import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../api.dart';
import '../main.dart';

const _kMealTypes = ['فطور', 'غداء', 'عشاء', 'سناك'];

/// Card that lets the user snap/pick a food photo, sends it to the AI
/// analyze endpoint, and lets them add the detected items to a meal.
/// Mirrors frontend-react/src/components/AiAnalyzer.jsx.
class AiAnalyzerSection extends StatefulWidget {
  final void Function(String mealType, List<Map> items) onAddFoods;

  const AiAnalyzerSection({super.key, required this.onAddFoods});

  @override
  State<AiAnalyzerSection> createState() => _AiAnalyzerSectionState();
}

class _AiAnalyzerSectionState extends State<AiAnalyzerSection> {
  bool loading = false;
  Map? result;
  String mealType = _kMealTypes[0];
  final _picker = ImagePicker();

  Future<void> _pickAndAnalyze(ImageSource source) async {
    final XFile? picked = await _picker.pickImage(
      source: source,
      maxWidth: 1600,
      imageQuality: 82,
    );
    if (picked == null) return;

    setState(() {
      loading = true;
      result = null;
    });

    try {
      final bytes = await picked.readAsBytes();
      final b64 = base64Encode(bytes);
      final ext = picked.name.split('.').last.toLowerCase();
      final mime = switch (ext) {
        'png' => 'image/png',
        'webp' => 'image/webp',
        _ => 'image/jpeg',
      };
      final data = await Api.analyzeImage(b64, mime);
      if (mounted) setState(() => result = data);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: kDanger,
        ));
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void _showSourceSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: kSurface(context),
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera, color: kPrimary),
              title: const Text('التقاط صورة'),
              onTap: () {
                Navigator.pop(context);
                _pickAndAnalyze(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library, color: kPrimary),
              title: const Text('اختيار من المعرض'),
              onTap: () {
                Navigator.pop(context);
                _pickAndAnalyze(ImageSource.gallery);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _addAll() {
    final foods = (result?['foods'] ?? []) as List;
    if (foods.isEmpty) return;
    final items = foods.map<Map>((f) => {
          'name': f['name'],
          'calories': ((f['calories'] ?? 0) as num).round(),
          'protein': ((f['protein'] ?? 0) as num).round(),
          'carbs': ((f['carbs'] ?? 0) as num).round(),
          'fat': ((f['fat'] ?? 0) as num).round(),
          'serving': f['quantity'] ?? 'حصة واحدة',
          'addedAt': DateTime.now().toIso8601String(),
        }).toList();
    widget.onAddFoods(mealType, items);
    setState(() => result = null);
  }

  @override
  Widget build(BuildContext context) {
    final foods = (result?['foods'] ?? []) as List;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: kSurface(context),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: kPrimary.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('🤖 تحليل الطعام بالذكاء الاصطناعي',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: kText(context))),
          const SizedBox(height: 16),
          if (loading)
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  const CircularProgressIndicator(color: kPrimary),
                  const SizedBox(height: 12),
                  Text('جارِ تحليل الصورة...', style: TextStyle(color: kTextMuted(context))),
                ],
              ),
            )
          else if (result == null)
            InkWell(
              onTap: _showSourceSheet,
              borderRadius: BorderRadius.circular(16),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 32),
                decoration: BoxDecoration(
                  color: kPrimaryBgOf(context),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                      color: kPrimary.withOpacity(0.4), width: 1.5, style: BorderStyle.solid),
                ),
                child: Column(
                  children: [
                    const Text('📸', style: TextStyle(fontSize: 40)),
                    const SizedBox(height: 10),
                    Text('التقط صورة لطعامك',
                        style: TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w700, color: kText(context))),
                    const SizedBox(height: 4),
                    Text('سنحسب السعرات والمغذيات تلقائياً',
                        style: TextStyle(fontSize: 12, color: kTextMuted(context))),
                  ],
                ),
              ),
            )
          else ...[
            Text('نتائج التحليل · إجمالي: ${result!['totalCalories'] ?? 0} سعرة',
                style: const TextStyle(color: kPrimary, fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            ...foods.map((f) => Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: kPrimaryBgOf(context),
                    border: Border.all(color: kPrimary.withOpacity(0.3)),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(f['name'] ?? '',
                                style: TextStyle(
                                    fontWeight: FontWeight.w600, color: kText(context))),
                            Text(
                              '${f['quantity'] != null ? '${f['quantity']} · ' : ''}'
                              'بروتين ${f['protein']}g · كارب ${f['carbs']}g · دهون ${f['fat']}g',
                              style: TextStyle(fontSize: 11, color: kTextMuted(context)),
                            ),
                          ],
                        ),
                      ),
                      Text('${((f['calories'] ?? 0) as num).round()} س.ح',
                          style: const TextStyle(fontWeight: FontWeight.w800, color: kAccent)),
                    ],
                  ),
                )),
            if ((result!['message'] as String?)?.isNotEmpty == true) ...[
              const SizedBox(height: 4),
              Text(result!['message'],
                  style: TextStyle(fontSize: 12, color: kTextMuted(context))),
            ],
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              decoration: BoxDecoration(
                border: Border.all(color: kBorder(context)),
                borderRadius: BorderRadius.circular(10),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: mealType,
                  isExpanded: true,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  onChanged: (v) => setState(() => mealType = v ?? mealType),
                  items: _kMealTypes
                      .map((m) => DropdownMenuItem(value: m, child: Text(m)))
                      .toList(),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => setState(() => result = null),
                    style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 13)),
                    child: const Text('صورة أخرى'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    onPressed: foods.isEmpty ? null : _addAll,
                    style: FilledButton.styleFrom(
                      backgroundColor: kPrimary,
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('إضافة إلى الوجبة',
                        style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
