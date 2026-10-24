// Ported from frontend-react/src/pages/Login.jsx.
// Same state machine and same copy; the markup is React Native primitives and
// the CSS classes are now StyleSheet objects built from the theme tokens.

import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiLogin, apiRegister, saveAuth } from '../src/api';
import { useTheme } from '../src/ThemeContext';

export default function Login() {
  const { theme, toggleTheme, colors, fonts, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const s = styles(colors, fonts, shadows);

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [obscure, setObscure] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState(null);

  async function handleSubmit() {
    setError('');
    if (!email.trim() || !password || (!isLogin && !name.trim())) {
      setError('يرجى تعبئة جميع الحقول');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const data = await apiLogin(email.trim(), password);
        await saveAuth(data.token, data.user);
        router.replace('/');
      } else {
        const data = await apiRegister(name.trim(), email.trim(), password);
        await saveAuth(data.token, data.user);
        router.replace('/profile-setup');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (field) => [s.input, focused === field && s.inputFocused];

  return (
    <KeyboardAvoidingView
      style={s.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={s.themeToggle}
          onPress={toggleTheme}
          accessibilityLabel={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
        >
          <Text style={s.themeToggleIcon}>{theme === 'dark' ? '☀️' : '🌙'}</Text>
        </Pressable>

        <View style={s.logo}>
          <Text style={s.logoEmoji}>🔥</Text>
          <Text style={s.logoTitle}>لياقتك</Text>
          <Text style={s.logoSubtitle}>تتبع سعراتك الحرارية بذكاء</Text>
        </View>

        <View style={s.card}>
          <View style={s.tabs}>
            <Pressable
              style={[s.tab, isLogin && s.tabActive]}
              onPress={() => {
                setIsLogin(true);
                setError('');
              }}
            >
              <Text style={[s.tabText, isLogin && s.tabTextActive]}>تسجيل الدخول</Text>
            </Pressable>
            <Pressable
              style={[s.tab, !isLogin && s.tabActive]}
              onPress={() => {
                setIsLogin(false);
                setError('');
              }}
            >
              <Text style={[s.tabText, !isLogin && s.tabTextActive]}>إنشاء حساب</Text>
            </Pressable>
          </View>

          {!!error && (
            <View style={s.alert}>
              <Text style={s.alertText}>⚠ {error}</Text>
            </View>
          )}

          {!isLogin && (
            <View style={s.field}>
              <Text style={s.label}>الاسم</Text>
              <TextInput
                style={inputStyle('name')}
                value={name}
                onChangeText={setName}
                placeholder="اسمك الكامل"
                placeholderTextColor={colors.textMuted}
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused(null)}
                autoComplete="name"
                returnKeyType="next"
              />
            </View>
          )}

          <View style={s.field}>
            <Text style={s.label}>البريد الإلكتروني</Text>
            <TextInput
              style={[inputStyle('email'), s.inputLtr]}
              value={email}
              onChangeText={setEmail}
              placeholder="example@email.com"
              placeholderTextColor={colors.textMuted}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="next"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>كلمة المرور</Text>
            <View style={s.inputWrapper}>
              <TextInput
                style={[inputStyle('password'), s.inputWithButton]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                secureTextEntry={obscure}
                autoCapitalize="none"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
              />
              <Pressable
                style={s.togglePassword}
                onPress={() => setObscure((o) => !o)}
                accessibilityLabel={obscure ? 'إظهار كلمة المرور' : 'إخفاء كلمة المرور'}
                hitSlop={8}
              >
                <Text style={s.togglePasswordIcon}>{obscure ? '👁' : '🙈'}</Text>
              </Pressable>
            </View>
          </View>

          <Pressable onPress={handleSubmit} disabled={loading} style={s.submitWrapper}>
            {({ pressed }) => (
              <LinearGradient
                colors={[colors.primaryLight, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[s.submit, (loading || pressed) && s.submitDimmed]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.submitText}>{isLogin ? 'دخول' : 'إنشاء الحساب'}</Text>
                )}
              </LinearGradient>
            )}
          </Pressable>

          {isLogin && (
            <View style={s.linkRow}>
              <Link href="/forgot-password" asChild>
                <Pressable hitSlop={8}>
                  <Text style={s.link}>نسيت كلمة المرور؟</Text>
                </Pressable>
              </Link>
            </View>
          )}
        </View>

        <View style={s.features}>
          <View style={s.feature}>
            <Text style={s.featureIcon}>📊</Text>
            <Text style={s.featureLabel}>تتبع دقيق</Text>
          </View>
          <View style={s.feature}>
            <Text style={s.featureIcon}>📱</Text>
            <Text style={s.featureLabel}>سهل الاستخدام</Text>
          </View>
          <View style={s.feature}>
            <Text style={s.featureIcon}>🤖</Text>
            <Text style={s.featureLabel}>ذكاء اصطناعي</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (c, f, shadow) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.bg },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 20,
      maxWidth: 480,
      width: '100%',
      alignSelf: 'center',
    },

    themeToggle: {
      position: 'absolute',
      top: 8,
      left: 4,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
    },
    themeToggleIcon: { fontSize: 20 },

    logo: { alignItems: 'center', marginBottom: 28 },
    logoEmoji: { fontSize: 52, lineHeight: 62 },
    logoTitle: { fontSize: 32, fontFamily: f.extrabold, color: c.text, marginTop: 4 },
    logoSubtitle: { fontSize: 15, fontFamily: f.regular, color: c.textMuted, marginTop: 4 },

    card: { backgroundColor: c.surface, borderRadius: 24, padding: 24, ...shadow.card },

    tabs: {
      flexDirection: 'row',
      backgroundColor: c.surfaceAlt2,
      borderRadius: 12,
      padding: 4,
      marginBottom: 24,
    },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
    tabActive: {
      backgroundColor: c.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    tabText: { fontSize: 14, fontFamily: f.bold, color: c.textMuted },
    tabTextActive: { color: c.primary },

    alert: {
      backgroundColor: c.dangerBg,
      borderWidth: 1,
      borderColor: c.dangerBorder,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 16,
    },
    alertText: {
      fontSize: 13,
      fontFamily: f.bold,
      color: c.danger,
      textAlign: 'right',
      writingDirection: 'rtl',
    },

    field: { marginBottom: 16 },
    label: {
      fontSize: 13,
      fontFamily: f.medium,
      color: c.textMuted,
      marginBottom: 6,
      textAlign: 'right',
      writingDirection: 'rtl',
    },

    inputWrapper: { position: 'relative', justifyContent: 'center' },
    input: {
      backgroundColor: c.surfaceAlt,
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: 12,
      paddingVertical: 13,
      paddingHorizontal: 16,
      fontSize: 15,
      fontFamily: f.regular,
      color: c.text,
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    inputFocused: { borderColor: c.primaryLight, backgroundColor: c.primaryBg },
    inputLtr: { textAlign: 'left', writingDirection: 'ltr' },
    inputWithButton: { paddingLeft: 46 },

    togglePassword: { position: 'absolute', left: 10, padding: 6 },
    togglePasswordIcon: { fontSize: 16 },

    submitWrapper: { borderRadius: 12, ...shadow.button },
    submit: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
    submitDimmed: { opacity: 0.6 },
    submitText: { color: '#fff', fontSize: 16, fontFamily: f.bold },

    linkRow: { alignItems: 'center', marginTop: 14 },
    link: { fontSize: 13, fontFamily: f.medium, color: c.primary },

    features: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
    feature: { paddingHorizontal: 12, alignItems: 'center' },
    featureIcon: { fontSize: 22, lineHeight: 28 },
    featureLabel: { fontSize: 12, fontFamily: f.regular, color: c.textMuted, marginTop: 4 },
  });
