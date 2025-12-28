# True-Voice 설정 로직 문제점 분석 보고서

## 개요

프로젝트에서 "설정이 됐다가 안됐다가" 하는 **일관성 문제**가 발생하고 있습니다.
이 문서는 근본 원인과 해결 방안을 정리합니다.

---

## 프로젝트 구조

```
True-Voice/
├── backend/
│   ├── start.py                    # 서버 시작 스크립트
│   ├── app/
│   │   ├── main.py                 # FastAPI 메인 앱
│   │   ├── routers/analyze.py      # 분석 API 라우터
│   │   └── services/
│   │       ├── supabase.py         # Supabase 설정 & 클라이언트
│   │       ├── azure_speech.py     # Azure Speech 설정
│   │       ├── formant_analysis.py
│   │       └── tone_analysis.py
│   └── .env.example
└── frontend/
    ├── lib/
    │   ├── supabase.ts             # Supabase 클라이언트 및 DEV_MODE
    │   └── api.ts                  # API 클라이언트
    ├── app/
    │   ├── index.tsx               # 메인 화면
    │   └── result/[id].tsx         # 결과 화면
    └── .env.example
```

---

## 핵심 문제점

### 1. DEV_MODE 초기화 불일치 (가장 심각)

#### 문제 설명

`DEV_MODE`가 여러 모듈에서 **독립적으로** 읽히고 있어 값이 동기화되지 않습니다.

#### 관련 코드

**`backend/app/services/supabase.py` (라인 7-30)**

```python
load_dotenv()

# 개발 모드 확인
DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"  # 라인 10

supabase = None
supabase_url = os.getenv("SUPABASE_URL", "")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY", "")

if not DEV_MODE and supabase_url and supabase_key:
    try:
        from supabase import create_client, Client
        supabase: Client = create_client(supabase_url, supabase_key)
    except Exception as e:
        print(f"[ERROR] Failed to create Supabase client: {e}")
        DEV_MODE = True  # ⚠️ 동적으로 변경됨!
elif not DEV_MODE:
    print(f"[WARNING] SUPABASE_URL or SUPABASE_SERVICE_KEY not set.")
    DEV_MODE = True  # ⚠️ 다시 변경됨!
```

**`backend/app/routers/analyze.py` (라인 27)**

```python
# 개발 모드 확인
DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"  # ⚠️ 다른 값!
```

#### 문제 시나리오

| 단계 | 상태 |
|------|------|
| 1. 환경변수 | `DEV_MODE=false`, Supabase 설정 누락 |
| 2. `supabase.py` 로드 | DEV_MODE=false → 초기화 실패 → **DEV_MODE=True로 변경** |
| 3. `analyze.py` 로드 | 환경변수에서 DEV_MODE=false를 **다시 읽음** |
| 4. 결과 | 두 모듈이 **서로 다른 DEV_MODE** 값으로 동작 |

---

### 2. `load_dotenv()` 중복 호출

여러 모듈에서 독립적으로 `load_dotenv()`를 호출합니다.

| 파일 | 라인 |
|------|------|
| `backend/app/main.py` | 10 |
| `backend/app/services/supabase.py` | 7 |
| `backend/app/services/azure_speech.py` | 11 |

#### 문제점

- `load_dotenv()`는 이미 `os.environ`에 있는 변수를 덮어쓰지 않음
- 로드 시점이 임의적이면 일부 모듈에서 변수가 읽히지 않을 수 있음
- 모듈 로딩 순서에 따라 결과가 달라질 수 있음

---

### 3. PORT 설정 불일치

| 파일 | 기본값 | 코드 |
|------|--------|------|
| `backend/start.py` | **8080** | `port = int(os.environ.get("PORT", 8080))` |
| `backend/app/main.py` | **8000** | `port = int(os.getenv("PORT", 8000))` |
| Frontend 설정 | **8000** | `EXPO_PUBLIC_API_URL=http://localhost:8000` |

#### 문제점

- `start.py`로 서버 시작 시 → 포트 8080에서 실행
- Frontend는 포트 8000으로 API 호출 시도
- **결과:** 연결 실패

---

### 4. 모듈 수준 초기화 - 재초기화 불가

#### 문제 코드

```python
# supabase.py - 모듈 로드시 한 번만 실행
supabase = None

if not DEV_MODE and supabase_url and supabase_key:
    supabase = create_client(...)
```

#### 문제점

- 모듈 로드 시점에 한 번만 초기화
- 환경변수가 나중에 변경되어도 반영 안됨
- 서버 재시작 전까지 설정 변경 불가

---

### 5. Frontend 모듈 로드시점 고정 초기화

**`frontend/lib/supabase.ts` (라인 11)**

```typescript
// 개발 모드 확인
const DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === 'true';
```

#### 문제점

- 모듈 로드시점에만 환경변수 읽음
- 앱 실행 중 환경변수 변경되어도 반영 안됨
- Hot reload 시에도 환경변수 변경 영향 없음

