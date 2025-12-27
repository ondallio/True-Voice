// 앱 레이아웃 설정
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../lib/theme';

const ONBOARDING_KEY = '@onboarding_complete';

function RootLayoutNav() {
  const { isDark, colors } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // 온보딩 완료 여부 확인
  useEffect(() => {
    async function checkOnboarding() {
      try {
        const value = await AsyncStorage.getItem(ONBOARDING_KEY);
        setNeedsOnboarding(value !== 'true');
      } catch {
        setNeedsOnboarding(true);
      }
      setIsReady(true);
    }
    checkOnboarding();
  }, []);

  // 온보딩이 필요하면 리다이렉트
  useEffect(() => {
    if (!isReady) return;
    
    const inOnboarding = segments[0] === 'onboarding';
    
    if (needsOnboarding && !inOnboarding) {
      router.replace('/onboarding');
    }
  }, [isReady, needsOnboarding, segments]);

  if (!isReady) return null;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        {/* 온보딩 화면 */}
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
          }}
        />
        {/* 홈/녹음 화면 */}
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        {/* 히스토리 화면 */}
        <Stack.Screen
          name="history"
          options={{
            title: '학습 기록',
            headerShown: true,
          }}
        />
        {/* 설정 화면 */}
        <Stack.Screen
          name="settings"
          options={{
            title: '설정',
            headerShown: true,
          }}
        />
        {/* 발음 연습 화면 */}
        <Stack.Screen
          name="drills"
          options={{
            title: '발음 연습',
            headerShown: false,
          }}
        />
        {/* 결과 화면 */}
        <Stack.Screen
          name="result/[id]"
          options={{
            title: '분석 결과',
            headerShown: true,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}
