/**
 * app.js - Main dashboard application logic
 */

// ── Goals (from user profile, fallback to defaults) ───────────────────────────
function loadGoals() {
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
const GOALS = loadGoals();
const ML_PER_CUP = 250;
const MEAL_TYPES = ['فطور', 'غداء', 'عشاء', 'سناك'];
const MEAL_ICONS = { فطور: '🌅', غداء: '☀️', عشاء: '🌙', سناك: '🍎' };
const RING_CIRCUMFERENCE = 2 * Math.PI * 85; // ~534

// ── State ─────────────────────────────────────────────────────────────────────
let state = {
  meals: { فطور: [], غداء: [], عشاء: [], سناك: [] },
  water: 0,
  todayDate: getTodayString(),
};

let allFoods = [];
let currentMealType = null;
let selectedFood = null;
let aiResults = null;
let saveDebounceTimer = null;

// ── Initialization ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  const user = getUser();
  if (user) {
    document.getElementById('navUserName').textContent = user.name || 'المستخدم';
  }

  setArabicDate();
  renderWaterCups();
  renderMealSkeletons();

  // Show personalized goals
  const ringGoal = document.getElementById('ringGoal');
  const goalCal = document.getElementById('goalCal');
  if (ringGoal) ringGoal.textContent = `من ${GOALS.calories}`;
  if (goalCal) goalCal.textContent = GOALS.calories;
  const gProtein = document.getElementById('goalProtein');
  const gCarbs = document.getElementById('goalCarbs');
  const gFat = document.getElementById('goalFat');
  if (gProtein) gProtein.textContent = GOALS.protein;
  if (gCarbs) gCarbs.textContent = GOALS.carbs;
  if (gFat) gFat.textContent = GOALS.fat;

  // Load today's data from backend
  try {
    const logData = await apiGetLog(state.todayDate);
    if (logData) {
      state.meals = {
        فطور: logData.meals?.فطور || [],
        غداء: logData.meals?.غداء || [],
        عشاء: logData.meals?.عشاء || [],
        سناك: logData.meals?.سناك || [],
      };
      state.water = logData.water || 0;
    }
  } catch (err) {
    console.warn('Could not load log:', err.message);
  }
  renderMeals();

  // Load foods for local search
  try {
    const foodData = await apiGetAllFoods();
    allFoods = foodData.foods || [];
  } catch {
    // Use hardcoded fallback
    allFoods = getSaudiFoodsFallback();
  }

  updateUI();
});

// ── Date helpers ──────────────────────────────────────────────────────────────
function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function setArabicDate() {
  const now = new Date();
  const arabicDate = now.toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const el = document.getElementById('todayDate');
  if (el) el.textContent = arabicDate;
}

