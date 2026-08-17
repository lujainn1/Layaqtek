import 'dart:async';
import 'package:flutter/material.dart';
import '../api.dart';
import '../main.dart';

/// Bottom sheet for searching the food database and adding an item.
/// Food data is stored per 100g — values scale with the grams input.
/// Search is server-side (GET /api/food/search), debounced, matching the
/// web app's FoodModal; the initial empty-state list comes from the
/// pre-fetched allFoods cache.
class AddFoodSheet extends StatefulWidget {
  final String mealType;
  final List allFoods;
  final void Function(Map item) onAdd;

  const AddFoodSheet({
    super.key,
    required this.mealType,
    required this.allFoods,
    required this.onAdd,
  });

  @override
  State<AddFoodSheet> createState() => _AddFoodSheetState();
}

class _AddFoodSheetState extends State<AddFoodSheet> {
  final searchCtrl = TextEditingController();
  final gramsCtrl = TextEditingController(text: '100');
  List results = [];
  Map? selected;
  bool searching = false;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    results = widget.allFoods.take(25).toList();
  }

  @override
  void dispose() {
    searchCtrl.dispose();
    gramsCtrl.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onQueryChanged(String query) {
    setState(() => selected = null);
    _debounce?.cancel();
    final q = query.trim();
    if (q.isEmpty) {
      setState(() => results = widget.allFoods.take(25).toList());
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 350), () => _search(q));
  }

  Future<void> _search(String query) async {
    setState(() => searching = true);
    try {
      final found = await Api.searchFood(query);
      if (mounted && searchCtrl.text.trim() == query) {
        setState(() => results = found);
      }
    } catch (_) {
      // fall back to local filtering if the server search fails
      if (mounted) {
        setState(() {
          results = widget.allFoods.where((f) {
            final name = (f['name'] ?? '') as String;
            final nameEn = ((f['nameEn'] ?? '') as String).toLowerCase();
            final category = (f['category'] ?? '') as String;
            return name.contains(query) ||
                nameEn.contains(query.toLowerCase()) ||
                category.contains(query);
          }).toList();
        });
      }
    } finally {
      if (mounted) setState(() => searching = false);
    }
  }

  int _forGrams(num per100, double grams) => (per100 * grams / 100).round();

  void _confirm() {
    if (selected == null) return;
    final grams = double.tryParse(gramsCtrl.text) ?? 100;
    if (grams <= 0) return;

    final f = selected!;
    widget.onAdd({
      'id': f['id'],
      'name': f['name'],
      'calories': _forGrams(f['calories'] ?? 0, grams),
      'protein': _forGrams(f['protein'] ?? 0, grams),
      'carbs': _forGrams(f['carbs'] ?? 0, grams),
      'fat': _forGrams(f['fat'] ?? 0, grams),
      'sugar': _forGrams(f['sugar'] ?? 0, grams),
      'fiber': _forGrams(f['fiber'] ?? 0, grams),
      'grams': grams.round(),
      'serving': '${grams.round()}g',
      'addedAt': DateTime.now().toIso8601String(),
    });
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final grams = double.tryParse(gramsCtrl.text) ?? 100;

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: BoxDecoration(
        color: kSurface(context),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Handle bar
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
                Text('إضافة طعام — ${widget.mealType}',
                    style: TextStyle(
                        fontSize: 18, fontWeight: FontWeight.w700, color: kText(context))),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),

          // Search field
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: TextField(
              controller: searchCtrl,
              onChanged: _onQueryChanged,
              autofocus: true,
              style: TextStyle(color: kText(context)),
              decoration: InputDecoration(
                hintText: 'ابحث عن طعام...',
                prefixIcon: searching
                    ? Padding(
                        padding: const EdgeInsets.all(14),
                        child: SizedBox(
                          width: 16, height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: kPrimary),
                        ),
                      )
                    : const Icon(Icons.search),
                filled: true,
                fillColor: kSurfaceAlt(context),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: kBorder(context)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: kBorder(context)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: kPrimaryLight, width: 1.5),
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),

          // Results list
          Expanded(
            child: results.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('🔍', style: TextStyle(fontSize: 32)),
                        const SizedBox(height: 8),
                        Text('لا توجد نتائج',
                            style: TextStyle(color: kTextMuted(context))),
                      ],
                    ),
                  )
                : ListView.builder(
                    itemCount: results.length,
                    itemBuilder: (_, i) {
                      final f = results[i];
                      final isSelected = selected != null && selected!['id'] == f['id'];
                      final servingW = (f['servingWeight'] ?? 100) as num;
                      final servingCal = _forGrams(f['calories'] ?? 0, servingW.toDouble());
                      return ListTile(
                        selected: isSelected,
                        selectedTileColor: kPrimaryBgOf(context),
                        onTap: () {
                          setState(() {
                            selected = f;
                            gramsCtrl.text = servingW.round().toString();
                          });
                        },
                        title: Text(f['name'] ?? '',
                            style: TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 15, color: kText(context))),
                        subtitle: Text(
                          '${f['serving'] ?? ''} · بروتين ${_forGrams(f['protein'] ?? 0, servingW.toDouble())}g · كارب ${_forGrams(f['carbs'] ?? 0, servingW.toDouble())}g',
                          style: TextStyle(fontSize: 12, color: kTextMuted(context)),
                        ),
                        trailing: isSelected
                            ? const Icon(Icons.check_circle, color: kPrimary)
                            : Text('$servingCal س.ح',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    color: kAccent,
                                    fontSize: 13)),
                      );
                    },
                  ),
          ),

          // Footer: grams + confirm
          if (selected != null)
            Container(
              padding: EdgeInsets.only(
                left: 20, right: 20, top: 14,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              decoration: BoxDecoration(
                color: kSurfaceAlt(context),
                border: Border(top: BorderSide(color: kBorder(context))),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '${selected!['name']} (${grams.round()}g) · ${_forGrams(selected!['calories'] ?? 0, grams)} سعرة',
                    style: TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w600, color: kText(context)),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Text('الكمية:', style: TextStyle(fontSize: 14, color: kText(context))),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: gramsCtrl,
                          keyboardType: TextInputType.number,
                          textAlign: TextAlign.center,
                          onChanged: (_) => setState(() {}),
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w700, color: kText(context)),
                          decoration: InputDecoration(
                            isDense: true,
                            filled: true,
                            fillColor: kSurface(context),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: BorderSide(color: kBorder(context)),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text('جرام', style: TextStyle(fontSize: 13, color: kText(context))),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: FilledButton(
                      onPressed: _confirm,
                      style: FilledButton.styleFrom(
                        backgroundColor: kPrimary,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('إضافة ✓',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
