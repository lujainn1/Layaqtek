import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح: يجب تسجيل الدخول أولاً' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'غير مصرح: الرمز المميز مفقود' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'الرمز المميز غير صالح' });
    }
    return res.status(401).json({ error: 'خطأ في التحقق من الهوية' });
  }
};

export default authMiddleware;
