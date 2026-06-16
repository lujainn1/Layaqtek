import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import authMiddleware from '../middleware/auth.js';
import { db } from '../server.js';

const router = express.Router();

// GET /api/food/search?q=query (protected)
router.get(
  '/search',
  authMiddleware,
  [
    query('q')
      .trim()
      .notEmpty()
      .withMessage('يرجى إدخال كلمة البحث')
      .isLength({ min: 1, max: 100 })
      .withMessage('كلمة البحث يجب أن تكون بين 1 و 100 حرف'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const q = req.query.q.trim();
    try {
      const snapshot = await db.collection('foods').get();
      const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const lower = q.toLowerCase();
      const results = all.filter(
        (f) =>
          f.name.includes(q) ||
          (f.nameEn && f.nameEn.toLowerCase().includes(lower)) ||
          (f.category && f.category.includes(q))
      );
      res.json({ foods: results, total: results.length });
    } catch (err) {
      console.error('Food search error:', err);
      res.status(500).json({ error: 'حدث خطأ أثناء البحث' });
    }
  }
);

// GET /api/food/all (protected) - return all foods
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const snapshot = await db.collection('foods').orderBy('category').get();
    const foods = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ foods, total: foods.length });
  } catch (err) {
    console.error('Food all error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحميل قائمة الأطعمة' });
  }
});

// GET /api/food/log/:date (protected)
router.get(
  '/log/:date',
  authMiddleware,
  [
    param('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('صيغة التاريخ غير صحيحة، يجب أن تكون YYYY-MM-DD'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { date } = req.params;
    const uid = req.user.uid;

    try {
      const docRef = db.collection('users').doc(uid).collection('days').doc(date);
      const doc = await docRef.get();

      if (!doc.exists) {
        // Return empty structure for the day
        return res.json({
          date,
          meals: {
            فطور: [],
            غداء: [],
            عشاء: [],
            سناك: [],
          },
          water: 0,
          updatedAt: null,
        });
      }

      res.json({ date, ...doc.data() });
    } catch (err) {
      console.error('Get log error:', err);
      res.status(500).json({ error: 'حدث خطأ أثناء تحميل السجل' });
    }
  }
);

// POST /api/food/log/:date (protected)
router.post(
  '/log/:date',
  authMiddleware,
  [
    param('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('صيغة التاريخ غير صحيحة، يجب أن تكون YYYY-MM-DD'),
    body('meals').isObject().withMessage('بيانات الوجبات غير صحيحة'),
    body('water')
      .isNumeric()
      .withMessage('قيمة الماء يجب أن تكون رقماً')
      .isInt({ min: 0, max: 20 })
      .withMessage('قيمة الماء يجب أن تكون بين 0 و 20'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { date } = req.params;
    const { meals, water } = req.body;
    const uid = req.user.uid;

    // Validate meal structure
    const validMealTypes = ['فطور', 'غداء', 'عشاء', 'سناك'];
    for (const mealType of Object.keys(meals)) {
      if (!validMealTypes.includes(mealType)) {
        return res.status(400).json({ error: `نوع وجبة غير صالح: ${mealType}` });
      }
      if (!Array.isArray(meals[mealType])) {
        return res.status(400).json({ error: 'بيانات الوجبة يجب أن تكون قائمة' });
      }
    }

    try {
      const docRef = db.collection('users').doc(uid).collection('days').doc(date);

      const logData = {
        meals: {
          فطور: meals.فطور || [],
          غداء: meals.غداء || [],
          عشاء: meals.عشاء || [],
          سناك: meals.سناك || [],
        },
        water: Number(water),
        updatedAt: new Date().toISOString(),
      };

      await docRef.set(logData, { merge: true });

      res.json({ message: 'تم حفظ السجل بنجاح', date, ...logData });
    } catch (err) {
      console.error('Save log error:', err);
      res.status(500).json({ error: 'حدث خطأ أثناء حفظ السجل' });
    }
  }
);

// GET /api/food/stats?days=7 (protected)
router.get('/stats', authMiddleware, async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 7, 30);
  const uid = req.user.uid;

  // Build date list: today first → oldest last
  const dates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
  }

  try {
    const daysRef = db.collection('users').doc(uid).collection('days');
    const snapshots = await Promise.all(dates.map((date) => daysRef.doc(date).get()));

    const daysData = snapshots.map((snap, i) => ({
      date: dates[i],
      hasData: snap.exists,
      ...(snap.exists ? snap.data() : { meals: {}, water: 0 }),
    }));

    // Daily calories per day (oldest→newest for chart)
    const dailyCalories = daysData
      .map((day) => {
        let cals = 0, protein = 0, carbs = 0, fat = 0;
        if (day.meals) {
          for (const items of Object.values(day.meals)) {
            for (const item of items) {
              cals += item.calories || 0;
              protein += item.protein || 0;
              carbs += item.carbs || 0;
              fat += item.fat || 0;
            }
          }
        }
        return {
          date: day.date,
          calories: Math.round(cals),
          protein: Math.round(protein),
          carbs: Math.round(carbs),
          fat: Math.round(fat),
          water: day.water || 0,
          hasData: day.hasData,
        };
      })
      .reverse();

    // Streak (consecutive days from today backward with logged calories > 0)
    let streak = 0;
    for (const day of daysData) {
      const cals = dailyCalories.find((d) => d.date === day.date)?.calories || 0;
      if (day.hasData && cals > 0) streak++;
      else break;
    }

    // Weekly macro averages
    const activeDays = dailyCalories.filter((d) => d.calories > 0);
    const macroAvg = activeDays.length
      ? {
          protein: Math.round(activeDays.reduce((s, d) => s + d.protein, 0) / activeDays.length),
          carbs:   Math.round(activeDays.reduce((s, d) => s + d.carbs,   0) / activeDays.length),
          fat:     Math.round(activeDays.reduce((s, d) => s + d.fat,     0) / activeDays.length),
          calories: Math.round(activeDays.reduce((s, d) => s + d.calories, 0) / activeDays.length),
          water:   Math.round(activeDays.reduce((s, d) => s + d.water,   0) / activeDays.length),
        }
      : { protein: 0, carbs: 0, fat: 0, calories: 0, water: 0 };

    // Top 5 most frequent foods
    const foodCount = {};
    for (const day of daysData) {
      if (!day.meals) continue;
      for (const items of Object.values(day.meals)) {
        for (const item of items) {
          if (item.name) foodCount[item.name] = (foodCount[item.name] || 0) + 1;
        }
      }
    }
    const topFoods = Object.entries(foodCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    res.json({
      dailyCalories,
      macroAvg,
      streak,
      topFoods,
      daysWithData: activeDays.length,
      totalDays: days,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحميل الإحصاءات' });
  }
});

export default router;
