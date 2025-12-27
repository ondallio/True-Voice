// 홈/녹음 화면 - 미니멀 디자인
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Keyboard,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RecordButton from '../components/RecordButton';
import TTSButton, { TTSIconButton } from '../components/TTSButton';
import { uploadRecording, createRecording, DEV_MODE } from '../lib/supabase';
import { analyzeRecording } from '../lib/api';
import {
  Quote,
  QuoteCategory,
  Difficulty,
  CATEGORIES,
  DIFFICULTIES,
  getRandomQuote,
} from '../lib/quotes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SAVED_SENTENCES_KEY = '@saved_sentences';

// 추천 문장
const SUGGESTED_TEXTS = [
  '안녕하세요',
  '감사합니다',
  '반갑습니다',
  '좋은 아침입니다',
  '오늘 날씨가 좋네요',
  '맛있게 드세요',
  '다음에 또 만나요',
  '도와주셔서 감사합니다',
];

type InputMode = 'suggested' | 'custom' | 'saved' | 'ai';

export default function HomeScreen() {
  const router = useRouter();
  
  // 상태
  const [inputMode, setInputMode] = useState<InputMode>('suggested');
  const [textIndex, setTextIndex] = useState(0);
  const [customText, setCustomText] = useState('');
  const [savedSentences, setSavedSentences] = useState<string[]>([]);
  const [savedIndex, setSavedIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  
  // AI 명언
  const [selectedCategory, setSelectedCategory] = useState<QuoteCategory | undefined>();
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);

  // 애니메이션
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSavedSentences();
  }, []);

  useEffect(() => {
    if (inputMode === 'ai' && !currentQuote) {
      generateNewQuote();
    }
  }, [inputMode]);

  // 문장 변경 애니메이션
  function animateTextChange(callback: () => void) {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setTimeout(callback, 150);
  }

  async function loadSavedSentences() {
    try {
      const stored = await AsyncStorage.getItem(SAVED_SENTENCES_KEY);
      if (stored) setSavedSentences(JSON.parse(stored));
    } catch (e) {}
  }

  async function saveSentences(sentences: string[]) {
    await AsyncStorage.setItem(SAVED_SENTENCES_KEY, JSON.stringify(sentences));
    setSavedSentences(sentences);
  }

  function generateNewQuote() {
    animateTextChange(() => {
      const quote = getRandomQuote(selectedCategory, selectedDifficulty);
      setCurrentQuote(quote);
    });
  }

  // 현재 연습 문장
  const currentText = inputMode === 'suggested' 
    ? SUGGESTED_TEXTS[textIndex] 
    : inputMode === 'saved' && savedSentences.length > 0
    ? savedSentences[savedIndex]
    : inputMode === 'ai' && currentQuote
    ? currentQuote.text
    : customText.trim();

  // 저장
  async function handleSave() {
    const text = inputMode === 'ai' && currentQuote ? currentQuote.text : customText.trim();
    if (!text) return;
    if (savedSentences.includes(text)) {
      Alert.alert('알림', '이미 저장된 문장입니다.');
      return;
    }
    await saveSentences([text, ...savedSentences]);
    Alert.alert('✓ 저장됨');
    if (inputMode === 'custom') setCustomText('');
  }

  // 삭제
  async function handleDelete(idx: number) {
    const newList = savedSentences.filter((_, i) => i !== idx);
    await saveSentences(newList);
    if (savedIndex >= newList.length && newList.length > 0) {
      setSavedIndex(newList.length - 1);
    }
  }

  // 녹음 완료
  async function handleRecordingComplete(uri: string, durationMs: number) {
    setIsAnalyzing(true);
    try {
      if (DEV_MODE) {
        setStatusMessage('분석 중...');
        const { result, error } = await analyzeRecording('mock-id', currentText);
        if (error) throw error;
        router.push({
          pathname: '/result/[id]',
          params: { id: result!.id, resultData: JSON.stringify(result) },
        });
        return;
      }

      setStatusMessage('업로드 중...');
      const fileName = `recording_${Date.now()}.wav`;
      const { path, error: uploadError } = await uploadRecording(uri, fileName);
      if (uploadError) throw uploadError;

      setStatusMessage('저장 중...');
      const { recording, error: createError } = await createRecording(path, currentText, durationMs);
      if (createError || !recording) throw createError || new Error('저장 실패');

      setStatusMessage('분석 중...');
      const { result, error: analyzeError } = await analyzeRecording(recording.id, currentText);
      if (analyzeError || !result) throw analyzeError || new Error('분석 실패');

      router.push({
        pathname: '/result/[id]',
        params: { id: result.id, resultData: JSON.stringify(result), audioPath: path },
      });
    } catch (error) {
      Alert.alert('오류', error instanceof Error ? error.message : '처리 중 오류');
    } finally {
      setIsAnalyzing(false);
      setStatusMessage('');
    }
  }

  // 다음 문장
  function handleNext() {
    animateTextChange(() => {
      if (inputMode === 'suggested') {
        setTextIndex((prev) => (prev + 1) % SUGGESTED_TEXTS.length);
      } else if (inputMode === 'saved' && savedSentences.length > 0) {
        setSavedIndex((prev) => (prev + 1) % savedSentences.length);
      } else if (inputMode === 'ai') {
        generateNewQuote();
      }
    });
  }

  const canRecord = currentText.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/settings')}>
          <Text style={styles.headerBtnText}>⚙️</Text>
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>True Voice</Text>
          {DEV_MODE && <View style={styles.devBadge}><Text style={styles.devText}>DEV</Text></View>}
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/history')}>
          <Text style={styles.headerBtnText}>📊</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 발음 연습 바로가기 */}
        <TouchableOpacity 
          style={styles.drillBanner}
          onPress={() => router.push('/drills')}
        >
          <Text style={styles.drillBannerEmoji}>🎯</Text>
          <View style={styles.drillBannerText}>
            <Text style={styles.drillBannerTitle}>발음 집중 연습</Text>
            <Text style={styles.drillBannerDesc}>ㄹ발음, 받침, 억양 등</Text>
          </View>
          <Text style={styles.drillBannerArrow}>→</Text>
        </TouchableOpacity>

        {/* 모드 선택 탭 */}
        <View style={styles.tabs}>
          {[
            { id: 'suggested', icon: '📝', label: '추천' },
            { id: 'ai', icon: '✨', label: '명언' },
            { id: 'custom', icon: '✏️', label: '입력' },
            { id: 'saved', icon: '💾', label: '저장' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, inputMode === tab.id && styles.tabActive]}
              onPress={() => {
                setInputMode(tab.id as InputMode);
                setShowOptions(false);
              }}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, inputMode === tab.id && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 연습 문장 표시 영역 */}
        <View style={styles.sentenceCard}>
          {inputMode === 'custom' ? (
            // 직접 입력
            <View style={styles.inputArea}>
              <TextInput
                style={styles.textInput}
                value={customText}
                onChangeText={setCustomText}
                placeholder="문장을 입력하세요..."
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={200}
              />
              {customText.length > 0 && (
                <View style={styles.inputActions}>
                  <TouchableOpacity onPress={() => setCustomText('')}>
                    <Text style={styles.clearBtn}>지우기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                    <Text style={styles.saveBtnText}>저장</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : inputMode === 'saved' && savedSentences.length === 0 ? (
            // 저장된 문장 없음
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>저장된 문장이 없습니다</Text>
            </View>
          ) : (
            // 문장 표시
            <>
              <View style={styles.sentenceHeader}>
                <Text style={styles.sentenceLabel}>읽어주세요</Text>
                <TTSIconButton text={currentText} />
              </View>
              
              <Animated.View style={{ opacity: fadeAnim }}>
                <Text style={styles.sentenceText}>{currentText}</Text>
                {inputMode === 'ai' && currentQuote && (
                  <Text style={styles.author}>— {currentQuote.author}</Text>
                )}
              </Animated.View>

              <View style={styles.sentenceActions}>
                <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                  <Text style={styles.nextBtnText}>
                    {inputMode === 'ai' ? '🔄 다른 명언' : '→ 다음'}
                  </Text>
                </TouchableOpacity>
                
                {(inputMode === 'ai' || inputMode === 'suggested') && (
                  <TouchableOpacity style={styles.saveSmallBtn} onPress={handleSave}>
                    <Text style={styles.saveSmallBtnText}>💾</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>

        {/* AI 명언 옵션 (접이식) */}
        {inputMode === 'ai' && (
          <View style={styles.optionsCard}>
            <TouchableOpacity 
              style={styles.optionsHeader}
              onPress={() => setShowOptions(!showOptions)}
            >
              <Text style={styles.optionsTitle}>카테고리 & 난이도</Text>
              <Text style={styles.optionsToggle}>{showOptions ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            
            {showOptions && (
              <View style={styles.optionsContent}>
                {/* 카테고리 */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  <TouchableOpacity
                    style={[styles.chip, !selectedCategory && styles.chipActive]}
                    onPress={() => setSelectedCategory(undefined)}
                  >
                    <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>전체</Text>
                  </TouchableOpacity>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.chip, selectedCategory === cat.id && styles.chipActive]}
                      onPress={() => setSelectedCategory(cat.id)}
                    >
                      <Text style={[styles.chipText, selectedCategory === cat.id && styles.chipTextActive]}>
                        {cat.emoji} {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                {/* 난이도 */}
                <View style={styles.difficultyRow}>
                  {DIFFICULTIES.map((d) => (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.diffChip, selectedDifficulty === d.id && styles.diffChipActive]}
                      onPress={() => setSelectedDifficulty(d.id)}
                    >
                      <Text style={[styles.diffText, selectedDifficulty === d.id && styles.diffTextActive]}>
                        {d.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* 저장된 문장 목록 */}
        {inputMode === 'saved' && savedSentences.length > 0 && (
          <View style={styles.savedList}>
            {savedSentences.map((text, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.savedItem, idx === savedIndex && styles.savedItemActive]}
                onPress={() => setSavedIndex(idx)}
                onLongPress={() => {
                  Alert.alert('삭제', `"${text.slice(0, 20)}..." 삭제할까요?`, [
                    { text: '취소', style: 'cancel' },
                    { text: '삭제', style: 'destructive', onPress: () => handleDelete(idx) },
                  ]);
                }}
              >
                <Text 
                  style={[styles.savedText, idx === savedIndex && styles.savedTextActive]}
                  numberOfLines={1}
                >
                  {text}
                </Text>
                <TouchableOpacity onPress={() => handleDelete(idx)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.deleteIcon}>×</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 추천 문장 목록 (작게) */}
        {inputMode === 'suggested' && (
          <View style={styles.suggestedGrid}>
            {SUGGESTED_TEXTS.map((text, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.suggestedChip, idx === textIndex && styles.suggestedChipActive]}
                onPress={() => animateTextChange(() => setTextIndex(idx))}
              >
                <Text style={[styles.suggestedChipText, idx === textIndex && styles.suggestedChipTextActive]}>
                  {text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* TTS 음성 선택 (명언 모드) */}
        {inputMode === 'ai' && currentQuote && (
          <View style={styles.ttsSection}>
            <TTSButton text={currentQuote.text} size="medium" />
          </View>
        )}
      </ScrollView>

      {/* 녹음 버튼 (하단 고정) */}
      <View style={styles.recordArea}>
        {isAnalyzing ? (
          <View style={styles.analyzing}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.analyzingText}>{statusMessage}</Text>
          </View>
        ) : (
          <>
            {!canRecord && (
              <Text style={styles.hint}>
                {inputMode === 'custom' ? '문장을 입력하세요' : '문장을 선택하세요'}
              </Text>
            )}
            <RecordButton
              onRecordingComplete={handleRecordingComplete}
              disabled={isAnalyzing || !canRecord}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: -0.5,
  },
  devBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  devText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ef4444',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    paddingBottom: 24,
  },
  // 발음 연습 배너
  drillBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  drillBannerEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  drillBannerText: {
    flex: 1,
  },
  drillBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5b21b6',
  },
  drillBannerDesc: {
    fontSize: 12,
    color: '#7c3aed',
    marginTop: 2,
  },
  drillBannerArrow: {
    fontSize: 18,
    color: '#7c3aed',
  },
  // 탭
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#1f2937',
    fontWeight: '600',
  },
  // 문장 카드
  sentenceCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    minHeight: 160,
  },
  sentenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sentenceLabel: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  sentenceText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 36,
    textAlign: 'center',
  },
  author: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  sentenceActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  nextBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
  },
  nextBtnText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  saveSmallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveSmallBtnText: {
    fontSize: 16,
  },
  // 입력 영역
  inputArea: {
    flex: 1,
  },
  textInput: {
    fontSize: 18,
    color: '#1f2937',
    minHeight: 100,
    textAlignVertical: 'top',
    lineHeight: 28,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
    gap: 16,
  },
  clearBtn: {
    fontSize: 14,
    color: '#9ca3af',
  },
  saveBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // 빈 상태
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#9ca3af',
  },
  // 옵션 카드
  optionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  optionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  optionsToggle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  optionsContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  chipScroll: {
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#ede9fe',
  },
  chipText: {
    fontSize: 13,
    color: '#6b7280',
  },
  chipTextActive: {
    color: '#7c3aed',
    fontWeight: '600',
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  diffChip: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  diffChipActive: {
    backgroundColor: '#dbeafe',
  },
  diffText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  diffTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  // 저장된 목록
  savedList: {
    gap: 8,
    marginBottom: 12,
  },
  savedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  savedItemActive: {
    backgroundColor: '#ede9fe',
    borderWidth: 1,
    borderColor: '#a78bfa',
  },
  savedText: {
    flex: 1,
    fontSize: 15,
    color: '#4b5563',
  },
  savedTextActive: {
    color: '#5b21b6',
    fontWeight: '600',
  },
  deleteIcon: {
    fontSize: 20,
    color: '#d1d5db',
    paddingLeft: 12,
  },
  // 추천 그리드
  suggestedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  suggestedChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  suggestedChipActive: {
    backgroundColor: '#ede9fe',
    borderColor: '#a78bfa',
  },
  suggestedChipText: {
    fontSize: 14,
    color: '#6b7280',
  },
  suggestedChipTextActive: {
    color: '#7c3aed',
    fontWeight: '600',
  },
  // TTS
  ttsSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  // 녹음 영역
  recordArea: {
    paddingVertical: 20,
    paddingBottom: 32,
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  analyzing: {
    alignItems: 'center',
  },
  analyzingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6b7280',
  },
  hint: {
    fontSize: 13,
    color: '#f87171',
    marginBottom: 12,
  },
});
