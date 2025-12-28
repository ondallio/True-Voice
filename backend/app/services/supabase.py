# Supabase 서비스 - 데이터베이스 및 스토리지 연동
import os
import uuid
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# 개발 모드 확인
DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"

# Supabase 클라이언트 (DEV_MODE가 아닐 때만 생성)
supabase = None

supabase_url = os.getenv("SUPABASE_URL", "")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY", "")

# URL과 KEY가 있을 때만 클라이언트 생성
if not DEV_MODE and supabase_url and supabase_key:
    try:
        from supabase import create_client, Client
        supabase: Client = create_client(supabase_url, supabase_key)
        print(f"[INFO] Supabase client created successfully")
    except Exception as e:
        print(f"[ERROR] Failed to create Supabase client: {e}")
        print(f"[WARNING] Falling back to DEV_MODE")
        DEV_MODE = True
elif not DEV_MODE:
    print(f"[WARNING] SUPABASE_URL or SUPABASE_SERVICE_KEY not set. Running in DEV_MODE.")
    DEV_MODE = True


def get_recording(recording_id: str) -> Optional[dict]:
    """녹음 정보 조회"""
    if DEV_MODE:
        return {
            "id": recording_id,
            "file_path": "mock/recording.wav",
            "original_text": "안녕하세요",
            "status": "pending"
        }
    try:
        response = supabase.table("recordings").select("*").eq("id", recording_id).single().execute()
        return response.data
    except Exception as e:
        print(f"녹음 조회 오류: {e}")
        return None


def update_recording_status(recording_id: str, status: str) -> bool:
    """녹음 상태 업데이트"""
    if DEV_MODE:
        print(f"[DEV_MODE] 상태 업데이트: {recording_id} -> {status}")
        return True
    try:
        supabase.table("recordings").update({"status": status}).eq("id", recording_id).execute()
        return True
    except Exception as e:
        print(f"상태 업데이트 오류: {e}")
        return False


def save_analysis_result(
    recording_id: str,
    accuracy_score: float,
    fluency_score: float,
    completeness_score: float,
    pronunciation_score: float,
    feedback: str,
    formant_data: Optional[dict] = None,  # 공명 분석 결과
    tone_data: Optional[dict] = None,     # 톤 분석 결과
) -> Optional[dict]:
    """분석 결과 저장"""
    if DEV_MODE:
        mock_id = str(uuid.uuid4())
        print(f"[DEV_MODE] 결과 저장: {mock_id}")
        return {
            "id": mock_id,
            "recording_id": recording_id,
            "accuracy_score": accuracy_score,
            "fluency_score": fluency_score,
            "completeness_score": completeness_score,
            "pronunciation_score": pronunciation_score,
            "feedback": feedback,
            "formant_data": formant_data,
            "tone_data": tone_data,
        }
    try:
        data = {
            "recording_id": recording_id,
            "accuracy_score": accuracy_score,
            "fluency_score": fluency_score,
            "completeness_score": completeness_score,
            "pronunciation_score": pronunciation_score,
            "feedback": feedback,
        }
        # 공명 데이터 추가
        if formant_data:
            data["formant_data"] = formant_data
        # 톤 데이터 추가
        if tone_data:
            data["tone_data"] = tone_data

        response = supabase.table("analysis_results").insert(data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"결과 저장 오류: {e}")
        return None


def get_analysis_result(result_id: str) -> Optional[dict]:
    """분석 결과 조회 (result_id로)"""
    if DEV_MODE:
        return {
            "id": result_id,
            "recording_id": "mock-recording-id",
            "created_at": "2024-01-01T00:00:00Z",
            "accuracy_score": 85.5,
            "fluency_score": 90.0,
            "completeness_score": 100.0,
            "pronunciation_score": 88.2,
            "feedback": "[DEV MODE] 전반적으로 좋은 발음입니다.",
            "formant_data": None,
            "tone_data": None,
        }
    try:
        response = supabase.table("analysis_results").select("*").eq("id", result_id).single().execute()
        return response.data
    except Exception as e:
        print(f"결과 조회 오류: {e}")
        return None


def get_analysis_result_by_recording(recording_id: str) -> Optional[dict]:
    """분석 결과 조회 (recording_id로)"""
    if DEV_MODE:
        return {
            "id": str(uuid.uuid4()),
            "recording_id": recording_id,
            "created_at": "2024-01-01T00:00:00Z",
            "accuracy_score": 85.5,
            "fluency_score": 90.0,
            "completeness_score": 100.0,
            "pronunciation_score": 88.2,
            "feedback": "[DEV MODE] 전반적으로 좋은 발음입니다.",
            "formant_data": None,
            "tone_data": None,
        }
    try:
        response = (
            supabase.table("analysis_results")
            .select("*")
            .eq("recording_id", recording_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"결과 조회 오류: {e}")
        return None


def get_recording_file_url(file_path: str) -> str:
    """녹음 파일의 공개 URL 가져오기"""
    if DEV_MODE:
        return f"https://mock-url.example.com/{file_path}"
    try:
        response = supabase.storage.from_("recordings").get_public_url(file_path)
        return response
    except Exception as e:
        print(f"URL 생성 오류: {e}")
        return ""


def download_recording_file(file_path: str) -> Optional[bytes]:
    """
    녹음 파일 다운로드
    
    Args:
        file_path: DB에 저장된 파일 경로 (예: recordings/xxx.m4a)
    
    Returns:
        오디오 파일 바이너리 데이터 또는 None
    """
    if DEV_MODE:
        return b"mock audio data"
    
    try:
        # Storage 경로: 버킷(recordings) > 폴더(recordings) > 파일명
        # file_path가 "recordings/xxx.m4a" 형식이면 그대로 사용
        storage_path = file_path if file_path.startswith("recordings/") else f"recordings/{file_path}"
        
        # 파일 다운로드
        response = supabase.storage.from_("recordings").download(storage_path)
        
        if response and len(response) > 0:
            print(f"[INFO] 파일 다운로드 성공: {len(response)} bytes")
            return response
        else:
            print(f"[ERROR] 다운로드된 파일이 비어있습니다: {storage_path}")
            return None
            
    except Exception as e:
        print(f"[ERROR] 파일 다운로드 실패: {e}")
        return None
