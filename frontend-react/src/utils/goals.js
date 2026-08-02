// Mifflin-St Jeor BMR + activity/goal adjustments — mirrors backend/routes/auth.js
export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

export const GOAL_ADJUSTMENTS = { lose: -500, maintain: 0, gain: 300 };
export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 };

export function calculateGoals({ gender, age, weight, height, activityLevel, goal }) {
  const bmr =
    gender === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const tdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.55));
  const calories = Math.max(1200, tdee + (GOAL_ADJUSTMENTS[goal] || 0));

  return {
    calories,
    protein: Math.round((calories * 0.3) / 4),
    carbs: Math.round((calories * 0.4) / 4),
    fat: Math.round((calories * 0.3) / 9),
    water: 8,
  };
}

export function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
