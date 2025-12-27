// 테마 시스템
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@app_theme';

// 테마 타입
export type ThemeMode = 'light' | 'dark' | 'system';

// 색상 정의
export const lightColors = {
  // 배경
  background: '#fafafa',
  surface: '#ffffff',
  surfaceSecondary: '#f3f4f6',
  
  // 텍스트
  text: '#1f2937',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  
  // 브랜드
  primary: '#6366f1',
  primaryLight: '#ede9fe',
  accent: '#8b5cf6',
  
  // 상태
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  
  // 기타
  border: '#e5e7eb',
  divider: '#f0f0f0',
  overlay: 'rgba(0,0,0,0.5)',
};

export const darkColors = {
  // 배경
  background: '#0f0f0f',
  surface: '#1a1a1a',
  surfaceSecondary: '#262626',
  
  // 텍스트
  text: '#f9fafb',
  textSecondary: '#d1d5db',
  textTertiary: '#9ca3af',
  
  // 브랜드
  primary: '#818cf8',
  primaryLight: '#312e81',
  accent: '#a78bfa',
  
  // 상태
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  
  // 기타
  border: '#374151',
  divider: '#262626',
  overlay: 'rgba(0,0,0,0.7)',
};

export type Colors = typeof lightColors;

// 컨텍스트 타입
interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: Colors;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 테마 프로바이더
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // 저장된 테마 불러오기
  useEffect(() => {
    async function loadTheme() {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (saved && ['light', 'dark', 'system'].includes(saved)) {
          setModeState(saved as ThemeMode);
        }
      } catch (e) {}
      setIsLoaded(true);
    }
    loadTheme();
  }, []);

  // 테마 저장
  async function setMode(newMode: ThemeMode) {
    setModeState(newMode);
    await AsyncStorage.setItem(THEME_KEY, newMode);
  }

  // 실제 다크 모드 여부
  const isDark = mode === 'system' 
    ? systemScheme === 'dark' 
    : mode === 'dark';

  const colors = isDark ? darkColors : lightColors;

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

// 테마 훅
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// 테마별 스타일 생성 헬퍼
export function createThemedStyles<T extends Record<string, any>>(
  styleCreator: (colors: Colors, isDark: boolean) => T
) {
  return (colors: Colors, isDark: boolean) => styleCreator(colors, isDark);
}

