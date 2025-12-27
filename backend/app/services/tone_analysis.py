# 톤(Tone) 분석 서비스
# 피치, 억양, 목소리 안정성 등을 분석합니다.
import os
import tempfile
from typing import Optional
from dataclasses import dataclass
import numpy as np

try:
    import parselmouth
    from parselmouth.praat import call
    PARSELMOUTH_AVAILABLE = True
except ImportError:
    PARSELMOUTH_AVAILABLE = False

try:
    import librosa
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False


@dataclass
class ToneResult:
    """톤 분석 결과"""
    success: bool
    error: Optional[str] = None
    
    # 피치 (F0) 분석
    mean_pitch: float = 0.0        # 평균 피치 (Hz)
    min_pitch: float = 0.0         # 최소 피치
    max_pitch: float = 0.0         # 최대 피치
    pitch_range: float = 0.0       # 피치 범위 (억양 변화)
    pitch_std: float = 0.0         # 피치 표준편차
    
    # 목소리 품질
    jitter: float = 0.0            # 피치 떨림 (%) - 낮을수록 안정
    shimmer: float = 0.0           # 음량 떨림 (%) - 낮을수록 안정
    hnr: float = 0.0               # 소음 대비 명료도 (dB) - 높을수록 맑음
    
    # 종합 점수 (0-100)
    stability_score: float = 0.0   # 안정성 점수
    clarity_score: float = 0.0     # 명료도 점수
    intonation_score: float = 0.0  # 억양 풍부함 점수
    tone_score: float = 0.0        # 종합 톤 점수
    
    # 피드백
    feedback: str = ""


def analyze_tone(audio_data: bytes, sample_rate: int = 16000) -> ToneResult:
    """
    오디오 데이터에서 톤을 분석합니다.
    
    Args:
        audio_data: WAV 형식의 오디오 데이터 (bytes)
        sample_rate: 샘플링 레이트 (기본 16000Hz)
    
    Returns:
        ToneResult: 톤 분석 결과
    """
    if not PARSELMOUTH_AVAILABLE:
        return ToneResult(
            success=False,
            error="parselmouth library not available",
            feedback="톤 분석 라이브러리가 설치되지 않았습니다."
        )
    
    temp_file_path = None
    try:
        # 임시 파일에 오디오 저장
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_file.write(audio_data)
            temp_file_path = temp_file.name
        
        # Praat Sound 객체 생성
        sound = parselmouth.Sound(temp_file_path)
        
        # 1. 피치 분석
        pitch = call(sound, "To Pitch", 0.0, 75, 600)
        
        mean_pitch = call(pitch, "Get mean", 0, 0, "Hertz")
        min_pitch = call(pitch, "Get minimum", 0, 0, "Hertz", "Parabolic")
        max_pitch = call(pitch, "Get maximum", 0, 0, "Hertz", "Parabolic")
        pitch_std = call(pitch, "Get standard deviation", 0, 0, "Hertz")
        
        # NaN 처리
        mean_pitch = 0 if np.isnan(mean_pitch) else mean_pitch
        min_pitch = 0 if np.isnan(min_pitch) else min_pitch
        max_pitch = 0 if np.isnan(max_pitch) else max_pitch
        pitch_std = 0 if np.isnan(pitch_std) else pitch_std
        pitch_range = max_pitch - min_pitch if min_pitch > 0 else 0
        
        # 2. 목소리 품질 분석
        point_process = call(sound, "To PointProcess (periodic, cc)", 75, 600)
        
        # Jitter (피치 떨림)
        jitter = call(point_process, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)
        jitter = 0 if np.isnan(jitter) else jitter * 100  # 퍼센트로 변환
        
        # Shimmer (음량 떨림)
        shimmer = call([sound, point_process], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
        shimmer = 0 if np.isnan(shimmer) else shimmer * 100  # 퍼센트로 변환
        
        # HNR (Harmonics-to-Noise Ratio)
        harmonicity = call(sound, "To Harmonicity (cc)", 0.01, 75, 0.1, 1.0)
        hnr = call(harmonicity, "Get mean", 0, 0)
        hnr = 0 if np.isnan(hnr) else hnr
        
        # 3. 점수 계산
        stability_score = calculate_stability_score(jitter, shimmer)
        clarity_score = calculate_clarity_score(hnr)
        intonation_score = calculate_intonation_score(pitch_range, mean_pitch)
        tone_score = (stability_score * 0.3 + clarity_score * 0.4 + intonation_score * 0.3)
        
        # 4. 피드백 생성
        feedback = generate_tone_feedback(
            mean_pitch, pitch_range, jitter, shimmer, hnr,
            stability_score, clarity_score, intonation_score
        )
        
        return ToneResult(
            success=True,
            mean_pitch=round(mean_pitch, 1),
            min_pitch=round(min_pitch, 1),
            max_pitch=round(max_pitch, 1),
            pitch_range=round(pitch_range, 1),
            pitch_std=round(pitch_std, 1),
            jitter=round(jitter, 2),
            shimmer=round(shimmer, 2),
            hnr=round(hnr, 1),
            stability_score=round(stability_score, 1),
            clarity_score=round(clarity_score, 1),
            intonation_score=round(intonation_score, 1),
            tone_score=round(tone_score, 1),
            feedback=feedback
        )
        
    except Exception as e:
        print(f"톤 분석 오류: {e}")
        return ToneResult(
            success=False,
            error=str(e),
            feedback="톤 분석 중 오류가 발생했습니다."
        )
        
    finally:
        # 임시 파일 정리
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)


