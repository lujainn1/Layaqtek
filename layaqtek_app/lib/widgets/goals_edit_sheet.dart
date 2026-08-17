import 'package:flutter/material.dart';
import '../api.dart';
import '../main.dart';

const kKcalPerG = {'protein': 4, 'carbs': 4, 'fat': 9};

/// Bottom sheet for editing daily calorie/macro/water goals.
/// Mirrors frontend-react/src/components/GoalsModal.jsx.
class GoalsEditSheet extends StatefulWidget {
  final Map goals;
  final void Function(Map newGoals) onSaved;

  const GoalsEditSheet({super.key, required this.goals, required this.onSaved});

  @override
  State<GoalsEditSheet> createState() => _GoalsEditSheetState();
}

class _GoalsEditSheetState extends State<GoalsEditSheet> {
  late int calories;
  late Map<String, int> grams;
  late int water;
  bool saving = false;

  static const macros = [
    ('protein', 'البروتين', kProteinColor),
    ('carbs', 'الكربوهيدرات', kCarbsColor),
    ('fat', 'الدهون', kFatColor),
  ];

  @override
  void initState() {
    super.initState();
    calories = ((widget.goals['calories'] ?? 2000) as num).round();
    grams = {
      for (final m in macros) m.$1: ((widget.goals[m.$1] ?? 0) as num).round(),
    };
    water = ((widget.goals['water'] ?? 8) as num).round();
  }

  int _pctFor(String macro) {
    if (calories <= 0) return 0;
    final kcal = grams[macro]! * kKcalPerG[macro]!;
    return ((kcal / calories) * 100).round();
  }

  int get _totalPct => macros.fold(0, (s, m) => s + _pctFor(m.$1));

  void _onGramsChange(String macro, String value) {
    final v = int.tryParse(value) ?? 0;
    setState(() => grams[macro] = v.clamp(0, 2000));
  }

  void _onPctChange(String macro, String value) {
    final pct = int.tryParse(value) ?? 0;
    final clamped = pct.clamp(0, 100);
    setState(() {
      grams[macro] = ((clamped / 100 * calories) / kKcalPerG[macro]!).round();
    });
  }

  void _resetToAuto() {
    // No profile data available client-side — fall back to a standard
    // 30/40/30 split of current calories, same fallback the web uses.
    final cal = calories > 0 ? calories : 2000;
    setState(() {
      grams = {
        'protein': ((cal * 0.3) / 4).round(),
        'carbs': ((cal * 0.4) / 4).round(),
        'fat': ((cal * 0.3) / 9).round(),
      };
      water = 8;
    });
  }

