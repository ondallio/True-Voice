// 결과 화면 - 미니멀 디자인
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AnalysisResult, getRecordingUrl, DEV_MODE } from '../../lib/supabase';
import { getResult } from '../../lib/api';
import AudioPlayer from '../../components/AudioPlayer';
import ComparePlayer from '../../components/ComparePlayer';
import { addPracticeRecord } from '../../lib/history';

interface ToneAnalysis {
  tone_score: number;
  stability_score: number;
  clarity_score: number;
  intonation_score: number;
  mean_pitch: number;
  pitch_range: number;
  feedback: string;
}

interface FormantAnalysis {
  resonance_score: number;
  stability_score: number;
  feedback: string;
}

export default function ResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ 
    id: string; 
    resultData?: string;
    audioPath?: string;
  }>();

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadResult() {
      try {
        if (params.resultData) {
          const parsedResult = JSON.parse(params.resultData);
          setResult(parsedResult);
          if (params.audioPath && !DEV_MODE) {
            setAudioUrl(getRecordingUrl(params.audioPath));
          }
          setIsLoading(false);
          return;
        }
        const { result: fetchedResult, error: fetchError } = await getResult(params.id);
        if (fetchError) throw fetchError;
        setResult(fetchedResult);
      } catch (err) {
        setError('결과를 불러올 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    }
    loadResult();
  }, [params.id, params.resultData, params.audioPath]);

  // 히스토리에 저장
  useEffect(() => {
    async function saveToHistory() {
      if (!result || saved) return;
      
      const formant = result.formant as FormantAnalysis | undefined;
      const tone = (result as any).tone as ToneAnalysis | undefined;
      const avgScore = Math.round(
        (result.pronunciation_score + (formant?.resonance_score || 0) + (tone?.tone_score || 0)) / 3
      );

      await addPracticeRecord({
        date: new Date().toISOString(),
        text: result.reference_text || '연습 문장',
        pronunciationScore: Math.round(result.pronunciation_score),
        resonanceScore: Math.round(formant?.resonance_score || 0),
        toneScore: Math.round(tone?.tone_score || 0),
        avgScore,
        feedback: result.feedback,
      });
      setSaved(true);
    }
    saveToHistory();
  }, [result, saved]);

  function getScoreColor(score: number): string {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  }

  function getScoreGrade(score: number): string {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    return 'D';
  }

  function getScoreEmoji(score: number): string {
    if (score >= 90) return '🌟';
    if (score >= 80) return '✨';
    if (score >= 60) return '💪';
    return '📚';
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>결과 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>😕</Text>
          <Text style={styles.errorText}>{error || '결과를 찾을 수 없습니다.'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formant = result.formant as FormantAnalysis | undefined;
  const tone = (result as any).tone as ToneAnalysis | undefined;
  const avgScore = Math.round(
    (result.pronunciation_score + (formant?.resonance_score || 0) + (tone?.tone_score || 0)) / 3
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 헤더 - 종합 점수 */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>{getScoreEmoji(avgScore)}</Text>
          <Text style={styles.headerTitle}>분석 완료</Text>
          <View style={styles.totalScoreContainer}>
            <Text style={[styles.totalScore, { color: getScoreColor(avgScore) }]}>
              {avgScore}
            </Text>
            <Text style={styles.totalScoreLabel}>종합 점수</Text>
          </View>
        </View>

        {/* 3개 점수 카드 */}
        <View style={styles.scoreCards}>
          <ScoreCard
            icon="🗣️"
            label="발음"
            score={result.pronunciation_score}
            color="#6366f1"
            getScoreColor={getScoreColor}
          />
          <ScoreCard
            icon="🔊"
            label="공명"
            score={formant?.resonance_score || 0}
            color="#8b5cf6"
            getScoreColor={getScoreColor}
          />
          <ScoreCard
            icon="🎵"
            label="톤"
            score={tone?.tone_score || 0}
            color="#a855f7"
            getScoreColor={getScoreColor}
          />
        </View>

        {/* 발음 비교 플레이어 */}
        {audioUrl && result.reference_text && (
          <View style={styles.section}>
            <ComparePlayer 
              myAudioUrl={audioUrl} 
              referenceText={result.reference_text} 
            />
          </View>
        )}

        {/* 내 녹음만 재생 (비교 불가능 시) */}
        {audioUrl && !result.reference_text && (
          <View style={styles.section}>
            <AudioPlayer audioUrl={audioUrl} title="🎧 내 녹음 듣기" />
          </View>
        )}

        {/* 발음 상세 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗣️ 발음 분석</Text>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <DetailScore label="정확도" score={result.accuracy_score} />
              <DetailScore label="유창성" score={result.fluency_score} />
              <DetailScore label="완성도" score={result.completeness_score} />
            </View>
          </View>
        </View>

        {/* 공명 상세 */}
        {formant && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔊 공명 분석</Text>
            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <DetailScore label="공명" score={formant.resonance_score} />
                <DetailScore label="안정성" score={formant.stability_score} />
              </View>
              <View style={styles.feedbackBox}>
                <Text style={styles.feedbackText}>{formant.feedback}</Text>
              </View>
            </View>
          </View>
        )}

        {/* 톤 상세 */}
        {tone && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎵 톤 분석</Text>
            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <DetailScore label="명료도" score={tone.clarity_score} />
                <DetailScore label="안정성" score={tone.stability_score} />
                <DetailScore label="억양" score={tone.intonation_score} />
              </View>
              <View style={styles.pitchRow}>
                <View style={styles.pitchItem}>
                  <Text style={styles.pitchValue}>{Math.round(tone.mean_pitch)} Hz</Text>
                  <Text style={styles.pitchLabel}>평균 피치</Text>
                </View>
                <View style={styles.pitchDivider} />
                <View style={styles.pitchItem}>
                  <Text style={styles.pitchValue}>{Math.round(tone.pitch_range)} Hz</Text>
                  <Text style={styles.pitchLabel}>피치 범위</Text>
                </View>
              </View>
              <View style={styles.feedbackBox}>
                <Text style={styles.feedbackText}>{tone.feedback}</Text>
              </View>
            </View>
          </View>
        )}

        {/* 종합 피드백 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 피드백</Text>
          <View style={styles.feedbackCard}>
            <Text style={styles.mainFeedback}>{result.feedback}</Text>
          </View>
        </View>

        {/* 다시 연습 버튼 */}
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>🔄 다시 연습하기</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// 점수 카드 컴포넌트
function ScoreCard({ 
  icon, 
  label, 
  score, 
  color,
  getScoreColor 
}: { 
  icon: string; 
  label: string; 
  score: number; 
  color: string;
  getScoreColor: (s: number) => string;
}) {
  return (
    <View style={[styles.scoreCard, { borderTopColor: color }]}>
      <Text style={styles.scoreCardIcon}>{icon}</Text>
      <Text style={styles.scoreCardLabel}>{label}</Text>
      <Text style={[styles.scoreCardValue, { color: getScoreColor(score) }]}>
        {Math.round(score)}
      </Text>
    </View>
  );
}

// 상세 점수 컴포넌트
function DetailScore({ label, score }: { label: string; score: number }) {
  function getColor(s: number): string {
    if (s >= 80) return '#10b981';
    if (s >= 60) return '#f59e0b';
    return '#ef4444';
  }
  
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, { color: getColor(score) }]}>
        {Math.round(score)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6b7280',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // 헤더
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  totalScoreContainer: {
    alignItems: 'center',
  },
  totalScore: {
    fontSize: 64,
    fontWeight: '700',
    letterSpacing: -2,
  },
  totalScoreLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: -4,
  },
  // 점수 카드
  scoreCards: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  scoreCardIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  scoreCardLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  scoreCardValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  // 섹션
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  // 상세 카드
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  detailLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  // 피드백
  feedbackBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
  },
  feedbackText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },
  feedbackCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  mainFeedback: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  // 피치 정보
  pitchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  pitchItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  pitchValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  pitchLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  pitchDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e5e7eb',
  },
  // 버튼
  retryButton: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#6366f1',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
