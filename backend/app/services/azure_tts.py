# Azure TTS 서비스 - 텍스트를 음성으로 변환
import os
import tempfile
from typing import Optional
from dataclasses import dataclass
import azure.cognitiveservices.speech as speechsdk
from dotenv import load_dotenv

load_dotenv()

# Azure Speech 설정 (발음 평가와 동일한 키 사용)
AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY", "")
AZURE_REGION = os.getenv("AZURE_REGION", "koreacentral")


@dataclass
class TTSResult:
    """TTS 결과"""
    success: bool
    audio_data: Optional[bytes] = None
    duration_ms: int = 0
    error: Optional[str] = None


# 한국어 음성 목록
KOREAN_VOICES = {
    "female": {
        "name": "ko-KR-SunHiNeural",
        "display": "선희 (여성)",
    },
    "male": {
        "name": "ko-KR-InJoonNeural", 
        "display": "인준 (남성)",
    },
    "female2": {
        "name": "ko-KR-YuJinNeural",
        "display": "유진 (여성)",
    },
}

# 속도 설정
SPEED_OPTIONS = {
    "slow": "0.7",      # 느리게 (70%)
    "normal": "1.0",    # 보통 (100%)
    "fast": "1.3",      # 빠르게 (130%)
}


def text_to_speech(
    text: str,
    voice: str = "female",
    speed: str = "normal"
) -> TTSResult:
    """
    텍스트를 음성으로 변환 (Azure Neural TTS)
    
    Args:
        text: 변환할 텍스트
        voice: 음성 선택 (female, male, female2)
        speed: 속도 (slow, normal, fast)
    
    Returns:
        TTSResult: 음성 데이터 및 결과
    """
    if not AZURE_SPEECH_KEY:
        return TTSResult(
            success=False,
            error="Azure Speech 키가 설정되지 않았습니다."
        )
    
    try:
        # Speech 설정
        speech_config = speechsdk.SpeechConfig(
            subscription=AZURE_SPEECH_KEY,
            region=AZURE_REGION
        )
        
        # 음성 선택
        voice_info = KOREAN_VOICES.get(voice, KOREAN_VOICES["female"])
        speech_config.speech_synthesis_voice_name = voice_info["name"]
        
        # 오디오 출력 설정 (메모리에 저장)
        # MP3 형식으로 출력 (모바일 호환성)
        speech_config.set_speech_synthesis_output_format(
            speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
        )
        
        # 속도 설정을 위한 SSML
        rate = SPEED_OPTIONS.get(speed, "1.0")
        ssml = f"""
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ko-KR">
            <voice name="{voice_info['name']}">
                <prosody rate="{rate}">
                    {text}
                </prosody>
            </voice>
        </speak>
        """
        
        # 음성 합성기 생성 (메모리 출력)
        synthesizer = speechsdk.SpeechSynthesizer(
            speech_config=speech_config,
            audio_config=None  # None = 메모리에 저장
        )
        
        # 음성 합성 실행
        result = synthesizer.speak_ssml_async(ssml).get()
        
        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            return TTSResult(
                success=True,
                audio_data=result.audio_data,
                duration_ms=result.audio_duration.total_seconds() * 1000 if result.audio_duration else 0
            )
        
        elif result.reason == speechsdk.ResultReason.Canceled:
            cancellation = result.cancellation_details
            error_msg = f"TTS 취소됨: {cancellation.reason}"
            if cancellation.error_details:
                error_msg += f" - {cancellation.error_details}"
            return TTSResult(
                success=False,
                error=error_msg
            )
        
        else:
            return TTSResult(
                success=False,
                error=f"알 수 없는 오류: {result.reason}"
            )
            
    except Exception as e:
        print(f"Azure TTS 오류: {e}")
        return TTSResult(
            success=False,
            error=str(e)
        )


def get_available_voices():
    """사용 가능한 음성 목록 반환"""
    return [
        {"id": key, "name": value["display"]}
        for key, value in KOREAN_VOICES.items()
    ]


def get_speed_options():
    """사용 가능한 속도 옵션 반환"""
    return [
        {"id": "slow", "name": "느리게", "rate": 0.7},
        {"id": "normal", "name": "보통", "rate": 1.0},
        {"id": "fast", "name": "빠르게", "rate": 1.3},
    ]

