-- =========================================
-- True Voice MVP - Supabase 데이터베이스 설정
-- =========================================
-- Supabase Dashboard > SQL Editor에서 실행하세요.

-- 1. recordings 테이블: 녹음 기록 저장
CREATE TABLE IF NOT EXISTS recordings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_path TEXT NOT NULL,           -- Storage 경로
    original_text TEXT NOT NULL,       -- 읽어야 할 텍스트
    duration_ms INTEGER,               -- 녹음 길이 (밀리초)
    status TEXT DEFAULT 'pending'      -- pending, analyzing, completed, failed
);

-- 2. analysis_results 테이블: 분석 결과 저장
CREATE TABLE IF NOT EXISTS analysis_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 종합 점수 (0-100)
    accuracy_score DECIMAL(5,2),       -- 정확도
    fluency_score DECIMAL(5,2),        -- 유창성
    completeness_score DECIMAL(5,2),   -- 완성도
    pronunciation_score DECIMAL(5,2),  -- 종합 발음 점수

    -- 단어별 상세 결과 (JSON)
    word_details JSONB,
    -- 예: [{"word": "안녕", "score": 85, "error_type": null}, ...]

    -- 피드백 메시지
    feedback TEXT,

    -- 포먼트(공명) 분석 결과 (JSON)
    formant_data JSONB
    -- 예: {
    --   "mean_f1": 520.3,
    --   "mean_f2": 1450.7,
    --   "mean_f3": 2650.2,
    --   "stability_f1": 82.5,
    --   "stability_f2": 78.3,
    --   "stability_f3": 71.2,
    --   "stability_score": 78.5,
    --   "resonance_score": 82.0,
    --   "feedback": "공명이 양호합니다.",
    --   "formant_track": [{"time": 0.0, "f1": 520, "f2": 1450, "f3": 2650}, ...]
    -- }
);

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON recordings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_recording_id ON analysis_results(recording_id);
CREATE INDEX IF NOT EXISTS idx_analysis_created_at ON analysis_results(created_at DESC);

-- 4. RLS 비활성화 (개발 환경에서만 사용)
-- 주의: 프로덕션에서는 RLS를 활성화하고 적절한 정책을 설정하세요!
ALTER TABLE recordings DISABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results DISABLE ROW LEVEL SECURITY;

-- 5. 모든 사용자에게 권한 부여 (개발용)
GRANT ALL ON recordings TO anon, authenticated;
GRANT ALL ON analysis_results TO anon, authenticated;

-- =========================================
-- 기존 테이블에 formant_data 컬럼 추가 (마이그레이션용)
-- =========================================
-- 이미 테이블이 있는 경우 아래 명령어로 컬럼 추가
-- ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS formant_data JSONB;

-- =========================================
-- Storage 버킷 설정
-- =========================================
-- Supabase Dashboard > Storage에서 'recordings' 버킷을 생성하세요.
-- 또는 아래 SQL을 실행하세요.

INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Storage 정책: 모든 접근 허용 (개발용)
-- 기존 정책이 있으면 삭제 후 재생성
DROP POLICY IF EXISTS "Allow all access to recordings" ON storage.objects;
CREATE POLICY "Allow all access to recordings"
ON storage.objects FOR ALL
USING (bucket_id = 'recordings')
WITH CHECK (bucket_id = 'recordings');

-- =========================================
-- 테스트 데이터 (선택사항)
-- =========================================
-- 테스트용 녹음 기록 삽입
/*
INSERT INTO recordings (file_path, original_text, duration_ms, status)
VALUES
    ('recordings/test_1.wav', '안녕하세요', 2000, 'completed'),
    ('recordings/test_2.wav', '감사합니다', 1500, 'completed');

-- 테스트용 분석 결과 삽입 (포먼트 포함)
INSERT INTO analysis_results (
    recording_id,
    accuracy_score,
    fluency_score,
    completeness_score,
    pronunciation_score,
    word_details,
    feedback,
    formant_data
)
SELECT
    id,
    85.5,
    90.0,
    100.0,
    88.2,
    '[{"word": "안녕하세요", "score": 88.2, "error_type": null}]'::jsonb,
    '전반적으로 좋은 발음입니다.',
    '{
        "mean_f1": 520.3,
        "mean_f2": 1450.7,
        "mean_f3": 2650.2,
        "stability_f1": 82.5,
        "stability_f2": 78.3,
        "stability_f3": 71.2,
        "stability_score": 78.5,
        "resonance_score": 82.0,
        "feedback": "공명이 양호합니다. 발음이 안정적입니다."
    }'::jsonb
FROM recordings
WHERE original_text = '안녕하세요'
LIMIT 1;
*/

-- =========================================
-- 완료!
-- =========================================
-- 이제 Supabase Dashboard에서 다음을 확인하세요:
-- 1. Table Editor > recordings, analysis_results 테이블 생성 확인
-- 2. analysis_results 테이블에 formant_data 컬럼 확인
-- 3. Storage > recordings 버킷 생성 확인
-- 4. Settings > API > URL과 anon key 복사하여 .env 파일에 설정
