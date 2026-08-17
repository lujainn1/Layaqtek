import 'package:flutter/material.dart';
import '../api.dart';
import '../main.dart';

/// Requests a password-reset email. There is deliberately no separate
/// "enter new password" screen in the app — the emailed link points at the
/// deployed web app's reset-password page (already fully working, mobile
/// responsive), so tapping it from the phone's mail client opens the
/// browser and the user resets there, then comes back and logs in here.
class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final emailCtrl = TextEditingController();
  bool loading = false;
  bool sent = false;
  String? error;

  @override
  void dispose() {
    emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = emailCtrl.text.trim();
    if (email.isEmpty) {
      setState(() => error = 'يرجى إدخال البريد الإلكتروني');
      return;
    }
    setState(() {
      loading = true;
      error = null;
    });
    try {
      await Api.forgotPassword(email);
      if (mounted) setState(() => sent = true);
    } catch (e) {
      if (mounted) setState(() => error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('استعادة كلمة المرور'),
        actions: const [ThemeToggleButton()],
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                const Text('🔥', style: TextStyle(fontSize: 44)),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: kSurface(context),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 16),
                    ],
                  ),
                  child: sent
                      ? Column(
                          children: [
                            const Icon(Icons.mark_email_read, color: kPrimary, size: 40),
                            const SizedBox(height: 12),
                            Text(
                              'إذا كان البريد الإلكتروني مسجلاً لدينا، سيصلك رابط إعادة تعيين كلمة المرور خلال دقائق',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: kText(context), fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'افتح الرابط من بريدك على هاتفك لإكمال إعادة التعيين، ثم عد لتسجيل الدخول هنا',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 12, color: kTextMuted(context)),
                            ),
                            const SizedBox(height: 16),
                            TextButton(
                              onPressed: () => Navigator.of(context).pop(),
                              child: const Text('العودة لتسجيل الدخول'),
                            ),
                          ],
                        )
                      : Column(
                          children: [
                            if (error != null) ...[
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(12),
                                margin: const EdgeInsets.only(bottom: 14),
                                decoration: BoxDecoration(
                                  color: kDanger.withOpacity(0.08),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: kDanger.withOpacity(0.3)),
                                ),
                                child: Text(error!,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(color: kDanger, fontSize: 13)),
                              ),
                            ],
                            TextField(
                              controller: emailCtrl,
                              keyboardType: TextInputType.emailAddress,
                              textDirection: TextDirection.ltr,
                              style: TextStyle(color: kText(context)),
                              decoration: InputDecoration(
                                labelText: 'البريد الإلكتروني',
                                prefixIcon: const Icon(Icons.email_outlined, size: 20),
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
                            const SizedBox(height: 20),
                            SizedBox(
                              width: double.infinity,
                              height: 50,
                              child: FilledButton(
                                onPressed: loading ? null : _submit,
                                style: FilledButton.styleFrom(
                                  backgroundColor: kPrimary,
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12)),
                                ),
                                child: loading
                                    ? const SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CircularProgressIndicator(
                                            color: Colors.white, strokeWidth: 2.5))
                                    : const Text('إرسال رابط إعادة التعيين',
                                        style: TextStyle(
                                            fontSize: 15, fontWeight: FontWeight.w700)),
                              ),
                            ),
                          ],
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
