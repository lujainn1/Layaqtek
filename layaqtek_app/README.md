# لياقتك — تطبيق الجوال (Flutter)

نسخة iOS/Android من تطبيق لياقتك. يتصل بنفس الخادم الخلفي (Node.js/Express + Firestore) بدون أي تغيير عليه.

## المتطلبات

1. **Flutter SDK** — [دليل التثبيت على Windows](https://docs.flutter.dev/get-started/install/windows)
2. **Android Studio** — للمحاكي و Android SDK
3. الخادم الخلفي يعمل: `cd ../backend && node server.js`

## خطوات التشغيل (أول مرة)

```bash
cd layaqtek_app

# توليد ملفات المنصات (android/ios) — مرة واحدة فقط
flutter create . --org com.layaqtek --platforms android,ios

# تحميل المكتبات
flutter pub get

# التشغيل على المحاكي أو جهاز موصول
flutter run
```

## إعداد عنوان الخادم

الملف: `lib/api.dart` — عدّل `baseUrl` حسب طريقة التشغيل:

| البيئة | العنوان |
|---|---|
| محاكي Android | `http://10.0.2.2:3001` (الافتراضي) |
| جوال حقيقي على نفس الشبكة | `http://YOUR_PC_IP:3001` (اعرف الآيبي بأمر `ipconfig`) |
| الخادم المنشور | `https://your-project.vercel.app` |

**ملاحظة للجوال الحقيقي:** أضف آيبي جهازك لقائمة CORS في `backend/server.js`.

## بناء iOS بدون ماك

استخدم [Codemagic](https://codemagic.io):
1. سجّل حساب مجاني (500 دقيقة/شهر على أجهزة ماك سحابية)
2. اربط مستودع GitHub
3. اختر Flutter workflow → iOS
4. للنشر على App Store تحتاج حساب Apple Developer ($99/سنة)

## هيكل المشروع

```
lib/
├── main.dart                  # نقطة البداية + الثيم + RTL
├── api.dart                   # جميع طلبات الخادم (يطابق api.js)
├── screens/
│   ├── login.dart             # تسجيل الدخول / إنشاء حساب
│   ├── profile_setup.dart     # إعداد الملف (4 خطوات)
│   ├── dashboard.dart         # اللوحة الرئيسية (حلقة السعرات، الماكروز، الماء، الوجبات)
│   └── progress.dart          # التقدم والتحليل (7/14/30 يوم)
└── widgets/
    └── add_food_sheet.dart    # نافذة البحث عن الطعام وإضافته
```

## المكتبات المستخدمة

- `http` — طلبات الخادم
- `shared_preferences` — حفظ الجلسة (JWT token)
- `google_fonts` — خط Tajawal
