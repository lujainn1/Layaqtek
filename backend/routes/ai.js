import express from 'express';
import { body, validationResult } from 'express-validator';
import authMiddleware from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { db } from '../server.js';

const router = express.Router();

const UNKNOWN_FOOD_NAME = 'طعام غير محدد';

// Best-effort: add AI-identified foods to the shared `foods` database so future
// manual searches (FoodModal) can find them too. Never overwrites an existing
// entry (curated/seed data wins), and normalizes to per-100g to match the
// existing schema (see backend/seedFoods.js) since the AI reports values for
// the visible portion, not per 100g.
async function saveAiFoodToDatabase(food) {
  if (!food.name || food.name === UNKNOWN_FOOD_NAME) return;

  try {
    const existing = await db.collection('foods').where('name', '==', food.name).limit(1).get();
    if (!existing.empty) return;

    const grams = food.grams > 0 ? food.grams : 100;
    const scale = 100 / grams;

    await db.collection('foods').add({
      name: food.name,
      nameEn: null,
      category: food.category || 'غير مصنف',
      calories: Math.round(food.calories * scale),
      protein: Math.round(food.protein * scale * 10) / 10,
      carbs: Math.round(food.carbs * scale * 10) / 10,
      fat: Math.round(food.fat * scale * 10) / 10,
      sugar: 0,
      fiber: 0,
      sodium: 0,
      serving: food.quantity || 'حصة واحدة',
      servingWeight: grams,
      source: 'ai-detected',
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('AI food DB upsert error:', err);
  }
}

// Tried in order — falls through to the next model if one is unavailable
// (quota exhausted, deprecated/not found, or temporarily overloaded).
const MODEL_FALLBACKS = ['gemini-2.5-flash', 'gemini-flash-lite-latest'];
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Calls one Gemini model and returns its raw text response. Throws an Error
// with `.retryable = true` for failures where trying the next model in
// MODEL_FALLBACKS makes sense (quota exceeded, model unavailable, timeout,
// empty response) — anything else (validation, safety block) is not retryable
// since a different model would fail the same way.
async function callGeminiModel(model, prompt, mimeType, imageData) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30 * 1000);

  let response;
  try {
    response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageData } },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });
  } catch (fetchErr) {
    if (fetchErr.name === 'AbortError') {
      const err = new Error('timeout');
      err.retryable = true;
      throw err;
    }
    throw fetchErr;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const err = new Error(errData?.error?.message || `Gemini error ${response.status}`);
    err.status = response.status;
    // 404 = model unavailable/deprecated, 429 = quota exceeded, 503 = overloaded
    err.retryable = [404, 429, 503].includes(response.status);
    throw err;
  }

  const data = await response.json();

  if (data.promptFeedback?.blockReason) {
    const err = new Error('تعذر تحليل هذه الصورة، يرجى المحاولة بصورة مختلفة');
    err.retryable = false;
    throw err;
  }

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!rawText) {
    const err = new Error('empty response');
    err.retryable = true;
    throw err;
  }

  return rawText;
}

async function analyzeImageWithFallback(prompt, mimeType, imageData) {
  let lastErr;
  for (const model of MODEL_FALLBACKS) {
    try {
      return await callGeminiModel(model, prompt, mimeType, imageData);
    } catch (err) {
      lastErr = err;
      if (!err.retryable) throw err;
      console.warn(`Gemini model "${model}" unavailable (${err.message}), trying next fallback...`);
    }
  }
  throw lastErr;
}