// ── Calculate totals ──────────────────────────────────────────────────────────
function calculateTotals() {
  let calories = 0, protein = 0, carbs = 0, fat = 0;
  for (const mealItems of Object.values(state.meals)) {
    for (const item of mealItems) {
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
}

// ── Render calorie ring ───────────────────────────────────────────────────────
function updateCalorieRing(consumed) {
  const ring = document.getElementById('calorieRing');
  const ringCal = document.getElementById('ringCalories');
  const remaining = document.getElementById('remainingCal');
  const consumed_ = document.getElementById('consumedCal');

  if (!ring) return;

  const pct = Math.min(consumed / GOALS.calories, 1);
  const offset = RING_CIRCUMFERENCE - pct * RING_CIRCUMFERENCE;

  ring.style.strokeDasharray = RING_CIRCUMFERENCE;
  ring.style.strokeDashoffset = offset;
  ring.classList.toggle('over-limit', consumed > GOALS.calories);

  ringCal.textContent = consumed;
  if (consumed_) consumed_.textContent = consumed;
  if (remaining) remaining.textContent = Math.max(0, GOALS.calories - consumed);
}

// ── Render macro bars ─────────────────────────────────────────────────────────
function updateMacros(protein, carbs, fat) {
  const update = (valId, barId, value, goal) => {
    const valEl = document.getElementById(valId);
    const barEl = document.getElementById(barId);
    if (valEl) valEl.textContent = value;
    if (barEl) barEl.style.width = Math.min((value / goal) * 100, 100) + '%';
  };
  update('proteinVal', 'proteinBar', protein, GOALS.protein);
  update('carbsVal', 'carbsBar', carbs, GOALS.carbs);
  update('fatVal', 'fatBar', fat, GOALS.fat);
}

// ── Render water cups ─────────────────────────────────────────────────────────
function renderWaterCups() {
  const container = document.getElementById('waterCups');
  if (!container) return;

  container.innerHTML = '';
  for (let i = 0; i < GOALS.water; i++) {
    const filled = i < state.water;
    const cup = document.createElement('div');
    cup.className = `water-cup ${filled ? 'filled' : ''}`;
    cup.title = `كوب ${i + 1}`;
    cup.onclick = () => {
      state.water = i < state.water ? i : i + 1;
      renderWaterCups();
      updateWaterDisplay();
      scheduleSave();
    };
    cup.innerHTML = `
      <svg viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 10 L6 46 H34 L32 10 Z" fill="${filled ? '#3498db' : 'rgba(255,255,255,0.1)'}" stroke="${filled ? '#2980b9' : 'rgba(255,255,255,0.2)'}" stroke-width="2" rx="2"/>
        <path d="M8 10 L32 10" stroke="${filled ? '#5dade2' : 'rgba(255,255,255,0.15)'}" stroke-width="2"/>
        ${filled ? '<path d="M10 32 Q20 26 30 32" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" fill="none"/>' : ''}
      </svg>`;
    container.appendChild(cup);
  }
}

function updateWaterDisplay() {
  const ml = document.getElementById('waterMl');
  const cupsLabel = document.getElementById('waterCupsLabel');
  if (ml) ml.textContent = `${state.water * ML_PER_CUP} مل`;
  if (cupsLabel) cupsLabel.textContent = `${state.water} / ${GOALS.water} أكواب`;
}

function updateWater(delta) {
  state.water = Math.max(0, Math.min(GOALS.water, state.water + delta));
  renderWaterCups();
  updateWaterDisplay();
  scheduleSave();
}

// ── Skeleton loader for meal cards while data loads ───────────────────────────
function renderMealSkeletons() {
  const grid = document.getElementById('mealsGrid');
  if (!grid) return;
  grid.innerHTML = MEAL_TYPES.map((mealType) => `
    <div class="meal-card" style="animation-delay:${MEAL_TYPES.indexOf(mealType) * 80}ms">
      <div class="meal-header" style="cursor:default">
        <div class="meal-title">
          <span class="meal-icon">${MEAL_ICONS[mealType]}</span>
          <span class="meal-name">${mealType}</span>
        </div>
        <div class="meal-actions">
          <span class="meal-cal-badge">— سعرة</span>
        </div>
      </div>
      <div class="meal-body open">
        <div class="skeleton-meal-body">
          <div class="skeleton-line full"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
    </div>`).join('');
}

// ── Render meal sections ──────────────────────────────────────────────────────
function renderMeals() {
  const grid = document.getElementById('mealsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  for (const mealType of MEAL_TYPES) {
    const items = state.meals[mealType] || [];
    const mealCal = items.reduce((s, i) => s + (i.calories || 0), 0);

    const card = document.createElement('div');
    card.className = 'meal-card';
    card.id = `meal-card-${mealType}`;

    card.innerHTML = `
      <div class="meal-header" onclick="toggleMeal('${mealType}')">
        <div class="meal-title">
          <span class="meal-icon">${MEAL_ICONS[mealType]}</span>
          <span class="meal-name">${mealType}</span>
        </div>
        <div class="meal-actions">
          <span class="meal-cal-badge">${Math.round(mealCal)} سعرة</span>
          <button class="add-food-btn" onclick="openAddFood(event, '${mealType}')">+</button>
          <span class="chevron" id="chevron-${mealType}">▼</span>
        </div>
      </div>
      <div class="meal-body" id="meal-body-${mealType}">
        <div class="meal-body-inner" id="meal-items-${mealType}">
          ${renderMealItems(mealType)}
        </div>
      </div>`;

    grid.appendChild(card);
  }
}

function renderMealItems(mealType) {
  const items = state.meals[mealType] || [];
  if (items.length === 0) {
    return `<div class="empty-meal">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2m0 14v2M5 12H3m18 0h-2M7.05 7.05 5.636 5.636m12.728 12.728L16.95 16.95M7.05 16.95l-1.414 1.414M18.364 5.636 16.95 7.05"/>
        <circle cx="12" cy="12" r="4"/>
      </svg>
      <p>لا توجد وجبات بعد</p>
      <button class="empty-meal-btn" onclick="openAddFood({stopPropagation:()=>{}}, '${mealType}')">+ إضافة طعام</button>
    </div>`;
  }

  return items
    .map(
      (item, index) => `
    <div class="food-item${index === items.length - 1 ? ' food-item-new' : ''}">
      <div class="food-item-info">
        <div class="food-item-name">${item.name}</div>
        <div class="food-item-meta">
          ${item.grams ? item.grams + 'g · ' : ''}بروتين ${item.protein}g · كارب ${item.carbs}g · دهون ${item.fat}g${item.fiber ? ' · ألياف ' + item.fiber + 'g' : ''}
        </div>
      </div>
      <div class="food-item-cal">${Math.round(item.calories)} س.ح</div>
      <button class="remove-food-btn" onclick="removeFood('${mealType}', ${index})" title="حذف">✕</button>
    </div>`
    )
    .join('');
}

function toggleMeal(mealType) {
  const body = document.getElementById(`meal-body-${mealType}`);
  const chevron = document.getElementById(`chevron-${mealType}`);
  if (!body) return;
  const isOpen = body.classList.toggle('open');
  if (chevron) chevron.style.transform = isOpen ? 'rotate(180deg)' : '';
}

// ── Add/Remove food ───────────────────────────────────────────────────────────
function openAddFood(event, mealType) {
  event.stopPropagation();
  currentMealType = mealType;
  selectedFood = null;

  document.getElementById('modalTitle').textContent = `إضافة طعام — ${mealType}`;
  document.getElementById('foodSearchInput').value = '';
  document.getElementById('quantityInput').value = '100';
  document.getElementById('modalFooter').classList.remove('visible');
  document.getElementById('selectedFoodInfo').textContent = '';

  renderFoodResults(allFoods.slice(0, 25));

  document.getElementById('foodModal').classList.add('open');
  setTimeout(() => document.getElementById('foodSearchInput').focus(), 100);
}

function closeModal() {
  document.getElementById('foodModal').classList.remove('open');
  selectedFood = null;
  currentMealType = null;
}

// Close modal on overlay click
document.getElementById('foodModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('foodModal')) closeModal();
});

// Escape key closes any open modal
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (document.getElementById('foodModal')?.classList.contains('open'))  closeModal();
  if (document.getElementById('goalsModal')?.classList.contains('open')) closeGoalsModal();
});

