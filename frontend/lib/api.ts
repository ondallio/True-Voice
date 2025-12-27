// 백엔드 API 클라이언트
import { AnalysisResult, DEV_MODE, getMockAnalysisResult } from './supabase';

// API 기본 URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// API 응답 타입
interface AnalyzeResponse {
  success: boolean;
  result_id?: string;
  scores?: {
    accuracy: number;
    fluency: number;
    completeness: number;
    pronunciation: number;
  };
  feedback?: string;
  error?: string;
  formant?: {
    resonance_score: number;
    stability_score: number;
    feedback: string;
  };
  tone?: {
    tone_score: number;
    stability_score: number;
    clarity_score: number;
    intonation_score: number;
    mean_pitch: number;
    pitch_range: number;
    feedback: string;
  };
}

// 발음 분석 요청
export async function analyzeRecording(
  recordingId: string,
  referenceText: string
): Promise<{ result: AnalysisResult | null; error: Error | null }> {
  // 개발 모드에서는 목업 데이터 반환
  if (DEV_MODE) {
    console.log('[DEV] 목업 분석 결과 반환');
    // 실제 API 호출을 시뮬레이션하기 위해 약간의 지연
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return { result: getMockAnalysisResult(), error: null };
  }

  try {
    const response = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recording_id: recordingId,
        reference_text: referenceText,
      }),
    });

    const data: AnalyzeResponse = await response.json();

    if (!data.success) {
      // "No speech recognized" 오류를 친근한 메시지로 변환
      const errorMessage = data.error || '분석에 실패했습니다.';
      if (errorMessage.includes('No speech recognized')) {
        throw new Error('🎤 음성이 감지되지 않았어요!\n\n마이크에 가까이 대고 크고 또렷하게 말해보세요.');
      }
      throw new Error(errorMessage);
    }

    // 응답을 AnalysisResult 형태로 변환
    const result: AnalysisResult = {
      id: data.result_id!,
      recording_id: recordingId,
      created_at: new Date().toISOString(),
      accuracy_score: data.scores!.accuracy,
      fluency_score: data.scores!.fluency,
      completeness_score: data.scores!.completeness,
      pronunciation_score: data.scores!.pronunciation,
      feedback: data.feedback!,
      formant: data.formant,
      tone: data.tone,
    };

    return { result, error: null };
  } catch (error) {
    console.error('분석 요청 오류:', error);
    return { result: null, error: error as Error };
  }
}

// 분석 결과 조회
export async function getResult(
  resultId: string
): Promise<{ result: AnalysisResult | null; error: Error | null }> {
  // 개발 모드에서는 목업 데이터 반환
  if (DEV_MODE) {
    console.log('[DEV] 목업 결과 조회');
    return { result: getMockAnalysisResult(), error: null };
  }

  try {
    const response = await fetch(`${API_URL}/api/results/${resultId}`);
    const data = await response.json();

    const result: AnalysisResult = {
      id: data.id,
      recording_id: data.recording_id,
      created_at: data.created_at,
      accuracy_score: data.scores.accuracy,
      fluency_score: data.scores.fluency,
      completeness_score: data.scores.completeness,
      pronunciation_score: data.scores.pronunciation,
      feedback: data.feedback,
      formant: data.formant,
      tone: data.tone,
    };

    return { result, error: null };
  } catch (error) {
    console.error('결과 조회 오류:', error);
    return { result: null, error: error as Error };
  }
}

// 헬스 체크
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
