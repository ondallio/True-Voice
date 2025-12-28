# Azure Speech 서비스 - 발음 평가 API 연동
import os
import tempfile
from typing import Optional
from dataclasses import dataclass
import azure.cognitiveservices.speech as speechsdk
from pydub import AudioSegment
import io

from app.config import settings

# Azure Speech 설정 (config에서 가져옴)
AZURE_SPEECH_KEY = settings.AZURE_SPEECH_KEY
AZURE_REGION = settings.AZURE_REGION


@dataclass
class PronunciationResult:
    """발음 평가 결과"""
    accuracy_score: float
    fluency_score: float
    completeness_score: float
    pronunciation_score: float
    word_details: list
    feedback: str
    success: bool
    error: Optional[str] = None


def generate_feedback(pronunciation_score: float, word_details: list) -> str:
    """점수에 따른 피드백 생성"""
    # 점수 기반 기본 피드백
    if pronunciation_score >= 90:
        base_feedback = "훌륭합니다! 거의 완벽한 발음입니다."
    elif pronunciation_score >= 80:
        base_feedback = "아주 좋습니다! 조금만 더 연습하면 완벽해질 거예요."
    elif pronunciation_score >= 70:
        base_feedback = "좋습니다! 꾸준히 연습하면 더 좋아질 거예요."
    elif pronunciation_score >= 60:
        base_feedback = "괜찮습니다. 조금 더 천천히 또박또박 발음해보세요."
    else:
        base_feedback = "더 연습이 필요합니다. 천천히 한 글자씩 발음해보세요."

    # 낮은 점수의 단어 찾기
    low_score_words = [w for w in word_details if w.get("score", 100) < 70]

    if low_score_words:
        problem_words = ", ".join([f"'{w['word']}'" for w in low_score_words[:3]])
        base_feedback += f" 특히 {problem_words} 발음에 주의해보세요."

    return base_feedback


def convert_to_wav(audio_data: bytes, source_format: str = "m4a") -> bytes:
    """
    오디오 데이터를 WAV 형식으로 변환 (Azure Speech용)
    
    Azure Speech SDK는 WAV 형식만 지원하므로, M4A/WebM 등의 형식을
    16kHz, 16bit, mono WAV로 변환합니다.
    
    Args:
        audio_data: 원본 오디오 데이터 (bytes)
        source_format: 원본 형식 (m4a, mp4, webm 등)
    
    Returns:
        WAV 형식의 오디오 데이터 (bytes)
    """
    temp_input_path = None
    try:
        # 임시 파일에 원본 저장
        with tempfile.NamedTemporaryFile(suffix=f".{source_format}", delete=False) as temp_input:
            temp_input.write(audio_data)
            temp_input_path = temp_input.name
        
        # pydub으로 오디오 로드 (형식별 처리)
        format_map = {"m4a": "m4a", "mp4": "m4a", "aac": "m4a", "webm": "webm"}
        audio_format = format_map.get(source_format, None)
        
        if audio_format:
            audio = AudioSegment.from_file(temp_input_path, format=audio_format)
        else:
            audio = AudioSegment.from_file(temp_input_path)
        
        # Azure 권장 설정으로 변환: 16kHz, 16bit, mono
        audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
        
        # WAV로 내보내기
        wav_buffer = io.BytesIO()
        audio.export(wav_buffer, format="wav")
        wav_data = wav_buffer.getvalue()
        
        print(f"[INFO] 오디오 변환 완료: {source_format} -> wav ({len(wav_data)} bytes)")
        return wav_data
        
    except Exception as e:
        print(f"[ERROR] 오디오 변환 실패: {e}")
        return audio_data  # 변환 실패 시 원본 반환
        
    finally:
        # 임시 파일 정리
        if temp_input_path and os.path.exists(temp_input_path):
            os.unlink(temp_input_path)