let _searchDebounceTimer = null;
function searchFoods(query) {
  clearTimeout(_searchDebounceTimer);
  const container = document.getElementById('modalResults');
  if (container && query.trim()) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:24px;font-size:14px;">جارٍ البحث...</div>';
  }
  _searchDebounceTimer = setTimeout(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      renderFoodResults(allFoods.slice(0, 25));
      return;
    }
    const results = allFoods.filter(
      (f) =>
        f.name.includes(query.trim()) ||
        (f.nameEn && f.nameEn.toLowerCase().includes(q)) ||
        (f.category && f.category.includes(query.trim()))
    );
    renderFoodResults(results);
  }, 300);
}

// Returns per-serving calories for display in results list
function servingCalories(food) {
  const grams = food.servingWeight || 100;
  return Math.round((food.calories * grams) / 100);
}

function renderFoodResults(foods) {
  const container = document.getElementById('modalResults');
  if (!container) return;

  if (foods.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px 24px;font-size:14px;">🔍<br><br>لا توجد نتائج<br><span style="font-size:12px">جرب كلمة مختلفة</span></div>';
    return;
  }

  container.innerHTML = foods
    .map(
      (food) => `
    <div class="food-result-item ${selectedFood && selectedFood.id === food.id ? 'selected' : ''}" onclick="selectFood('${food.id}')">
      <div class="food-result-info">
        <div class="food-result-name">${food.name}</div>
        <div class="food-result-meta">${food.serving} · بروتين ${Math.round(food.protein * (food.servingWeight||100)/100)}g · كارب ${Math.round(food.carbs * (food.servingWeight||100)/100)}g · دهون ${Math.round(food.fat * (food.servingWeight||100)/100)}g</div>
      </div>
      <div class="food-result-cal">${servingCalories(food)} س.ح</div>
    </div>`
    )
    .join('');
}

