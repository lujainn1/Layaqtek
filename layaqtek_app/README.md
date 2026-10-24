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

**ملاحظة عن CORS:** لا حاجة لأي تعديل. طلبات التطبيق الأصلي (Flutter)
لا ترسل ترويسة `Origin`، و`backend/server.js` يسمح بمرورها عبر
`if (!origin) return callback(null, true)`. قائمة CORS تخص المتصفح فقط.

## الاختبار على iPhone بدون ماك

ملف `codemagic.yaml` في جذر المستودع يبني التطبيق ويرسله إلى TestFlight
تلقائياً عند كل دفعة على فرع `master`.

### المتطلبات

| العنصر المطلوب | التكلفة |
|---|---|
| حساب Apple Developer | $99/سنة — إلزامي لأي تثبيت على جهاز حقيقي |
| Codemagic | مجاني (500 دقيقة macOS شهرياً ≈ 30 بناءً) |

### الخطوات

1. **اشترك في Apple Developer Program** — الموافقة تستغرق 24–48 ساعة
   وتعطل كل ما بعدها، فابدأ بها.
2. سجّل معرف التطبيق `com.layaqtek.layaqtekApp` في Certificates, Identifiers
   & Profiles، ثم أنشئ سجل التطبيق في App Store Connect.
3. أنشئ مفتاح App Store Connect API بصلاحية **App Manager**، ونزّل ملف
   `.p8` (يُنزّل مرة واحدة فقط). احتفظ به خارج المستودع — `*.p8` مضاف إلى
   `.gitignore`.
4. في Codemagic: اربط مستودع GitHub، ثم Teams → Integrations → App Store
   Connect وارفع المفتاح باسم `layaqtek_asc_key` بالضبط.
5. املأ `APP_STORE_APPLE_ID` في `codemagic.yaml` بالرقم الموجود في صفحة
   App Information. (البناء الأول يعمل وهو فارغ.)
6. ادفع على `master` — يبدأ البناء تلقائياً (~12–15 دقيقة).
7. في App Store Connect → TestFlight → Internal Testing: أضف نفسك كمختبر، ثم
   ثبّت تطبيق **TestFlight** على الجوال واقبل الدعوة.

الاختبار الداخلي لا يحتاج مراجعة App Review، ويسمح بـ 100 مختبر.

**ملاحظة مهمة:** البناء يمرر `--dart-define=API_BASE_URL=https://layaqtek.vercel.app`.
بدونه يعود التطبيق إلى القيمة الافتراضية `http://10.0.2.2:3001` (عنوان محاكي
Android) وتفشل جميع الطلبات على الجوال.

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
