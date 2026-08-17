import 'package:flutter/material.dart';
import '../api.dart';
import '../main.dart';

class ProgressScreen extends StatefulWidget {
  const ProgressScreen({super.key});

  @override
  State<ProgressScreen> createState() => _ProgressScreenState();
}

class _ProgressScreenState extends State<ProgressScreen> {
  int days = 7;
  bool loading = true;
  Map? stats;
  Map goals = {'calories': 2000, 'protein': 150, 'carbs': 250, 'fat': 65, 'water': 8};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    final user = await Api.getUser();
    if (user?['goals'] != null) goals = {...goals, ...user!['goals']};
    try {
      stats = await Api.getStats(days);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: kDanger,
        ));
      }
    }
    if (mounted) setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('📊 التقدم والتحليل'),
        actions: const [ThemeToggleButton()],
      ),
      body: Column(
        children: [
          // Period tabs
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [7, 14, 30].map((d) {
                final active = days == d;
                return Expanded(
                  child: GestureDetector(
                    onTap: () {
                      if (days != d) {
                        days = d;
                        _load();
                      }
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: active ? kPrimary : kSurface(context),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                            color: active ? kPrimary : kBorder(context)),
                      ),
                      child: Text('$d أيام',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                            color: active ? Colors.white : kTextMuted(context),
                          )),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          Expanded(
            child: loading
                ? const Center(child: CircularProgressIndicator(color: kPrimary))
                : stats == null
                    ? Center(
                        child: Text('لا توجد بيانات',
                            style: TextStyle(color: kTextMuted(context))))
                    : ListView(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                        children: [
                          _statsGrid(),
                          const SizedBox(height: 16),
                          _chartCard(),
                          const SizedBox(height: 16),
                          _macroAvgCard(),
                          const SizedBox(height: 16),
                          _topFoodsCard(),
                        ],
                      ),
          ),
        ],
      ),
    );
  }

  // ── Stats summary cards ───────────────────────────────────────
  Widget _statsGrid() {
    final macroAvg = (stats!['macroAvg'] ?? {}) as Map;
    return Row(
      children: [
        _statCard('🔥', '${stats!['streak'] ?? 0}', 'أيام متتالية'),
        const SizedBox(width: 10),
        _statCard('📅', '${stats!['daysWithData'] ?? 0}/${stats!['totalDays'] ?? days}', 'أيام مسجلة'),
        const SizedBox(width: 10),
        _statCard('⚡', '${((macroAvg['calories'] ?? 0) as num).round()}', 'متوسط السعرات'),
      ],
    );
  }

  Widget _statCard(String icon, String value, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: kSurface(context),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: kBorder(context)),
        ),
        child: Column(
          children: [
            Text(icon, style: const TextStyle(fontSize: 24)),
            const SizedBox(height: 6),
            Text(value,
                style: TextStyle(
                    fontSize: 20, fontWeight: FontWeight.w800, color: kText(context))),
            Text(label,
                style: TextStyle(fontSize: 11, color: kTextMuted(context)),
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  // ── Daily calories bar chart ──────────────────────────────────
  Widget _chartCard() {
    final daily = (stats!['dailyCalories'] ?? []) as List;
    final goalCal = (goals['calories'] as num).toDouble();
    final maxVal = daily.fold<double>(goalCal, (max, d) {
      final c = ((d is Map ? d['calories'] : 0) as num).toDouble();
      return c > max ? c : max;
    });

    const dayNames = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];

    return _card(
      title: '📈 السعرات اليومية',
      child: daily.isEmpty
          ? Padding(
              padding: const EdgeInsets.all(20),
              child: Text('لا توجد بيانات بعد',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: kTextMuted(context))),
            )
          : SizedBox(
              height: 160,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: daily.map<Widget>((d) {
                  final m = d is Map ? d : {};
                  final cal = ((m['calories'] ?? 0) as num).toDouble();
                  final frac = maxVal > 0 ? (cal / maxVal).clamp(0.02, 1.0) : 0.02;
                  final over = cal > goalCal;
                  String label = '';
                  final dateStr = m['date'] as String?;
                  if (dateStr != null) {
                    final dt = DateTime.tryParse(dateStr);
                    if (dt != null) label = dayNames[dt.weekday % 7];
                  }
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 3),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          if (cal > 0)
                            Text('${cal.round()}',
                                style: TextStyle(
                                    fontSize: 9, color: kTextMuted(context))),
                          const SizedBox(height: 2),
                          FractionallySizedBox(
                            widthFactor: 1,
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 600),
                              height: 120 * frac,
                              decoration: BoxDecoration(
                                borderRadius: const BorderRadius.vertical(
                                    top: Radius.circular(6)),
                                color: cal == 0
                                    ? kSurfaceAlt2(context)
                                    : over
                                        ? kDanger
                                        : kPrimaryLight,
                              ),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(label,
                              style: TextStyle(
                                  fontSize: 10, color: kTextMuted(context))),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
    );
  }

  // ── Weekly macro averages ─────────────────────────────────────
  Widget _macroAvgCard() {
    final avg = (stats!['macroAvg'] ?? {}) as Map;
    return _card(
      title: '💪 متوسط المغذيات',
      child: Column(
        children: [
          _avgBar('البروتين', ((avg['protein'] ?? 0) as num).round(),
              (goals['protein'] as num).round(), kProteinColor),
          const SizedBox(height: 12),
          _avgBar('الكربوهيدرات', ((avg['carbs'] ?? 0) as num).round(),
              (goals['carbs'] as num).round(), kCarbsColor),
          const SizedBox(height: 12),
          _avgBar('الدهون', ((avg['fat'] ?? 0) as num).round(),
              (goals['fat'] as num).round(), kFatColor),
          const SizedBox(height: 12),
          _avgBar('الماء (أكواب)', ((avg['water'] ?? 0) as num).round(),
              (goals['water'] as num).round(), kWaterColor),
        ],
      ),
    );
  }

  Widget _avgBar(String name, int value, int goal, Color color) {
    final pct = goal > 0 ? (value / goal).clamp(0.0, 1.0) : 0.0;
    return Column(
      children: [
        Row(
          children: [
            Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            const Spacer(),
            Text('$value / $goal',
                style: TextStyle(fontSize: 12, color: kTextMuted(context))),
          ],
        ),
        const SizedBox(height: 5),
        ClipRRect(
          borderRadius: BorderRadius.circular(99),
          child: LinearProgressIndicator(
            value: pct,
            minHeight: 7,
            backgroundColor: kSurfaceAlt2(context),
            color: color,
          ),
        ),
      ],
    );
  }

  // ── Top foods ─────────────────────────────────────────────────
  Widget _topFoodsCard() {
    final topFoods = (stats!['topFoods'] ?? []) as List;
    const medals = ['🥇', '🥈', '🥉', '4', '5'];
    return _card(
      title: '🏆 الأطعمة الأكثر تكراراً',
      child: topFoods.isEmpty
          ? Padding(
              padding: const EdgeInsets.all(12),
              child: Text('لا توجد بيانات بعد',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: kTextMuted(context))),
            )
          : Column(
              children: List.generate(topFoods.length, (i) {
                final f = topFoods[i] as Map;
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 30,
                        child: Text(i < medals.length ? medals[i] : '${i + 1}',
                            style: const TextStyle(fontSize: 16)),
                      ),
                      Expanded(
                        child: Text(f['name'] ?? '',
                            style: const TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 14)),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                        decoration: BoxDecoration(
                          color: kPrimaryBg,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text('${f['count'] ?? 0} مرة',
                            style: const TextStyle(
                                fontSize: 12,
                                color: kPrimary,
                                fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                );
              }),
            ),
    );
  }

  Widget _card({required String title, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: kSurface(context),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: kBorder(context)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: TextStyle(
                  fontSize: 15, fontWeight: FontWeight.w700, color: kText(context))),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}
