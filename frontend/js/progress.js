/**
 * progress.js — Progress & analytics page logic
 */

if (!isAuthenticated()) {
  window.location.href = 'login.html';
}

let currentDays = 7;

const DAY_NAMES = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];

function getDayName(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return DAY_NAMES[d.getDay()];
}

function getGoals() {
  const user = getUser();
  const g = user?.goals;
  return {
    calories: g?.calories || 2000,
    protein:  g?.protein  || 150,
    carbs:    g?.carbs    || 250,
    fat:      g?.fat      || 65,
    water:    g?.water    || 8,
  };
}

// ── Load & render ─────────────────────────────────────────────────────────────
async function loadStats(days, tabEl) {
  currentDays = days;

  // Update active tab
  document.querySelectorAll('.period-tab').forEach((t) => t.classList.remove('active'));
  if (tabEl) tabEl.classList.add('active');

  const labelMap = { 7: 'آخر 7 أيام', 14: 'آخر 14 يوم', 30: 'آخر 30 يوم' };
  document.getElementById('periodLabel').textContent = labelMap[days] || `آخر ${days} أيام`;

  // Show skeletons
  showSkeletons();

  try {
    const data = await apiGetStats(days);
    renderStats(data);
    renderChart(data.dailyCalories);
    renderMacros(data.macroAvg);
    renderTopFoods(data.topFoods);
  } catch (err) {
    showError(err.message);
  }
}

function showSkeletons() {
  const s = (h) => `<div class="skeleton" style="height:${h}px;border-radius:8px"></div>`;
  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card streak">${s(80)}</div>
    <div class="stat-card logged">${s(80)}</div>
    <div class="stat-card avg-cal">${s(80)}</div>
    <div class="stat-card avg-water">${s(80)}</div>`;
  document.getElementById('calorieChart').innerHTML = s(180);
  document.getElementById('macrosSection').innerHTML = s(180);
  document.getElementById('topFoodsSection').innerHTML = s(160);
}

// ── Summary cards ─────────────────────────────────────────────────────────────
function renderStats(data) {
  const GOALS = getGoals();
  const adherence = data.daysWithData > 0
    ? Math.round((data.daysWithData / currentDays) * 100)
    : 0;

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card streak">
      <div class="stat-icon">🔥</div>
      <div class="stat-value">${data.streak}</div>
      <div class="stat-label">أيام متتالية</div>
      <div class="stat-sub">streak حالي</div>
    </div>
    <div class="stat-card logged">
      <div class="stat-icon">📅</div>
      <div class="stat-value">${data.daysWithData}<span style="font-size:18px;font-weight:500;color:var(--text-muted)">/${currentDays}</span></div>
      <div class="stat-label">أيام مسجّلة</div>
      <div class="stat-sub">${adherence}% التزام</div>
    </div>
    <div class="stat-card avg-cal">
      <div class="stat-icon">⚡</div>
      <div class="stat-value">${data.macroAvg.calories}</div>
      <div class="stat-label">متوسط السعرات</div>
      <div class="stat-sub">الهدف ${GOALS.calories} س.ح</div>
    </div>
    <div class="stat-card avg-water">
      <div class="stat-icon">💧</div>
      <div class="stat-value">${data.macroAvg.water}</div>
      <div class="stat-label">متوسط الماء</div>
      <div class="stat-sub">الهدف ${GOALS.water} أكواب</div>
    </div>`;
}

// ── Daily calories bar chart ──────────────────────────────────────────────────
function renderChart(dailyCalories) {
  if (!dailyCalories || dailyCalories.length === 0) {
    document.getElementById('calorieChart').innerHTML =
      '<div class="chart-empty">لا توجد بيانات بعد</div>';
    return;
  }

  const GOALS = getGoals();
  const goal = GOALS.calories;
  const maxVal = Math.max(goal * 1.3, ...dailyCalories.map((d) => d.calories), 1);
  const goalPct = (goal / maxVal) * 144; // 144 = chart height in px

  // Only show last 7 or 14 for readability, slice if needed
  const slice = dailyCalories.length > 14 ? dailyCalories.slice(-14) : dailyCalories;

  const bars = slice
    .map((day) => {
      const pct = day.calories > 0 ? Math.max((day.calories / maxVal) * 144, 4) : 4;
      const cls = day.calories === 0 ? 'empty' : day.calories > goal * 1.1 ? 'over' : 'under';
      const tip = day.calories > 0 ? `${day.calories} س.ح` : 'لا يوجد';
      return `
        <div class="bar-wrap">
          <div class="bar-cal">${day.calories > 0 ? day.calories : ''}</div>
          <div class="bar ${cls}" style="height:${pct}px" data-tip="${tip}"></div>
          <div class="bar-day">${getDayName(day.date)}</div>
        </div>`;
    })
    .join('');

  document.getElementById('calorieChart').innerHTML = `
    <div class="chart-area">
      <div class="chart-goal-line" style="bottom:${goalPct + 36}px">
        <span class="chart-goal-label">الهدف ${goal}</span>
      </div>
      ${bars}
    </div>
    <div style="text-align:center;margin-top:8px;font-size:12px;color:var(--text-muted)">
      <span style="display:inline-flex;align-items:center;gap:4px;margin-left:12px">
        <span style="width:10px;height:10px;border-radius:2px;background:var(--primary);display:inline-block"></span> ضمن الهدف
      </span>
      <span style="display:inline-flex;align-items:center;gap:4px">
        <span style="width:10px;height:10px;border-radius:2px;background:#dc2626;display:inline-block"></span> تجاوز الهدف
      </span>
    </div>`;
}