function selectFood(foodId) {
  selectedFood = allFoods.find((f) => f.id === foodId);
  if (!selectedFood) return;

  // Default to serving weight
  document.getElementById('quantityInput').value = selectedFood.servingWeight || 100;

  document.querySelectorAll('.food-result-item').forEach((el) => el.classList.remove('selected'));
  document.querySelectorAll('.food-result-item').forEach((el) => {
    if (el.querySelector('.food-result-name').textContent === selectedFood.name) {
      el.classList.add('selected');
    }
  });

  document.getElementById('modalFooter').classList.add('visible');
  updateQuantityCalc();
}

// All values stored per 100g — multiply by (grams / 100)
function calcForGrams(food, grams) {
  const r = (v) => Math.round((v * grams) / 100);
  return {
    calories: r(food.calories),
    protein:  r(food.protein),
    carbs:    r(food.carbs),
    fat:      r(food.fat),
    sugar:    r(food.sugar  || 0),
    fiber:    r(food.fiber  || 0),
  };
}

function updateQuantityCalc() {
  if (!selectedFood) return;
  const grams = parseFloat(document.getElementById('quantityInput').value) || 100;
  const n = calcForGrams(selectedFood, grams);
  document.getElementById('selectedFoodInfo').innerHTML =
    `<strong>${selectedFood.name}</strong> (${grams}g) · <strong style="color:var(--accent)">${n.calories}</strong> سعرة
    <span style="margin-right:8px;font-size:12px">
      بروتين ${n.protein}g · كارب ${n.carbs}g · دهون ${n.fat}g
      ${n.fiber ? ' · ألياف ' + n.fiber + 'g' : ''}
    </span>`;
}

function confirmAddFood() {
  if (!selectedFood || !currentMealType) return;

  const grams = parseFloat(document.getElementById('quantityInput').value) || 100;
  if (grams <= 0) {
    showToast('يرجى إدخال كمية صحيحة', 'error');
    return;
  }

  const n = calcForGrams(selectedFood, grams);

  const newItem = {
    id: selectedFood.id,
    name: selectedFood.name,
    calories: n.calories,
    protein:  n.protein,
    carbs:    n.carbs,
    fat:      n.fat,
    sugar:    n.sugar,
    fiber:    n.fiber,
    grams,
    serving: `${grams}g`,
    addedAt: new Date().toISOString(),
  };

  if (!state.meals[currentMealType]) state.meals[currentMealType] = [];
  state.meals[currentMealType].push(newItem);

  closeModal();
  updateUI();
  scheduleSave();
  showToast(`تمت إضافة ${selectedFood.name}`, 'success');

  const body = document.getElementById(`meal-body-${currentMealType}`);
  if (body && !body.classList.contains('open')) {
    toggleMeal(currentMealType);
  }
}

function removeFood(mealType, index) {
  if (!state.meals[mealType]) return;
  const removed = state.meals[mealType].splice(index, 1);
  if (removed.length) showToast(`تم حذف ${removed[0].name}`, 'info');
  updateUI();
  scheduleSave();
}

