import express from 'express';
import { body, validationResult } from 'express-validator';
import authMiddleware from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'nvidia/nemotron-nano-12b-v2-vl:free';

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

STRICT language rule: every "name", "quantity", and "message" value MUST be written in plain,
standard Modern Standard Arabic (Arabic script only). Never mix in English, French, or any other
language or random symbols inside these values. Keep food names short and simple — the common
everyday Arabic name (e.g. "أرز", "دجاج مشوي", "تفاح"), not a long description.

Example of a correctly formatted reply:
{
  "foods": [
    { "name": "أرز أبيض", "calories": 200, "protein": 4, "carbs": 44, "fat": 1, "quantity": "كوب واحد" },
    { "name": "دجاج مشوي", "calories": 250, "protein": 30, "carbs": 0, "fat": 12, "quantity": "قطعة صدر" }
  ],
  "totalCalories": 450,
  "message": "طبق أرز مع دجاج مشوي"
}

Required JSON shape (same as the example above):
{
  "foods": [
    { "name": "string", "calories": number, "protein": number, "carbs": number, "fat": number, "quantity": "string" }
  ],
  "totalCalories": number,
  "message": "string"
}

Rules:
- Be accurate based on visible portion sizes
- If a food item is unidentifiable, name it "طعام غير محدد"
- Double-check the JSON is valid before replying: matching braces/brackets, quoted keys, no trailing commas`;

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://layaqtek.app',
          'X-Title': 'Layaqtek',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageData}` } },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          return res.status(429).json({ error: 'تم تجاوز حد استخدام الذكاء الاصطناعي، يرجى المحاولة لاحقاً' });
        }
        throw new Error(errData?.error?.message || `OpenRouter error ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content?.trim();

      if (!rawText) throw new Error('لم يتمكن الذكاء الاصطناعي من تحليل الصورة');

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
      }));

      analysisResult.totalCalories =
        analysisResult.foods.reduce((sum, f) => sum + f.calories, 0) ||
        Math.round(Number(analysisResult.totalCalories) || 0);

      analysisResult.message = analysisResult.message || 'تم تحليل الصورة بنجاح';

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
