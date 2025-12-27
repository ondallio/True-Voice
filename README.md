# True Voice - 음성 발음 교정 앱 MVP

한국어 음성의 발음 정확도를 분석하고 피드백을 제공하는 모바일 앱 MVP입니다.

## 프로젝트 구조

```
true-voice/
├── frontend/                 # React Native + Expo
│   ├── app/                  # Expo Router 페이지
│   │   ├── _layout.tsx       # 앱 레이아웃
│   │   ├── index.tsx         # 홈/녹음 화면
│   │   └── result/[id].tsx   # 결과 화면
│   ├── components/
│   │   └── RecordButton.tsx  # 녹음 버튼 컴포넌트
│   ├── lib/
│   │   ├── supabase.ts       # Supabase 클라이언트
│   │   └── api.ts            # 백엔드 API 호출
│   └── ...
│
├── backend/                  # Python FastAPI
│   ├── app/
│   │   ├── main.py           # FastAPI 엔트리포인트
│   │   ├── schemas.py        # Pydantic 모델
│   │   ├── routers/
│   │   │   └── analyze.py    # 분석 API 라우터
│   │   └── services/
│   │       ├── azure_speech.py   # Azure 발음 평가
│   │       └── supabase.py       # Supabase 연동
│   ├── requirements.txt
│   └── Dockerfile
│
└── supabase_setup.sql        # 데이터베이스 설정 SQL
```

## MVP 핵심 기능

1. **마이크로 음성 녹음** - expo-av 사용
2. **Azure Pronunciation Assessment로 발음 평가** - 정확도, 유창성, 완성도 분석
3. **점수 및 단어별 피드백 표시** - 종합 점수 및 개선점 안내

## 기술 스택

- **프론트엔드**: React Native + Expo + TypeScript
- **백엔드**: Python FastAPI
- **데이터베이스**: Supabase (PostgreSQL + Storage)
- **음성 분석**: Azure Pronunciation Assessment
- **배포**: Expo EAS Build (모바일), Railway (백엔드)

---

## 시작하기

### 1. 사전 요구사항

- Node.js 18+
- Python 3.9+
- Expo Go 앱 (iOS/Android)
- Supabase 계정
- Azure Speech 서비스 키

### 2. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `supabase_setup.sql` 실행
3. Storage에서 `recordings` 버킷 확인
4. Settings > API에서 URL과 anon key 복사

### 3. Azure Speech 설정

1. [Azure Portal](https://portal.azure.com)에서 Speech 서비스 생성
2. 지역: `koreacentral` 권장
3. Keys and Endpoint에서 키 복사

### 4. 환경 변수 설정

**Frontend** (`frontend/.env`):
```bash
cp frontend/.env.example frontend/.env
# 파일 편집하여 실제 값 입력
```

**Backend** (`backend/.env`):
```bash
cp backend/.env.example backend/.env
# 파일 편집하여 실제 값 입력
```

### 5. Backend 실행

```bash
cd backend

# 가상환경 활성화
source venv/bin/activate  # Windows: venv\Scripts\activate

# 서버 실행
uvicorn app.main:app --reload --port 8000
```

### 6. Frontend 실행

```bash
cd frontend

# 패키지 설치 (이미 설치됨)
npm install

# 개발 서버 시작
npx expo start
```

Expo Go 앱에서 QR 코드를 스캔하여 실행합니다.

---

## API 엔드포인트

### POST /api/analyze
음성 파일을 분석하고 결과를 반환합니다.

```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "recording_id": "uuid-string",
    "reference_text": "안녕하세요"
  }'
```

**응답:**
```json
{
  "success": true,
  "result_id": "uuid-string",
  "scores": {
    "accuracy": 85.5,
    "fluency": 90.0,
    "completeness": 100.0,
    "pronunciation": 88.2
  },
  "word_details": [
    {"word": "안녕하세요", "score": 88.2, "error_type": null}
  ],
  "feedback": "전반적으로 좋은 발음입니다."
}
```

### GET /api/results/{id}
저장된 분석 결과를 조회합니다.

```bash
curl http://localhost:8000/api/results/result-uuid
```

### GET /health
서버 상태 확인

```bash
curl http://localhost:8000/health
```

---

## 개발 모드

개발 모드(`DEV_MODE=true`)에서는:
- Azure API 호출 없이 목업 데이터 사용
- Supabase 연결 없이도 앱 테스트 가능
- 프론트엔드에 "DEV MODE" 배지 표시

---

## 배포

### Backend - Railway

```bash
cd backend

# Railway CLI 설치
npm install -g @railway/cli

# 로그인 및 배포
railway login
railway init
railway up

# 환경 변수 설정 (Railway Dashboard에서)
# AZURE_SPEECH_KEY, AZURE_REGION, SUPABASE_URL, SUPABASE_SERVICE_KEY
```

### Frontend - Expo EAS Build

```bash
cd frontend

# EAS CLI 설치
npm install -g eas-cli

# 로그인
eas login

# 프로젝트 설정
eas build:configure

# 개발 빌드
eas build --profile development --platform all

# 프로덕션 빌드
eas build --profile production --platform all
```

---

## 테스트 방법

### 1. Expo Go로 실제 디바이스 테스트

```bash
cd frontend
npx expo start
# QR 코드를 Expo Go 앱으로 스캔
```

### 2. API 테스트

```bash
# 헬스 체크
curl http://localhost:8000/health

# 분석 요청 (개발 모드)
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"recording_id": "test", "reference_text": "안녕하세요"}'
```

### 3. 개발 모드에서 빠른 테스트

1. `frontend/.env`에서 `EXPO_PUBLIC_DEV_MODE=true` 설정
2. `backend/.env`에서 `DEV_MODE=true` 설정
3. 앱에서 녹음 버튼 클릭 → 목업 결과 확인

---

## 문제 해결

### 마이크 권한 오류
- iOS: Settings > Privacy > Microphone에서 Expo Go 권한 확인
- Android: Settings > Apps > Expo Go > Permissions에서 마이크 권한 허용

### Backend 연결 오류
- `EXPO_PUBLIC_API_URL`이 올바른지 확인
- 같은 네트워크에 있는지 확인 (로컬 개발 시)
- 개발 모드 사용: `EXPO_PUBLIC_DEV_MODE=true`

### Azure Speech 오류
- API 키와 지역이 올바른지 확인
- 할당량 초과 여부 확인
- 개발 모드로 먼저 테스트

---

## 라이선스

MIT License