// ── AI Image Analysis ─────────────────────────────────────────────────────────
async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('يرجى اختيار ملف صورة', 'error');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showToast('حجم الصورة كبير جداً (الحد الأقصى 10MB)', 'error');
    return;
  }

  // Show loading
  document.getElementById('aiLoading').style.display = 'block';
  document.getElementById('aiResults').style.display = 'none';
  document.getElementById('aiDropArea').style.display = 'none';

  try {
    // Convert to base64
    const base64 = await fileToBase64(file);
    const mimeType = file.type;

    const result = await apiAnalyzeImage(base64, mimeType);
    aiResults = result;

    displayAIResults(result);
    showToast('تم تحليل الصورة بنجاح', 'success');
  } catch (err) {
    showToast(err.message || 'فشل تحليل الصورة', 'error');
    document.getElementById('aiDropArea').style.display = 'block';
  } finally {
    document.getElementById('aiLoading').style.display = 'none';
    // Reset file input
    event.target.value = '';
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Strip data URL prefix (data:image/jpeg;base64,...)
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function displayAIResults(result) {
  const resultsEl = document.getElementById('aiResults');
  const titleEl = document.getElementById('aiResultsTitle');
  const foodsEl = document.getElementById('aiResultsFoods');

  if (!resultsEl || !titleEl || !foodsEl) return;

  titleEl.textContent = `نتائج التحليل · إجمالي: ${result.totalCalories} سعرة حرارية`;

  foodsEl.innerHTML = result.foods
    .map(
      (food) => `
    <div class="ai-food-item">
      <div>
        <div class="ai-food-name">${food.name}</div>
        <div class="ai-food-macros">
          ${food.quantity ? food.quantity + ' · ' : ''}
          بروتين ${food.protein}g · كارب ${food.carbs}g · دهون ${food.fat}g
        </div>
      </div>
      <div class="ai-food-cal">${food.calories} س.ح</div>
    </div>`
    )
    .join('');

  if (result.message) {
    foodsEl.innerHTML += `<div style="font-size:13px;color:var(--text-muted);margin-top:8px;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:8px;">${result.message}</div>`;
  }

  resultsEl.style.display = 'block';

  // Add "analyze another" button
  const dropArea = document.getElementById('aiDropArea');
  dropArea.innerHTML = `
    <div class="ai-upload-icon">✅</div>
    <div class="ai-upload-text">تم التحليل بنجاح</div>
    <button class="ai-upload-btn" type="button" onclick="resetAISection()">
      <span>📷</span> تحليل صورة أخرى
    </button>`;
  dropArea.style.display = 'block';
}

function resetAISection() {
  aiResults = null;
  document.getElementById('aiResults').style.display = 'none';
  const dropArea = document.getElementById('aiDropArea');
  dropArea.innerHTML = `
    <div class="ai-upload-icon">📸</div>
    <div class="ai-upload-text">التقط صورة لطعامك</div>
    <div class="ai-upload-hint">سيقوم الذكاء الاصطناعي بتحليل السعرات والمغذيات تلقائياً</div>
    <button class="ai-upload-btn" type="button">
      <span>📷</span> رفع صورة
    </button>`;
  dropArea.onclick = () => document.getElementById('aiFileInput').click();
  dropArea.style.display = 'block';
}

function addAIResultsToMeal() {
  if (!aiResults || !aiResults.foods || aiResults.foods.length === 0) {
    showToast('لا توجد أطعمة لإضافتها', 'error');
    return;
  }

  const mealType = document.getElementById('aiMealSelect').value;
  if (!state.meals[mealType]) state.meals[mealType] = [];

  let added = 0;
  for (const food of aiResults.foods) {
    state.meals[mealType].push({
      name: food.name,
      calories: food.calories || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fat: food.fat || 0,
      quantity: 1,
      addedAt: new Date().toISOString(),
    });
    added++;
  }

  updateUI();
  scheduleSave();
  showToast(`تمت إضافة ${added} عنصر إلى ${mealType}`, 'success');

  // Open the meal
  const body = document.getElementById(`meal-body-${mealType}`);
  if (body && !body.classList.contains('open')) toggleMeal(mealType);
}

// ── Update all UI ─────────────────────────────────────────────────────────────
function updateUI() {
  const totals = calculateTotals();
  updateCalorieRing(totals.calories);
  updateMacros(totals.protein, totals.carbs, totals.fat);
  updateWaterDisplay();
  renderWaterCups();
  renderMeals();
}

// ── Auto-save (debounced) ─────────────────────────────────────────────────────
function scheduleSave() {
  clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(async () => {
    try {
      await apiSaveLog(state.todayDate, state.meals, state.water);
    } catch (err) {
      console.warn('Auto-save failed:', err.message);
    }
  }, 1000);
}

// ── Toast notifications ───────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ── Goals Modal ───────────────────────────────────────────────────────────────
const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 };
let editingWater = 8;