// ── Weekly macros ─────────────────────────────────────────────────────────────
function renderMacros(macroAvg) {
  const GOALS = getGoals();

  if (!macroAvg || macroAvg.calories === 0) {
    document.getElementById('macrosSection').innerHTML =
      '<div class="chart-empty">لا توجد بيانات بعد</div>';
    return;
  }

  const macros = [
    { key: 'protein', name: 'البروتين',       color: 'var(--protein-color)', cls: 'protein', goal: GOALS.protein },
    { key: 'carbs',   name: 'الكربوهيدرات',   color: 'var(--carbs-color)',   cls: 'carbs',   goal: GOALS.carbs },
    { key: 'fat',     name: 'الدهون',          color: 'var(--fat-color)',     cls: 'fat',     goal: GOALS.fat },
  ];

  document.getElementById('macrosSection').innerHTML = macros
    .map(({ key, name, cls, goal }) => {
      const val = macroAvg[key] || 0;
      const pct = Math.min(Math.round((val / goal) * 100), 100);
      return `
        <div class="macro-row">
          <div class="macro-header">
            <div class="macro-name">
              <div class="macro-dot" style="background:var(--${cls === 'protein' ? 'protein' : cls === 'carbs' ? 'carbs' : 'fat'}-color)"></div>
              ${name}
            </div>
            <div class="macro-nums"><strong>${val}g</strong> / ${goal}g · ${pct}%</div>
          </div>
          <div class="macro-bar-bg">
            <div class="macro-bar-fill ${cls}" style="width:${pct}%"></div>
          </div>
        </div>`;
    })
    .join('');
}

// ── Top foods ─────────────────────────────────────────────────────────────────
function renderTopFoods(topFoods) {
  if (!topFoods || topFoods.length === 0) {
    document.getElementById('topFoodsSection').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🥗</div>
        <p>لم تسجّل أي وجبات بعد</p>
        <small>ابدأ بتسجيل وجباتك اليومية لترى تحليلك هنا</small>
      </div>`;
    return;
  }

  const maxCount = topFoods[0].count;
  const medals = ['🥇', '🥈', '🥉', '4', '5'];

  document.getElementById('topFoodsSection').innerHTML = topFoods
    .map((food, i) => {
      const pct = Math.round((food.count / maxCount) * 100);
      const isTop = i === 0;
      return `
        <div class="food-rank-item">
          <div class="rank-num ${isTop ? 'top' : ''}">${medals[i]}</div>
          <div class="food-rank-name">${food.name}</div>
          <div class="food-rank-bar-wrap">
            <div class="food-rank-bar-bg">
              <div class="food-rank-bar-fill" style="width:${pct}%"></div>
            </div>
          </div>
          <div class="food-rank-count">${food.count}×</div>
        </div>`;
    })
    .join('');
}

// ── Error state ───────────────────────────────────────────────────────────────
function showError(msg) {
  const errHtml = `
    <div class="empty-state">
      <div class="empty-icon">⚠️</div>
      <p>${msg || 'حدث خطأ أثناء تحميل البيانات'}</p>
    </div>`;
  document.getElementById('statsGrid').innerHTML = errHtml;
  document.getElementById('calorieChart').innerHTML = '';
  document.getElementById('macrosSection').innerHTML = '';
  document.getElementById('topFoodsSection').innerHTML = '';
}

// ── Animate bars on load ──────────────────────────────────────────────────────
function animateBars() {
  document.querySelectorAll('.macro-bar-fill, .food-rank-bar-fill').forEach((el) => {
    const target = el.style.width;
    el.style.width = '0%';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { el.style.width = target; });
    });
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => loadStats(7, document.querySelector('.period-tab.active')));
