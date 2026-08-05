import { useEffect, useMemo, useState } from 'react';
import { apiUpdateGoals, updateStoredUser } from '../api';
import { KCAL_PER_G } from '../utils/goals';

const MACROS = [
  ['protein', 'var(--protein-color)', 'البروتين'],
  ['carbs', 'var(--carbs-color)', 'الكربوهيدرات'],
  ['fat', 'var(--fat-color)', 'الدهون'],
];

export default function GoalsModal({ goals, onClose, onSaved }) {
  const [calories, setCalories] = useState(goals.calories);
  const [pct, setPct] = useState({});
  const [grams, setGrams] = useState({ protein: goals.protein, carbs: goals.carbs, fat: goals.fat });
  const [water, setWater] = useState(goals.water);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
    function onEsc(e) { if (e.key === 'Escape') onClose(); }
  }, [onClose]);

  useEffect(() => {
    const g = { protein: goals.protein, carbs: goals.carbs, fat: goals.fat };
    setGrams(g);
    setPct(gramsToPct(g, goals.calories));
  }, [goals]);

  function gramsToPct(g, cal) {
    const out = {};
    for (const [m] of MACROS) {
      out[m] = cal > 0 ? Math.round(((g[m] * KCAL_PER_G[m]) / cal) * 100) : 0;
    }
    return out;
  }

  function onPctChange(macro, value) {
    const v = Math.max(0, Math.min(100, Number(value) || 0));
    const newPct = { ...pct, [macro]: v };
    setPct(newPct);
    setGrams((g) => ({ ...g, [macro]: Math.round((v / 100 * calories) / KCAL_PER_G[macro]) }));
  }

  function onGramsChange(macro, value) {
    const v = Math.max(0, Number(value) || 0);
    setGrams((g) => ({ ...g, [macro]: v }));
    setPct((p) => ({
      ...p,
      [macro]: calories > 0 ? Math.round(((v * KCAL_PER_G[macro]) / calories) * 100) : 0,
    }));
  }

  function onCaloriesChange(value) {
    const cal = Number(value) || 0;
    setCalories(cal);
    setGrams((g) => {
      const next = {};
      for (const [m] of MACROS) {
        next[m] = Math.round(((pct[m] || 0) / 100 * cal) / KCAL_PER_G[m]);
      }
      return next;
    });
  }

  function resetToAuto() {
    // Requires the user's profile — fall back to a 30/40/30 split of current calories if unavailable.
    const cal = calories || 2000;
    const g = {
      protein: Math.round((cal * 0.3) / 4),
      carbs: Math.round((cal * 0.4) / 4),
      fat: Math.round((cal * 0.3) / 9),
    };
    setGrams(g);
    setPct(gramsToPct(g, cal));
    setWater(8);
  }

  const totalPct = useMemo(
    () => (pct.protein || 0) + (pct.carbs || 0) + (pct.fat || 0),
    [pct]
  );
  const diff = Math.abs(100 - totalPct);
  const pctStatus = diff === 0 ? 'ok' : diff <= 5 ? 'warn' : 'error';
  const canSave = diff <= 5 && calories >= 500;

  async function save() {
    setSaving(true);
    try {
      const data = await apiUpdateGoals(calories, grams.protein, grams.carbs, grams.fat, water);
      updateStoredUser({ goals: data.goals });
      onSaved({ calories, protein: grams.protein, carbs: grams.carbs, fat: grams.fat, water });
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal goals-modal">
        <div className="modal-header">
          <div className="modal-title">🎯 تعديل الأهداف اليومية</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-results" style={{ overflowY: 'auto' }}>
          <div className="goals-section">
            <div className="goals-section-title">⚡ الهدف اليومي من السعرات</div>
            <div className="calories-row">
              <input
                className="calories-input"
                type="number"
                min="500"
                max="10000"
                step="50"
                value={calories}
                onChange={(e) => onCaloriesChange(e.target.value)}
              />
              <span className="calories-unit">س.ح / يوم</span>
            </div>
          </div>

          <div className="goals-section">
            <div className="goals-section-title">💪 توزيع الماكروز</div>
            {MACROS.map(([macro, color, label]) => (
              <div className="macro-edit-row" key={macro}>
                <div className="macro-edit-header">
                  <div className="macro-edit-name">
                    <div className="macro-dot" style={{ background: color }} />
                    {label}
                  </div>
                  <span className="macro-edit-kcal">{grams[macro] * KCAL_PER_G[macro]} س.ح</span>
                </div>
                <div className="macro-inputs">
                  <div className="macro-field">
                    <input
                      className="macro-num-input"
                      type="number"
                      min="0" max="100"
                      value={pct[macro] ?? 0}
                      onChange={(e) => onPctChange(macro, e.target.value)}
                    />
                    <span className="macro-field-unit">%</span>
                  </div>
                  <span className="macro-arrow">↔</span>
                  <div className="macro-field">
                    <input
                      className="macro-num-input"
                      type="number"
                      min="0" max="2000"
                      value={grams[macro] ?? 0}
                      onChange={(e) => onGramsChange(macro, e.target.value)}
                    />
                    <span className="macro-field-unit">g</span>
                  </div>
                </div>
                <div className="macro-edit-bar-bg">
                  <div
                    className="macro-edit-bar-fill"
                    style={{ background: color, width: `${Math.min(pct[macro] || 0, 100)}%` }}
                  />
                </div>
              </div>
            ))}

            <div className={`pct-total-row ${pctStatus}`}>
              <span>مجموع النسب</span>
              <span>{totalPct}%</span>
            </div>
          </div>

          <div className="goals-section">
            <div className="goals-section-title">💧 هدف الماء</div>
            <div className="water-stepper">
              <button className="water-step-btn" onClick={() => setWater((w) => Math.max(1, w - 1))}>−</button>
              <span className="water-step-val">{water}</span>
              <span className="water-step-label">أكواب</span>
              <button className="water-step-btn" onClick={() => setWater((w) => Math.min(20, w + 1))}>+</button>
            </div>
          </div>
        </div>

        <div className="goals-actions">
          <button className="reset-goals-btn" onClick={resetToAuto}>↺ إعادة للأصل</button>
          <button className="save-goals-btn" disabled={!canSave || saving} onClick={save}>
            {saving ? 'جارٍ الحفظ...' : 'حفظ الأهداف'}
          </button>
        </div>
      </div>
    </div>
  );
}
