// 발음 연습 화면
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  DRILL_CATEGORIES,
  DrillCategory,
  DrillSentence,
  getDrillsByCategory,
  getRandomDrill,
} from '../lib/pronunciationDrills';
import RecordButton from '../components/RecordButton';
import { TTSIconButton } from '../components/TTSButton';
import { uploadRecording, createRecording, DEV_MODE } from '../lib/supabase';
import { analyzeRecording } from '../lib/api';

export default function DrillsScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<DrillCategory | null>(null);
  const [currentDrill, setCurrentDrill] = useState<DrillSentence | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  function selectCategory(category: DrillCategory) {
    setSelectedCategory(category);
    const drill = getRandomDrill(category.id);
    setCurrentDrill(drill);
  }

  function nextDrill() {
    if (selectedCategory) {
      const drill = getRandomDrill(selectedCategory.id);
      setCurrentDrill(drill);
    }
  }

  function goBack() {
    if (currentDrill) {
      setCurrentDrill(null);
    } else {
      setSelectedCategory(null);
    }
  }

  async function handleRecordingComplete(uri: string, durationMs: number) {
    if (!currentDrill) return;
    
    setIsAnalyzing(true);
    try {
      if (DEV_MODE) {
        const { result, error } = await analyzeRecording('mock-id', currentDrill.text);
        if (error) throw error;
        router.push({
          pathname: '/result/[id]',
          params: { id: result!.id, resultData: JSON.stringify(result) },
        });
        return;
      }

      const fileName = `drill_${Date.now()}.wav`;
      const { path, error: uploadError } = await uploadRecording(uri, fileName);
      if (uploadError) throw uploadError;

      const { recording, error: createError } = await createRecording(path, currentDrill.text, durationMs);
      if (createError || !recording) throw createError || new Error('저장 실패');

      const { result, error: analyzeError } = await analyzeRecording(recording.id, currentDrill.text);
      if (analyzeError || !result) throw analyzeError || new Error('분석 실패');

      router.push({
        pathname: '/result/[id]',
        params: { id: result.id, resultData: JSON.stringify(result), audioPath: path },
      });
    } catch (error) {
      Alert.alert('오류', error instanceof Error ? error.message : '처리 중 오류');
    } finally {
      setIsAnalyzing(false);
    }
  }

  // 카테고리 목록
  if (!selectedCategory) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🎯 발음 연습</Text>
          <Text style={styles.subtitle}>집중적으로 연습할 발음을 선택하세요</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.categoryGrid}>
            {DRILL_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => selectCategory(category)}
              >
                <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryDesc}>{category.description}</Text>
                <View style={[
                  styles.difficultyBadge,
                  category.difficulty === 'easy' && styles.difficultyEasy,
                  category.difficulty === 'medium' && styles.difficultyMedium,
                  category.difficulty === 'hard' && styles.difficultyHard,
                ]}>
                  <Text style={styles.difficultyText}>
                    {category.difficulty === 'easy' ? '쉬움' : 
                     category.difficulty === 'medium' ? '보통' : '어려움'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 연습 화면
  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.drillHeader}>
        <TouchableOpacity onPress={goBack}>
          <Text style={styles.backBtn}>← 뒤로</Text>
        </TouchableOpacity>
        <View style={styles.drillHeaderCenter}>
          <Text style={styles.drillEmoji}>{selectedCategory.emoji}</Text>
          <Text style={styles.drillTitle}>{selectedCategory.name}</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.drillContent}>
        {currentDrill ? (
          <>
            {/* 현재 문장 */}
            <View style={styles.sentenceCard}>
              <View style={styles.sentenceHeader}>
                <Text style={styles.focusLabel}>
                  집중 발음: <Text style={styles.focusText}>{currentDrill.focus}</Text>
                </Text>
                <TTSIconButton text={currentDrill.text} />
              </View>
              
              <Text style={styles.sentenceText}>"{currentDrill.text}"</Text>
              
              <View style={styles.tipBox}>
                <Text style={styles.tipLabel}>💡 팁</Text>
                <Text style={styles.tipText}>{currentDrill.tip}</Text>
              </View>
            </View>

            {/* 다른 문장 버튼 */}
            <TouchableOpacity style={styles.nextBtn} onPress={nextDrill}>
              <Text style={styles.nextBtnText}>🔄 다른 문장</Text>
            </TouchableOpacity>

            {/* 녹음 버튼 */}
            <View style={styles.recordArea}>
              <RecordButton
                onRecordingComplete={handleRecordingComplete}
                disabled={isAnalyzing}
              />
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>문장이 없습니다</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  // 카테고리 그리드
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  categoryEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  categoryDesc: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  difficultyEasy: {
    backgroundColor: '#d1fae5',
  },
  difficultyMedium: {
    backgroundColor: '#fef3c7',
  },
  difficultyHard: {
    backgroundColor: '#fee2e2',
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  // 연습 화면
  drillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    fontSize: 15,
    color: '#6366f1',
    fontWeight: '500',
  },
  drillHeaderCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drillEmoji: {
    fontSize: 24,
  },
  drillTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  drillContent: {
    paddingBottom: 40,
  },
  // 문장 카드
  sentenceCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  sentenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  focusLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  focusText: {
    color: '#6366f1',
    fontWeight: '600',
  },
  sentenceText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 20,
  },
  tipBox: {
    backgroundColor: '#fef9c3',
    borderRadius: 12,
    padding: 16,
  },
  tipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
  nextBtn: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  nextBtnText: {
    fontSize: 15,
    color: '#4b5563',
    fontWeight: '500',
  },
  recordArea: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
});

