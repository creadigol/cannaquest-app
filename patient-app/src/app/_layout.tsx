import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppProviders } from '@/providers/AppProviders';
import { useAuth } from '@/features/auth/auth.context';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { state } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const ready = state.status !== 'booting' && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  const authenticated = state.status === 'authenticated';

  useEffect(() => {
    if (!ready) return;
    if (__DEV__) {
      console.log('[RootNavigator] Auth state status:', state.status, 'authenticated:', authenticated);
    }
  }, [ready, state.status, authenticated]);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" redirect={authenticated} />
      <Stack.Screen name="(app)" redirect={!authenticated} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