---

## 환경 변수 목록

### Backend

| 변수명 | 사용 위치 | 기본값 |
|--------|----------|--------|
| `DEV_MODE` | supabase.py, analyze.py | `false` |
| `SUPABASE_URL` | supabase.py | - |
| `SUPABASE_SERVICE_KEY` | supabase.py | - |
| `AZURE_SPEECH_KEY` | azure_speech.py | - |
| `AZURE_REGION` | azure_speech.py | `koreacentral` |
| `PORT` | start.py, main.py | **불일치** |

### Frontend

| 변수명 | 사용 위치 |
|--------|----------|
| `EXPO_PUBLIC_SUPABASE_URL` | supabase.ts |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | supabase.ts |
| `EXPO_PUBLIC_API_URL` | api.ts |
| `EXPO_PUBLIC_DEV_MODE` | supabase.ts |

---

## "설정이 됐다가 안됐다가" 동작 원인

### 시나리오 1: 초기 상태 (정상 동작)

```
환경변수 없음 또는 불완전
├── Backend: DEV_MODE=true (fallback)
├── Frontend: DEV_MODE=true
└── 결과: 목업 데이터로 작동 ✅
```

### 시나리오 2: 부분 설정 (불안정)

```
Supabase 설정만 추가
├── supabase.py: DEV_MODE=true (fallback으로 변경됨)
├── analyze.py: DEV_MODE=false (환경변수에서 읽음)
├── PORT 불일치
└── 결과: 목업과 실제 API가 섞여서 동작 ❌
```

### 시나리오 3: 서버 재시작 (랜덤 결과)

```
모듈 변수들이 다시 초기화
├── 로딩 순서에 따라 다른 결과
├── 환경변수 로딩 시점에 따라 다른 결과
└── 결과: 때때로 작동, 때때로 실패 🔄
```

---

## 권장 해결 방안

### 긴급 수정 (즉시 필요)

#### 1. DEV_MODE 일원화

**중앙 설정 모듈 생성: `backend/app/config.py`**

```python
import os
from dotenv import load_dotenv

# 단일 지점에서 환경변수 로드
load_dotenv()

class Settings:
    DEV_MODE: bool = os.getenv("DEV_MODE", "false").lower() == "true"
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    AZURE_SPEECH_KEY: str = os.getenv("AZURE_SPEECH_KEY", "")
    AZURE_REGION: str = os.getenv("AZURE_REGION", "koreacentral")
    PORT: int = int(os.getenv("PORT", "8000"))

settings = Settings()
```

#### 2. 모든 모듈에서 중앙 설정 사용

```python
# supabase.py
from app.config import settings

if not settings.DEV_MODE and settings.SUPABASE_URL:
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
```

```python
# analyze.py
from app.config import settings

if settings.DEV_MODE:
    return mock_response()
```

#### 3. PORT 기본값 통일

모든 파일에서 기본 포트를 **8000**으로 통일

#### 4. `load_dotenv()` 단일화

- `config.py`에서만 `load_dotenv()` 호출
- 다른 모듈에서 `load_dotenv()` 제거

---

### 중기 개선

#### 5. 동적 설정 지원

```python
class Settings:
    @property
    def DEV_MODE(self) -> bool:
        return os.getenv("DEV_MODE", "false").lower() == "true"
```

#### 6. 설정 검증 추가

```python
def validate_settings():
    if not settings.DEV_MODE:
        if not settings.SUPABASE_URL:
            raise ValueError("SUPABASE_URL is required in production mode")
        if not settings.AZURE_SPEECH_KEY:
            raise ValueError("AZURE_SPEECH_KEY is required in production mode")
```

---

## 주요 파일 경로

### Backend

| 파일 | 역할 |
|------|------|
| `/backend/start.py` | 서버 시작 스크립트 |
| `/backend/app/main.py` | FastAPI 메인 앱 |
| `/backend/app/routers/analyze.py` | 분석 API 라우터 |
| `/backend/app/services/supabase.py` | Supabase 클라이언트 |
| `/backend/app/services/azure_speech.py` | Azure Speech 서비스 |

### Frontend

| 파일 | 역할 |
|------|------|
| `/frontend/lib/supabase.ts` | Supabase 클라이언트 |
| `/frontend/lib/api.ts` | API 클라이언트 |
| `/frontend/app/index.tsx` | 메인 화면 |
| `/frontend/app/result/[id].tsx` | 결과 화면 |

---

## 결론

"설정이 됐다가 안됐다가 한다"는 문제의 **근본 원인**:

1. **모듈 수준 변수**들이 초기화 시점에만 값이 결정됨
2. **여러 모듈**에서 독립적으로 환경변수를 읽음
3. **DEV_MODE 등 중요 설정**이 모듈 간 동기화되지 않음
4. **PORT 기본값**이 파일마다 다름

**해결책:** 중앙 집중식 설정 관리 (`config.py`) 도입
