import 'package:flutter_test/flutter_test.dart';
import 'package:layaqtek_app/main.dart';

void main() {
  testWidgets('App renders login screen when logged out', (tester) async {
    await tester.pumpWidget(const LayaqtekApp(loggedIn: false));
    expect(find.text('لياقتك'), findsWidgets);
  });
}
