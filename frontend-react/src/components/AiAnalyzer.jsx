import { useRef, useState } from 'react';
import { apiAnalyzeImage } from '../api';

const MEAL_TYPES = ['فطور', 'غداء', 'عشاء', 'سناك'];

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AiAnalyzer({ onAddFoods }) {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [mealType, setMealType] = useState('عشاء');

  async function handleFile(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('حجم الصورة كبير جداً (الحد الأقصى 10MB)');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);
    try {
      const base64 = await fileToBase64(file);
      const data = await apiAnalyzeImage(base64, file.type);
      setResult(data);
    } catch (err) {
      setError(err.message || 'فشل تحليل الصورة');
    } finally {
      setLoading(false);
    }
  }

  function addToMeal() {
    if (!result?.foods?.length) return;
    onAddFoods(mealType, result.foods.map((f) => ({
      name: f.name,
      calories: f.calories || 0,
      protein: f.protein || 0,
      carbs: f.carbs || 0,
      fat: f.fat || 0,
      quantity: 1,
      addedAt: new Date().toISOString(),
    })));
    setResult(null);
  }

  return (
    <div className="ai-section">
      <div className="card ai-card">
        <div className="card-title">🤖 تحليل الطعام بالذكاء الاصطناعي</div>

        {loading ? (
          <div className="ai-loading">
            <div className="ai-loading-spinner" />
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>جارٍ تحليل الصورة...</div>
          </div>
        ) : result ? (
          <div className="ai-upload-area" style={{ cursor: 'default' }}>
            <div className="ai-upload-icon">✅</div>
            <div className="ai-upload-text">تم التحليل بنجاح</div>
            <button className="ai-upload-btn" type="button" onClick={() => fileInputRef.current?.click()}>
              <span>📷</span> تحليل صورة أخرى
            </button>
          </div>
        ) : (
          <div className="ai-upload-area" onClick={() => fileInputRef.current?.click()}>
            <div className="ai-upload-icon">📸</div>
            <div className="ai-upload-text">التقط صورة لطعامك</div>
            <div className="ai-upload-hint">سيقوم الذكاء الاصطناعي بتحليل السعرات والمغذيات تلقائياً</div>
            <button className="ai-upload-btn" type="button">
              <span>📷</span> رفع صورة
            </button>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 12, textAlign: 'center' }}>{error}</div>
        )}

        {result && (
          <div className="ai-results" style={{ marginTop: 20 }}>
            <div className="ai-results-title">
              نتائج التحليل · إجمالي: {result.totalCalories} سعرة حرارية
            </div>
            {result.foods.map((food, i) => (
              <div className="ai-food-item" key={i}>
                <div>
                  <div className="ai-food-name">{food.name}</div>
                  <div className="ai-food-macros">
                    {food.quantity ? `${food.quantity} · ` : ''}
                    بروتين {food.protein}g · كارب {food.carbs}g · دهون {food.fat}g
                  </div>
                </div>
                <div className="ai-food-cal">{food.calories} س.ح</div>
              </div>
            ))}
            {result.message && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, padding: '8px 12px', background: 'var(--surface-alt)', borderRadius: 8 }}>
                {result.message}
              </div>
            )}
            <select className="ai-add-meal-select" value={mealType} onChange={(e) => setMealType(e.target.value)}>
              {MEAL_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <button className="ai-add-all-btn" onClick={addToMeal}>إضافة إلى الوجبة المختارة</button>
          </div>
        )}
      </div>
    </div>
  );
}
