import 'package:flutter/material.dart';
import '../api.dart';
import '../main.dart';
import '../widgets/add_food_sheet.dart';
import '../widgets/ai_analyzer_section.dart';
import '../widgets/goals_edit_sheet.dart';
import 'login.dart';
import 'progress.dart';

const kMealTypes = ['فطور', 'غداء', 'عشاء', 'سناك'];
const kMealIcons = {'فطور': '🌅', 'غداء': '☀️', 'عشاء': '🌙', 'سناك': '🍎'};
const kMlPerCup = 250;

String _formatDate(DateTime d) =>
    '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

DateTime _parseDate(String s) {
  final parts = s.split('-').map(int.parse).toList();
  return DateTime(parts[0], parts[1], parts[2]);
}

String _addDays(String dateStr, int delta) =>
    _formatDate(_parseDate(dateStr).add(Duration(days: delta)));

const _dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const _monthNames = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];
String _formatArabicDate(DateTime d) =>
    '${_dayNames[d.weekday % 7]}، ${d.day} ${_monthNames[d.month - 1]} ${d.year}';

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

  final String todayDate = _formatDate(DateTime.now());
  late String selectedDate = todayDate;
  bool get isToday => selectedDate == todayDate;

  @override
  void initState() {
    super.initState();
    _loadAllFoods();
    _loadLog();
  }

  Future<void> _loadAllFoods() async {
    try {
      allFoods = await Api.getAllFoods();
      if (mounted) setState(() {});
    } catch (_) {}
  }

  Future<void> _loadLog() async {
    setState(() => loading = true);
    final user = await Api.getUser();
    if (user != null) {
      userName = user['name'] ?? '';
      if (user['goals'] != null) goals = {...goals, ...user['goals']};
    }

    try {
      final log = await Api.getLog(selectedDate);
      if (log != null) {
        final m = log['meals'] ?? {};
        meals = {
          for (final type in kMealTypes) type: List.from(m[type] ?? []),
        };
        water = log['water'] ?? 0;
      } else {
        meals = {for (final type in kMealTypes) type: []};
        water = 0;
      }
    } catch (e) {
      if (e.toString().contains('جلسة منتهية')) return _logout();
    }

    if (mounted) setState(() => loading = false);
  }

  void _changeDate(String next) {
    setState(() => selectedDate = next);
    _loadLog();
  }

  Future<void> _saveLog() async {
    try {
      await Api.saveLog(selectedDate, meals, water);
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

  void _addAIFoods(String mealType, List<Map> items) {
    setState(() => meals[mealType]!.addAll(items));
    _saveLog();
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text('تمت إضافة ${items.length} صنف إلى $mealType ✓'),
      backgroundColor: kPrimary,
      duration: const Duration(seconds: 2),
    ));
  }

  void _openEditGoals() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => Directionality(
        textDirection: TextDirection.rtl,
        child: GoalsEditSheet(
          goals: goals,
          onSaved: (newGoals) {
            setState(() => goals = {...goals, ...newGoals});
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
              content: Text('✓ تم حفظ الأهداف بنجاح'),
              backgroundColor: kPrimary,
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
            const ThemeToggleButton(),
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
              onRefresh: _loadLog,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (userName.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text('مرحباً، $userName 👋',
                          style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: kText(context))),
                    ),
                  _dateNav(),
                  const SizedBox(height: 16),
                  _calorieCard(t),
                  const SizedBox(height: 16),
                  _macrosCard(t),
                  const SizedBox(height: 16),
                  _waterCard(),
                  const SizedBox(height: 16),
                  ...kMealTypes.map(_mealCard),
                  const SizedBox(height: 16),
                  AiAnalyzerSection(onAddFoods: _addAIFoods),
                  const SizedBox(height: 40),
                ],
              ),
            ),
    );
  }

  // ── Date navigation ──────────────────────────────────────────
  Widget _dateNav() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _dateNavBtn(Icons.chevron_right, () => _changeDate(_addDays(selectedDate, -1))),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            children: [
              Text(
                _formatArabicDate(_parseDate(selectedDate)),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: kPrimary),
              ),
              if (!isToday)
                TextButton(
                  onPressed: () => _changeDate(todayDate),
                  style: TextButton.styleFrom(
                      padding: EdgeInsets.zero, minimumSize: const Size(0, 24)),
                  child: Text('العودة لليوم',
                      style: TextStyle(fontSize: 11, color: kTextMuted(context))),
                ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        _dateNavBtn(Icons.chevron_left, isToday ? null : () => _changeDate(_addDays(selectedDate, 1))),
      ],
    );
  }

  Widget _dateNavBtn(IconData icon, VoidCallback? onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(99),
      child: Container(
        width: 34, height: 34,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: kBorder(context)),
          color: kSurface(context),
        ),
        child: Icon(icon, size: 18, color: onTap == null ? kBorder(context) : kTextMuted(context)),
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
                    backgroundColor: kBorder(context),
                    color: over ? kDanger : kPrimaryLight,
                  ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('$consumed',
                        style: TextStyle(
                            fontSize: 36, fontWeight: FontWeight.w800, color: kText(context))),
                    Text('سعرة', style: TextStyle(fontSize: 12, color: kTextMuted(context))),
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
              _statBox('الهدف', '$goalCal', kTextMuted(context)),
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
          color: kSurfaceAlt(context),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: kBorder(context)),
        ),
        child: Column(
          children: [
            Text(value,
                style: TextStyle(
                    fontSize: 17, fontWeight: FontWeight.w700, color: color)),
            Text(label, style: TextStyle(fontSize: 11, color: kTextMuted(context))),
          ],
        ),
      ),
    );
  }

  // ── Macros card ───────────────────────────────────────────────
  Widget _macrosCard(Map<String, int> t) {
    return _card(
      title: '💪 المغذيات الكبرى',
      titleTrailing: IconButton(
        tooltip: 'تعديل الأهداف',
        icon: const Icon(Icons.edit, size: 18, color: kAccent),
        onPressed: _openEditGoals,
        visualDensity: VisualDensity.compact,
      ),
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
            Text(name,
                style: TextStyle(
                    fontWeight: FontWeight.w600, fontSize: 14, color: kText(context))),
            const Spacer(),
            Text('$value g / $goal g',
                style: TextStyle(fontSize: 13, color: kTextMuted(context))),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(99),
          child: LinearProgressIndicator(
            value: pct,
            minHeight: 8,
            backgroundColor: kSurfaceAlt2(context),
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
                  color: filled ? kWaterColor : kBorder(context),
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
                      style: TextStyle(fontSize: 12, color: kTextMuted(context))),
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
          border: Border.all(color: kBorder(context), width: 1.5),
          color: kSurface(context),
        ),
        child: Icon(icon, size: 20, color: kTextMuted(context)),
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
        color: kSurface(context),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: kBorder(context)),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          leading: Text(kMealIcons[mealType]!, style: const TextStyle(fontSize: 24)),
          title: Text(mealType,
              style: TextStyle(
                  fontWeight: FontWeight.w700, fontSize: 16, color: kText(context))),
          subtitle: Text('$mealCal سعرة',
              style: TextStyle(fontSize: 12, color: kTextMuted(context))),
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
              Icon(Icons.expand_more, color: kTextMuted(context)),
            ],
          ),
          children: items.isEmpty
              ? [
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      children: [
                        Icon(Icons.restaurant, size: 32, color: kBorder(context)),
                        const SizedBox(height: 8),
                        Text('لا توجد وجبات بعد',
                            style: TextStyle(fontSize: 13, color: kTextMuted(context))),
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
                        style: TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 14, color: kText(context))),
                    subtitle: Text(
                      '${item['grams'] != null ? '${item['grams']}g · ' : ''}'
                      'بروتين ${item['protein']}g · كارب ${item['carbs']}g · دهون ${item['fat']}g',
                      style: TextStyle(fontSize: 11, color: kTextMuted(context)),
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

  Widget _card({required String title, required Widget child, Widget? titleTrailing}) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: kSurface(context),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: kBorder(context)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(title,
                  style: TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w700, color: kText(context))),
              if (titleTrailing != null) ...[const Spacer(), titleTrailing],
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}
