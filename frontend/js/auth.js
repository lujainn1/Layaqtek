/**
 * auth.js - Login/Register page logic
 */

// Redirect to dashboard if already logged in
if (isAuthenticated()) {
  window.location.href = 'index.html';
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(tab) {
  const tabs = document.querySelectorAll('.tab-btn');
  const sections = document.querySelectorAll('.form-section');

  tabs.forEach((btn, i) => {
    const isActive = (i === 0 && tab === 'login') || (i === 1 && tab === 'register');
    btn.classList.toggle('active', isActive);
  });

  document.getElementById('loginSection').classList.toggle('active', tab === 'login');
  document.getElementById('registerSection').classList.toggle('active', tab === 'register');

  // Clear alerts on switch
  hideAlert('loginError');
  hideAlert('loginSuccess');
  hideAlert('registerError');
  hideAlert('registerSuccess');
}

// ── Alert helpers ─────────────────────────────────────────────────────────────
function showAlert(id, message, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = (type === 'error' ? '⚠️ ' : '✅ ') + message;
  el.className = `alert alert-${type} show`;
}

function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) {
    el.className = 'alert';
    el.textContent = '';
  }
}

// ── Loading state ─────────────────────────────────────────────────────────────
function setLoading(btnId, spinnerId, textId, loading, text) {
  const btn = document.getElementById(btnId);
  const spinner = document.getElementById(spinnerId);
  const textEl = document.getElementById(textId);
  if (!btn || !spinner || !textEl) return;

  btn.disabled = loading;
  spinner.style.display = loading ? 'block' : 'none';
  textEl.textContent = text;
}

// ── Password toggle ───────────────────────────────────────────────────────────
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  btn.innerHTML = isPassword
    ? `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>`
    : `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>`;
}

// ── Login ─────────────────────────────────────────────────────────────────────
async function handleLogin(event) {
  event.preventDefault();
  hideAlert('loginError');
  hideAlert('loginSuccess');

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showAlert('loginError', 'يرجى ملء جميع الحقول');
    return;
  }

  setLoading('loginBtn', 'loginSpinner', 'loginBtnText', true, 'جارٍ تسجيل الدخول...');

  try {
    const data = await apiLogin(email, password);

    // Store auth data
    localStorage.setItem('layaqtek_token', data.token);
    localStorage.setItem('layaqtek_user', JSON.stringify(data.user));

    showAlert('loginSuccess', 'تم تسجيل الدخول بنجاح! جارٍ التحويل...', 'success');

    const profileComplete = data.user?.goals?.profileComplete;
    setTimeout(() => {
      window.location.href = profileComplete ? 'index.html' : 'profile.html';
    }, 800);
  } catch (err) {
    showAlert('loginError', err.message || 'حدث خطأ، يرجى المحاولة مجدداً');
    setLoading('loginBtn', 'loginSpinner', 'loginBtnText', false, 'تسجيل الدخول');
  }
}

// ── Register ──────────────────────────────────────────────────────────────────
async function handleRegister(event) {
  event.preventDefault();
  hideAlert('registerError');
  hideAlert('registerSuccess');

  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;

  if (!name || !email || !password) {
    showAlert('registerError', 'يرجى ملء جميع الحقول');
    return;
  }

  if (password.length < 6) {
    showAlert('registerError', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    return;
  }

  setLoading('registerBtn', 'registerSpinner', 'registerBtnText', true, 'جارٍ إنشاء الحساب...');

  try {
    const data = await apiRegister(name, email, password);

    // Store auth data
    localStorage.setItem('layaqtek_token', data.token);
    localStorage.setItem('layaqtek_user', JSON.stringify(data.user));

    showAlert('registerSuccess', 'تم إنشاء الحساب بنجاح! جارٍ التحويل...', 'success');

    setTimeout(() => {
      window.location.href = 'profile.html';
    }, 800);
  } catch (err) {
    showAlert('registerError', err.message || 'حدث خطأ، يرجى المحاولة مجدداً');
    setLoading('registerBtn', 'registerSpinner', 'registerBtnText', false, 'إنشاء حساب');
  }
}
