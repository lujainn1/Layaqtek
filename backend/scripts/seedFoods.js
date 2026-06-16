/**
 * seedFoods.js
 * Populates the global /foods collection in Firestore.
 * Run once with:  node backend/scripts/seedFoods.js
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_KEY
 * in your .env (same as the main server).
 */

import 'dotenv/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                  from 'firebase-admin/firestore';

// ── Initialize Firebase Admin ─────────────────────────────────────────────────
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// ── Food catalogue ─────────────────────────────────────────────────────────────
// category values: "main" | "breakfast" | "snack" | "dessert" | "beverage" | "side"
const foods = [
  // Main dishes
  { id: 1,  name: "كبسة دجاج",   nameEn: "Kabsa Chicken",   calories: 520, protein: 35, carbs: 60, fat: 14, serving: "طبق (400g)",        category: "main"      },
  { id: 2,  name: "مندي لحم",    nameEn: "Mandi Lamb",      calories: 650, protein: 42, carbs: 58, fat: 22, serving: "طبق (450g)",        category: "main"      },
  { id: 3,  name: "شاورما دجاج", nameEn: "Chicken Shawarma",calories: 380, protein: 28, carbs: 35, fat: 14, serving: "ساندويش (250g)",    category: "main"      },
  { id: 12, name: "هريسة",       nameEn: "Harees",          calories: 320, protein: 18, carbs: 45, fat:  7, serving: "طبق (300g)",        category: "main"      },
  { id: 18, name: "مرقوق",       nameEn: "Marqooq",         calories: 410, protein: 22, carbs: 48, fat: 14, serving: "طبق (350g)",        category: "main"      },
  { id: 17, name: "جريش",        nameEn: "Jareesh",         calories: 290, protein: 10, carbs: 52, fat:  5, serving: "طبق (250g)",        category: "main"      },
  { id: 10, name: "سمك مشوي",    nameEn: "Grilled Fish",    calories: 206, protein: 30, carbs:  0, fat:  9, serving: "قطعة (200g)",       category: "main"      },

  // Breakfast / light meals
  { id: 4,  name: "فول مدمس",    nameEn: "Ful Medames",     calories: 190, protein: 13, carbs: 28, fat:  4, serving: "كوب (180g)",        category: "breakfast" },
  { id: 5,  name: "حمص بطحينة",  nameEn: "Hummus",          calories: 166, protein:  8, carbs: 18, fat:  8, serving: "كوب (120g)",        category: "breakfast" },
  { id: 9,  name: "بيض مسلوق",   nameEn: "Boiled Egg",      calories: 155, protein: 13, carbs:  1, fat: 11, serving: "بيضتان (100g)",    category: "breakfast" },

  // Sides / staples
  { id: 7,  name: "خبز أبيض",    nameEn: "White Bread",     calories: 265, protein:  9, carbs: 51, fat:  3, serving: "رغيف (100g)",       category: "side"      },
  { id: 8,  name: "أرز أبيض",    nameEn: "White Rice",      calories: 206, protein:  4, carbs: 45, fat:  0, serving: "كوب مطبوخ (186g)", category: "side"      },
  { id: 11, name: "سلطة خضراء",  nameEn: "Green Salad",     calories:  45, protein:  2, carbs:  8, fat:  1, serving: "طبق (150g)",        category: "side"      },
  { id: 14, name: "لبن (زبادي)", nameEn: "Yogurt",          calories: 100, protein:  9, carbs: 11, fat:  3, serving: "كوب (245g)",        category: "side"      },

  // Snacks
  { id: 6,  name: "تمر مجدول",   nameEn: "Medjool Dates",   calories: 277, protein:  2, carbs: 75, fat:  0, serving: "100g (4-5 حبات)",  category: "snack"     },
  { id: 13, name: "سمبوسة لحم",  nameEn: "Samboosa",        calories: 180, protein:  8, carbs: 20, fat:  8, serving: "قطعة (80g)",        category: "snack"     },
  { id: 19, name: "مطبق",        nameEn: "Mutabbaq",        calories: 450, protein: 18, carbs: 55, fat: 18, serving: "قطعة (200g)",       category: "snack"     },

  // Desserts
  { id: 20, name: "كنافة",       nameEn: "Kunafa",          calories: 380, protein:  8, carbs: 55, fat: 16, serving: "قطعة (150g)",       category: "dessert"   },

  // Beverages
  { id: 15, name: "شاي بالحليب", nameEn: "Milk Tea",        calories:  90, protein:  3, carbs: 14, fat:  3, serving: "كوب (240ml)",       category: "beverage"  },
  { id: 16, name: "قهوة عربية",  nameEn: "Arabic Coffee",   calories:  15, protein:  0, carbs:  3, fat:  0, serving: "فنجان (100ml)",     category: "beverage"  },
];

// ── Seed ───────────────────────────────────────────────────────────────────────
async function seed() {
  const batch = db.batch();
  const col   = db.collection('foods');

  for (const food of foods) {
    const ref = col.doc(String(food.id));
    batch.set(ref, food, { merge: true });
  }

  await batch.commit();
  console.log(`✅  Seeded ${foods.length} foods into /foods`);
  process.exit(0);
}

seed().catch(err => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
