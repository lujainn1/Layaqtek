import { useEffect, useMemo, useRef, useState } from 'react';

// Food values stored per 100g — scale by (grams / 100).
function calcForGrams(food, grams) {
  const r = (v) => Math.round(((v || 0) * grams) / 100);
  return {
    calories: r(food.calories),
    protein: r(food.protein),
    carbs: r(food.carbs),
    fat: r(food.fat),
    sugar: r(food.sugar),
    fiber: r(food.fiber),
  };
}

function servingCalories(food) {
  const grams = food.servingWeight || 100;
  return Math.round((food.calories * grams) / 100);
}

export default function FoodModal({ mealType, allFoods, onClose, onConfirm }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [grams, setGrams] = useState(100);
  const searchRef = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();
    function onEsc(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allFoods.slice(0, 25);
    return allFoods.filter(
      (f) =>
        f.name?.includes(query.trim()) ||
        f.nameEn?.toLowerCase().includes(q) ||
        f.category?.includes(query.trim())
    );
  }, [query, allFoods]);

  function selectFood(food) {
    setSelected(food);
    setGrams(food.servingWeight || 100);
  }

  function confirm() {
    if (!selected || grams <= 0) return;
    const n = calcForGrams(selected, grams);
    onConfirm({
      id: selected.id,
      name: selected.name,
      ...n,
      grams,
      serving: `${grams}g`,
      addedAt: new Date().toISOString(),
    });
  }

  const n = selected ? calcForGrams(selected, grams) : null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">إضافة طعام — {mealType}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-search">
          <div className="search-input-wrapper">
            <input
              ref={searchRef}
              className="search-input"
              placeholder="ابحث عن طعام..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
            />
            <span className="search-icon">🔍</span>
          </div>
        </div>

        <div className="modal-results">
          {results.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 24px', fontSize: 14 }}>
              🔍<br /><br />لا توجد نتائج<br />
              <span style={{ fontSize: 12 }}>جرب كلمة مختلفة</span>
            </div>
          ) : (
            results.map((food) => (
              <div
                key={food.id}
                className={`food-result-item ${selected?.id === food.id ? 'selected' : ''}`}
                onClick={() => selectFood(food)}
              >
                <div>
                  <div className="food-result-name">{food.name}</div>
                  <div className="food-result-meta">
                    {food.serving} · بروتين {Math.round((food.protein * (food.servingWeight || 100)) / 100)}g ·
                    {' '}كارب {Math.round((food.carbs * (food.servingWeight || 100)) / 100)}g ·
                    {' '}دهون {Math.round((food.fat * (food.servingWeight || 100)) / 100)}g
                  </div>
                </div>
                <div className="food-result-cal">{servingCalories(food)} س.ح</div>
              </div>
            ))
          )}
        </div>

        {selected && (
          <div className="modal-footer">
            <div className="selected-food-info">
              <strong>{selected.name}</strong> ({grams}g) · <strong style={{ color: 'var(--accent)' }}>{n.calories}</strong> سعرة
              <span style={{ marginRight: 8, fontSize: 12 }}>
                بروتين {n.protein}g · كارب {n.carbs}g · دهون {n.fat}g{n.fiber ? ` · ألياف ${n.fiber}g` : ''}
              </span>
            </div>
            <div className="quantity-row">
              <span className="quantity-label">الكمية:</span>
              <input
                className="quantity-input"
                type="number"
                min="1"
                max="5000"
                value={grams}
                onChange={(e) => setGrams(parseFloat(e.target.value) || 0)}
              />
              <span className="quantity-unit">جرام</span>
            </div>
            <button className="confirm-add-btn" onClick={confirm}>إضافة ✓</button>
          </div>
        )}
      </div>
    </div>
  );
}
