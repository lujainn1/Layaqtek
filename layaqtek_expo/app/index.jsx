// Auth gate + placeholder for the dashboard.
// The real screen is still only in frontend-react/src/pages/Dashboard.jsx and
// layaqtek_app/lib/screens/dashboard.dart — this stub exists so the login flow
// has somewhere to land and you can confirm the token round-trip works.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BASE_URL, clearAuth, getUser, isAuthenticated } from '../src/api';
import { useTheme } from '../src/ThemeContext';

export default function Index() {
  const { colors, fonts } = useTheme();
  const s = styles(colors, fonts);
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      if (!(await isAuthenticated())) {
        router.replace('/login');
        return;
      }
      setUser(await getUser());
      setChecking(false);
    })();
  }, []);

  async function handleLogout() {
    await clearAuth();
    router.replace('/login');
  }

  if (checking) {
    return (
      <View style={[s.page, s.centered]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.page, s.centered]}>
      <Text style={s.emoji}>✅</Text>
      <Text style={s.title}>تم تسجيل الدخول</Text>
      {!!user?.name && <Text style={s.subtitle}>مرحباً {user.name}</Text>}

      <View style={s.note}>
        <Text style={s.noteTitle}>اللوحة الرئيسية لم تُنقل بعد</Text>
        <Text style={s.noteBody}>
          هذه شاشة مؤقتة للتأكد من أن تسجيل الدخول وحفظ الرمز يعملان.
        </Text>
        <Text style={s.baseUrl} numberOfLines={1}>
          {BASE_URL}
        </Text>
      </View>

      <Pressable onPress={handleLogout} style={s.logout} hitSlop={8}>
        <Text style={s.logoutText}>تسجيل الخروج</Text>
      </Pressable>
    </View>
  );
}

const styles = (c, f) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.bg, padding: 24 },
    centered: { alignItems: 'center', justifyContent: 'center' },
    emoji: { fontSize: 44, lineHeight: 54 },
    title: { fontSize: 24, fontFamily: f.extrabold, color: c.text, marginTop: 8 },
    subtitle: { fontSize: 15, fontFamily: f.regular, color: c.textMuted, marginTop: 4 },

    note: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      padding: 18,
      marginTop: 24,
      alignSelf: 'stretch',
    },
    noteTitle: {
      fontSize: 14,
      fontFamily: f.bold,
      color: c.text,
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    noteBody: {
      fontSize: 13,
      fontFamily: f.regular,
      color: c.textMuted,
      marginTop: 6,
      lineHeight: 20,
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    baseUrl: {
      fontSize: 12,
      fontFamily: f.regular,
      color: c.primary,
      marginTop: 10,
      textAlign: 'left',
      writingDirection: 'ltr',
    },

    logout: { marginTop: 24, paddingVertical: 10, paddingHorizontal: 20 },
    logoutText: { fontSize: 14, fontFamily: f.bold, color: c.danger },
  });
