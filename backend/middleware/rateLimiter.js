import rateLimit from 'express-rate-limit';

// General rate limiter: 100 requests per 15 minutes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'لقد تجاوزت الحد المسموح به من الطلبات، يرجى الانتظار 15 دقيقة',
  },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

// Password reset rate limiter: 5 requests per 15 minutes (prevent abuse/enumeration)
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'لقد تجاوزت الحد المسموح به من المحاولات، يرجى الانتظار 15 دقيقة',
  },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

// AI rate limiter: 10 requests per 1 minute (stricter for AI endpoint)
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'لقد تجاوزت الحد المسموح به لتحليل الصور، يرجى الانتظار دقيقة',
  },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});
