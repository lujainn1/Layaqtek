import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// All backend API calls — mirrors frontend/js/api.js.
/// The backend itself is unchanged (Node.js/Express on port 3001).
class Api {
  /// Android emulator reaches your PC's localhost via 10.0.2.2.
  /// For a physical phone on the same Wi-Fi, use your PC's local IP
  /// e.g. 'http://192.168.1.10:3001' (run `ipconfig` to find it).
  /// For the deployed backend use 'https://your-project.vercel.app'.
  static const String baseUrl = 'http://10.0.2.2:3001';

  // ── Auth storage ──────────────────────────────────────────────
  static Future<void> saveAuth(String token, Map user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('layaqtek_token', token);
    await prefs.setString('layaqtek_user', jsonEncode(user));
  }

  static Future<Map?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('layaqtek_user');
    return raw == null ? null : jsonDecode(raw) as Map;
  }

  static Future<void> updateUserGoals(Map goals) async {
    final prefs = await SharedPreferences.getInstance();
    final user = await getUser() ?? {};
    user['goals'] = goals;
    await prefs.setString('layaqtek_user', jsonEncode(user));
  }

  static Future<void> clearAuth() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('layaqtek_token');
    await prefs.remove('layaqtek_user');
  }

  // ── Core request wrapper ──────────────────────────────────────
  static Future<dynamic> _request(String method, String path,
      [Map<String, dynamic>? body]) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('layaqtek_token');
    final headers = {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
    final uri = Uri.parse('$baseUrl$path');

    late http.Response res;
    switch (method) {
      case 'POST':
        res = await http.post(uri, headers: headers, body: jsonEncode(body));
      case 'PUT':
        res = await http.put(uri, headers: headers, body: jsonEncode(body));
      default:
        res = await http.get(uri, headers: headers);
    }

    if (res.statusCode == 401) {
      await clearAuth();
      throw Exception('جلسة منتهية');
    }

    final data = jsonDecode(utf8.decode(res.bodyBytes));
    if (res.statusCode >= 400) {
      throw Exception(data['error'] ?? 'خطأ في الخادم (${res.statusCode})');
    }
    return data;
  }

  // ── Auth endpoints ────────────────────────────────────────────
  static Future<Map> login(String email, String password) async =>
      await _request('POST', '/api/auth/login',
          {'email': email, 'password': password}) as Map;

  static Future<Map> register(String name, String email, String password) async =>
      await _request('POST', '/api/auth/register',
          {'name': name, 'email': email, 'password': password}) as Map;

  static Future<Map> saveProfile({
    required String gender,
    required int age,
    required double weight,
    required double height,
    required String activityLevel,
    required String goal,
  }) async =>
      await _request('PUT', '/api/auth/profile', {
        'gender': gender,
        'age': age,
        'weight': weight,
        'height': height,
        'activityLevel': activityLevel,
        'goal': goal,
      }) as Map;

  static Future<Map> updateGoals(
          int calories, int protein, int carbs, int fat, int water) async =>
      await _request('PUT', '/api/auth/goals', {
        'calories': calories,
        'protein': protein,
        'carbs': carbs,
        'fat': fat,
        'water': water,
      }) as Map;

  // ── Food endpoints ────────────────────────────────────────────
  static Future<List> getAllFoods() async {
    final data = await _request('GET', '/api/food/all') as Map;
    return (data['foods'] ?? []) as List;
  }

  static Future<Map?> getLog(String date) async =>
      await _request('GET', '/api/food/log/$date') as Map?;

  static Future<void> saveLog(String date, Map meals, int water) async =>
      await _request('POST', '/api/food/log/$date',
          {'meals': meals, 'water': water});

  static Future<Map> getStats(int days) async =>
      await _request('GET', '/api/food/stats?days=$days') as Map;
}
