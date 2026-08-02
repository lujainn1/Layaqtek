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

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final loggedIn = prefs.getString('layaqtek_token') != null;
  runApp(LayaqtekApp(loggedIn: loggedIn));
}

class LayaqtekApp extends StatelessWidget {
  final bool loggedIn;
  const LayaqtekApp({super.key, required this.loggedIn});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'لياقتك',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: kPrimary),
        scaffoldBackgroundColor: const Color(0xFFF1F5F9),
        textTheme: GoogleFonts.tajawalTextTheme(),
        appBarTheme: AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: const Color(0xFF0F172A),
          elevation: 0,
          titleTextStyle: GoogleFonts.tajawal(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: const Color(0xFF0F172A),
          ),
        ),
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 1,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        ),
      ),
      // Force RTL for the whole app (Arabic)
      builder: (context, child) =>
          Directionality(textDirection: TextDirection.rtl, child: child!),
      home: loggedIn ? const DashboardScreen() : const LoginScreen(),
    );
  }
}
