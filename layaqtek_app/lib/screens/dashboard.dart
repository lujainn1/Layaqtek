import 'package:flutter/material.dart';
import '../api.dart';
import '../main.dart';
import '../widgets/add_food_sheet.dart';
import 'login.dart';
import 'progress.dart';

const kMealTypes = ['فطور', 'غداء', 'عشاء', 'سناك'];
const kMealIcons = {'فطور': '🌅', 'غداء': '☀️', 'عشاء': '🌙', 'سناك': '🍎'};
const kMlPerCup = 250;

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map goals = {'calories': 2000, 'protein': 150, 'carbs': 250, 'fat': 65, 'water': 8};
  Map<String, List> meals = {'فطور': [], 'غداء': [], 'عشاء': [], 'سناك': []};
  int water = 0;
  List allFoods = [];
  bool loading = true;
  String userName = '';

  String get todayDate {
    final now = DateTime.now();
    return '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = await Api.getUser();
    if (user != null) {
      userName = user['name'] ?? '';
      if (user['goals'] != null) goals = {...goals, ...user['goals']};
    }

    try {
      final log = await Api.getLog(todayDate);
      if (log != null) {
        final m = log['meals'] ?? {};
        meals = {
          for (final type in kMealTypes) type: List.from(m[type] ?? []),
        };
        water = log['water'] ?? 0;
      }
    } catch (e) {
      if (e.toString().contains('جلسة منتهية')) return _logout();
    }

    try {
      allFoods = await Api.getAllFoods();
    } catch (_) {}

    if (mounted) setState(() => loading = false);
  }

  Future<void> _saveLog() async {
    try {
      await Api.saveLog(todayDate, meals, water);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('تعذر الحفظ: ${e.toString().replaceFirst('Exception: ', '')}'),
          backgroundColor: kDanger,
        ));
      }
    }
  }

  void _logout() async {
    await Api.clearAuth();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  Map<String, int> get totals {
    int cal = 0, protein = 0, carbs = 0, fat = 0;
    for (final items in meals.values) {
      for (final item in items) {
        cal += ((item['calories'] ?? 0) as num).round();
        protein += ((item['protein'] ?? 0) as num).round();
        carbs += ((item['carbs'] ?? 0) as num).round();
        fat += ((item['fat'] ?? 0) as num).round();
      }
    }
    return {'calories': cal, 'protein': protein, 'carbs': carbs, 'fat': fat};
  }

  void _openAddFood(String mealType) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => Directionality(
        textDirection: TextDirection.rtl,
        child: AddFoodSheet(
          mealType: mealType,
          allFoods: allFoods,
          onAdd: (item) {
            setState(() => meals[mealType]!.add(item));
            _saveLog();
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text('تمت إضافة ${item['name']} ✓'),
              backgroundColor: kPrimary,
              duration: const Duration(seconds: 2),
            ));
          },
        ),
      ),
    );
  }

  void _removeFood(String mealType, int index) {
    final removed = meals[mealType]!.removeAt(index);
    setState(() {});
    _saveLog();
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text('تم حذف ${removed['name']}'),
      duration: const Duration(seconds: 2),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final t = totals;
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Text('🔥 لياقتك'),
            const Spacer(),
            IconButton(
              tooltip: 'التقدم',
              icon: const Icon(Icons.bar_chart, color: kPrimary),
              onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ProgressScreen())),
            ),
            IconButton(
              tooltip: 'تسجيل الخروج',
              icon: const Icon(Icons.logout, color: kDanger, size: 22),
              onPressed: _logout,
            ),
          ],
        ),
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: kPrimary))
          : RefreshIndicator(
              color: kPrimary,
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (userName.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text('مرحباً، $userName 👋',
                          style: const TextStyle(
                              fontSize: 18, fontWeight: FontWeight.w700)),
                    ),
                  _calorieCard(t),
                  const SizedBox(height: 16),
                  _macrosCard(t),
                  const SizedBox(height: 16),
                  _waterCard(),
                  const SizedBox(height: 16),
                  ...kMealTypes.map(_mealCard),
                  const SizedBox(height: 40),
                ],
              ),
            ),
    );
  }

  // ── Calorie ring card ─────────────────────────────────────────
  Widget _calorieCard(Map<String, int> t) {
    final goalCal = (goals['calories'] as num).round();
    final consumed = t['calories']!;
    final pct = (consumed / goalCal).clamp(0.0, 1.0);
    final over = consumed > goalCal;

    return _card(
      title: '🎯 السعرات الحرارية',
      child: Column(
        children: [
          SizedBox(
            width: 180,
            height: 180,
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 180,
                  height: 180,
                  child: CircularProgressIndicator(
                    value: pct,
                    strokeWidth: 13,
                    strokeCap: StrokeCap.round,
                    backgroundColor: const Color(0xFFE2E8F0),
                    color: over ? kDanger : kPrimaryLight,
                  ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('$consumed',
                        style: const TextStyle(
                            fontSize: 36, fontWeight: FontWeight.w800)),
                    Text('سعرة', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                    Text('من $goalCal',
                        style: const TextStyle(
                            fontSize: 13, color: kPrimary, fontWeight: FontWeight.w600)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              _statBox('مستهلك', '$consumed', kPrimary),
              const SizedBox(width: 10),
              _statBox('الهدف', '$goalCal', Colors.grey[600]!),
              const SizedBox(width: 10),
              _statBox('متبقي', '${(goalCal - consumed).clamp(0, goalCal)}', kAccent),
            ],
          ),
        ],
      ),
    );
  }

  Widget _statBox(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          children: [
            Text(value,
                style: TextStyle(
                    fontSize: 17, fontWeight: FontWeight.w700, color: color)),
            Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[600])),
          ],
        ),
      ),
    );
  }

  // ── Macros card ───────────────────────────────────────────────
  Widget _macrosCard(Map<String, int> t) {
    return _card(
      title: '💪 المغذيات الكبرى',
      child: Column(
        children: [
          _macroBar('البروتين', t['protein']!, (goals['protein'] as num).round(), kProteinColor),
          const SizedBox(height: 14),
          _macroBar('الكربوهيدرات', t['carbs']!, (goals['carbs'] as num).round(), kCarbsColor),
          const SizedBox(height: 14),
          _macroBar('الدهون', t['fat']!, (goals['fat'] as num).round(), kFatColor),
        ],
      ),
    );
  }

  Widget _macroBar(String name, int value, int goal, Color color) {
    final pct = goal > 0 ? (value / goal).clamp(0.0, 1.0) : 0.0;
    return Column(
      children: [
        Row(
          children: [
            Container(
              width: 10, height: 10,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
            Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const Spacer(),
            Text('$value g / $goal g',
                style: TextStyle(fontSize: 13, color: Colors.grey[600])),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(99),
          child: LinearProgressIndicator(
            value: pct,
            minHeight: 8,
            backgroundColor: const Color(0xFFF1F5F9),
            color: color,
          ),
        ),
      ],
    );
  }

  // ── Water card ────────────────────────────────────────────────
  Widget _waterCard() {
    final waterGoal = (goals['water'] as num).round();
    return _card(
      title: '💧 الماء اليومي',
      child: Column(
        children: [
          Wrap(
            spacing: 6,
            runSpacing: 6,
            alignment: WrapAlignment.center,
            children: List.generate(waterGoal, (i) {
              final filled = i < water;
              return GestureDetector(
                onTap: () {
                  setState(() => water = i < water ? i : i + 1);
                  _saveLog();
                },
                child: Icon(
                  filled ? Icons.water_drop : Icons.water_drop_outlined,
                  size: 34,
                  color: filled ? kWaterColor : Colors.grey[300],
                ),
              );
            }),
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _waterBtn(Icons.remove, () {
                if (water > 0) {
                  setState(() => water--);
                  _saveLog();
                }
              }),
              const SizedBox(width: 20),
              Column(
                children: [
                  Text('${water * kMlPerCup} مل',
                      style: const TextStyle(
                          fontSize: 20, fontWeight: FontWeight.w800, color: kWaterColor)),
                  Text('$water / $waterGoal أكواب',
                      style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                ],
              ),
              const SizedBox(width: 20),
              _waterBtn(Icons.add, () {
                if (water < waterGoal) {
                  setState(() => water++);
                  _saveLog();
                }
              }),
            ],
          ),
        ],
      ),
    );
  }

  Widget _waterBtn(IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(99),
      child: Container(
        width: 42, height: 42,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: const Color(0xFFE2E8F0), width: 1.5),
          color: Colors.white,
        ),
        child: Icon(icon, size: 20, color: Colors.grey[600]),
      ),
    );
  }

  // ── Meal card ─────────────────────────────────────────────────
  Widget _mealCard(String mealType) {
    final items = meals[mealType]!;
    final mealCal = items.fold<num>(0, (s, i) => s + (i['calories'] ?? 0)).round();

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          leading: Text(kMealIcons[mealType]!, style: const TextStyle(fontSize: 24)),
          title: Text(mealType,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          subtitle: Text('$mealCal سعرة',
              style: TextStyle(fontSize: 12, color: Colors.grey[600])),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                icon: Container(
                  width: 32, height: 32,
                  decoration: const BoxDecoration(
                      color: kPrimaryLight, shape: BoxShape.circle),
                  child: const Icon(Icons.add, color: Colors.white, size: 20),
                ),
                onPressed: () => _openAddFood(mealType),
              ),
              const Icon(Icons.expand_more),
            ],
          ),
          children: items.isEmpty
              ? [
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      children: [
                        Icon(Icons.restaurant, size: 32, color: Colors.grey[300]),
                        const SizedBox(height: 8),
                        Text('لا توجد وجبات بعد',
                            style: TextStyle(fontSize: 13, color: Colors.grey[500])),
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: () => _openAddFood(mealType),
                          child: const Text('+ إضافة طعام',
                              style: TextStyle(color: kPrimary, fontWeight: FontWeight.w700)),
                        ),
                      ],
                    ),
                  ),
                ]
              : List.generate(items.length, (i) {
                  final item = items[i];
                  return ListTile(
                    dense: true,
                    title: Text(item['name'] ?? '',
                        style: const TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 14)),
                    subtitle: Text(
                      '${item['grams'] != null ? '${item['grams']}g · ' : ''}'
                      'بروتين ${item['protein']}g · كارب ${item['carbs']}g · دهون ${item['fat']}g',
                      style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('${(item['calories'] as num).round()} س.ح',
                            style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                                color: kAccent)),
                        IconButton(
                          icon: const Icon(Icons.close, size: 18, color: kDanger),
                          onPressed: () => _removeFood(mealType, i),
                        ),
                      ],
                    ),
                  );
                }),
        ),
      ),
    );
  }

  Widget _card({required String title, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}
