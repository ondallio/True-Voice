# 중앙 집중식 설정 관리 모듈
import os
from dotenv import load_dotenv

# 단일 지점에서 환경변수 로드
load_dotenv()


class Settings:
    """애플리케이션 설정 - 모든 모듈에서 이 설정을 참조해야 함"""

    def __init__(self):
        # 개발 모드 (초기값)
        self._dev_mode = os.getenv("DEV_MODE", "false").lower() == "true"

        # Supabase 설정
        self.SUPABASE_URL = os.getenv("SUPABASE_URL", "")
        self.SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

        # Azure Speech 설정
        self.AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY", "")
        self.AZURE_REGION = os.getenv("AZURE_REGION", "koreacentral")

        # 서버 설정
        self.PORT = int(os.getenv("PORT", "8000"))

    @property
    def DEV_MODE(self) -> bool:
        """개발 모드 여부 반환"""
        return self._dev_mode

    def set_dev_mode(self, value: bool):
        """개발 모드 설정 (fallback 시 사용)"""
        self._dev_mode = value
        print(f"[CONFIG] DEV_MODE changed to: {value}")

    def validate(self):
        """설정 유효성 검사"""
        warnings = []

        if not self.DEV_MODE:
            if not self.SUPABASE_URL:
                warnings.append("SUPABASE_URL is not set")
            if not self.SUPABASE_SERVICE_KEY:
                warnings.append("SUPABASE_SERVICE_KEY is not set")
            if not self.AZURE_SPEECH_KEY:
                warnings.append("AZURE_SPEECH_KEY is not set")

        for warning in warnings:
            print(f"[CONFIG WARNING] {warning}")

        return len(warnings) == 0


# 싱글톤 인스턴스
settings = Settings()
