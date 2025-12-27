// 온보딩 화면
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Animated,
  ViewToken,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const ONBOARDING_KEY = '@onboarding_complete';

const slides = [
  {
    id: '1',
    emoji: '🎤',
    title: 'True Voice에 오신 것을\n환영합니다',
    description: '발음 교정을 통해\n더 자신감 있는 목소리를 만들어보세요',
    color: '#6366f1',
  },
  {
    id: '2',
    emoji: '📝',
    title: '문장을 선택하고\n녹음하세요',
    description: '추천 문장, 명언, 직접 입력 등\n다양한 방식으로 연습할 수 있어요',
    color: '#8b5cf6',
  },
  {
    id: '3',
    emoji: '📊',
    title: 'AI가 발음을\n분석해드려요',
    description: '발음, 공명, 톤을 종합적으로 분석하고\n개선 방법을 알려드려요',
    color: '#a855f7',
  },
  {
    id: '4',
    emoji: '🎧',
    title: '표준 발음과\n비교해보세요',
    description: 'TTS 표준 발음과 내 녹음을 비교하며\n차이점을 파악하세요',
    color: '#ec4899',
  },
  {
    id: '5',
    emoji: '🏆',
    title: '꾸준히 연습하고\n성장하세요',
    description: '매일 연습하며 레벨업하고\n배지를 수집해보세요',
    color: '#f43f5e',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  async function completeOnboarding() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/');
  }

  function handleNext() {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToOffset({ 
        offset: nextIndex * width, 
        animated: true 
      });
      setCurrentIndex(nextIndex);
    } else {
      completeOnboarding();
    }
  }

  function handleSkip() {
    completeOnboarding();
  }

  // 스크롤 시 인덱스 업데이트
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { 
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / width);
        if (index !== currentIndex && index >= 0 && index < slides.length) {
          setCurrentIndex(index);
        }
      }
    }
  );

  // 아이템 레이아웃 (scrollToIndex에 필요)
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: width,
    offset: width * index,
    index,
  }), []);

  return (
    <SafeAreaView style={styles.container}>
      {/* 스킵 버튼 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>건너뛰기</Text>
        </TouchableOpacity>
      </View>

      {/* 슬라이드 */}
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={getItemLayout}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={[styles.emojiContainer, { backgroundColor: item.color }]}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />

      {/* 인디케이터 */}
      <View style={styles.indicatorContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              currentIndex === index && styles.indicatorActive,
            ]}
          />
        ))}
      </View>

      {/* 진행 상황 */}
      <Text style={styles.progress}>
        {currentIndex + 1} / {slides.length}
      </Text>

      {/* 다음/시작 버튼 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: slides[currentIndex].color }]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {currentIndex === slides.length - 1 ? '시작하기 🚀' : '다음 →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// 온보딩 완료 여부 확인
export async function checkOnboardingComplete(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    alignItems: 'flex-end',
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 15,
    color: '#9ca3af',
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emojiContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: '#6366f1',
    width: 24,
  },
  progress: {
    textAlign: 'center',
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  button: {
    backgroundColor: '#6366f1',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});
