# 포먼트(공명) 분석 서비스
# F1, F2, F3 포먼트 주파수를 분석하여 모음 발음 품질을 평가합니다.
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
    print("Warning: parselmouth not installed. Formant analysis disabled.")

try:
    import librosa
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False
    print("Warning: librosa not installed.")


@dataclass
class FormantData:
    """단일 시점의 포먼트 데이터"""
    time: float      # 시간 (초)
    f1: float        # 첫 번째 포먼트 (입 열림/닫힘)
    f2: float        # 두 번째 포먼트 (혀의 전후 위치)
    f3: float        # 세 번째 포먼트 (입술 둥글림)


@dataclass
class FormantResult:
    """포먼트 분석 결과"""
    success: bool
    error: Optional[str] = None

    # 평균 포먼트 값
    mean_f1: float = 0.0
    mean_f2: float = 0.0
    mean_f3: float = 0.0

    # 포먼트 안정성 (표준편차가 낮을수록 안정적)
    stability_f1: float = 0.0
    stability_f2: float = 0.0
    stability_f3: float = 0.0

    # 전체 안정성 점수 (0-100)
    stability_score: float = 0.0

    # 공명 품질 점수 (0-100)
    resonance_score: float = 0.0

    # 시계열 데이터 (선택적)
    formant_track: list = None

    # 분석된 모음 정보
    vowel_analysis: list = None

    # 피드백
    feedback: str = ""


# 한국어 모음별 이상적인 포먼트 범위 (성인 남성 기준)
# 참고: 여성은 약 20% 높은 값
KOREAN_VOWELS_FORMANTS = {
    'ㅏ': {'f1': (700, 900), 'f2': (1100, 1400)},    # 아
    'ㅓ': {'f1': (500, 700), 'f2': (900, 1200)},     # 어
    'ㅗ': {'f1': (350, 500), 'f2': (700, 1000)},     # 오
    'ㅜ': {'f1': (300, 450), 'f2': (600, 900)},      # 우
    'ㅡ': {'f1': (300, 450), 'f2': (1200, 1600)},    # 으
    'ㅣ': {'f1': (250, 400), 'f2': (2000, 2800)},    # 이
    'ㅐ': {'f1': (500, 700), 'f2': (1700, 2100)},    # 애
    'ㅔ': {'f1': (400, 600), 'f2': (1800, 2200)},    # 에
}


def analyze_formants(audio_data: bytes, sample_rate: int = 16000) -> FormantResult:
    """
    오디오 데이터에서 포먼트를 분석합니다.

    Args:
        audio_data: WAV 형식의 오디오 데이터 (bytes)
        sample_rate: 샘플링 레이트 (기본 16000Hz)

    Returns:
        FormantResult: 포먼트 분석 결과
    """
    if not PARSELMOUTH_AVAILABLE:
        return FormantResult(
            success=False,
            error="parselmouth library not available",
            feedback="포먼트 분석 라이브러리가 설치되지 않았습니다."
        )

    try:
        # 임시 파일에 오디오 저장
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_file.write(audio_data)
            temp_file_path = temp_file.name

        try:
            # Praat Sound 객체 생성
            sound = parselmouth.Sound(temp_file_path)

            # 포먼트 추출 (최대 5개 포먼트, 5500Hz까지)
            formant = call(sound, "To Formant (burg)", 0.0, 5, 5500, 0.025, 50)

            # 시간 범위
            start_time = call(formant, "Get start time")
            end_time = call(formant, "Get end time")
            duration = end_time - start_time

            # 포먼트 값 수집
            f1_values = []
            f2_values = []
            f3_values = []
            formant_track = []

            # 10ms 간격으로 샘플링
            time_step = 0.01
            current_time = start_time

            while current_time <= end_time:
                f1 = call(formant, "Get value at time", 1, current_time, "Hertz", "Linear")
                f2 = call(formant, "Get value at time", 2, current_time, "Hertz", "Linear")
                f3 = call(formant, "Get value at time", 3, current_time, "Hertz", "Linear")

                # NaN이 아닌 값만 수집
                if not (np.isnan(f1) or np.isnan(f2) or np.isnan(f3)):
                    f1_values.append(f1)
                    f2_values.append(f2)
                    f3_values.append(f3)
                    formant_track.append(FormantData(
                        time=round(current_time - start_time, 3),
                        f1=round(f1, 1),
                        f2=round(f2, 1),
                        f3=round(f3, 1)
                    ))

                current_time += time_step

            if not f1_values:
                return FormantResult(
                    success=False,
                    error="No valid formant data extracted",
                    feedback="음성에서 포먼트를 추출할 수 없습니다. 더 크게 말씀해주세요."
                )

            # 평균 계산
            mean_f1 = np.mean(f1_values)
            mean_f2 = np.mean(f2_values)
            mean_f3 = np.mean(f3_values)

            # 표준편차 계산 (안정성 지표)
            std_f1 = np.std(f1_values)
            std_f2 = np.std(f2_values)
            std_f3 = np.std(f3_values)

            # 안정성 점수 계산 (표준편차가 낮을수록 높은 점수)
            # 일반적으로 F1 표준편차 100Hz 이하, F2 200Hz 이하가 안정적
            stability_f1 = max(0, 100 - (std_f1 / 2))  # 200Hz 이상이면 0점
            stability_f2 = max(0, 100 - (std_f2 / 4))  # 400Hz 이상이면 0점
            stability_f3 = max(0, 100 - (std_f3 / 5))  # 500Hz 이상이면 0점

            stability_score = (stability_f1 * 0.4 + stability_f2 * 0.4 + stability_f3 * 0.2)

            # 공명 품질 점수 계산
            resonance_score = calculate_resonance_score(mean_f1, mean_f2, mean_f3, stability_score)

            # 피드백 생성
            feedback = generate_formant_feedback(
                mean_f1, mean_f2, mean_f3,
                stability_score, resonance_score
            )

            return FormantResult(
                success=True,
                mean_f1=round(mean_f1, 1),
                mean_f2=round(mean_f2, 1),
                mean_f3=round(mean_f3, 1),
                stability_f1=round(stability_f1, 1),
                stability_f2=round(stability_f2, 1),
                stability_f3=round(stability_f3, 1),
                stability_score=round(stability_score, 1),
                resonance_score=round(resonance_score, 1),
                formant_track=[{
                    'time': f.time,
                    'f1': f.f1,
                    'f2': f.f2,
                    'f3': f.f3
                } for f in formant_track],
                feedback=feedback
            )

        finally:
            # 임시 파일 삭제
            os.unlink(temp_file_path)

    except Exception as e:
        print(f"포먼트 분석 오류: {e}")
        return FormantResult(
            success=False,
            error=str(e),
            feedback="포먼트 분석 중 오류가 발생했습니다."
        )


