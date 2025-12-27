// 홈/녹음 화면
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RecordButton from '../components/RecordButton';
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

// 저장된 문장 스토리지 키
const SAVED_SENTENCES_KEY = '@saved_sentences';

// 추천 연습 문장 목록
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

  // 입력 모드
  const [inputMode, setInputMode] = useState<InputMode>('suggested');
  // 현재 연습 텍스트 인덱스 (추천 문장용)
  const [textIndex, setTextIndex] = useState(0);
  // 직접 입력한 텍스트
  const [customText, setCustomText] = useState('');
  // 저장된 문장 목록
  const [savedSentences, setSavedSentences] = useState<string[]>([]);
  // 선택된 저장 문장 인덱스
  const [savedIndex, setSavedIndex] = useState(0);
  // 분석 중 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // 상태 메시지
  const [statusMessage, setStatusMessage] = useState('');

  // AI 명언 관련 상태
  const [selectedCategory, setSelectedCategory] = useState<QuoteCategory | undefined>(undefined);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);

  // 저장된 문장 불러오기
  useEffect(() => {
    loadSavedSentences();
  }, []);

  // AI 모드 진입 시 명언 생성
  useEffect(() => {
    if (inputMode === 'ai' && !currentQuote) {
      generateNewQuote();
    }
  }, [inputMode]);

  async function loadSavedSentences() {
    try {
      const stored = await AsyncStorage.getItem(SAVED_SENTENCES_KEY);
      if (stored) {
        setSavedSentences(JSON.parse(stored));
      }
    } catch (error) {
      console.error('저장된 문장 불러오기 실패:', error);
    }
  }

  async function saveSentences(sentences: string[]) {
    try {
      await AsyncStorage.setItem(SAVED_SENTENCES_KEY, JSON.stringify(sentences));
      setSavedSentences(sentences);
    } catch (error) {
      console.error('문장 저장 실패:', error);
    }
  }

  // 새 명언 생성
  function generateNewQuote() {
    const quote = getRandomQuote(selectedCategory, selectedDifficulty);
    setCurrentQuote(quote);
  }

  // 현재 연습 텍스트 (모드에 따라 다름)
  const currentText = inputMode === 'suggested' 
    ? SUGGESTED_TEXTS[textIndex] 
    : inputMode === 'saved' && savedSentences.length > 0
    ? savedSentences[savedIndex]
    : inputMode === 'ai' && currentQuote
    ? currentQuote.text
    : customText.trim();

  // 문장 저장 핸들러
  async function handleSaveSentence() {
    const textToSave = inputMode === 'ai' && currentQuote ? currentQuote.text : customText.trim();
    if (!textToSave) {
      Alert.alert('알림', '저장할 문장이 없습니다.');
      return;
    }
    if (savedSentences.includes(textToSave)) {
      Alert.alert('알림', '이미 저장된 문장입니다.');
      return;
    }
    const newList = [textToSave, ...savedSentences];
    await saveSentences(newList);
    Alert.alert('✅ 저장 완료', `"${textToSave.substring(0, 20)}..." 문장이 저장되었습니다.`);
    if (inputMode === 'custom') {
      setCustomText('');
    }
  }

  // 저장된 문장 삭제
  async function handleDeleteSaved(index: number) {
    Alert.alert(
      '문장 삭제',
      `"${savedSentences[index]}" 문장을 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            const newList = savedSentences.filter((_, i) => i !== index);
            await saveSentences(newList);
            if (savedIndex >= newList.length && newList.length > 0) {
              setSavedIndex(newList.length - 1);
            }
          },
        },
      ]
    );
  }

  // 녹음 완료 핸들러
  async function handleRecordingComplete(uri: string, durationMs: number) {
    console.log('녹음 완료:', uri, durationMs);
    setIsAnalyzing(true);

    try {
      // 개발 모드에서는 업로드 건너뛰기
      if (DEV_MODE) {
        setStatusMessage('분석 중...');

        // 목업 분석 결과 가져오기
        const { result, error } = await analyzeRecording('mock-id', currentText);

        if (error) {
          throw error;
        }

        // 결과 화면으로 이동
        router.push({
          pathname: '/result/[id]',
          params: {
            id: result!.id,
            resultData: JSON.stringify(result),
          },
        });
        return;
      }

      // 1. 파일 업로드
      setStatusMessage('업로드 중...');
      const fileName = `recording_${Date.now()}.wav`;
      const { path, error: uploadError } = await uploadRecording(uri, fileName);

      if (uploadError) {
        throw uploadError;
      }

      // 2. 녹음 기록 생성
      setStatusMessage('저장 중...');
      const { recording, error: createError } = await createRecording(
        path,
        currentText,
        durationMs
      );

      if (createError || !recording) {
        throw createError || new Error('녹음 기록 생성 실패');
      }

      // 3. 발음 분석 요청
      setStatusMessage('분석 중...');
      const { result, error: analyzeError } = await analyzeRecording(
        recording.id,
        currentText
      );

      if (analyzeError || !result) {
        throw analyzeError || new Error('분석 실패');
      }

      // 4. 결과 화면으로 이동 (녹음 파일 경로 포함)
      router.push({
        pathname: '/result/[id]',
        params: {
          id: result.id,
          resultData: JSON.stringify(result),
          audioPath: path,
        },
      });

    } catch (error) {
      console.error('처리 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '녹음 처리 중 오류가 발생했습니다.';
      Alert.alert('알림', errorMessage);
    } finally {
      setIsAnalyzing(false);
      setStatusMessage('');
    }
  }

  // 다음 추천 문장으로 변경
  function handleNextText() {
    setTextIndex((prev) => (prev + 1) % SUGGESTED_TEXTS.length);
  }

  // 추천 문장 선택
  function handleSelectSuggested(index: number) {
    setTextIndex(index);
    setInputMode('suggested');
    Keyboard.dismiss();
  }

  // 저장된 문장 선택
  function handleSelectSaved(index: number) {
    setSavedIndex(index);
    setInputMode('saved');
    Keyboard.dismiss();
  }

  // 녹음 시작 가능 여부
  const canRecord = currentText.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 제목 */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🎤</Text>
          <Text style={styles.title}>True Voice</Text>
          <Text style={styles.subtitle}>문장을 선택하거나 직접 입력하세요</Text>
        </View>

        {/* 모드 선택 탭 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, inputMode === 'suggested' && styles.tabActive]}
            onPress={() => setInputMode('suggested')}
          >
            <Text style={[styles.tabText, inputMode === 'suggested' && styles.tabTextActive]}>
              📝 추천
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, inputMode === 'ai' && styles.tabActive]}
            onPress={() => setInputMode('ai')}
          >
            <Text style={[styles.tabText, inputMode === 'ai' && styles.tabTextActive]}>
              ✨ 명언
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, inputMode === 'custom' && styles.tabActive]}
            onPress={() => setInputMode('custom')}
          >
            <Text style={[styles.tabText, inputMode === 'custom' && styles.tabTextActive]}>
              ✏️ 입력
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, inputMode === 'saved' && styles.tabActive]}
            onPress={() => setInputMode('saved')}
          >
            <Text style={[styles.tabText, inputMode === 'saved' && styles.tabTextActive]}>
              💾 저장
            </Text>
          </TouchableOpacity>
        </View>

        {/* 연습 텍스트 카드 */}
        <View style={styles.textCard}>
          {inputMode === 'suggested' ? (
            // 추천 문장 모드
            <>
              <Text style={styles.practiceLabel}>읽어주세요:</Text>
              <Text style={styles.practiceText}>"{currentText}"</Text>
              <TouchableOpacity onPress={handleNextText} style={styles.nextButtonContainer}>
                <Text style={styles.nextButton}>다른 문장 보기 →</Text>
              </TouchableOpacity>
              
              {/* 추천 문장 목록 */}
              <View style={styles.suggestedList}>
                {SUGGESTED_TEXTS.map((text, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.suggestedItem,
                      index === textIndex && styles.suggestedItemActive
                    ]}
                    onPress={() => handleSelectSuggested(index)}
                  >
                    <Text style={[
                      styles.suggestedText,
                      index === textIndex && styles.suggestedTextActive
                    ]}>
                      {text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : inputMode === 'ai' ? (
            // AI 명언 모드
            <>
              {/* 카테고리 선택 */}
              <Text style={styles.practiceLabel}>카테고리:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                <TouchableOpacity
                  style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
                  onPress={() => { setSelectedCategory(undefined); generateNewQuote(); }}
                >
                  <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
                    🎲 전체
                  </Text>
                </TouchableOpacity>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
                    onPress={() => { setSelectedCategory(cat.id); }}
                  >
                    <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextActive]}>
                      {cat.emoji} {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* 난이도 선택 */}
              <Text style={[styles.practiceLabel, { marginTop: 16 }]}>난이도:</Text>
              <View style={styles.difficultyRow}>
                {DIFFICULTIES.map((diff) => (
                  <TouchableOpacity
                    key={diff.id}
                    style={[styles.difficultyChip, selectedDifficulty === diff.id && styles.difficultyChipActive]}
                    onPress={() => { setSelectedDifficulty(diff.id); }}
                  >
                    <Text style={[styles.difficultyChipText, selectedDifficulty === diff.id && styles.difficultyChipTextActive]}>
                      {diff.name}
                    </Text>
                    <Text style={styles.difficultyDesc}>{diff.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 명언 표시 */}
              {currentQuote && (
                <View style={styles.quoteContainer}>
                  <Text style={styles.quoteText}>"{currentQuote.text}"</Text>
                  <Text style={styles.quoteAuthor}>- {currentQuote.author}</Text>
                </View>
              )}

              {/* 버튼들 */}
              <View style={styles.quoteActions}>
                <TouchableOpacity style={styles.refreshButton} onPress={generateNewQuote}>
                  <Text style={styles.refreshButtonText}>🔄 다른 명언</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveQuoteButton} onPress={handleSaveSentence}>
                  <Text style={styles.saveQuoteButtonText}>💾 저장</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : inputMode === 'custom' ? (
            // 직접 입력 모드
            <>
              <Text style={styles.practiceLabel}>연습할 문장을 입력하세요:</Text>
              <TextInput
                style={styles.textInput}
                value={customText}
                onChangeText={setCustomText}
                placeholder="여기에 문장을 입력하거나 붙여넣기..."
                placeholderTextColor="#bdc3c7"
                multiline
                maxLength={200}
                autoCorrect={false}
              />
              <View style={styles.inputActions}>
                <Text style={styles.charCount}>
                  {customText.length}/200
                </Text>
                <View style={styles.inputButtons}>
                  {customText.length > 0 && (
                    <>
                      <TouchableOpacity 
                        style={styles.clearButton}
                        onPress={() => setCustomText('')}
                      >
                        <Text style={styles.clearButtonText}>지우기</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.saveButton}
                        onPress={handleSaveSentence}
                      >
                        <Text style={styles.saveButtonText}>💾 저장</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </>
          ) : (
            // 저장된 문장 모드
            <>
              {savedSentences.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>📭</Text>
                  <Text style={styles.emptyText}>저장된 문장이 없습니다</Text>
                  <Text style={styles.emptySubtext}>
                    '입력' 또는 '명언' 탭에서 문장을 저장하세요
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.practiceLabel}>읽어주세요:</Text>
                  <Text style={styles.practiceText}>"{savedSentences[savedIndex]}"</Text>
                  
                  {/* 저장된 문장 목록 */}
                  <View style={styles.savedList}>
                    {savedSentences.map((text, index) => (
                      <View key={index} style={styles.savedItemContainer}>
                        <TouchableOpacity
                          style={[
                            styles.savedItem,
                            index === savedIndex && styles.savedItemActive
                          ]}
                          onPress={() => handleSelectSaved(index)}
                        >
                          <Text 
                            style={[
                              styles.savedText,
                              index === savedIndex && styles.savedTextActive
                            ]}
                            numberOfLines={1}
                          >
                            {text}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteSaved(index)}
                        >
                          <Text style={styles.deleteButtonText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </>
          )}
        </View>

        {/* 현재 선택된 문장 표시 (직접 입력 모드일 때) */}
        {inputMode === 'custom' && customText.trim().length > 0 && (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>읽어주세요:</Text>
            <Text style={styles.previewText}>"{customText.trim()}"</Text>
          </View>
        )}

        {/* 녹음 버튼 */}
        <View style={styles.recordSection}>
          {isAnalyzing ? (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="large" color="#3498db" />
              <Text style={styles.analyzingText}>{statusMessage}</Text>
            </View>
          ) : (
            <>
              {!canRecord && (
                <Text style={styles.warningText}>
                  {inputMode === 'saved' ? '저장된 문장을 선택해주세요' : 
                   inputMode === 'ai' ? '명언을 생성해주세요' : '문장을 입력해주세요'}
                </Text>
              )}
              <RecordButton
                onRecordingComplete={handleRecordingComplete}
                disabled={isAnalyzing || !canRecord}
              />
            </>
          )}
        </View>

        {/* 개발 모드 표시 */}
        {DEV_MODE && (
          <View style={styles.devBadge}>
            <Text style={styles.devBadgeText}>DEV MODE</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  // 탭 스타일
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#e9ecef',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#2c3e50',
    fontWeight: '600',
  },
  // 텍스트 카드 스타일
  textCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  practiceLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  practiceText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
    lineHeight: 32,
  },
  nextButtonContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  nextButton: {
    fontSize: 14,
    color: '#3498db',
  },
  // 추천 문장 목록 스타일
  suggestedList: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestedItem: {
    backgroundColor: '#f1f3f4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  suggestedItemActive: {
    backgroundColor: '#e8f4fd',
    borderColor: '#3498db',
  },
  suggestedText: {
    fontSize: 13,
    color: '#5f6368',
  },
  suggestedTextActive: {
    color: '#3498db',
    fontWeight: '600',
  },
  // AI 명언 스타일
  categoryScroll: {
    marginBottom: 8,
  },
  categoryChip: {
    backgroundColor: '#f1f3f4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: '#fef3e2',
    borderColor: '#e67e22',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#5f6368',
  },
  categoryChipTextActive: {
    color: '#e67e22',
    fontWeight: '600',
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  difficultyChip: {
    flex: 1,
    backgroundColor: '#f1f3f4',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  difficultyChipActive: {
    backgroundColor: '#e8f4fd',
    borderColor: '#3498db',
  },
  difficultyChipText: {
    fontSize: 14,
    color: '#5f6368',
    fontWeight: '500',
  },
  difficultyChipTextActive: {
    color: '#3498db',
    fontWeight: '600',
  },
  difficultyDesc: {
    fontSize: 10,
    color: '#95a5a6',
    marginTop: 2,
  },
  quoteContainer: {
    backgroundColor: '#fef9e7',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f1c40f',
  },
  quoteText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#2c3e50',
    lineHeight: 28,
    fontStyle: 'italic',
  },
  quoteAuthor: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 12,
    textAlign: 'right',
  },
  quoteActions: {
    flexDirection: 'row',
    gap: 12,
  },
  refreshButton: {
    flex: 1,
    backgroundColor: '#f1f3f4',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 14,
    color: '#5f6368',
    fontWeight: '500',
  },
  saveQuoteButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveQuoteButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  // 직접 입력 스타일
  textInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#2c3e50',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  inputActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    fontSize: 12,
    color: '#95a5a6',
  },
  inputButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#e74c3c',
  },
  saveButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  // 저장된 문장 스타일
  savedList: {
    marginTop: 20,
    gap: 8,
  },
  savedItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savedItem: {
    flex: 1,
    backgroundColor: '#f1f3f4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  savedItemActive: {
    backgroundColor: '#e8f4fd',
    borderColor: '#3498db',
  },
  savedText: {
    fontSize: 14,
    color: '#5f6368',
  },
  savedTextActive: {
    color: '#3498db',
    fontWeight: '600',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f3f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#95a5a6',
  },
  // 빈 상태
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#95a5a6',
    textAlign: 'center',
  },
  // 미리보기 카드
  previewCard: {
    backgroundColor: '#e8f4fd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  previewLabel: {
    fontSize: 12,
    color: '#3498db',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#2c3e50',
  },
  // 녹음 섹션
  recordSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  warningText: {
    fontSize: 14,
    color: '#e74c3c',
    marginBottom: 16,
  },
  analyzingContainer: {
    alignItems: 'center',
  },
  analyzingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  devBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#e74c3c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  devBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
