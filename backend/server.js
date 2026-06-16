import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import { generalLimiter } from './middleware/rateLimiter.js';
import authRoutes from './routes/auth.js';
import foodRoutes from './routes/food.js';
import aiRoutes from './routes/ai.js';

dotenv.config();

// Initialize Firebase Admin SDK
const firebaseConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined,
  }),
};

const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp, process.env.FIREBASE_DATABASE_ID || '(default)');

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet());

// CORS - allow localhost in development and all Vercel deployments in production
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5500',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5501',
  'http://127.0.0.1:5501',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  /https:\/\/.*\.vercel\.app$/,
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = allowedOrigins.some((o) =>
        typeof o === 'string' ? o === origin : o.test(origin)
      );
      if (allowed) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Body parsing with 10mb limit for image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Health check endpoint (no auth required)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'لياقتك API يعمل بشكل صحيح' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/ai', aiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'المسار غير موجود' });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'حجم الملف كبير جداً' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'حدث خطأ في الخادم',
  });
});

if (process.argv[1]?.endsWith('server.js')) {
  app.listen(PORT, () => {
    console.log(`لياقتك backend running on port ${PORT}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
  });
}

export default app;
