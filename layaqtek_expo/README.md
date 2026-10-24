# لياقتك — نسخة Expo (React Native)

منفذ تجريبي لتطبيق الجوال باستخدام Expo، للمقارنة المباشرة مع نسخة Flutter في
`../layaqtek_app`. يتصل بنفس الخادم الخلفي (Node.js/Express + Firestore) بدون أي
تغيير عليه.

**الغرض من هذا المجلد:** مقارنة طبقة الـ API وشاشة تسجيل الدخول بين Expo و Flutter
قبل اتخاذ قرار نهائي بالانتقال. ليس تطبيقاً كاملاً بعد.

## المتطلبات

1. **Node.js** — مثبّت مسبقاً (الإصدار الحالي: 22)
2. **تطبيق Expo Go** على جوالك ([iOS](https://apps.apple.com/app/expo-go/id982107779) /
   [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
3. الخادم الخلفي يعمل: `cd ../backend && node server.js`

لا حاجة إلى Android Studio ولا Xcode للتطوير — هذا الفرق العملي الأكبر عن Flutter.

## التشغيل

```bash
cd layaqtek_expo
npm install     # مرة واحدة فقط
npm start       # ثم امسح رمز QR بتطبيق Expo Go
```

للتشغيل على المحاكي أو المتصفح:

```bash
npm run android
npm run web
```

## إعداد عنوان الخادم

يقابل `--dart-define=API_BASE_URL` في Flutter. انسخ `.env.example` إلى `.env.local`
وعدّل القيمة:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:3001
```

| البيئة | العنوان |
|---|---|
| محاكي Android | `http://10.0.2.2:3001` (افتراضي) |
| محاكي iOS | `http://localhost:3001` (افتراضي) |
| جوال حقيقي على نفس الشبكة | `http://YOUR_PC_IP:3001` (اعرف الآيبي بأمر `ipconfig`) |
| الخادم المنشور | `https://layaqtek.vercel.app` |

**ملاحظة عن CORS:** على الجوال لا حاجة لأي تعديل — `fetch` في React Native
لا يرسل ترويسة `Origin`، و`backend/server.js` يسمح بمرورها عبر
`if (!origin) return callback(null, true)`.

لكن `npm run web` يعمل من `http://localhost:8081` وهو غير موجود في قائمة
`allowedOrigins`، فأضفه إن احتجت للنسخة الويب من Expo.

## ما تم نقله

```
app/
├── _layout.jsx            # الجذر: خط Tajawal + RTL + الثيم + Stack
├── login.jsx              # ✅ تسجيل الدخول / إنشاء حساب (منقولة كاملة)
├── index.jsx              # 🚧 شاشة مؤقتة تتحقق من حفظ الرمز وتسجيل الخروج
├── forgot-password.jsx    # 🚧 لم تُنقل
└── profile-setup.jsx      # 🚧 لم تُنقل
src/
├── api.js                 # ✅ جميع طلبات الخادم (19 دالة، منقولة كاملة)
├── theme.js               # ✅ الألوان والخطوط من index.css
├── ThemeContext.jsx       # ✅ الوضع الفاتح/الداكن مع حفظ التفضيل
└── NotPorted.jsx          # شاشة بديلة للشاشات غير المنقولة
```

المتبقي للوصول إلى تكافؤ كامل مع Flutter: `dashboard`، `progress`،
`add_food_sheet`، `goals_edit_sheet`، `ai_analyzer_section`، وشاشتا
`forgot-password` و `profile-setup`.

## خلاصة المقارنة

### ما ينقل من الويب بدون تغيير تقريباً

`src/api.js` نسخة شبه حرفية من `frontend-react/src/api.js` — نفس الدوال التسعة عشر
ونفس رسائل الخطأ العربية. الاختلاف الوحيد في الشكل: التخزين على الجوال غير متزامن،
فأصبحت `getToken()` و `getUser()` و `saveAuth()` ترجع `Promise`. وهذا نفس شكل
`layaqtek_app/lib/api.dart` حيث ترجع `Future`.

هذا هو الربح الحقيقي: منطق واحد بلغة واحدة بين الويب والجوال، بدل صيانته مرتين
بـ JavaScript و Dart.

### ما لا ينقل

الواجهة نفسها. كل `<div>` صار `<View>`، وكل `className` صار كائن `StyleSheet`.
شاشة تسجيل الدخول: 153 سطراً في الويب مقابل 338 سطراً هنا (و 267 في Flutter) —
الزيادة كلها أنماط كانت في `index.css`. القاعدة العامة: المنطق ينتقل، الواجهة
تُعاد كتابتها.

### التخزين الآمن — نقطة لصالح Expo

الرمز (JWT) يُحفظ في `expo-secure-store`، أي Keychain على iOS و Keystore على
Android. نسخة Flutter تستخدم `shared_preferences` وهو تخزين نصي غير مشفّر.

### RTL — نقطة ضد Expo

`Directionality` في Flutter يعمل مباشرة. في React Native نستدعي
`I18nManager.forceRTL(true)` في `app/_layout.jsx`، والعلم الأصلي لا يتغيّر إلا عند
بدء التطبيق: إذا عُدّل أثناء التطوير فلن يتأثر التخطيط حتى إعادة تحميل كاملة
(اضغط `r` في الطرفية). لهذا السبب تحدد الأنماط في هذا المشروع
`textAlign: 'right'` و `writingDirection: 'rtl'` صراحةً بدل الاعتماد على العلم
وحده. هذه مضايقة متكررة في تطبيق عربي بالأساس، وليست إعداداً لمرة واحدة.

## بناء iOS بدون ماك

استخدم [EAS Build](https://docs.expo.dev/build/setup/) — أبسط من Codemagic المستخدم
في نسخة Flutter لأنه مدمج في Expo:

```bash
npm install -g eas-cli
eas login
eas build --platform ios
```

الطبقة المجانية متاحة لكن مع انتظار في الطابور. للنشر على App Store تحتاج حساب
Apple Developer ($99/سنة) في الحالتين.
