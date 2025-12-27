# Pydantic 스키마 정의
from typing import Optional
from pydantic import BaseModel


# 점수 정보
class Scores(BaseModel):
    accuracy: float        # 정확도 (0-100)
    fluency: float         # 유창성 (0-100)
    completeness: float    # 완성도 (0-100)
    pronunciation: float   # 종합 발음 점수 (0-100)


# 포먼트(공명) 분석 결과
class FormantAnalysis(BaseModel):
    # 종합 점수
    resonance_score: float      # 공명 품질 점수 (0-100)
    stability_score: float      # 안정성 점수 (0-100)
    
    # 피드백
    feedback: str


# 톤 분석 결과
class ToneAnalysis(BaseModel):
    # 종합 점수
    tone_score: float           # 종합 톤 점수 (0-100)
    stability_score: float      # 안정성 점수 (0-100)
    clarity_score: float        # 명료도 점수 (0-100)
    intonation_score: float     # 억양 풍부함 점수 (0-100)
    
    # 피치 정보
    mean_pitch: float           # 평균 피치 (Hz)
    pitch_range: float          # 피치 범위 (억양 변화)
    
    # 피드백
    feedback: str


# 분석 요청
class AnalyzeRequest(BaseModel):
    recording_id: str
    reference_text: str
    include_formant: bool = True  # 공명 분석 포함 여부
    include_tone: bool = True     # 톤 분석 포함 여부


# 분석 응답
class AnalyzeResponse(BaseModel):
    success: bool
    result_id: Optional[str] = None
    scores: Optional[Scores] = None
    feedback: Optional[str] = None
    error: Optional[str] = None
    # 공명 분석 결과
    formant: Optional[FormantAnalysis] = None
    # 톤 분석 결과
    tone: Optional[ToneAnalysis] = None


# 결과 조회 응답
class ResultResponse(BaseModel):
    id: str
    recording_id: str
    created_at: str
    scores: Scores
    feedback: str
    # 공명 분석 결과
    formant: Optional[FormantAnalysis] = None
    # 톤 분석 결과
    tone: Optional[ToneAnalysis] = None


# 녹음 정보
class Recording(BaseModel):
    id: str
    created_at: str
    file_path: str
    original_text: str
    duration_ms: Optional[int] = None
    status: str


# 분석 결과 DB 모델
class AnalysisResult(BaseModel):
    id: str
    recording_id: str
    created_at: str
    accuracy_score: float
    fluency_score: float
    completeness_score: float
    pronunciation_score: float
    feedback: str
    # 공명 분석 결과
    formant_data: Optional[dict] = None
    # 톤 분석 결과
    tone_data: Optional[dict] = None
