import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiForgotPassword } from '../api';
import ThemeToggle from '../components/ThemeToggle';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }

    setLoading(true);
    try {
      await apiForgotPassword(email.trim());
      setSent(true);
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
          <p>استعادة كلمة المرور</p>
        </div>

        <div className="auth-card">
          {error && <div className="auth-alert error">⚠ {error}</div>}

          {sent ? (
            <div className="auth-alert success">
              ✓ إذا كان البريد الإلكتروني مسجلاً لدينا، سيصلك رابط إعادة تعيين كلمة المرور خلال دقائق
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
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

              <button className="auth-submit-btn" type="submit" disabled={loading}>
                {loading ? <span className="spinner" /> : 'إرسال رابط إعادة التعيين'}
              </button>
            </form>
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