function openGoalsModal() {
  const cal = GOALS.calories;
  editingWater = GOALS.water;

  document.getElementById('goalCalInput').value = cal;
  document.getElementById('waterGoalVal').textContent = editingWater;

  // Populate from current GOALS
  _setMacroFields('protein', GOALS.protein, cal);
  _setMacroFields('carbs',   GOALS.carbs,   cal);
  _setMacroFields('fat',     GOALS.fat,     cal);

  _updatePctTotal();
  _updateMacroBars();
  document.getElementById('goalsModal').classList.add('open');
}

function closeGoalsModal() {
  document.getElementById('goalsModal').classList.remove('open');
}

document.getElementById('goalsModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('goalsModal')) closeGoalsModal();
});

// Given grams, set both % and g fields and kcal label
function _setMacroFields(macro, grams, calories) {
  const pct = calories > 0 ? Math.round((grams * KCAL_PER_G[macro] / calories) * 100) : 0;
  document.getElementById(`${macro}G`).value   = grams;
  document.getElementById(`${macro}Pct`).value = pct;
  _updateKcalLabel(macro, grams);
}

function _updateKcalLabel(macro, grams) {
  const kcal = Math.round(grams * KCAL_PER_G[macro]);
  document.getElementById(`${macro}Kcal`).textContent = `${kcal} س.ح`;
}

function _updateMacroBars() {
  const total = _getTotalPct();
  ['protein', 'carbs', 'fat'].forEach((m) => {
    const pct = parseInt(document.getElementById(`${m}Pct`).value) || 0;
    const barPct = total > 0 ? Math.round((pct / total) * 100) : 0;
    document.getElementById(`${m}EditBar`).style.width = `${Math.min(barPct, 100)}%`;
  });
}

function _getTotalPct() {
  return ['protein', 'carbs', 'fat'].reduce(
    (s, m) => s + (parseInt(document.getElementById(`${m}Pct`).value) || 0), 0
  );
}

function _updatePctTotal() {
  const total = _getTotalPct();
  const row   = document.getElementById('pctTotalRow');
  const text  = document.getElementById('pctTotalText');
  const icon  = document.getElementById('pctTotalIcon');
  const btn   = document.getElementById('saveGoalsBtn');

  text.textContent = `المجموع: ${total}%`;

  const diff = Math.abs(total - 100);
  if (diff === 0) {
    row.className = 'pct-total-row ok';
    icon.textContent = '✓';
    btn.disabled = false;
  } else if (diff <= 5) {
    row.className = 'pct-total-row warn';
    icon.textContent = `(${total > 100 ? '+' : ''}${total - 100})`;
    btn.disabled = false;
  } else {
    row.className = 'pct-total-row error';
    icon.textContent = `يجب أن يساوي 100%`;
    btn.disabled = true;
  }
}

// User changed % → recalculate grams
function onPctChange(macro) {
  const cal = parseInt(document.getElementById('goalCalInput').value) || GOALS.calories;
  const pct = parseInt(document.getElementById(`${macro}Pct`).value) || 0;
  const grams = Math.round((pct / 100 * cal) / KCAL_PER_G[macro]);
  document.getElementById(`${macro}G`).value = grams;
  _updateKcalLabel(macro, grams);
  _updatePctTotal();
  _updateMacroBars();
}

