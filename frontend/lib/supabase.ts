// Supabase 클라이언트 설정
import { createClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// 환경 변수에서 Supabase 설정 가져오기
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// 개발 모드 확인
const DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 녹음 데이터 타입
export interface Recording {
  id: string;
  created_at: string;
  file_path: string;
  original_text: string;
  duration_ms: number | null;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
}

// 공명(포먼트) 분석 결과
export interface FormantAnalysis {
  resonance_score: number;   // 공명 품질 점수 (0-100)
  stability_score: number;   // 안정성 점수 (0-100)
  feedback: string;
}

// 톤 분석 결과
export interface ToneAnalysis {
  tone_score: number;        // 종합 톤 점수 (0-100)
  stability_score: number;   // 안정성 점수 (0-100)
  clarity_score: number;     // 명료도 점수 (0-100)
  intonation_score: number;  // 억양 풍부함 점수 (0-100)
  mean_pitch: number;        // 평균 피치 (Hz)
  pitch_range: number;       // 피치 범위 (억양 변화)
  feedback: string;
}

// 분석 결과 데이터 타입
export interface AnalysisResult {
  id: string;
  recording_id: string;
  created_at: string;
  accuracy_score: number;
  fluency_score: number;
  completeness_score: number;
  pronunciation_score: number;
  feedback: string;
  // 공명 분석 결과
  formant?: FormantAnalysis;
  // 톤 분석 결과
  tone?: ToneAnalysis;
}

// 녹음 파일 업로드
export async function uploadRecording(
  fileUri: string,
  fileName: string
): Promise<{ path: string; error: Error | null }> {
  try {
    // 파일 경로 생성 (타임스탬프 + 파일명)
    const extension = '.m4a';
    const contentType = 'audio/mp4';
    const cleanFileName = fileName.replace(/\.(wav|webm|m4a)$/i, '');
    const filePath = `recordings/${Date.now()}_${cleanFileName}${extension}`;
    
    if (Platform.OS === 'web') {
      // 웹: fetch로 blob 생성 후 업로드
      const response = await fetch(fileUri);
      if (!response.ok) {
        throw new Error(`파일 읽기 실패: ${response.status}`);
      }
      const blob = await response.blob();
      
      // 웹에서는 webm 형식 사용
      const webExtension = blob.type.includes('webm') ? '.webm' : extension;
      const webContentType = blob.type.includes('webm') ? 'audio/webm' : contentType;
      const webFilePath = filePath.replace(extension, webExtension);
      
      const { data, error } = await supabase.storage
        .from('recordings')
        .upload(webFilePath, blob, { contentType: webContentType, upsert: false });

      if (error) throw error;
      if (!data?.path) throw new Error('업로드 응답에 경로가 없습니다');
      
      return { path: data.path, error: null };
      
    } else {
      // 네이티브(iOS/Android): FormData로 REST API 직접 호출
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      
      if (!fileInfo.exists) {
        throw new Error('녹음 파일이 존재하지 않습니다');
      }
      
      const fileSize = (fileInfo as any).size;
      if (fileSize === 0) {
        throw new Error('녹음 파일이 비어있습니다 (0 bytes)');
      }
      
      // FormData로 업로드
      const formData = new FormData();
      formData.append('', {
        uri: fileUri,
        name: filePath.split('/').pop(),
        type: contentType,
      } as any);
      
      const uploadUrl = `${supabaseUrl}/storage/v1/object/recordings/${filePath}`;
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'x-upsert': 'false',
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`업로드 실패: ${response.status} - ${errorText}`);
      }
      
      return { path: filePath, error: null };
    }
  } catch (error) {
    console.error('녹음 업로드 오류:', error);
    return { path: '', error: error as Error };
  }
}

// 녹음 기록 생성
export async function createRecording(
  filePath: string,
  originalText: string,
  durationMs?: number
): Promise<{ recording: Recording | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('recordings')
      .insert({
        file_path: filePath,
        original_text: originalText,
        duration_ms: durationMs || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return { recording: data as Recording, error: null };
  } catch (error) {
    console.error('녹음 기록 생성 오류:', error);
    return { recording: null, error: error as Error };
  }
}

// 분석 결과 조회
export async function getAnalysisResult(
  recordingId: string
): Promise<{ result: AnalysisResult | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('analysis_results')
      .select('*')
      .eq('recording_id', recordingId)
      .single();

    if (error) throw error;

    return { result: data as AnalysisResult, error: null };
  } catch (error) {
    console.error('분석 결과 조회 오류:', error);
    return { result: null, error: error as Error };
  }
}

// 녹음 파일 공개 URL 가져오기
export function getRecordingUrl(filePath: string): string {
  const { data } = supabase.storage.from('recordings').getPublicUrl(filePath);
  return data.publicUrl;
}

// 개발 모드에서 목업 데이터 반환
export function getMockAnalysisResult(): AnalysisResult {
  return {
    id: 'mock-result-id',
    recording_id: 'mock-recording-id',
    created_at: new Date().toISOString(),
    accuracy_score: 85.5,
    fluency_score: 90.0,
    completeness_score: 100.0,
    pronunciation_score: 88.2,
    feedback: '전반적으로 좋은 발음입니다. 계속 연습하세요!',
    // 공명 목업 데이터
    formant: {
      resonance_score: 82.0,
      stability_score: 78.5,
      feedback: '공명이 양호합니다. 발음이 안정적입니다.',
    },
    // 톤 목업 데이터
    tone: {
      tone_score: 85.0,
      stability_score: 80.0,
      clarity_score: 88.0,
      intonation_score: 82.0,
      mean_pitch: 180.5,
      pitch_range: 65.3,
      feedback: '목소리가 맑고 안정적입니다. 억양도 자연스럽습니다.',
    },
  };
}

export { DEV_MODE };
