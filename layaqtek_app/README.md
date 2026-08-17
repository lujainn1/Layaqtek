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

الافتراضي في `lib/api.dart` هو `http://10.0.2.2:3001` (محاكي Android). يمكن تغييره
بدون تعديل الكود عبر `--dart-define` عند التشغيل:

```bash
flutter run --dart-define=API_BASE_URL=http://YOUR_PC_IP:3001
```

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
├── main.dart                     # نقطة البداية + الثيم (فاتح/داكن) + RTL
├── api.dart                      # جميع طلبات الخادم (يطابق frontend-react/src/api.js)
├── screens/
│   ├── login.dart                # تسجيل الدخول / إنشاء حساب
│   ├── forgot_password.dart      # طلب رابط إعادة تعيين كلمة المرور
│   ├── profile_setup.dart        # إعداد الملف (4 خطوات)
│   ├── dashboard.dart            # اللوحة الرئيسية + التنقل بين الأيام
│   └── progress.dart             # التقدم والتحليل (7/14/30 يوم)
└── widgets/
    ├── add_food_sheet.dart       # نافذة البحث عن الطعام وإضافته (بحث من الخادم)
    ├── goals_edit_sheet.dart     # نافذة تعديل الأهداف اليومية
    └── ai_analyzer_section.dart  # تحليل صورة الطعام بالذكاء الاصطناعي
```

## المميزات

- تسجيل دخول / إنشاء حساب، ونسيان كلمة المرور (يرسل رابط إعادة التعيين عبر
  البريد، ويُفتح في المتصفح على نفس صفحة الويب الجاهزة — لا توجد شاشة منفصلة
  لإدخال كلمة مرور جديدة داخل التطبيق).
- التنقل بين الأيام في اللوحة الرئيسية (عرض وتعديل سجلات الأيام السابقة).
- تحليل صورة الطعام بالذكاء الاصطناعي (كاميرا أو معرض الصور) لإضافة الأطعمة تلقائياً.
- تعديل الأهداف اليومية (السعرات، توزيع الماكروز، هدف الماء) من لوحة التحكم مباشرة.
- الوضع الداكن، مع حفظ التفضيل والتوافق مع إعداد النظام تلقائياً عند عدم التحديد.

## المكتبات المستخدمة

- `http` — طلبات الخادم
- `shared_preferences` — حفظ الجلسة (JWT token) وتفضيل الثيم
- `google_fonts` — خط Tajawal
- `image_picker` — التقاط/اختيار صور الطعام لتحليل الذكاء الاصطناعي