  Future<void> _save() async {
    setState(() => saving = true);
    try {
      final data = await Api.updateGoals(
          calories, grams['protein']!, grams['carbs']!, grams['fat']!, water);
      final newGoals = (data['goals'] ?? {
            'calories': calories,
            'protein': grams['protein'],
            'carbs': grams['carbs'],
            'fat': grams['fat'],
            'water': water,
          }) as Map;
      await Api.updateUserGoals(newGoals);
      if (!mounted) return;
      widget.onSaved(newGoals);
      Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: kDanger,
        ));
      }
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final diff = (100 - _totalPct).abs();
    final status = diff == 0 ? 0 : (diff <= 5 ? 1 : 2); // 0=ok 1=warn 2=error
    final statusColor = [kPrimary, kAccent, kDanger][status];
    final canSave = diff <= 5 && calories >= 500;

    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      decoration: BoxDecoration(
        color: kSurface(context),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          Container(
            width: 40, height: 4,
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            decoration: BoxDecoration(
              color: kBorder(context),
              borderRadius: BorderRadius.circular(99),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              children: [
                Text('🎯 تعديل الأهداف اليومية',
                    style: TextStyle(
                        fontSize: 18, fontWeight: FontWeight.w700, color: kText(context))),
                const Spacer(),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.of(context).pop()),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              children: [
                Text('⚡ الهدف اليومي من السعرات',
                    style: TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w700, color: kTextMuted(context))),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: TextEditingController(text: '$calories')
                          ..selection = TextSelection.collapsed(offset: '$calories'.length),
                        keyboardType: TextInputType.number,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: 22, fontWeight: FontWeight.w800, color: kText(context)),
                        onChanged: (v) => setState(() => calories = int.tryParse(v) ?? 0),
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: kSurfaceAlt(context),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: kBorder(context)),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text('س.ح / يوم', style: TextStyle(color: kTextMuted(context))),
                  ],
                ),
                const SizedBox(height: 22),

                Text('💪 توزيع الماكروز',
                    style: TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w700, color: kTextMuted(context))),
                const SizedBox(height: 10),
                ...macros.map((m) {
                  final (key, label, color) = m;
                  final pct = _pctFor(key);
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                                width: 10, height: 10,
                                decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                            const SizedBox(width: 6),
                            Text(label,
                                style: TextStyle(
                                    fontWeight: FontWeight.w700, color: kText(context))),
                            const Spacer(),
                            Text('${grams[key]! * kKcalPerG[key]!} س.ح',
                                style: TextStyle(fontSize: 12, color: kTextMuted(context))),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            _miniField('$pct', '%', (v) => _onPctChange(key, v)),
                            const SizedBox(width: 8),
                            Icon(Icons.sync_alt, size: 16, color: kTextMuted(context)),
                            const SizedBox(width: 8),
                            _miniField('${grams[key]}', 'g', (v) => _onGramsChange(key, v)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(99),
                          child: LinearProgressIndicator(
                            value: (pct / 100).clamp(0.0, 1.0),
                            minHeight: 5,
                            backgroundColor: kSurfaceAlt2(context),
                            color: color,
                          ),
                        ),
                      ],
                    ),
                  );
                }),

                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    border: Border.all(color: statusColor.withOpacity(0.35)),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('مجموع النسب',
                          style: TextStyle(fontWeight: FontWeight.w700, color: statusColor)),
                      Text('$_totalPct%',
                          style: TextStyle(fontWeight: FontWeight.w700, color: statusColor)),
                    ],
                  ),
                ),
                const SizedBox(height: 22),

                Text('💧 هدف الماء',
                    style: TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w700, color: kTextMuted(context))),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _stepBtn(Icons.remove, () => setState(() => water = (water - 1).clamp(1, 20))),
                    const SizedBox(width: 16),
                    Text('$water',
                        style: TextStyle(
                            fontSize: 20, fontWeight: FontWeight.w800, color: kText(context))),
                    const SizedBox(width: 8),
                    Text('أكواب', style: TextStyle(color: kTextMuted(context))),
                    const SizedBox(width: 16),
                    _stepBtn(Icons.add, () => setState(() => water = (water + 1).clamp(1, 20))),
                  ],
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),

          Padding(
            padding: EdgeInsets.only(
              left: 20, right: 20, top: 4,
              bottom: MediaQuery.of(context).viewInsets.bottom + 20,
            ),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _resetToAuto,
                    style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                    child: const Text('↺ إعادة للأصل'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    onPressed: (!canSave || saving) ? null : _save,
                    style: FilledButton.styleFrom(
                      backgroundColor: kPrimary,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: saving
                        ? const SizedBox(
                            width: 20, height: 20,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                        : const Text('حفظ الأهداف',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _miniField(String value, String unit, void Function(String) onChanged) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: BoxDecoration(
          color: kSurfaceAlt(context),
          border: Border.all(color: kBorder(context)),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: TextEditingController(text: value)
                  ..selection = TextSelection.collapsed(offset: value.length),
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                onChanged: onChanged,
                style: TextStyle(fontWeight: FontWeight.w800, color: kText(context)),
                decoration: const InputDecoration(border: InputBorder.none, isDense: true),
              ),
            ),
            Text(unit, style: TextStyle(fontSize: 12, color: kTextMuted(context))),
          ],
        ),
      ),
    );
  }

  Widget _stepBtn(IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(99),
      child: Container(
        width: 36, height: 36,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: kSurfaceAlt2(context),
          border: Border.all(color: kBorder(context)),
        ),
        child: Icon(icon, size: 18, color: kTextMuted(context)),
      ),
    );
  }
}