def calculate_resonance_score(f1: float, f2: float, f3: float, stability: float) -> float:
    """
    공명 품질 점수를 계산합니다.

    좋은 공명의 특징:
    - F1, F2, F3가 적절한 범위 내에 있음
    - 포먼트 간 적절한 간격 유지
    - 안정적인 포먼트 값
    """
    score = 50.0  # 기본 점수

    # F1 범위 체크 (250-900Hz가 일반적)
    if 250 <= f1 <= 900:
        score += 15
    elif 200 <= f1 <= 1000:
        score += 10
    else:
        score -= 10

    # F2 범위 체크 (700-2800Hz가 일반적)
    if 700 <= f2 <= 2800:
        score += 15
    elif 600 <= f2 <= 3000:
        score += 10
    else:
        score -= 10

    # F2/F1 비율 체크 (1.5-4.0이 일반적)
    f2_f1_ratio = f2 / f1 if f1 > 0 else 0
    if 1.5 <= f2_f1_ratio <= 4.0:
        score += 10
    elif 1.2 <= f2_f1_ratio <= 5.0:
        score += 5

    # 안정성 반영
    score += stability * 0.1

    return min(100, max(0, score))


def generate_formant_feedback(f1: float, f2: float, f3: float,
                              stability: float, resonance: float) -> str:
    """포먼트 분석 결과에 대한 피드백 생성"""
    feedbacks = []

    # 전체 평가
    if resonance >= 80:
        feedbacks.append("공명이 풍부하고 안정적입니다!")
    elif resonance >= 60:
        feedbacks.append("공명이 양호합니다.")
    else:
        feedbacks.append("공명 개선이 필요합니다.")

    # F1 분석 (입 열림)
    if f1 < 300:
        feedbacks.append("입을 조금 더 크게 벌려보세요.")
    elif f1 > 800:
        feedbacks.append("입을 너무 크게 벌리지 않아도 됩니다.")

    # F2 분석 (혀 위치)
    if f2 < 1000:
        feedbacks.append("혀를 조금 앞으로 위치시켜 보세요.")
    elif f2 > 2500:
        feedbacks.append("혀가 너무 앞에 있습니다. 편하게 해주세요.")

    # 안정성 분석
    if stability < 50:
        feedbacks.append("발음을 더 일정하게 유지해보세요.")
    elif stability >= 80:
        feedbacks.append("발음이 매우 안정적입니다.")

    return " ".join(feedbacks)


def get_mock_formant_result() -> FormantResult:
    """개발용 목업 결과 반환"""
    import random

    mean_f1 = random.uniform(400, 700)
    mean_f2 = random.uniform(1200, 1800)
    mean_f3 = random.uniform(2400, 3000)
    stability = random.uniform(60, 90)
    resonance = random.uniform(65, 95)

    # 간단한 목업 트랙 데이터
    formant_track = []
    for i in range(20):
        formant_track.append({
            'time': round(i * 0.05, 3),
            'f1': round(mean_f1 + random.uniform(-50, 50), 1),
            'f2': round(mean_f2 + random.uniform(-100, 100), 1),
            'f3': round(mean_f3 + random.uniform(-150, 150), 1),
        })

    return FormantResult(
        success=True,
        mean_f1=round(mean_f1, 1),
        mean_f2=round(mean_f2, 1),
        mean_f3=round(mean_f3, 1),
        stability_f1=round(random.uniform(70, 95), 1),
        stability_f2=round(random.uniform(65, 90), 1),
        stability_f3=round(random.uniform(60, 85), 1),
        stability_score=round(stability, 1),
        resonance_score=round(resonance, 1),
        formant_track=formant_track,
        feedback=generate_formant_feedback(mean_f1, mean_f2, mean_f3, stability, resonance)
    )
