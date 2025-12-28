import uvicorn

# config를 임포트하면 load_dotenv()가 실행됨
from app.config import settings

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT)