// User changed grams → recalculate %
function onGramsChange(macro) {
  const cal   = parseInt(document.getElementById('goalCalInput').value) || GOALS.calories;
  const grams = parseInt(document.getElementById(`${macro}G`).value)   || 0;
  const pct   = cal > 0 ? Math.round((grams * KCAL_PER_G[macro] / cal) * 100) : 0;
  document.getElementById(`${macro}Pct`).value = pct;
  _updateKcalLabel(macro, grams);
  _updatePctTotal();
  _updateMacroBars();
}

// User changed calorie target → recalculate all grams from current %
function onCaloriesChange() {
  const cal = parseInt(document.getElementById('goalCalInput').value) || 0;
  ['protein', 'carbs', 'fat'].forEach((m) => {
    const pct   = parseInt(document.getElementById(`${m}Pct`).value) || 0;
    const grams = Math.round((pct / 100 * cal) / KCAL_PER_G[m]);
    document.getElementById(`${m}G`).value = grams;
    _updateKcalLabel(m, grams);
  });
  _updatePctTotal();
  _updateMacroBars();
}

function changeWaterGoal(delta) {
  editingWater = Math.max(1, Math.min(20, editingWater + delta));
  document.getElementById('waterGoalVal').textContent = editingWater;
}

// Reset to originally calculated goals (from profile page)
function resetToAutoGoals() {
  const user = getUser();
  const profile = user?.profile;
  if (!profile) { showToast('لا يوجد بيانات جسدية محفوظة — أعد تعبئة الملف الشخصي', 'error'); return; }

  const { gender, age, weight, height, activityLevel, goal } = profile;
  const bmr = gender === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;

  const multipliers = { sedentary:1.2, light:1.375, moderate:1.55, active:1.725, veryActive:1.9 };
  const adjustments = { lose:-500, maintain:0, gain:300 };
  const tdee = Math.round(bmr * (multipliers[activityLevel] || 1.55));
  const cal  = Math.max(1200, tdee + (adjustments[goal] || 0));

  document.getElementById('goalCalInput').value = cal;
  editingWater = 8;
  document.getElementById('waterGoalVal').textContent = 8;

  _setMacroFields('protein', Math.round(cal * 0.30 / 4), cal);
  _setMacroFields('carbs',   Math.round(cal * 0.40 / 4), cal);
  _setMacroFields('fat',     Math.round(cal * 0.30 / 9), cal);
  _updatePctTotal();
  _updateMacroBars();
  showToast('تمت إعادة الأهداف للقيم المحسوبة', 'info');
}

