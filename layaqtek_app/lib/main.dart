import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'screens/dashboard.dart';
import 'screens/login.dart';

// App color identity — same as the web version
const kPrimary = Color(0xFF16A34A);
const kPrimaryLight = Color(0xFF22C55E);
const kPrimaryBg = Color(0xFFF0FDF4);
const kAccent = Color(0xFFD97706);
const kDanger = Color(0xFFDC2626);
const kProteinColor = Color(0xFF2563EB);
const kCarbsColor = Color(0xFFD97706);
const kFatColor = Color(0xFFDC2626);
const kWaterColor = Color(0xFF0284C7);

// Dark-mode counterpart for the primary-tint background (used behind
// selected cards / badges) — mirrors frontend-react/src/index.css's
// `:root[data-theme="dark"]` --primary-bg.
const kPrimaryBgDark = Color(0xFF16341F);

/// Theme-aware color tokens for structural surfaces (background, cards,
/// borders, text). Brand/semantic accent colors (kPrimary, kDanger, kAccent,
/// kProteinColor, etc.) are intentionally left constant across themes —
/// they're vivid enough to stay readable on both light and dark backgrounds,
/// so only the surfaces they sit on need to adapt.
bool _isDark(BuildContext c) => Theme.of(c).brightness == Brightness.dark;
Color kSurface(BuildContext c) => _isDark(c) ? const Color(0xFF131C2E) : Colors.white;
Color kSurfaceAlt(BuildContext c) => _isDark(c) ? const Color(0xFF1A2436) : const Color(0xFFF8FAFC);
Color kSurfaceAlt2(BuildContext c) => _isDark(c) ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9);
Color kBorder(BuildContext c) => _isDark(c) ? const Color(0xFF2B3A52) : const Color(0xFFE2E8F0);
Color kText(BuildContext c) => _isDark(c) ? const Color(0xFFE2E8F0) : const Color(0xFF0F172A);
Color kTextMuted(BuildContext c) => _isDark(c) ? const Color(0xFF94A3B8) : Colors.grey[600]!;
Color kPrimaryBgOf(BuildContext c) => _isDark(c) ? kPrimaryBgDark : kPrimaryBg;

/// App-wide theme mode, persisted to SharedPreferences under the same key
/// name the web app uses in localStorage ('layaqtek_theme') for consistency.
class ThemeController {
  static final ValueNotifier<ThemeMode> mode = ValueNotifier(ThemeMode.system);

  static Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString('layaqtek_theme');
    mode.value = switch (stored) {
      'dark' => ThemeMode.dark,
      'light' => ThemeMode.light,
      _ => ThemeMode.system,
    };
  }

  static Future<void> toggle(BuildContext context) async {
    final isCurrentlyDark = mode.value == ThemeMode.dark ||
        (mode.value == ThemeMode.system &&
            MediaQuery.platformBrightnessOf(context) == Brightness.dark);
    final next = isCurrentlyDark ? ThemeMode.light : ThemeMode.dark;
    mode.value = next;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('layaqtek_theme', next == ThemeMode.dark ? 'dark' : 'light');
  }
}

/// Small circular button that flips between light/dark, matching the web
/// app's ThemeToggle component.
class ThemeToggleButton extends StatelessWidget {
  const ThemeToggleButton({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return IconButton(
      tooltip: isDark ? 'الوضع الفاتح' : 'الوضع الداكن',
      icon: Icon(isDark ? Icons.light_mode : Icons.dark_mode, color: kTextMuted(context)),
      onPressed: () => ThemeController.toggle(context),
    );
  }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final loggedIn = prefs.getString('layaqtek_token') != null;
  await ThemeController.load();
  runApp(LayaqtekApp(loggedIn: loggedIn));
}

ThemeData _buildTheme(Brightness brightness) {
  final isDark = brightness == Brightness.dark;
  final surface = isDark ? const Color(0xFF131C2E) : Colors.white;
  final bg = isDark ? const Color(0xFF0B1220) : const Color(0xFFF1F5F9);
  final text = isDark ? const Color(0xFFE2E8F0) : const Color(0xFF0F172A);

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: ColorScheme.fromSeed(seedColor: kPrimary, brightness: brightness),
    scaffoldBackgroundColor: bg,
    textTheme: GoogleFonts.tajawalTextTheme(isDark ? ThemeData.dark().textTheme : ThemeData.light().textTheme)
        .apply(bodyColor: text, displayColor: text),
    appBarTheme: AppBarTheme(
      backgroundColor: surface,
      foregroundColor: text,
      elevation: 0,
      titleTextStyle: GoogleFonts.tajawal(fontSize: 20, fontWeight: FontWeight.w800, color: text),
    ),
    cardTheme: CardThemeData(
      color: surface,
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: isDark ? const Color(0xFF1A2436) : const Color(0xFFF8FAFC),
    ),
    dialogTheme: DialogThemeData(backgroundColor: surface),
    bottomSheetTheme: BottomSheetThemeData(backgroundColor: surface),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: isDark ? const Color(0xFF1E293B) : const Color(0xFF0F172A),
      contentTextStyle: const TextStyle(color: Colors.white),
    ),
  );
}

class LayaqtekApp extends StatelessWidget {
  final bool loggedIn;
  const LayaqtekApp({super.key, required this.loggedIn});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: ThemeController.mode,
      builder: (context, mode, _) {
        return MaterialApp(
          title: 'لياقتك',
          debugShowCheckedModeBanner: false,
          themeMode: mode,
          theme: _buildTheme(Brightness.light),
          darkTheme: _buildTheme(Brightness.dark),
          // Force RTL for the whole app (Arabic)
          builder: (context, child) =>
              Directionality(textDirection: TextDirection.rtl, child: child!),
          home: loggedIn ? const DashboardScreen() : const LoginScreen(),
        );
      },
    );
  }
}
