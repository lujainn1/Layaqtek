import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiSaveProfile, updateStoredUser } from '../api';
import { calculateGoals } from '../utils/goals';
import ThemeToggle from '../components/ThemeToggle';

const ACTIVITIES = [
  ['sedentary', '🪑', 'خامل', 'عمل مكتبي، بدون رياضة'],
  ['light', '🚶', 'نشاط خفيف', 'رياضة 1-3 أيام أسبوعياً'],
  ['moderate', '🏃', 'نشاط متوسط', 'رياضة 3-5 أيام أسبوعياً'],
  ['active', '🏋️', 'نشيط', 'رياضة 6-7 أيام أسبوعياً'],
  ['veryActive', '⚡', 'نشيط جداً', 'رياضة يومية مكثفة'],
];

const GOALS_LIST = [
  ['lose', '📉', 'خسارة وزن', '−500 سعرة'],
  ['maintain', '⚖️', 'محافظة', 'بدون تغيير'],
  ['gain', '📈', 'زيادة وزن', '+300 سعرة'],
];

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [gender, setGender] = useState(null);
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [activityLevel, setActivityLevel] = useState(null);
  const [goal, setGoal] = useState(null);

  const stepValid = useMemo(() => {
    switch (step) {
      case 0: return gender && Number(age) >= 10;
      case 1: return Number(weight) >= 20 && Number(height) >= 50;
      case 2: return !!activityLevel;
      case 3: return !!goal;
      default: return false;
    }
  }, [step, gender, age, weight, height, activityLevel, goal]);

  const preview = useMemo(() => {
    if (!gender || !age || !weight || !height || !activityLevel || !goal) return null;
    return calculateGoals({
      gender, age: Number(age), weight: Number(weight), height: Number(height),
      activityLevel, goal,
    });
  }, [gender, age, weight, height, activityLevel, goal]);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const data = await apiSaveProfile(gender, Number(age), Number(weight), Number(height), activityLevel, goal);
      updateStoredUser({ goals: data.goals });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function next() {
    if (step < 3) setStep(step + 1);
    else handleSave();
  }

  return (
    <div className="setup-page">
      <ThemeToggle className="theme-toggle-fixed" />
      <div className="setup-container">
        <div className="setup-logo">
          <div className="emoji">🔥</div>
          <h1>أخبرنا عنك</h1>
          <p>لنحسب احتياجك اليومي من السعرات</p>
        </div>

        <div className="progress-track">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`progress-step ${i <= step ? 'active' : ''}`} />
          ))}
        </div>

        <div className="setup-card">
          {error && <div className="auth-alert error">⚠ {error}</div>}

          {step === 0 && (
            <div>
              <div className="setup-step-title">الجنس والعمر</div>
              <div className="gender-grid">
                <div
                  className={`option-card ${gender === 'male' ? 'selected' : ''}`}
                  onClick={() => setGender('male')}
                >
                  <div className="icon">👨</div>
                  <div className="label">ذكر</div>
                </div>
                <div
                  className={`option-card ${gender === 'female' ? 'selected' : ''}`}
                  onClick={() => setGender('female')}
                >
                  <div className="icon">👩</div>
                  <div className="label">أنثى</div>
                </div>
              </div>
              <div className="num-field">
                <label>العمر</label>
                <div className="num-input-wrapper">
                  <input
                    className="num-input"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                  <span className="num-unit">سنة</span>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="setup-step-title">الوزن والطول</div>
              <div className="num-field">
                <label>الوزن</label>
                <div className="num-input-wrapper">
                  <input
                    className="num-input"
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                  <span className="num-unit">كغ</span>
                </div>
              </div>
              <div className="num-field">
                <label>الطول</label>
                <div className="num-input-wrapper">
                  <input
                    className="num-input"
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                  />
                  <span className="num-unit">سم</span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="setup-step-title">مستوى نشاطك</div>
              {ACTIVITIES.map(([value, icon, name_, desc]) => (
                <div
                  key={value}
                  className={`activity-card ${activityLevel === value ? 'selected' : ''}`}
                  onClick={() => setActivityLevel(value)}
                >
                  <div className="icon">{icon}</div>
                  <div>
                    <div className="name">{name_}</div>
                    <div className="desc">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="setup-step-title">هدفك</div>
              {GOALS_LIST.map(([value, icon, name_, adj]) => (
                <div
                  key={value}
                  className={`goal-card ${goal === value ? 'selected' : ''}`}
                  onClick={() => setGoal(value)}
                >
                  <div className="icon">{icon}</div>
                  <div className="name">{name_}</div>
                  <div className="adj">{adj}</div>
                </div>
              ))}

              {preview && (
                <div className="results-preview">
                  <div className="result-box full">
                    <div className="value">{preview.calories}</div>
                    <div className="unit">سعرة / يوم</div>
                  </div>
                  <div className="result-box">
                    <div className="value">{preview.protein}g</div>
                    <div className="label">بروتين</div>
                  </div>
                  <div className="result-box">
                    <div className="value">{preview.carbs}g</div>
                    <div className="label">كارب</div>
                  </div>
                  <div className="result-box">
                    <div className="value">{preview.fat}g</div>
                    <div className="label">دهون</div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="btn-row">
            {step > 0 && (
              <button className="btn-back" onClick={() => setStep(step - 1)}>
                رجوع
              </button>
            )}
            <button className="btn-next" onClick={next} disabled={!stepValid || saving}>
              {saving ? <span className="spinner" /> : step < 3 ? 'التالي' : 'احسب أهدافي 🎯'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
