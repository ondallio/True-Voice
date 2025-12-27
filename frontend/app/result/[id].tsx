// 결과 화면
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

// 톤 분석 결과 타입
interface ToneAnalysis {
  tone_score: number;
  stability_score: number;
  clarity_score: number;
  intonation_score: number;
  mean_pitch: number;
  pitch_range: number;
  feedback: string;
}

// 공명 분석 결과 타입
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

  // 분석 결과
  const [result, setResult] = useState<AnalysisResult | null>(null);
  // 오디오 URL
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  // 로딩 상태
  const [isLoading, setIsLoading] = useState(true);
  // 에러 상태
  const [error, setError] = useState<string | null>(null);

  // 결과 데이터 로드
  useEffect(() => {
    async function loadResult() {
      try {
        // 파라미터로 전달된 결과가 있으면 사용
        if (params.resultData) {
          const parsedResult = JSON.parse(params.resultData);
          setResult(parsedResult);
          
          // 오디오 URL 설정
          if (params.audioPath && !DEV_MODE) {
            const url = getRecordingUrl(params.audioPath);
            setAudioUrl(url);
          }
          
          setIsLoading(false);
          return;
        }

        // API에서 결과 조회
        const { result: fetchedResult, error: fetchError } = await getResult(params.id);

        if (fetchError) {
          throw fetchError;
        }

        setResult(fetchedResult);
      } catch (err) {
        console.error('결과 로드 오류:', err);
        setError('결과를 불러올 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    loadResult();
  }, [params.id, params.resultData, params.audioPath]);

  // 점수에 따른 색상
  function getScoreColor(score: number): string {
    if (score >= 80) return '#27ae60'; // 녹색 (좋음)
    if (score >= 60) return '#f39c12'; // 주황색 (보통)
    return '#e74c3c'; // 빨간색 (개선 필요)
  }

  // 점수에 따른 이모지
  function getScoreEmoji(score: number): string {
    if (score >= 90) return '🌟';
    if (score >= 80) return '✅';
    if (score >= 60) return '💪';
    return '📚';
  }

  // 다시 연습하기
  function handleRetry() {
    router.back();
  }

  // 로딩 화면
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>결과 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 에러 화면
  if (error || !result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>😕</Text>
          <Text style={styles.errorText}>{error || '결과를 찾을 수 없습니다.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 타입 캐스팅
  const formant = result.formant as FormantAnalysis | undefined;
  const tone = (result as any).tone as ToneAnalysis | undefined;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 종합 점수 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>{getScoreEmoji(result.pronunciation_score)}</Text>
          <Text style={styles.headerTitle}>분석 완료!</Text>
        </View>

        {/* 3가지 주요 점수 카드 */}
        <View style={styles.mainScoresContainer}>
          {/* 발음 점수 */}
          <View style={[styles.mainScoreCard, styles.pronunciationCard]}>
            <Text style={styles.mainScoreIcon}>🗣️</Text>
            <Text style={styles.mainScoreLabel}>발음</Text>
            <Text style={[styles.mainScoreValue, { color: getScoreColor(result.pronunciation_score) }]}>
              {Math.round(result.pronunciation_score)}
            </Text>
          </View>

          {/* 공명 점수 */}
          <View style={[styles.mainScoreCard, styles.resonanceCard]}>
            <Text style={styles.mainScoreIcon}>🔊</Text>
            <Text style={styles.mainScoreLabel}>공명</Text>
            <Text style={[styles.mainScoreValue, { color: getScoreColor(formant?.resonance_score || 0) }]}>
              {Math.round(formant?.resonance_score || 0)}
            </Text>
          </View>

          {/* 톤 점수 */}
          <View style={[styles.mainScoreCard, styles.toneCard]}>
            <Text style={styles.mainScoreIcon}>🎵</Text>
            <Text style={styles.mainScoreLabel}>톤</Text>
            <Text style={[styles.mainScoreValue, { color: getScoreColor(tone?.tone_score || 0) }]}>
              {Math.round(tone?.tone_score || 0)}
            </Text>
          </View>
        </View>

        {/* 🎧 내 녹음 재생 */}
        {audioUrl && (
          <AudioPlayer audioUrl={audioUrl} title="내 녹음 듣기" />
        )}

        {/* 발음 상세 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🗣️</Text>
            <Text style={styles.sectionTitle}>발음 분석</Text>
          </View>
          <View style={styles.detailScoresRow}>
            <DetailItem label="정확도" score={result.accuracy_score} color={getScoreColor(result.accuracy_score)} />
            <DetailItem label="유창성" score={result.fluency_score} color={getScoreColor(result.fluency_score)} />
            <DetailItem label="완성도" score={result.completeness_score} color={getScoreColor(result.completeness_score)} />
          </View>
        </View>

        {/* 공명 상세 */}
        {formant && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🔊</Text>
              <Text style={styles.sectionTitle}>공명 분석</Text>
            </View>
            <View style={styles.detailScoresRow}>
              <DetailItem label="공명 품질" score={formant.resonance_score} color={getScoreColor(formant.resonance_score)} />
              <DetailItem label="안정성" score={formant.stability_score} color={getScoreColor(formant.stability_score)} />
            </View>
            <View style={styles.feedbackBox}>
              <Text style={styles.feedbackBoxText}>{formant.feedback}</Text>
            </View>
          </View>
        )}

        {/* 톤 상세 */}
        {tone && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🎵</Text>
              <Text style={styles.sectionTitle}>톤 분석</Text>
            </View>
            <View style={styles.detailScoresRow}>
              <DetailItem label="명료도" score={tone.clarity_score} color={getScoreColor(tone.clarity_score)} />
              <DetailItem label="안정성" score={tone.stability_score} color={getScoreColor(tone.stability_score)} />
              <DetailItem label="억양" score={tone.intonation_score} color={getScoreColor(tone.intonation_score)} />
            </View>
            <View style={styles.pitchInfo}>
              <View style={styles.pitchItem}>
                <Text style={styles.pitchLabel}>평균 피치</Text>
                <Text style={styles.pitchValue}>{Math.round(tone.mean_pitch)} Hz</Text>
              </View>
              <View style={styles.pitchDivider} />
              <View style={styles.pitchItem}>
                <Text style={styles.pitchLabel}>피치 범위</Text>
                <Text style={styles.pitchValue}>{Math.round(tone.pitch_range)} Hz</Text>
              </View>
            </View>
            <View style={styles.feedbackBox}>
              <Text style={styles.feedbackBoxText}>{tone.feedback}</Text>
            </View>
          </View>
        )}

        {/* 종합 피드백 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>💡</Text>
            <Text style={styles.sectionTitle}>종합 피드백</Text>
          </View>
          <Text style={styles.mainFeedbackText}>{result.feedback}</Text>
        </View>

        {/* 다시 연습하기 버튼 */}
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>🔄 다시 연습하기</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// 세부 항목 컴포넌트
function DetailItem({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, { color }]}>{Math.round(score)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
  },
  // 헤더
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  // 주요 점수 카드
  mainScoresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  mainScoreCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  pronunciationCard: {
    borderTopWidth: 3,
    borderTopColor: '#3498db',
  },
  resonanceCard: {
    borderTopWidth: 3,
    borderTopColor: '#9b59b6',
  },
  toneCard: {
    borderTopWidth: 3,
    borderTopColor: '#e67e22',
  },
  mainScoreIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  mainScoreLabel: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  mainScoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  // 섹션 카드
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2c3e50',
  },
  // 상세 점수 행
  detailScoresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailItem: {
    alignItems: 'center',
    minWidth: 70,
  },
  detailLabel: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  // 피드백 박스
  feedbackBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
  },
  feedbackBoxText: {
    fontSize: 14,
    color: '#5f6368',
    lineHeight: 20,
  },
  // 피치 정보
  pitchInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  pitchItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  pitchLabel: {
    fontSize: 12,
    color: '#95a5a6',
    marginBottom: 4,
  },
  pitchValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  pitchDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#ecf0f1',
  },
  // 종합 피드백
  mainFeedbackText: {
    fontSize: 15,
    color: '#34495e',
    lineHeight: 24,
  },
  // 버튼
  retryButton: {
    backgroundColor: '#3498db',
    borderRadius: 14,
    padding: 18,
    marginTop: 8,
    alignItems: 'center',
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
