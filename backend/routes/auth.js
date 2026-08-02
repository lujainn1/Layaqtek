import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { db } from '../server.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Helper to generate JWT — no expiresIn means the token never expires
const generateToken = (uid, email, name) => {
  return jwt.sign({ uid, email, name }, process.env.JWT_SECRET);
};

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('الاسم مطلوب')
      .isLength({ min: 2, max: 50 })
      .withMessage('الاسم يجب أن يكون بين 2 و 50 حرف'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('البريد الإلكتروني مطلوب')
      .isEmail()
      .withMessage('البريد الإلكتروني غير صالح')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('كلمة المرور مطلوبة')
      .isLength({ min: 6 })
      .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: errors.array()[0].msg,
        errors: errors.array().map((e) => e.msg),
      });
    }

    const { name, email, password } = req.body;

    try {
      // Check if email already exists
      const usersRef = db.collection('users');
      const existingUser = await usersRef.where('email', '==', email).limit(1).get();

      if (!existingUser.empty) {
        return res.status(409).json({ error: 'البريد الإلكتروني مسجل بالفعل' });
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user document in Firestore
      const newUserRef = usersRef.doc();
      const uid = newUserRef.id;

      await newUserRef.set({
        uid,
        name,
        email,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        goals: {
          calories: 2000,
          protein: 150,
          carbs: 250,
          fat: 65,
          water: 8,
        },
      });

      // Generate JWT
      const token = generateToken(uid, email, name);

      res.status(201).json({
        message: 'تم إنشاء الحساب بنجاح',
        token,
        user: { uid, name, email },
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الحساب' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('البريد الإلكتروني مطلوب')
      .isEmail()
      .withMessage('البريد الإلكتروني غير صالح')
      .normalizeEmail(),
    body('password').notEmpty().withMessage('كلمة المرور مطلوبة'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: errors.array()[0].msg,
        errors: errors.array().map((e) => e.msg),
      });
    }

    const { email, password } = req.body;

    try {
      // Find user by email
      const usersRef = db.collection('users');
      const userQuery = await usersRef.where('email', '==', email).limit(1).get();

      if (userQuery.empty) {
        return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
      }

      const userDoc = userQuery.docs[0];
      const userData = userDoc.data();

      // Compare password
      const isPasswordValid = await bcrypt.compare(password, userData.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
      }

      // Generate JWT
      const token = generateToken(userData.uid, userData.email, userData.name);

      res.json({
        message: 'تم تسجيل الدخول بنجاح',
        token,
        user: {
          uid: userData.uid,
          name: userData.name,
          email: userData.email,
          goals: userData.goals,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
    }
  }
);

// PUT /api/auth/profile
router.put(
  '/profile',
  authMiddleware,
  [
    body('gender').isIn(['male', 'female']).withMessage('الجنس غير صالح'),
    body('age').isInt({ min: 10, max: 100 }).withMessage('العمر يجب أن يكون بين 10 و 100'),
    body('weight').isFloat({ min: 20, max: 300 }).withMessage('الوزن يجب أن يكون بين 20 و 300 كغ'),
    body('height').isFloat({ min: 50, max: 300 }).withMessage('الطول يجب أن يكون بين 50 و 300 سم'),
    body('activityLevel')
      .isIn(['sedentary', 'light', 'moderate', 'active', 'veryActive'])
      .withMessage('مستوى النشاط غير صالح'),
    body('goal').isIn(['lose', 'maintain', 'gain']).withMessage('الهدف غير صالح'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { gender, age, weight, height, activityLevel, goal } = req.body;
    const uid = req.user.uid;

    // Mifflin-St Jeor BMR
    const bmr =
      gender === 'male'
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;

    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      veryActive: 1.9,
    };

    const tdee = Math.round(bmr * activityMultipliers[activityLevel]);
    const goalAdjustments = { lose: -500, maintain: 0, gain: 300 };
    const targetCalories = Math.max(1200, tdee + goalAdjustments[goal]);

    const goals = {
      calories: targetCalories,
      protein: Math.round((targetCalories * 0.30) / 4),
      carbs: Math.round((targetCalories * 0.40) / 4),
      fat: Math.round((targetCalories * 0.30) / 9),
      water: 8,
      profileComplete: true,
    };

    try {
      const usersRef = db.collection('users');
      await usersRef.doc(uid).update({
        profile: { gender, age, weight, height, activityLevel, goal },
        goals,
        updatedAt: new Date().toISOString(),
      });

      res.json({ message: 'تم حفظ البيانات بنجاح', goals });
    } catch (err) {
      console.error('Profile update error:', err);
      res.status(500).json({ error: 'حدث خطأ أثناء حفظ البيانات' });
    }
  }
);

// PUT /api/auth/goals  — manual macro override
router.put(
  '/goals',
  authMiddleware,
  [
    body('calories').isInt({ min: 500, max: 10000 }).withMessage('السعرات يجب أن تكون بين 500 و 10000'),
    body('protein').isInt({ min: 0, max: 1000 }).withMessage('البروتين غير صالح'),
    body('carbs').isInt({ min: 0, max: 2000 }).withMessage('الكربوهيدرات غير صالحة'),
    body('fat').isInt({ min: 0, max: 1000 }).withMessage('الدهون غير صالحة'),
    body('water').isInt({ min: 1, max: 20 }).withMessage('الماء يجب أن يكون بين 1 و 20 كوب'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { calories, protein, carbs, fat, water } = req.body;
    const uid = req.user.uid;

    try {
      const userRef = db.collection('users').doc(uid);
      const snap = await userRef.get();
      const existing = snap.exists ? snap.data().goals || {} : {};

      const goals = {
        ...existing,
        calories,
        protein,
        carbs,
        fat,
        water,
        profileComplete: true,
        customized: true,
        updatedAt: new Date().toISOString(),
      };

      await userRef.update({ goals, updatedAt: new Date().toISOString() });
      res.json({ message: 'تم حفظ الأهداف بنجاح', goals });
    } catch (err) {
      console.error('Goals update error:', err);
      res.status(500).json({ error: 'حدث خطأ أثناء حفظ الأهداف' });
    }
  }
);

export default router;
