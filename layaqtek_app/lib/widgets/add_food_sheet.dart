import 'package:flutter/material.dart';
import '../main.dart';

/// Bottom sheet for searching the food database and adding an item.
/// Food data is stored per 100g — values scale with the grams input.
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

  @override
  void initState() {
    super.initState();
    results = widget.allFoods.take(25).toList();
  }

  @override
  void dispose() {
    searchCtrl.dispose();
    gramsCtrl.dispose();
    super.dispose();
  }

  void _search(String query) {
    final q = query.trim().toLowerCase();
    setState(() {
      selected = null;
      results = q.isEmpty
          ? widget.allFoods.take(25).toList()
          : widget.allFoods.where((f) {
              final name = (f['name'] ?? '') as String;
              final nameEn = ((f['nameEn'] ?? '') as String).toLowerCase();
              final category = (f['category'] ?? '') as String;
              return name.contains(query.trim()) ||
                  nameEn.contains(q) ||
                  category.contains(query.trim());
            }).toList();
    });
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
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Handle bar
          Container(
            width: 40, height: 4,
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(99),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              children: [
                Text('إضافة طعام — ${widget.mealType}',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
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
              onChanged: _search,
              autofocus: true,
              decoration: InputDecoration(
                hintText: 'ابحث عن طعام...',
                prefixIcon: const Icon(Icons.search),
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
                            style: TextStyle(color: Colors.grey[600])),
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
                        selectedTileColor: kPrimaryBg,
                        onTap: () {
                          setState(() {
                            selected = f;
                            gramsCtrl.text = servingW.round().toString();
                          });
                        },
                        title: Text(f['name'] ?? '',
                            style: const TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 15)),
                        subtitle: Text(
                          '${f['serving'] ?? ''} · بروتين ${_forGrams(f['protein'] ?? 0, servingW.toDouble())}g · كارب ${_forGrams(f['carbs'] ?? 0, servingW.toDouble())}g',
                          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
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
              decoration: const BoxDecoration(
                color: Color(0xFFF8FAFC),
                border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '${selected!['name']} (${grams.round()}g) · ${_forGrams(selected!['calories'] ?? 0, grams)} سعرة',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Text('الكمية:', style: TextStyle(fontSize: 14)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: gramsCtrl,
                          keyboardType: TextInputType.number,
                          textAlign: TextAlign.center,
                          onChanged: (_) => setState(() {}),
                          style: const TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w700),
                          decoration: InputDecoration(
                            isDense: true,
                            filled: true,
                            fillColor: Colors.white,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Text('جرام', style: TextStyle(fontSize: 13)),
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
