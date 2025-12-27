# FastAPI 메인 엔트리포인트
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routers import analyze, tts

# 환경 변수 로드
load_dotenv()

# FastAPI 앱 생성
app = FastAPI(
    title="True Voice API",
    description="한국어 발음 교정 앱 MVP API",
    version="1.0.0",
)

# CORS 설정 (개발 환경에서는 모든 출처 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인만 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(analyze.router, prefix="/api", tags=["analyze"])
app.include_router(tts.router, prefix="/api", tags=["tts"])


@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "True Voice API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트"""
    return {
        "status": "healthy",
        "service": "true-voice-api",
    }


# 개발 서버 실행 (직접 실행 시)
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
    )
