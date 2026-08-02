import { useEffect, useRef, useState } from 'react';

const MEAL_ICONS = { فطور: '🌅', غداء: '☀️', عشاء: '🌙', سناك: '🍎' };

export default function MealCard({ mealType, items, onAdd, onRemove, delay, lastAddedIndex }) {
  const [open, setOpen] = useState(false);
  const prevLen = useRef(items.length);
  useEffect(() => {
    if (items.length > prevLen.current) setOpen(true);
    prevLen.current = items.length;
  }, [items.length]);
  const mealCal = items.reduce((s, i) => s + (i.calories || 0), 0);

  return (
    <div className="meal-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="meal-header" onClick={() => setOpen((o) => !o)}>
        <div className="meal-title">
          <span className="meal-icon">{MEAL_ICONS[mealType]}</span>
          <span className="meal-name">{mealType}</span>
        </div>
        <div className="meal-actions">
          <span className="meal-cal-badge">{Math.round(mealCal)} سعرة</span>
          <button
            className="add-food-btn"
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
          >
            +
          </button>
          <span className={`chevron ${open ? 'open' : ''}`}>▼</span>
        </div>
      </div>
      <div className={`meal-body ${open ? 'open' : ''}`}>
        <div className="meal-body-inner">
          {items.length === 0 ? (
            <div className="empty-meal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2M5 12H3m18 0h-2M7.05 7.05 5.636 5.636m12.728 12.728L16.95 16.95M7.05 16.95l-1.414 1.414M18.364 5.636 16.95 7.05" />
                <circle cx="12" cy="12" r="4" />
              </svg>
              <p>لا توجد وجبات بعد</p>
              <button className="empty-meal-btn" onClick={onAdd}>+ إضافة طعام</button>
            </div>
          ) : (
            items.map((item, i) => (
              <div key={i} className={`food-item ${i === lastAddedIndex ? 'food-item-new' : ''}`}>
                <div className="food-item-info">
                  <div className="food-item-name">{item.name}</div>
                  <div className="food-item-meta">
                    {item.grams ? `${item.grams}g · ` : ''}
                    بروتين {item.protein}g · كارب {item.carbs}g · دهون {item.fat}g
                    {item.fiber ? ` · ألياف ${item.fiber}g` : ''}
                  </div>
                </div>
                <div className="food-item-cal">{Math.round(item.calories)} س.ح</div>
                <button className="remove-food-btn" onClick={() => onRemove(i)} title="حذف">✕</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