def calculate_stability_score(jitter: float, shimmer: float) -> float:
    """
    안정성 점수 계산
    - Jitter < 1%: 정상
    - Shimmer < 3%: 정상
    """
    # Jitter 점수 (0-50)
    if jitter < 0.5:
        jitter_score = 50
    elif jitter < 1.0:
        jitter_score = 40
    elif jitter < 2.0:
        jitter_score = 25
    else:
        jitter_score = max(0, 50 - jitter * 10)
    
    # Shimmer 점수 (0-50)
    if shimmer < 2:
        shimmer_score = 50
    elif shimmer < 4:
        shimmer_score = 40
    elif shimmer < 6:
        shimmer_score = 25
    else:
        shimmer_score = max(0, 50 - shimmer * 5)
    
    return min(100, jitter_score + shimmer_score)


def calculate_clarity_score(hnr: float) -> float:
    """
    명료도 점수 계산
    - HNR > 20 dB: 매우 맑음
    - HNR 10-20 dB: 보통
    - HNR < 10 dB: 거칠음
    """
    if hnr >= 20:
        return 100
    elif hnr >= 15:
        return 80 + (hnr - 15) * 4
    elif hnr >= 10:
        return 60 + (hnr - 10) * 4
    elif hnr >= 5:
        return 40 + (hnr - 5) * 4
    else:
        return max(0, hnr * 8)


def calculate_intonation_score(pitch_range: float, mean_pitch: float) -> float:
    """
    억양 풍부함 점수 계산
    - 적당한 피치 변화가 있으면 높은 점수
    - 너무 단조롭거나 너무 변화가 심하면 낮은 점수
    """
    if mean_pitch == 0:
        return 50
    
    # 피치 범위 비율 (평균 대비)
    range_ratio = pitch_range / mean_pitch if mean_pitch > 0 else 0
    
    # 이상적인 범위: 0.3 ~ 0.8 (평균의 30-80%)
    if 0.3 <= range_ratio <= 0.8:
        return 100
    elif 0.2 <= range_ratio <= 1.0:
        return 80
    elif 0.1 <= range_ratio <= 1.2:
        return 60
    elif range_ratio < 0.1:
        # 너무 단조로움
        return 40
    else:
        # 너무 변화가 심함
        return 50


def generate_tone_feedback(
    mean_pitch: float, pitch_range: float,
    jitter: float, shimmer: float, hnr: float,
    stability: float, clarity: float, intonation: float
) -> str:
    """톤 분석 결과에 대한 피드백 생성"""
    feedbacks = []
    
    # 종합 평가
    overall = (stability + clarity + intonation) / 3
    if overall >= 80:
        feedbacks.append("목소리가 매우 좋습니다!")
    elif overall >= 60:
        feedbacks.append("목소리가 양호합니다.")
    else:
        feedbacks.append("목소리 개선이 필요합니다.")
    
    # 안정성 피드백
    if stability < 50:
        if jitter > 2:
            feedbacks.append("목소리가 약간 떨립니다. 긴장을 풀어보세요.")
        if shimmer > 5:
            feedbacks.append("음량이 불안정합니다. 일정하게 말해보세요.")
    elif stability >= 80:
        feedbacks.append("목소리가 안정적입니다.")
    
    # 명료도 피드백
    if clarity < 50:
        feedbacks.append("목소리가 거칠게 들립니다. 물을 마시고 다시 시도해보세요.")
    elif clarity >= 80:
        feedbacks.append("목소리가 맑고 명료합니다.")
    
    # 억양 피드백
    if intonation < 50:
        if pitch_range < mean_pitch * 0.2:
            feedbacks.append("억양이 단조롭습니다. 좀 더 생동감 있게 말해보세요.")
    elif intonation >= 80:
        feedbacks.append("억양이 자연스럽습니다.")
    
    # 피치 정보 (참고용)
    if mean_pitch > 0:
        if mean_pitch < 150:
            pitch_type = "낮은 편"
        elif mean_pitch < 250:
            pitch_type = "보통"
        else:
            pitch_type = "높은 편"
        feedbacks.append(f"목소리 높이는 {pitch_type}입니다.")
    
    return " ".join(feedbacks)


def get_mock_tone_result() -> ToneResult:
    """개발용 목업 결과 반환"""
    import random
    
    mean_pitch = random.uniform(100, 250)
    pitch_range = random.uniform(30, 100)
    jitter = random.uniform(0.3, 1.5)
    shimmer = random.uniform(1.5, 4.5)
    hnr = random.uniform(12, 22)
    
    stability = calculate_stability_score(jitter, shimmer)
    clarity = calculate_clarity_score(hnr)
    intonation = calculate_intonation_score(pitch_range, mean_pitch)
    tone_score = (stability * 0.3 + clarity * 0.4 + intonation * 0.3)
    
    return ToneResult(
        success=True,
        mean_pitch=round(mean_pitch, 1),
        min_pitch=round(mean_pitch - pitch_range/2, 1),
        max_pitch=round(mean_pitch + pitch_range/2, 1),
        pitch_range=round(pitch_range, 1),
        pitch_std=round(pitch_range/3, 1),
        jitter=round(jitter, 2),
        shimmer=round(shimmer, 2),
        hnr=round(hnr, 1),
        stability_score=round(stability, 1),
        clarity_score=round(clarity, 1),
        intonation_score=round(intonation, 1),
        tone_score=round(tone_score, 1),
        feedback=generate_tone_feedback(
            mean_pitch, pitch_range, jitter, shimmer, hnr,
            stability, clarity, intonation
        )
    )

