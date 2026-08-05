import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiResetPassword } from '../api';
import ThemeToggle from '../components/ThemeToggle';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('يرجى تعبئة جميع الحقول');
      return;
    }
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);
    try {
      await apiResetPassword(email, token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
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
          <p>تعيين كلمة مرور جديدة</p>
        </div>

        <div className="auth-card">
          {!email || !token ? (
            <div className="auth-alert error">⚠ رابط إعادة التعيين غير صالح، يرجى طلب رابط جديد</div>
          ) : done ? (
            <div className="auth-alert success">✓ تم تغيير كلمة المرور بنجاح، جارِ تحويلك لتسجيل الدخول...</div>
          ) : (
            <>
              {error && <div className="auth-alert error">⚠ {error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="auth-field">
                  <label>كلمة المرور الجديدة</label>
                  <input
                    className="auth-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <div className="auth-field">
                  <label>تأكيد كلمة المرور</label>
                  <input
                    className="auth-input"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <button className="auth-submit-btn" type="submit" disabled={loading}>
                  {loading ? <span className="spinner" /> : 'تعيين كلمة المرور'}
                </button>
              </form>
            </>
          )}

          <div className="auth-link-row">
            <Link className="auth-link" to="/login">
              العودة لتسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
