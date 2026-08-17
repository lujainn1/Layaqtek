import 'package:flutter/material.dart';
import '../api.dart';
import '../main.dart';
import 'dashboard.dart';
import 'forgot_password.dart';
import 'profile_setup.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool isLogin = true;
  bool loading = false;
  bool obscure = true;

  final nameCtrl = TextEditingController();
  final emailCtrl = TextEditingController();
  final passCtrl = TextEditingController();

  @override
  void dispose() {
    nameCtrl.dispose();
    emailCtrl.dispose();
    passCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = emailCtrl.text.trim();
    final pass = passCtrl.text;
    if (email.isEmpty || pass.isEmpty || (!isLogin && nameCtrl.text.trim().isEmpty)) {
      _showError('يرجى تعبئة جميع الحقول');
      return;
    }

    setState(() => loading = true);
    try {
      if (isLogin) {
        final data = await Api.login(email, pass);
        await Api.saveAuth(data['token'], data['user']);
        if (!mounted) return;
        Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const DashboardScreen()));
      } else {
        final data = await Api.register(nameCtrl.text.trim(), email, pass);
        await Api.saveAuth(data['token'], data['user']);
        if (!mounted) return;
        Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const ProfileSetupScreen()));
      }
    } catch (e) {
      _showError(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: kDanger),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    // Logo
                    const Text('🔥', style: TextStyle(fontSize: 52)),
                    const SizedBox(height: 8),
                    Text('لياقتك',
                        style: TextStyle(
                            fontSize: 32, fontWeight: FontWeight.w800, color: kText(context))),
                    Text('تتبع سعراتك الحرارية بذكاء',
                        style: TextStyle(fontSize: 15, color: kTextMuted(context))),
                    const SizedBox(height: 28),

                    // Card
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: kSurface(context),
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
                          // Tabs
                          Container(
                            decoration: BoxDecoration(
                              color: kSurfaceAlt2(context),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                _tab('تسجيل الدخول', isLogin, () => setState(() => isLogin = true)),
                                _tab('إنشاء حساب', !isLogin, () => setState(() => isLogin = false)),
                              ],
                            ),
                          ),
                          const SizedBox(height: 20),

                          if (!isLogin) ...[
                            _field(nameCtrl, 'الاسم', Icons.person_outline),
                            const SizedBox(height: 14),
                          ],
                          _field(emailCtrl, 'البريد الإلكتروني', Icons.email_outlined,
                              keyboard: TextInputType.emailAddress, ltr: true),
                          const SizedBox(height: 14),
                          _field(passCtrl, 'كلمة المرور', Icons.lock_outline,
                              isPassword: true),
                          const SizedBox(height: 22),

                          // Submit
                          SizedBox(
                            width: double.infinity,
                            height: 52,
                            child: FilledButton(
                              onPressed: loading ? null : _submit,
                              style: FilledButton.styleFrom(
                                backgroundColor: kPrimary,
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12)),
                              ),
                              child: loading
                                  ? const SizedBox(
                                      width: 22,
                                      height: 22,
                                      child: CircularProgressIndicator(
                                          color: Colors.white, strokeWidth: 2.5))
                                  : Text(isLogin ? 'دخول' : 'إنشاء الحساب',
                                      style: const TextStyle(
                                          fontSize: 16, fontWeight: FontWeight.w700)),
                            ),
                          ),

                          if (isLogin) ...[
                            const SizedBox(height: 12),
                            TextButton(
                              onPressed: () => Navigator.of(context).push(
                                  MaterialPageRoute(builder: (_) => const ForgotPasswordScreen())),
                              child: Text('نسيت كلمة المرور؟',
                                  style: TextStyle(
                                      color: kPrimary,
                                      fontWeight: FontWeight.w600,
                                      fontSize: 13)),
                            ),
                          ],
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _feature('📊', 'تتبع دقيق'),
                        _feature('📱', 'سهل الاستخدام'),
                        _feature('🤖', 'ذكاء اصطناعي'),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            top: 12,
            left: 12,
            child: SafeArea(child: ThemeToggleButton()),
          ),
        ],
      ),
    );
  }

  Widget _tab(String label, bool active, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: active ? kSurface(context) : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: active
                ? [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 6)]
                : null,
          ),
          child: Text(label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 14,
                color: active ? kPrimary : kTextMuted(context),
              )),
        ),
      ),
    );
  }

  Widget _field(TextEditingController ctrl, String label, IconData icon,
      {bool isPassword = false, TextInputType? keyboard, bool ltr = false}) {
    return TextField(
      controller: ctrl,
      obscureText: isPassword && obscure,
      keyboardType: keyboard,
      textDirection: ltr ? TextDirection.ltr : null,
      style: TextStyle(color: kText(context)),
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, size: 20),
        suffixIcon: isPassword
            ? IconButton(
                icon: Icon(obscure ? Icons.visibility_off : Icons.visibility, size: 20),
                onPressed: () => setState(() => obscure = !obscure),
              )
            : null,
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
    );
  }

  Widget _feature(String icon, String label) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Column(
        children: [
          Text(icon, style: const TextStyle(fontSize: 22)),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(fontSize: 12, color: kTextMuted(context))),
        ],
      ),
    );
  }
}
