import 'package:flutter/material.dart';
import '../api.dart';
import '../main.dart';
import 'dashboard.dart';

class ProfileSetupScreen extends StatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  State<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends State<ProfileSetupScreen> {
  int step = 0;
  bool saving = false;

  String? gender;
  final ageCtrl = TextEditingController();
  final weightCtrl = TextEditingController();
  final heightCtrl = TextEditingController();
  String? activityLevel;
  String? goal;

  static const activities = [
    ('sedentary', '🪑', 'خامل', 'عمل مكتبي، بدون رياضة'),
    ('light', '🚶', 'نشاط خفيف', 'رياضة 1-3 أيام أسبوعياً'),
    ('moderate', '🏃', 'نشاط متوسط', 'رياضة 3-5 أيام أسبوعياً'),
    ('active', '🏋️', 'نشيط', 'رياضة 6-7 أيام أسبوعياً'),
    ('veryActive', '⚡', 'نشيط جداً', 'رياضة يومية مكثفة'),
  ];

  static const goals = [
    ('lose', '📉', 'خسارة وزن', '−500 سعرة'),
    ('maintain', '⚖️', 'محافظة', 'بدون تغيير'),
    ('gain', '📈', 'زيادة وزن', '+300 سعرة'),
  ];

  @override
  void dispose() {
    ageCtrl.dispose();
    weightCtrl.dispose();
    heightCtrl.dispose();
    super.dispose();
  }

  bool get _stepValid => switch (step) {
        0 => gender != null && (int.tryParse(ageCtrl.text) ?? 0) >= 10,
        1 => (double.tryParse(weightCtrl.text) ?? 0) >= 20 &&
            (double.tryParse(heightCtrl.text) ?? 0) >= 50,
        2 => activityLevel != null,
        3 => goal != null,
        _ => false,
      };

  Future<void> _save() async {
    setState(() => saving = true);
    try {
      final data = await Api.saveProfile(
        gender: gender!,
        age: int.parse(ageCtrl.text),
        weight: double.parse(weightCtrl.text),
        height: double.parse(heightCtrl.text),
        activityLevel: activityLevel!,
        goal: goal!,
      );
      await Api.updateUserGoals(data['goals']);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const DashboardScreen()));
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
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 12),
              const Text('🔥', textAlign: TextAlign.center, style: TextStyle(fontSize: 44)),
              const SizedBox(height: 4),
              const Text('أخبرنا عنك',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
              Text('لنحسب احتياجك اليومي من السعرات',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: Colors.grey[600])),
              const SizedBox(height: 24),

              // Progress indicator
              Row(
                children: List.generate(4, (i) {
                  return Expanded(
                    child: Container(
                      height: 5,
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      decoration: BoxDecoration(
                        color: i <= step ? kPrimary : const Color(0xFFE2E8F0),
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 24),

              // Step content
              Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(22),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 16),
                  ],
                ),
                child: _buildStep(),
              ),
              const SizedBox(height: 20),

              // Navigation buttons
              Row(
                children: [
                  if (step > 0)
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => setState(() => step--),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 15),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('رجوع'),
                      ),
                    ),
                  if (step > 0) const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: FilledButton(
                      onPressed: !_stepValid || saving
                          ? null
                          : () {
                              if (step < 3) {
                                setState(() => step++);
                              } else {
                                _save();
                              }
                            },
                      style: FilledButton.styleFrom(
                        backgroundColor: kPrimary,
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      child: saving
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                  color: Colors.white, strokeWidth: 2.5))
                          : Text(step < 3 ? 'التالي' : 'احسب أهدافي 🎯',
                              style: const TextStyle(
                                  fontSize: 16, fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStep() {
    switch (step) {
      case 0:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('الجنس والعمر',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            Row(
              children: [
                _genderCard('male', '👨', 'ذكر'),
                const SizedBox(width: 12),
                _genderCard('female', '👩', 'أنثى'),
              ],
            ),
            const SizedBox(height: 16),
            _numField(ageCtrl, 'العمر', 'سنة'),
          ],
        );
      case 1:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('الوزن والطول',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            _numField(weightCtrl, 'الوزن', 'كغ'),
            const SizedBox(height: 14),
            _numField(heightCtrl, 'الطول', 'سم'),
          ],
        );
      case 2:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('مستوى نشاطك',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            ...activities.map((a) => _activityCard(a.$1, a.$2, a.$3, a.$4)),
          ],
        );
      default:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('هدفك',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            ...goals.map((g) => _goalCard(g.$1, g.$2, g.$3, g.$4)),
          ],
        );
    }
  }

  Widget _genderCard(String value, String icon, String label) {
    final selected = gender == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => gender = value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 20),
          decoration: BoxDecoration(
            color: selected ? kPrimaryBg : Colors.white,
            border: Border.all(
                color: selected ? kPrimary : const Color(0xFFE2E8F0),
                width: selected ? 2 : 1.5),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            children: [
              Text(icon, style: const TextStyle(fontSize: 34)),
              const SizedBox(height: 6),
              Text(label,
                  style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: selected ? kPrimary : Colors.grey[800])),
            ],
          ),
        ),
      ),
    );
  }

  Widget _activityCard(String value, String icon, String name, String desc) {
    final selected = activityLevel == value;
    return GestureDetector(
      onTap: () => setState(() => activityLevel = value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: selected ? kPrimaryBg : Colors.white,
          border: Border.all(
              color: selected ? kPrimary : const Color(0xFFE2E8F0),
              width: selected ? 2 : 1.5),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Text(icon, style: const TextStyle(fontSize: 26)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text(desc,
                      style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                ],
              ),
            ),
            if (selected) const Icon(Icons.check_circle, color: kPrimary),
          ],
        ),
      ),
    );
  }

  Widget _goalCard(String value, String icon, String name, String adjustment) {
    final selected = goal == value;
    return GestureDetector(
      onTap: () => setState(() => goal = value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: selected ? kPrimaryBg : Colors.white,
          border: Border.all(
              color: selected ? kPrimary : const Color(0xFFE2E8F0),
              width: selected ? 2 : 1.5),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Text(icon, style: const TextStyle(fontSize: 26)),
            const SizedBox(width: 12),
            Expanded(
                child: Text(name, style: const TextStyle(fontWeight: FontWeight.w700))),
            Text(adjustment,
                style: TextStyle(fontSize: 13, color: Colors.grey[600])),
            if (selected) ...[
              const SizedBox(width: 8),
              const Icon(Icons.check_circle, color: kPrimary),
            ],
          ],
        ),
      ),
    );
  }

  Widget _numField(TextEditingController ctrl, String label, String unit) {
    return TextField(
      controller: ctrl,
      keyboardType: TextInputType.number,
      textAlign: TextAlign.center,
      onChanged: (_) => setState(() {}),
      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
      decoration: InputDecoration(
        labelText: label,
        suffixText: unit,
        filled: true,
        fillColor: const Color(0xFFF8FAFC),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: kPrimaryLight, width: 1.5),
        ),
      ),
    );
  }
}
