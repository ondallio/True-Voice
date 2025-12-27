# TTS API 라우터
import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional

from app.services.azure_tts import (
    text_to_speech,
    get_available_voices,
    get_speed_options,
)

router = APIRouter()

# 개발 모드 확인
DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"


class TTSRequest(BaseModel):
    text: str
    voice: str = "female"  # female, male, female2
    speed: str = "normal"  # slow, normal, fast


class VoiceInfo(BaseModel):
    id: str
    name: str


class SpeedInfo(BaseModel):
    id: str
    name: str
    rate: float


@router.post("/tts")
async def synthesize_speech(request: TTSRequest):
    """
    텍스트를 음성으로 변환 (Azure Neural TTS)
    
    - text: 변환할 텍스트
    - voice: 음성 선택 (female, male, female2)
    - speed: 속도 (slow, normal, fast)
    
    Returns: MP3 오디오 데이터
    """
    if not request.text or len(request.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="텍스트가 비어있습니다.")
    
    if len(request.text) > 500:
        raise HTTPException(status_code=400, detail="텍스트가 너무 깁니다. (최대 500자)")
    
    # 개발 모드에서는 빈 응답 (프론트엔드에서 처리)
    if DEV_MODE:
        raise HTTPException(
            status_code=503, 
            detail="DEV_MODE: TTS 서비스를 사용할 수 없습니다."
        )
    
    # TTS 실행
    result = text_to_speech(
        text=request.text.strip(),
        voice=request.voice,
        speed=request.speed
    )
    
    if not result.success:
        raise HTTPException(
            status_code=500,
            detail=result.error or "음성 합성에 실패했습니다."
        )
    
    # MP3 오디오 반환
    return Response(
        content=result.audio_data,
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": "inline; filename=tts.mp3",
            "X-Duration-Ms": str(int(result.duration_ms)),
        }
    )


@router.get("/tts/voices", response_model=list[VoiceInfo])
async def list_voices():
    """사용 가능한 음성 목록"""
    return get_available_voices()


@router.get("/tts/speeds", response_model=list[SpeedInfo])
async def list_speeds():
    """사용 가능한 속도 옵션"""
    return get_speed_options()