// POST /api/ai/analyze (protected, aiLimiter)
router.post(
  '/analyze',
  authMiddleware,
  aiLimiter,
  [
    body('imageData')
      .notEmpty()
      .withMessage('بيانات الصورة مطلوبة')
      .isString()
      .withMessage('بيانات الصورة يجب أن تكون نصاً'),
    body('mimeType')
      .notEmpty()
      .withMessage('نوع الصورة مطلوب')
      .matches(/^image\//)
      .withMessage('نوع الصورة غير مدعوم'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { imageData, mimeType } = req.body;

    if (imageData.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'حجم الصورة كبير جداً، يرجى استخدام صورة أصغر' });
    }

    const prompt = `You are a nutrition expert specialized in Arabic and Saudi food.
Analyze this image and identify all visible food items.
Count estimated Calories and Macros (protein, carbs, fat) for each item based on visible portions.

Reply with ONLY a single valid JSON object — no markdown, no comments, no text before or after.

STRICT language rule: every "name", "quantity", "category", and "message" value MUST be written in
plain, standard Modern Standard Arabic (Arabic script only). Never mix in English, French, or any
other language or random symbols inside these values. Keep food names short and simple — the common
everyday Arabic name (e.g. "أرز", "دجاج مشوي", "تفاح"), not a long description.

Each food item also needs "grams": your best estimate of the total weight in grams of the visible
portion (used to save this food into a reusable nutrition database, so it must be realistic — e.g.
a cooked cup of rice ≈ 158g, a grilled chicken breast ≈ 120g). And "category": a single short
Arabic word grouping the food (e.g. "حبوب", "لحوم", "خضروات", "فواكه", "ألبان", "حلويات", "مشروبات").

Example of a correctly formatted reply:
{
  "foods": [
    { "name": "أرز أبيض", "calories": 200, "protein": 4, "carbs": 44, "fat": 1, "quantity": "كوب واحد", "grams": 158, "category": "حبوب" },
    { "name": "دجاج مشوي", "calories": 250, "protein": 30, "carbs": 0, "fat": 12, "quantity": "قطعة صدر", "grams": 120, "category": "لحوم" }
  ],
  "totalCalories": 450,
  "message": "طبق أرز مع دجاج مشوي"
}

Required JSON shape (same as the example above):
{
  "foods": [
    { "name": "string", "calories": number, "protein": number, "carbs": number, "fat": number, "quantity": "string", "grams": number, "category": "string" }
  ],
  "totalCalories": number,
  "message": "string"
}

Rules:
- Be accurate based on visible portion sizes
- If a food item is unidentifiable, name it "طعام غير محدد"
- Double-check the JSON is valid before replying: matching braces/brackets, quoted keys, no trailing commas`;

    try {
      let rawText;
      try {
        rawText = await analyzeImageWithFallback(prompt, mimeType, imageData);
      } catch (err) {
        if (err.status === 429) {
          return res.status(429).json({ error: 'تم تجاوز حد استخدام الذكاء الاصطناعي، يرجى المحاولة لاحقاً' });
        }
        if (err.retryable) {
          // Every fallback model was tried and failed (timeout, empty response, 404/503).
          return res.status(504).json({ error: 'الذكاء الاصطناعي مشغول حالياً، يرجى المحاولة مرة أخرى بعد قليل' });
        }
        throw err; // non-retryable (e.g. safety block) — its message is already a friendly Arabic string
      }

      let analysisResult;
      try {
        const cleaned = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        analysisResult = JSON.parse(cleaned);
      } catch {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        try {
          analysisResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch {
          analysisResult = null;
        }
        if (!analysisResult) {
          throw new Error('تعذر تحليل الصورة، يرجى المحاولة مرة أخرى بصورة أوضح');
        }
      }

      if (!analysisResult.foods || !Array.isArray(analysisResult.foods)) {
        throw new Error('استجابة غير صحيحة من الذكاء الاصطناعي');
      }

      analysisResult.foods = analysisResult.foods.map((food) => ({
        name: food.name || 'طعام غير محدد',
        calories: Math.round(Number(food.calories) || 0),
        protein: Math.round(Number(food.protein) || 0),
        carbs: Math.round(Number(food.carbs) || 0),
        fat: Math.round(Number(food.fat) || 0),
        quantity: food.quantity || 'حصة واحدة',
        grams: Math.round(Number(food.grams)) || 100,
        category: (food.category || 'غير مصنف').trim(),
      }));

      analysisResult.totalCalories =
        analysisResult.foods.reduce((sum, f) => sum + f.calories, 0) ||
        Math.round(Number(analysisResult.totalCalories) || 0);

      analysisResult.message = analysisResult.message || 'تم تحليل الصورة بنجاح';

      // Best-effort persist to the shared foods database so future manual
      // searches can find these items too. Awaited so it isn't dropped if the
      // serverless function is frozen right after the response is sent.
      await Promise.allSettled(analysisResult.foods.map(saveAiFoodToDatabase));

      res.json(analysisResult);
    } catch (err) {
      console.error('AI analyze error:', err);
      res.status(500).json({
        error: err.message || 'حدث خطأ أثناء تحليل الصورة، يرجى المحاولة مجدداً',
      });
    }
  }
);

export default router;
