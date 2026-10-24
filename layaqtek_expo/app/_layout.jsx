import { useEffect } from 'react';
import { ActivityIndicator, I18nManager, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_800ExtraBold,
} from '@expo-google-fonts/tajawal';
import { ThemeProvider, useTheme } from '../src/ThemeContext';

// RTL — the one place React Native is clumsier than Flutter's Directionality.
// These run at module scope, before the first render, so a cold start lays out
// right-to-left. Note that the native flag only changes on app start: if you
// flip it while Fast Refresh is running, the layout will not update until you
// fully reload the app (press `r` in the Expo CLI).
//
// Because that flag can lag in development, the text styles in this app also
// set writingDirection/textAlign explicitly rather than relying on it alone.
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

function RootStack() {
  const { theme, colors } = useTheme();

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Tajawal_800ExtraBold,
  });

  useEffect(() => {
    if (fontError) console.warn('Tajawal failed to load:', fontError);
  }, [fontError]);

  // Render nothing until Tajawal is ready, so Arabic never flashes in the
  // system font first. Font errors fall through to the system font.
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
        <ActivityIndicator color="#16a34a" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootStack />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
