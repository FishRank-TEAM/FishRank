import React, { useEffect, useState } from 'react';
import { QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useFonts, NotoSansKR_400Regular, NotoSansKR_700Bold } from '@expo-google-fonts/noto-sans-kr';
import * as SplashScreen from 'expo-splash-screen';
import * as Network from 'expo-network';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { useNavigationStore } from '@/store/navigation.store';
import ToastHost from '@/components/ui/ToastHost';
import OnboardingSheet from '@/components/onboarding/OnboardingSheet';
import { isOnboardingComplete } from '@/lib/onboarding';
import { colors } from '@/theme/colors';
import { motion } from '@/theme/motion';

SplashScreen.preventAutoHideAsync().catch(() => {});

import { getMobileQueryClient } from '@/lib/query-client';

onlineManager.setEventListener((setOnline) => {
  const sub = Network.addNetworkStateListener((state) => {
    setOnline(!!state.isConnected);
  });
  return () => sub.remove();
});

function isProtectedRoute(segments: string[]): boolean {
  const [group, screen] = segments;
  if (group === '(tabs)' && (screen === 'capture' || screen === 'my')) return true;
  if (group === 'upload' || group === 'my') return true;
  if (group === 'community' && screen === 'write') return true;
  if (group === 'admin') return true;
  return false;
}

function segmentsToPath(segments: string[]): string {
  if (!segments.length) return '/(tabs)';
  return `/${segments.join('/')}`;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { isLoggedIn, authReady, user, bootstrap } = useAuthStore();
  const setReturnTo = useNavigationStore((s) => s.setReturnTo);
  const consumeReturnTo = useNavigationStore((s) => s.consumeReturnTo);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!authReady) return;
    const inAuth = segments[0] === '(auth)';
    const protectedRoute = isProtectedRoute(segments as string[]);
    const adminRoute = segments[0] === 'admin';

    if (!isLoggedIn && protectedRoute) {
      setReturnTo(segmentsToPath(segments as string[]));
      router.replace('/(auth)/login');
    } else if (isLoggedIn && inAuth) {
      const returnTo = consumeReturnTo();
      router.replace((returnTo ?? '/(tabs)') as never);
    } else if (adminRoute && isLoggedIn && user?.role !== 'admin') {
      router.replace('/(tabs)/my');
    }
  }, [authReady, isLoggedIn, user?.role, segments, router, setReturnTo, consumeReturnTo]);

  if (!authReady) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.oceanBright} />
      </View>
    );
  }

  return <>{children}</>;
}

function OnboardingGate() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const authReady = useAuthStore((s) => s.authReady);
  const segments = useSegments();
  const onTabs = segments[0] === '(tabs)';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!authReady || !onTabs) return;
    isOnboardingComplete().then((done) => {
      if (!done) setVisible(true);
    });
  }, [authReady, onTabs, isLoggedIn]);

  return <OnboardingSheet visible={visible} onDone={() => setVisible(false)} />;
}

function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sub = Network.addNetworkStateListener((state) => {
      setOffline(state.isConnected === false);
    });
    Network.getNetworkStateAsync().then((s) => setOffline(s.isConnected === false));
    return () => sub.remove();
  }, []);

  if (!offline) return null;
  return (
    <View style={styles.offline} accessibilityRole="alert">
      <Text style={styles.offlineText}>오프라인 — 일부 기능을 사용할 수 없습니다</Text>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ NotoSansKR_400Regular, NotoSansKR_700Bold });

  useEffect(() => {
    if (fontsLoaded) {
      const TextAny = Text as typeof Text & { defaultProps?: { style?: object } };
      TextAny.defaultProps = TextAny.defaultProps ?? {};
      TextAny.defaultProps.style = { fontFamily: 'NotoSansKR_400Regular' };
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={getMobileQueryClient()}>
        <AuthGate>
          <StatusBar style="auto" />
          <OfflineBanner />
          <ToastHost />
          <OnboardingGate />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.oceanDeep },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: '700', fontFamily: 'NotoSansKR_700Bold' },
              headerBackTitleVisible: false,
              headerBackButtonDisplayMode: 'minimal',
              contentStyle: { backgroundColor: colors.bg },
              animation: 'fade',
              animationDuration: motion.pageTransitionMs,
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: '' }} />
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="catch/[id]" options={{ title: '기록 상세' }} />
            <Stack.Screen name="my/edit" options={{ title: '프로필 편집' }} />
          </Stack>
        </AuthGate>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  offline: {
    backgroundColor: colors.error,
    paddingVertical: 6,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 44 : 6,
  },
  offlineText: { color: '#fff', fontSize: 12, textAlign: 'center', fontWeight: '600' },
});
