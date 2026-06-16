import express from 'express';
import { body, validationResult } from 'express-validator';
import authMiddleware from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'qwen/qwen2.5-vl-72b-instruct:free';

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
Reply with valid JSON only, no extra text before or after.

Required format:
{
  "foods": [
    {
      "name": "اسم الطعام بالعربية",
      "calories": 000,
      "protein": 0,
      "carbs": 0,
      "fat": 0,
      "quantity": "وصف الكمية المرئية"
    }
  ],
  "totalCalories": 000,
  "message": "وصف قصير للوجبة بالعربية"
}

Rules:
- Name foods in Arabic
- Be accurate based on visible portion sizes
- If food is unidentifiable, write "طعام غير محدد"`;

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
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('لم يتمكن الذكاء الاصطناعي من تحليل الصورة');
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
