import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGetStats, getUser } from '../api';
import ThemeToggle from '../components/ThemeToggle';

const DAY_NAMES = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];
const DEFAULT_GOALS = { calories: 2000, protein: 150, carbs: 250, fat: 65, water: 8 };
const MEDALS = ['🥇', '🥈', '🥉'];

export default function Progress() {
  const user = getUser();
  const goals = { ...DEFAULT_GOALS, ...(user?.goals || {}) };

  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGetStats(days)
      .then((data) => { if (!cancelled) setStats(data); })
      .catch(() => { if (!cancelled) setStats(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days]);

  const macroAvg = stats?.macroAvg || {};
  const dailyCalories = stats?.dailyCalories || [];
  const topFoods = stats?.topFoods || [];
  const maxVal = Math.max(goals.calories, ...dailyCalories.map((d) => d.calories || 0));

  return (
    <div>
      <nav className="navbar">
        <Link to="/" className="nav-logo"><span>🔥</span>لياقتك</Link>
        <div className="nav-right">
          <div className="period-tabs">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                className={`period-tab ${days === d ? 'active' : ''}`}
                onClick={() => setDays(d)}
              >
                {d} أيام
              </button>
            ))}
          </div>
          <ThemeToggle />
        </div>
      </nav>

      <main className="main-content">
        <div className="progress-page-title">📊 التقدم والتحليل</div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>جارٍ التحميل...</div>
        ) : !stats ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد بيانات</div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card streak">
                <div className="stat-icon">🔥</div>
                <div className="stat-value">{stats.streak || 0}</div>
                <div className="stat-label">أيام متتالية</div>
              </div>
              <div className="stat-card logged">
                <div className="stat-icon">📅</div>
                <div className="stat-value">{stats.daysWithData || 0}/{stats.totalDays || days}</div>
                <div className="stat-label">أيام مسجلة</div>
              </div>
              <div className="stat-card avg-cal">
                <div className="stat-icon">⚡</div>
                <div className="stat-value">{Math.round(macroAvg.calories || 0)}</div>
                <div className="stat-label">متوسط السعرات</div>
              </div>
              <div className="stat-card avg-water">
                <div className="stat-icon">💧</div>
                <div className="stat-value">{Math.round(macroAvg.water || 0)}</div>
                <div className="stat-label">متوسط الأكواب</div>
              </div>
            </div>

            <div className="two-col">
              <div className="card">
                <div className="card-title">📈 السعرات اليومية</div>
                {dailyCalories.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>لا توجد بيانات بعد</div>
                ) : (
                  <div className="chart-bars">
                    {dailyCalories.map((d, i) => {
                      const cal = d.calories || 0;
                      const frac = maxVal > 0 ? Math.max(cal / maxVal, 0.02) : 0.02;
                      const dt = d.date ? new Date(d.date) : null;
                      const label = dt ? DAY_NAMES[dt.getDay()] : '';
                      const cls = cal === 0 ? 'empty' : cal > goals.calories ? 'over' : 'under';
                      return (
                        <div className="chart-bar-col" key={i}>
                          <div className={`chart-bar ${cls}`} style={{ height: `${frac * 100}%` }} title={`${cal} سعرة`} />
                          <div className="chart-bar-label">{label}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-title">💪 متوسط المغذيات</div>
                {[
                  ['protein', 'البروتين', 'var(--protein-color)'],
                  ['carbs', 'الكربوهيدرات', 'var(--carbs-color)'],
                  ['fat', 'الدهون', 'var(--fat-color)'],
                ].map(([key, label, color]) => {
                  const val = Math.round(macroAvg[key] || 0);
                  const goal = goals[key];
                  const pct = goal > 0 ? Math.min((val / goal) * 100, 100) : 0;
                  return (
                    <div className="macro-avg-row" key={key}>
                      <div className="macro-avg-header">
                        <span>{label}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{val} / {goal}</span>
                      </div>
                      <div className="macro-avg-bar-bg">
                        <div className="macro-avg-bar-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <div className="card-title">🏆 الأطعمة الأكثر تكراراً</div>
              {topFoods.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>لا توجد بيانات بعد</div>
              ) : (
                topFoods.map((f, i) => (
                  <div className="top-food-row" key={i}>
                    <div className="top-food-medal">{MEDALS[i] || i + 1}</div>
                    <div className="top-food-name">{f.name}</div>
                    <div className="top-food-count">{f.count} مرة</div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
