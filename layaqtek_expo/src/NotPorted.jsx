// Placeholder for the screens that are not ported yet, so every route the
// login screen links to resolves instead of throwing a navigation error.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from './ThemeContext';

export default function NotPorted({ title, source }) {
  const { colors, fonts } = useTheme();
  const s = styles(colors, fonts);

  return (
    <View style={s.page}>
      <Text style={s.emoji}>🚧</Text>
      <Text style={s.title}>{title}</Text>
      <Text style={s.body}>لم تُنقل هذه الشاشة إلى Expo بعد.</Text>
      <Text style={s.source} numberOfLines={2}>
        {source}
      </Text>
      <Pressable onPress={() => router.back()} style={s.back} hitSlop={8}>
        <Text style={s.backText}>رجوع</Text>
      </Pressable>
    </View>
  );
}

const styles = (c, f) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
    emoji: { fontSize: 40, lineHeight: 50 },
    title: { fontSize: 20, fontFamily: f.extrabold, color: c.text, marginTop: 8 },
    body: {
      fontSize: 14,
      fontFamily: f.regular,
      color: c.textMuted,
      marginTop: 6,
      textAlign: 'center',
      writingDirection: 'rtl',
    },
    source: {
      fontSize: 12,
      fontFamily: f.regular,
      color: c.primary,
      marginTop: 12,
      textAlign: 'center',
      writingDirection: 'ltr',
    },
    back: { marginTop: 24, paddingVertical: 10, paddingHorizontal: 20 },
    backText: { fontSize: 14, fontFamily: f.bold, color: c.primary },
  });
