import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  apiGetLog, apiSaveLog, apiGetAllFoods, clearAuth, getUser,
} from '../api';
import { getTodayString } from '../utils/goals';
import { useToast } from '../context/ToastContext';
import MealCard from '../components/MealCard';
import FoodModal from '../components/FoodModal';
import GoalsModal from '../components/GoalsModal';
import AiAnalyzer from '../components/AiAnalyzer';

const MEAL_TYPES = ['فطور', 'غداء', 'عشاء', 'سناك'];
const ML_PER_CUP = 250;
const RING_CIRCUMFERENCE = 2 * Math.PI * 85;

const DEFAULT_GOALS = { calories: 2000, protein: 150, carbs: 250, fat: 65, water: 8 };

export default function Dashboard() {
  const navigate = useNavigate();
  const showToast = useToast();
  const user = getUser();

  const [goals, setGoals] = useState({ ...DEFAULT_GOALS, ...(user?.goals || {}) });
  const [meals, setMeals] = useState({ فطور: [], غداء: [], عشاء: [], سناك: [] });
  const [water, setWater] = useState(0);
  const [allFoods, setAllFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalMeal, setModalMeal] = useState(null);
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState({});

  const todayDate = getTodayString();

  useEffect(() => {
    (async () => {
      try {
        const log = await apiGetLog(todayDate);
        if (log) {
          setMeals({
            فطور: log.meals?.فطور || [],
            غداء: log.meals?.غداء || [],
            عشاء: log.meals?.عشاء || [],
            سناك: log.meals?.سناك || [],
          });
          setWater(log.water || 0);
        }
      } catch (err) {
        if (err.message === 'جلسة منتهية') return;
        console.warn('Could not load log:', err.message);
      }
      try {
        const data = await apiGetAllFoods();
        setAllFoods(data.foods || []);
      } catch { /* ignore, search will just show empty results */ }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(nextMeals, nextWater) {
    apiSaveLog(todayDate, nextMeals, nextWater).catch((err) => {
      showToast(`تعذر الحفظ: ${err.message}`, 'error');
    });
  }

  const totals = useMemo(() => {
    let calories = 0, protein = 0, carbs = 0, fat = 0;
    for (const items of Object.values(meals)) {
      for (const item of items) {
        calories += item.calories || 0;
        protein += item.protein || 0;
        carbs += item.carbs || 0;
        fat += item.fat || 0;
      }
    }
    return {
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
    };
  }, [meals]);

  function addFood(mealType, item) {
    const next = { ...meals, [mealType]: [...meals[mealType], item] };
    setMeals(next);
    setLastAdded((l) => ({ ...l, [mealType]: next[mealType].length - 1 }));
    persist(next, water);
    setModalMeal(null);
    showToast(`تمت إضافة ${item.name}`, 'success');
    setTimeout(() => setLastAdded((l) => ({ ...l, [mealType]: -1 })), 500);
  }

  function addAIFoods(mealType, items) {
    const next = { ...meals, [mealType]: [...meals[mealType], ...items] };
    setMeals(next);
    persist(next, water);
    showToast(`تمت إضافة ${items.length} صنف إلى ${mealType}`, 'success');
  }

  function removeFood(mealType, index) {
    const removed = meals[mealType][index];
    const next = { ...meals, [mealType]: meals[mealType].filter((_, i) => i !== index) };
    setMeals(next);
    persist(next, water);
    if (removed) showToast(`تم حذف ${removed.name}`, 'info');
  }

  function updateWater(delta) {
    const next = Math.max(0, Math.min(goals.water, water + delta));
    setWater(next);
    persist(meals, next);
  }

  function toggleCup(i) {
    const next = i < water ? i : i + 1;
    setWater(next);
    persist(meals, next);
  }

  function logout() {
    clearAuth();
    navigate('/login');
  }

  const goalCal = Math.round(goals.calories);
  const consumed = totals.calories;
  const pct = Math.min(consumed / goalCal, 1);
  const offset = RING_CIRCUMFERENCE - pct * RING_CIRCUMFERENCE;
  const over = consumed > goalCal;

  return (
    <div>
      <nav className="navbar">
        <Link to="/" className="nav-logo"><span>🔥</span>لياقتك</Link>
        <div className="nav-right">
          <div className="nav-user">مرحباً، <strong>{user?.name || 'المستخدم'}</strong></div>
          <Link to="/progress" className="nav-link">📊 <span className="nav-progress-text">التقدم</span></Link>
          <button className="logout-btn" onClick={logout}>تسجيل الخروج</button>
        </div>
      </nav>

      <main className="main-content">
        <div className="date-header">
          <h2>سجل اليوم</h2>
          <div className="date-text">
            {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        <div className="top-grid">
          {/* Calorie ring */}
          <div className="card calorie-card">
            <div className="card-title">🎯 السعرات الحرارية</div>
            <div className="ring-container">
              <svg className="ring-svg" viewBox="0 0 200 200">
                <circle className="ring-bg" cx="100" cy="100" r="85" />
                <circle
                  className={`ring-progress ${over ? 'over-limit' : ''}`}
                  cx="100" cy="100" r="85"
                  style={{ strokeDasharray: RING_CIRCUMFERENCE, strokeDashoffset: offset }}
                />
              </svg>
              <div className="ring-center">
                <div className="ring-calories">{consumed}</div>
                <div className="ring-label">سعرة</div>
                <div className="ring-goal">من {goalCal}</div>
              </div>
            </div>
            <div className="calorie-stats">
              <div className="cal-stat consumed">
                <div className="value">{consumed}</div>
                <div className="label">مستهلك</div>
              </div>
              <div className="cal-stat">
                <div className="value" style={{ color: 'var(--text-muted)' }}>{goalCal}</div>
                <div className="label">الهدف</div>
              </div>
              <div className="cal-stat remaining">
                <div className="value">{Math.max(0, goalCal - consumed)}</div>
                <div className="label">متبقي</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Macros */}
            <div className="card macros-card">
              <div className="card-title">
                💪 المغذيات الكبرى
                <button className="edit-goals-btn" onClick={() => setGoalsModalOpen(true)} title="تعديل الأهداف">✏️</button>
              </div>
              {[
                ['protein', 'البروتين', 'var(--protein-color)'],
                ['carbs', 'الكربوهيدرات', 'var(--carbs-color)'],
                ['fat', 'الدهون', 'var(--fat-color)'],
              ].map(([key, label, color]) => (
                <div className="macro-item" key={key}>
                  <div className="macro-header">
                    <div className="macro-name">
                      <div className="macro-dot" style={{ background: color }} />
                      {label}
                    </div>
                    <div className="macro-values">
                      <strong>{totals[key]}</strong>g / {goals[key]}g
                    </div>
                  </div>
                  <div className="macro-bar-bg">
                    <div
                      className={`macro-bar-fill ${key}`}
                      style={{ width: `${Math.min((totals[key] / goals[key]) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Water */}
            <div className="card water-card">
              <div className="card-title">💧 الماء اليومي</div>
              <div className="water-cups">
                {Array.from({ length: goals.water }).map((_, i) => (
                  <div
                    key={i}
                    className={`water-cup ${i < water ? 'filled' : ''}`}
                    title={`كوب ${i + 1}`}
                    onClick={() => toggleCup(i)}
                  >
                    <svg viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 10 L6 46 H34 L32 10 Z" fill={i < water ? '#3498db' : 'rgba(0,0,0,0.05)'} stroke={i < water ? '#2980b9' : 'rgba(0,0,0,0.1)'} strokeWidth="2" />
                      <path d="M8 10 L32 10" stroke={i < water ? '#5dade2' : 'rgba(0,0,0,0.08)'} strokeWidth="2" />
                    </svg>
                  </div>
                ))}
              </div>
              <div className="water-controls">
                <button className="water-btn" onClick={() => updateWater(-1)}>−</button>
                <div className="water-info">
                  <div className="water-ml">{water * ML_PER_CUP} مل</div>
                  <div className="water-label">{water} / {goals.water} أكواب</div>
                </div>
                <button className="water-btn" onClick={() => updateWater(1)}>+</button>
              </div>
            </div>
          </div>
        </div>

        {/* Meals */}
        <div className="meals-grid">
          {loading
            ? MEAL_TYPES.map((mealType, i) => (
                <div className="meal-card" key={mealType} style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="meal-header" style={{ cursor: 'default' }}>
                    <div className="meal-title">
                      <span className="meal-icon">{{ فطور: '🌅', غداء: '☀️', عشاء: '🌙', سناك: '🍎' }[mealType]}</span>
                      <span className="meal-name">{mealType}</span>
                    </div>
                    <span className="meal-cal-badge">— سعرة</span>
                  </div>
                  <div className="meal-body open">
                    <div className="skeleton-meal-body">
                      <div className="skeleton-line full" />
                      <div className="skeleton-line short" />
                    </div>
                  </div>
                </div>
              ))
            : MEAL_TYPES.map((mealType, i) => (
                <MealCard
                  key={mealType}
                  mealType={mealType}
                  items={meals[mealType]}
                  delay={i * 80}
                  lastAddedIndex={lastAdded[mealType] ?? -1}
                  onAdd={() => setModalMeal(mealType)}
                  onRemove={(index) => removeFood(mealType, index)}
                />
              ))}
        </div>

        <AiAnalyzer onAddFoods={addAIFoods} />
      </main>

      <button className="fab" onClick={() => setModalMeal('غداء')} aria-label="إضافة طعام">+</button>

      {modalMeal && (
        <FoodModal
          mealType={modalMeal}
          allFoods={allFoods}
          onClose={() => setModalMeal(null)}
          onConfirm={(item) => addFood(modalMeal, item)}
        />
      )}

      {goalsModalOpen && (
        <GoalsModal
          goals={goals}
          onClose={() => setGoalsModalOpen(false)}
          onSaved={(newGoals) => {
            setGoals(newGoals);
            showToast('✓ تم حفظ الأهداف بنجاح', 'success');
          }}
        />
      )}
    </div>
  );
}
