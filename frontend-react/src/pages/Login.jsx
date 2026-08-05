import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiLogin, apiRegister, saveAuth } from '../api';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [obscure, setObscure] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password || (!isLogin && !name.trim())) {
      setError('يرجى تعبئة جميع الحقول');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const data = await apiLogin(email.trim(), password);
        saveAuth(data.token, data.user);
        navigate('/');
      } else {
        const data = await apiRegister(name.trim(), email.trim(), password);
        saveAuth(data.token, data.user);
        navigate('/profile-setup');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <ThemeToggle className="theme-toggle-fixed" />
      <div className="auth-container">
        <div className="auth-logo">
          <div className="emoji">🔥</div>
          <h1>لياقتك</h1>
          <p>تتبع سعراتك الحرارية بذكاء</p>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(true); setError(''); }}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              className={`auth-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(false); setError(''); }}
            >
              إنشاء حساب
            </button>
          </div>

          {error && <div className="auth-alert error">⚠ {error}</div>}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="auth-field">
                <label>الاسم</label>
                <input
                  className="auth-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="اسمك الكامل"
                />
              </div>
            )}

            <div className="auth-field">
              <label>البريد الإلكتروني</label>
              <input
                className="auth-input"
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
              />
            </div>

            <div className="auth-field">
              <label>كلمة المرور</label>
              <div className="auth-input-wrapper">
                <input
                  className="auth-input"
                  type={obscure ? 'password' : 'text'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setObscure((o) => !o)}
                >
                  {obscure ? '👁' : '🙈'}
                </button>
              </div>
            </div>

            <button className="auth-submit-btn" type="submit" disabled={loading}>
              {loading ? (
                <span className="spinner" />
              ) : (
                isLogin ? 'دخول' : 'إنشاء الحساب'
              )}
            </button>
          </form>

          {isLogin && (
            <div className="auth-link-row">
              <Link className="auth-link" to="/forgot-password">
                نسيت كلمة المرور؟
              </Link>
            </div>
          )}
        </div>

        <div className="auth-features">
          <div className="auth-feature">
            <div className="icon">📊</div>
            <div className="label">تتبع دقيق</div>
          </div>
          <div className="auth-feature">
            <div className="icon">📱</div>
            <div className="label">سهل الاستخدام</div>
          </div>
          <div className="auth-feature">
            <div className="icon">🤖</div>
            <div className="label">ذكاء اصطناعي</div>
          </div>
        </div>
      </div>
    </div>
  );
}