async function saveGoals() {
  const btn = document.getElementById('saveGoalsBtn');
  const cal     = parseInt(document.getElementById('goalCalInput').value);
  const protein = parseInt(document.getElementById('proteinG').value);
  const carbs   = parseInt(document.getElementById('carbsG').value);
  const fat     = parseInt(document.getElementById('fatG').value);
  const water   = editingWater;

  if (!cal || cal < 500) { showToast('السعرات يجب أن تكون 500 على الأقل', 'error'); return; }

  btn.disabled = true;
  btn.textContent = 'جارٍ الحفظ...';

  try {
    const data = await apiUpdateGoals(cal, protein, carbs, fat, water);

    // Update GOALS in memory
    Object.assign(GOALS, { calories: cal, protein, carbs, fat, water });

    // Update localStorage
    const user = getUser();
    if (user) {
      user.goals = { ...user.goals, ...data.goals };
      localStorage.setItem('layaqtek_user', JSON.stringify(user));
    }

    // Refresh dashboard display
    const ringGoal = document.getElementById('ringGoal');
    const goalCal  = document.getElementById('goalCal');
    if (ringGoal) ringGoal.textContent = `من ${cal}`;
    if (goalCal)  goalCal.textContent  = cal;
    const gP = document.getElementById('goalProtein');
    const gC = document.getElementById('goalCarbs');
    const gF = document.getElementById('goalFat');
    if (gP) gP.textContent = protein;
    if (gC) gC.textContent = carbs;
    if (gF) gF.textContent = fat;

    updateUI();
    closeGoalsModal();
    showToast('✓ تم حفظ الأهداف بنجاح', 'success');
  } catch (err) {
    showToast(err.message || 'حدث خطأ أثناء الحفظ', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'حفظ الأهداف';
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────
function logout() {
  clearAuth();
  window.location.href = 'login.html';
}

// ── Saudi food fallback (used if backend is unavailable) ──────────────────────
function getSaudiFoodsFallback() {
  return [
    { id: 1, name: "كبسة دجاج", nameEn: "Kabsa Chicken", calories: 520, protein: 35, carbs: 60, fat: 14, serving: "طبق (400g)" },
    { id: 2, name: "مندي لحم", nameEn: "Mandi Lamb", calories: 650, protein: 42, carbs: 58, fat: 22, serving: "طبق (450g)" },
    { id: 3, name: "شاورما دجاج", nameEn: "Chicken Shawarma", calories: 380, protein: 28, carbs: 35, fat: 14, serving: "ساندويش (250g)" },
    { id: 4, name: "فول مدمس", nameEn: "Ful Medames", calories: 190, protein: 13, carbs: 28, fat: 4, serving: "كوب (180g)" },
    { id: 5, name: "حمص بطحينة", nameEn: "Hummus", calories: 166, protein: 8, carbs: 18, fat: 8, serving: "كوب (120g)" },
    { id: 6, name: "تمر مجدول", nameEn: "Medjool Dates", calories: 277, protein: 2, carbs: 75, fat: 0, serving: "100g (4-5 حبات)" },
    { id: 7, name: "خبز أبيض", nameEn: "White Bread", calories: 265, protein: 9, carbs: 51, fat: 3, serving: "رغيف (100g)" },
    { id: 8, name: "أرز أبيض", nameEn: "White Rice", calories: 206, protein: 4, carbs: 45, fat: 0, serving: "كوب مطبوخ (186g)" },
    { id: 9, name: "بيض مسلوق", nameEn: "Boiled Egg", calories: 155, protein: 13, carbs: 1, fat: 11, serving: "بيضتان (100g)" },
    { id: 10, name: "سمك مشوي", nameEn: "Grilled Fish", calories: 206, protein: 30, carbs: 0, fat: 9, serving: "قطعة (200g)" },
    { id: 11, name: "سلطة خضراء", nameEn: "Green Salad", calories: 45, protein: 2, carbs: 8, fat: 1, serving: "طبق (150g)" },
    { id: 12, name: "هريسة", nameEn: "Harees", calories: 320, protein: 18, carbs: 45, fat: 7, serving: "طبق (300g)" },
    { id: 13, name: "سمبوسة لحم", nameEn: "Samboosa", calories: 180, protein: 8, carbs: 20, fat: 8, serving: "قطعة (80g)" },
    { id: 14, name: "لبن (زبادي)", nameEn: "Yogurt", calories: 100, protein: 9, carbs: 11, fat: 3, serving: "كوب (245g)" },
    { id: 15, name: "شاي بالحليب", nameEn: "Milk Tea", calories: 90, protein: 3, carbs: 14, fat: 3, serving: "كوب (240ml)" },
    { id: 16, name: "قهوة عربية", nameEn: "Arabic Coffee", calories: 15, protein: 0, carbs: 3, fat: 0, serving: "فنجان (100ml)" },
    { id: 17, name: "جريش", nameEn: "Jareesh", calories: 290, protein: 10, carbs: 52, fat: 5, serving: "طبق (250g)" },
    { id: 18, name: "مرقوق", nameEn: "Marqooq", calories: 410, protein: 22, carbs: 48, fat: 14, serving: "طبق (350g)" },
    { id: 19, name: "مطبق", nameEn: "Mutabbaq", calories: 450, protein: 18, carbs: 55, fat: 18, serving: "قطعة (200g)" },
    { id: 20, name: "كنافة", nameEn: "Kunafa", calories: 380, protein: 8, carbs: 55, fat: 16, serving: "قطعة (150g)" },
  ];
}