def assess_pronunciation(audio_data: bytes, reference_text: str, audio_format: str = "wav") -> PronunciationResult:
    """
    Azure Pronunciation Assessment를 사용하여 발음 평가

    Args:
        audio_data: 오디오 데이터 (bytes)
        reference_text: 평가할 기준 텍스트
        audio_format: 오디오 형식 (wav, m4a, webm 등)

    Returns:
        PronunciationResult: 발음 평가 결과
    """
    if not AZURE_SPEECH_KEY:
        return PronunciationResult(
            accuracy_score=0,
            fluency_score=0,
            completeness_score=0,
            pronunciation_score=0,
            word_details=[],
            feedback="Azure Speech 키가 설정되지 않았습니다.",
            success=False,
            error="AZURE_SPEECH_KEY not configured",
        )

    try:
        # WAV가 아닌 형식은 변환
        if audio_format != "wav":
            print(f"[DEBUG] 오디오 형식 변환 필요: {audio_format} -> wav")
            audio_data = convert_to_wav(audio_data, audio_format)
        
        # Speech 설정
        speech_config = speechsdk.SpeechConfig(
            subscription=AZURE_SPEECH_KEY,
            region=AZURE_REGION,
        )
        speech_config.speech_recognition_language = "ko-KR"

        # 임시 파일에 오디오 데이터 저장
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_file.write(audio_data)
            temp_file_path = temp_file.name

        try:
            # 오디오 설정
            audio_config = speechsdk.audio.AudioConfig(filename=temp_file_path)

            # 발음 평가 설정
            pronunciation_config = speechsdk.PronunciationAssessmentConfig(
                reference_text=reference_text,
                grading_system=speechsdk.PronunciationAssessmentGradingSystem.HundredMark,
                granularity=speechsdk.PronunciationAssessmentGranularity.Word,
                enable_miscue=True,
            )

            # 음성 인식기 생성
            speech_recognizer = speechsdk.SpeechRecognizer(
                speech_config=speech_config,
                audio_config=audio_config,
            )

            # 발음 평가 적용
            pronunciation_config.apply_to(speech_recognizer)

            # 인식 수행
            result = speech_recognizer.recognize_once()

            if result.reason == speechsdk.ResultReason.RecognizedSpeech:
                # 발음 평가 결과 가져오기
                pronunciation_result = speechsdk.PronunciationAssessmentResult(result)

                # 단어별 상세 결과
                word_details = []
                if pronunciation_result.words:
                    for word in pronunciation_result.words:
                        word_details.append({
                            "word": word.word,
                            "score": word.accuracy_score,
                            "error_type": word.error_type if hasattr(word, 'error_type') else None,
                        })

                # 피드백 생성
                feedback = generate_feedback(
                    pronunciation_result.pronunciation_score,
                    word_details,
                )

                return PronunciationResult(
                    accuracy_score=pronunciation_result.accuracy_score,
                    fluency_score=pronunciation_result.fluency_score,
                    completeness_score=pronunciation_result.completeness_score,
                    pronunciation_score=pronunciation_result.pronunciation_score,
                    word_details=word_details,
                    feedback=feedback,
                    success=True,
                )

            elif result.reason == speechsdk.ResultReason.NoMatch:
                return PronunciationResult(
                    accuracy_score=0,
                    fluency_score=0,
                    completeness_score=0,
                    pronunciation_score=0,
                    word_details=[],
                    feedback="음성을 인식할 수 없습니다. 더 크고 명확하게 말씀해주세요.",
                    success=False,
                    error="No speech recognized",
                )

            else:
                cancellation = result.cancellation_details
                return PronunciationResult(
                    accuracy_score=0,
                    fluency_score=0,
                    completeness_score=0,
                    pronunciation_score=0,
                    word_details=[],
                    feedback="음성 인식 중 오류가 발생했습니다.",
                    success=False,
                    error=f"Cancelled: {cancellation.reason}",
                )

        finally:
            # 임시 파일 삭제
            os.unlink(temp_file_path)

    except Exception as e:
        print(f"Azure Speech 오류: {e}")
        return PronunciationResult(
            accuracy_score=0,
            fluency_score=0,
            completeness_score=0,
            pronunciation_score=0,
            word_details=[],
            feedback="발음 평가 중 오류가 발생했습니다.",
            success=False,
            error=str(e),
        )


def get_mock_result(reference_text: str) -> PronunciationResult:
    """개발용 목업 결과 반환"""
    import random

    # 텍스트를 단어로 분리 (공백 기준)
    words = reference_text.split()
    if not words:
        words = [reference_text]  # 공백 없으면 전체를 하나의 단어로

    # 단어별 랜덤 점수 생성
    word_details = []
    for word in words:
        score = random.uniform(75, 98)
        word_details.append({
            "word": word,
            "score": round(score, 1),
            "error_type": None,
        })

    # 평균 점수 계산
    avg_score = sum(w["score"] for w in word_details) / len(word_details)

    return PronunciationResult(
        accuracy_score=round(random.uniform(80, 95), 1),
        fluency_score=round(random.uniform(85, 98), 1),
        completeness_score=100.0,
        pronunciation_score=round(avg_score, 1),
        word_details=word_details,
        feedback=generate_feedback(avg_score, word_details),
        success=True,
    )
