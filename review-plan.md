# 📱 True Voice 프로젝트 전체 리뷰 & 재구현 가이드

> 이 문서는 True Voice 앱을 처음부터 끝까지 만든 과정을 정리한 것입니다.  
> 똑같은 앱을 다시 만들거나, 비슷한 프로젝트를 시작할 때 참고하세요!  
> **중학생도 이해할 수 있도록 쉽게 설명했어요** 📚

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [왜 이런 기술을 선택했나요?](#2-왜-이런-기술을-선택했나요)
3. [프로젝트 구조 이해하기](#3-프로젝트-구조-이해하기)
4. [단계별 개발 과정](#4-단계별-개발-과정)
5. [주요 기능 구현 방법](#5-주요-기능-구현-방법)
6. [배포 과정](#6-배포-과정)
7. [문제 해결 경험](#7-문제-해결-경험)
8. [같은 앱을 다시 만들 때 체크리스트](#8-같은-앱을-다시-만들-때-체크리스트)

---

## 1. 프로젝트 개요

### 🎯 True Voice는 뭔가요?

**한국어 발음 교정 앱**이에요! 사용자가 문장을 읽어서 녹음하면, AI가 발음을 분석하고 점수를 매겨줘요.

```
사용자: "안녕하세요" (녹음)
    ↓
앱: "발음 점수 85점! '안녕' 부분을 더 명확하게 발음해보세요"
```

### 🏗️ 앱의 구성 요소

앱은 크게 **3부분**으로 나뉘어져 있어요:

```
┌─────────────────────────────────────────┐
│  1. 프론트엔드 (Frontend)               │
│     → 휴대폰 화면, 버튼, 녹음 기능      │
├─────────────────────────────────────────┤
│  2. 백엔드 (Backend)                    │
│     → 서버, AI 분석, 데이터 처리         │
├─────────────────────────────────────────┤
│  3. 데이터베이스 (Database)             │
│     → 녹음 파일 저장, 결과 저장          │
└─────────────────────────────────────────┘
```

### 📊 핵심 기능

1. **음성 녹음** - 마이크로 문장 읽기
2. **발음 분석** - AI가 발음 정확도 평가
3. **점수 표시** - 발음, 공명, 톤 점수 보여주기
4. **피드백 제공** - 어떤 부분을 개선해야 하는지 알려주기

---

## 2. 왜 이런 기술을 선택했나요?

### 🎨 프론트엔드: React Native + Expo

**왜 선택했나요?**
- **하나의 코드**로 iOS와 Android 둘 다 만들 수 있어요
- **Expo** 덕분에 복잡한 설정 없이 바로 시작할 수 있어요
- **TypeScript**로 실수를 미리 잡을 수 있어요

```
❌ 다른 방법들:
- 순수 네이티브 (Swift/Kotlin) → 코드를 2번 써야 함
- Flutter → Dart 언어를 새로 배워야 함
- 웹 앱 → 성능이 느림

✅ React Native + Expo:
- JavaScript만 알면 됨
- 한 번만 코드 작성
- 빠르게 시작 가능
```

### 🐍 백엔드: Python FastAPI

**왜 선택했나요?**
- **Python**은 AI/데이터 분석 라이브러리가 많아요
- **FastAPI**는 빠르고 문서가 자동 생성돼요
- Azure Speech SDK가 Python을 잘 지원해요

```
Python의 장점:
- librosa (오디오 분석)
- parselmouth (음성 분석)
- pydub (오디오 변환)
→ 모두 Python 라이브러리!
```

### 🗄️ 데이터베이스: Supabase

**왜 선택했나요?**
- **PostgreSQL** (강력한 데이터베이스) + **Storage** (파일 저장) 한 번에!
- 무료 플랜이 있어요
- 설정이 쉬워요

```
Supabase = Firebase의 오픈소스 버전
- PostgreSQL (데이터 저장)
- Storage (파일 저장)
- Auth (로그인) - 나중에 사용 가능
```

### 🤖 AI 분석: Azure Speech

**왜 선택했나요?**
- **한국어 발음 평가**를 정확하게 해줘요
- Microsoft의 서비스라 안정적이에요
- 무료 할당량이 있어요

---

## 3. 프로젝트 구조 이해하기

### 📁 폴더 구조

```
True Voice/
├── frontend/              # 휴대폰 앱 (React Native)
│   ├── app/              # 화면들
│   │   ├── index.tsx     # 메인 화면 (녹음)
│   │   └── result/[id].tsx # 결과 화면
│   ├── components/        # 재사용 가능한 컴포넌트
│   │   ├── RecordButton.tsx  # 녹음 버튼
│   │   └── AudioPlayer.tsx   # 재생 버튼
│   └── lib/              # 유틸리티 함수들
│       ├── api.ts        # 백엔드 호출
│       └── supabase.ts   # Supabase 연결
│
├── backend/              # 서버 (Python)
│   ├── app/
│   │   ├── main.py      # 서버 시작점
│   │   ├── routers/     # API 엔드포인트
│   │   │   └── analyze.py  # /api/analyze
│   │   └── services/    # 비즈니스 로직
│   │       ├── azure_speech.py  # Azure 호출
│   │       ├── supabase.py      # DB 저장
│   │       └── formant_analysis.py  # 공명 분석
│   └── requirements.txt  # 필요한 라이브러리
│
└── supabase_setup.sql    # 데이터베이스 설정
```

### 🔄 데이터 흐름

```
사용자가 녹음 버튼 클릭
    ↓
[프론트엔드] RecordButton.tsx
    ↓ 녹음 파일 생성 (M4A)
[프론트엔드] supabase.ts
    ↓ Supabase Storage에 업로드
[백엔드] analyze.py
    ↓ Supabase에서 파일 다운로드
[백엔드] azure_speech.py
    ↓ Azure Speech로 분석
[백엔드] formant_analysis.py
    ↓ 공명 분석
[백엔드] supabase.py
    ↓ 결과를 DB에 저장
[프론트엔드] result/[id].tsx
    ↓ 결과 화면 표시
```

---

## 4. 단계별 개발 과정

### 📍 Phase 0: 기획 및 설계

**무엇을 했나요?**
1. 앱의 목적 정하기: "한국어 발음 교정"
2. 필요한 기능 나열하기: 녹음, 분석, 결과 표시
3. 기술 스택 선택하기: React Native, FastAPI, Supabase, Azure

**왜 중요한가요?**
- 처음부터 계획을 세우면 나중에 헤맬 일이 없어요
- "이 기능이 정말 필요한가?"를 먼저 생각해봐요

### 📍 Phase 1: 기본 설정

**무엇을 했나요?**

1. **프로젝트 생성**
   ```bash
   # 프론트엔드
   npx create-expo-app frontend --template blank-typescript
   
   # 백엔드
   mkdir backend && cd backend
   python -m venv venv
   ```

2. **필요한 라이브러리 설치**
   ```bash
   # 프론트엔드
   npm install expo-av @supabase/supabase-js
   
   # 백엔드
   pip install fastapi uvicorn azure-cognitiveservices-speech supabase
   ```

3. **Supabase 프로젝트 생성**
   - supabase.com에서 새 프로젝트 만들기
   - `supabase_setup.sql` 실행 (테이블 생성)

4. **Azure Speech 서비스 생성**
   - Azure Portal에서 Speech 서비스 만들기
   - 키와 지역 복사

**왜 중요한가요?**
- 모든 도구를 먼저 준비해야 나중에 편해요
- 환경 변수(.env)를 미리 설정해두면 좋아요

### 📍 Phase 2: 기본 녹음 기능

**무엇을 했나요?**

1. **RecordButton 컴포넌트 만들기**
   ```typescript
   // RecordButton.tsx
   const [recording, setRecording] = useState<Audio.Recording | null>(null);
   
   const startRecording = async () => {
     const { recording } = await Audio.Recording.createAsync(...);
     setRecording(recording);
   };
   ```

2. **녹음 파일 저장**
   - expo-av로 녹음
   - 파일 URI 얻기

**어려웠던 점:**
- iOS와 Android에서 녹음 형식이 달라요 (WAV vs M4A)
- 해결: M4A로 통일 (iOS에서 더 안정적)

### 📍 Phase 3: 파일 업로드

**무엇을 했나요?**

1. **Supabase Storage에 업로드**
   ```typescript
   const formData = new FormData();
   formData.append('', {
     uri: fileUri,
     name: 'recording.m4a',
     type: 'audio/mp4',
   });
   ```

**어려웠던 점:**
- React Native에서 파일을 읽는 방법이 웹과 달라요
- 해결: FormData를 사용해서 파일 URI를 직접 전송

### 📍 Phase 4: 백엔드 분석 API

**무엇을 했나요?**

1. **FastAPI 서버 만들기**
   ```python
   # main.py
   app = FastAPI()
   app.include_router(analyze.router)
   ```

2. **분석 엔드포인트 만들기**
   ```python
   # routers/analyze.py
   @router.post("/api/analyze")
   async def analyze_recording(...):
       # 1. Supabase에서 파일 다운로드
       # 2. Azure Speech로 분석
       # 3. 결과 저장
   ```

**어려웠던 점:**
- M4A 파일을 Azure Speech가 읽지 못해요 (WAV만 지원)
- 해결: pydub + ffmpeg로 M4A → WAV 변환

### 📍 Phase 5: 결과 표시

**무엇을 했나요?**

1. **결과 화면 만들기**
   - 발음 점수 표시
   - 단어별 피드백 표시
   - 재생 버튼 추가

2. **AudioPlayer 컴포넌트**
   - expo-av로 녹음 재생

### 📍 Phase 6: 추가 기능

**무엇을 추가했나요?**

1. **공명 분석** (formant_analysis.py)
   - 모음 발음의 품질 측정
   - F1, F2, F3 주파수 분석

2. **톤 분석** (tone_analysis.py)
   - 음성의 안정성, 명확도 측정
   - 피치, 지터, 쉬머 분석

3. **문장 직접 입력**
   - 사용자가 원하는 문장 입력 가능

4. **AI 명언 생성**
   - 카테고리별 명언 제공

**왜 추가했나요?**
- 발음만으로는 부족해요
- 공명과 톤도 중요해요
- 사용자가 원하는 문장으로 연습할 수 있게 해요

### 📍 Phase 7: UI/UX 개선

**무엇을 개선했나요?**

1. **미니멀 디자인**
   - 불필요한 요소 제거
   - 직관적인 버튼 배치

2. **색상 통일**
   - 일관된 색상 팔레트 사용

3. **애니메이션 추가**
   - 녹음 중 펄스 효과
   - 부드러운 전환

**왜 중요한가요?**
- 사용자가 앱을 쓰기 편해야 해요
- 예쁜 앱이 더 사용하고 싶게 만들어요

### 📍 Phase 8: 배포 준비

**무엇을 했나요?**

1. **Railway 설정 파일 추가**
   - `railway.json` - 빌드 설정
   - `nixpacks.toml` - FFmpeg 설치
   - `Procfile` - 시작 명령어

2. **GitHub에 코드 푸시**
   - `.gitignore` 설정 (비밀 정보 제외)
   - Railway와 GitHub 연결

3. **환경 변수 설정**
   - Railway Dashboard에서 환경 변수 추가

**왜 중요한가요?**
- 로컬에서만 돌아가면 다른 사람이 못 써요
- 배포해야 실제로 사용할 수 있어요

---

## 5. 주요 기능 구현 방법

### 🎤 녹음 기능 (RecordButton.tsx)

**핵심 코드:**
```typescript
// 1. 녹음 시작
const startRecording = async () => {
  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  setRecording(recording);
};

// 2. 녹음 중지
const stopRecording = async () => {
  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  // uri를 Supabase에 업로드
};
```

**왜 이렇게 했나요?**
- `expo-av`는 React Native에서 가장 안정적인 녹음 라이브러리예요
- iOS와 Android 둘 다 지원해요

### 📤 파일 업로드 (supabase.ts)

**핵심 코드:**
```typescript
const formData = new FormData();
formData.append('', {
  uri: fileUri,        // 파일 경로
  name: 'recording.m4a',
  type: 'audio/mp4',
});

// Supabase Storage REST API로 직접 업로드
await fetch(`${supabaseUrl}/storage/v1/object/recordings/${fileName}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'multipart/form-data',
  },
  body: formData,
});
```

**왜 이렇게 했나요?**
- React Native에서는 `Blob`을 만들기 어려워요
- `FormData`를 사용하면 파일 URI를 직접 전송할 수 있어요

### 🤖 발음 분석 (azure_speech.py)

**핵심 코드:**
```python
# 1. M4A를 WAV로 변환
def convert_to_wav(audio_data, source_format):
    audio = AudioSegment.from_file(temp_file, format="m4a")
    audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
    audio.export(wav_buffer, format="wav")
    return wav_buffer

# 2. Azure Speech로 분석
def assess_pronunciation(audio_data, reference_text):
    speech_config = SpeechConfig(...)
    pronunciation_config = PronunciationAssessmentConfig(...)
    
    result = speech_recognizer.recognize_once()
    pronunciation_result = PronunciationAssessmentResult(result)
    
    return {
        "accuracy": pronunciation_result.accuracy_score,
        "fluency": pronunciation_result.fluency_score,
        ...
    }
```

**왜 이렇게 했나요?**
- Azure Speech는 WAV 형식만 지원해요
- `pydub`로 형식을 변환해야 해요
- 16kHz, mono, 16bit로 설정하면 Azure가 가장 잘 분석해요

### 📊 공명 분석 (formant_analysis.py)

**핵심 코드:**
```python
import parselmouth

def analyze_formants(audio_data):
    sound = parselmouth.Sound(audio_data)
    
    # F1, F2, F3 추출 (모음의 특성)
    formants = sound.to_formant_burg()
    
    # 공명 점수 계산
    resonance_score = calculate_resonance_score(formants)
    
    return {
        "f1": f1_value,
        "f2": f2_value,
        "f3": f3_value,
        "score": resonance_score,
    }
```

**왜 이렇게 했나요?**
- **포먼트(Formant)**는 모음의 특성을 나타내는 주파수예요
- F1, F2, F3를 분석하면 발음의 품질을 알 수 있어요
- `parselmouth`는 Praat(음성 분석 도구)의 Python 버전이에요

---

## 6. 배포 과정

### 🚂 Railway 배포 (백엔드)

**단계별 과정:**

1. **Railway 계정 만들기**
   - https://railway.app 접속
   - GitHub로 로그인

2. **프로젝트 생성**
   - "New Project" 클릭
   - "Deploy from GitHub repo" 선택
   - `ondallio/True-Voice` 선택

3. **설정**
   - **Settings 탭** → Root Directory: `backend`
   - **Variables 탭** → 환경 변수 추가:
     ```
     DEV_MODE=false
     AZURE_SPEECH_KEY=...
     AZURE_REGION=koreacentral
     SUPABASE_URL=https://xxx.supabase.co
     SUPABASE_SERVICE_KEY=...
     ```

4. **배포**
   - 자동으로 빌드 시작
   - 빌드 완료 후 URL 확인 (예: `https://xxx.up.railway.app`)

**왜 Railway를 선택했나요?**
- 설정이 쉬워요
- 무료 플랜이 있어요
- GitHub와 자동 연동돼요

### 📱 Expo EAS Build (프론트엔드)

**단계별 과정:**

1. **EAS CLI 설치**
   ```bash
   npm install -g eas-cli
   ```

2. **로그인**
   ```bash
   eas login
   ```

3. **빌드 설정**
   ```bash
   cd frontend
   eas build:configure
   ```

4. **빌드 실행**
   ```bash
   # 개발 빌드
   eas build --profile development --platform ios
   eas build --profile development --platform android
   
   # 프로덕션 빌드
   eas build --profile production --platform all
   ```

5. **앱 설치**
   - 빌드 완료 후 QR 코드 스캔
   - 또는 TestFlight/Google Play에 배포

**왜 EAS Build를 사용했나요?**
- Expo Go는 일부 네이티브 모듈을 지원하지 않아요
- EAS Build는 완전한 네이티브 앱을 만들어줘요

---

## 7. 문제 해결 경험

### 🐛 주요 문제들과 해결 방법

#### 문제 1: 녹음 파일이 0 bytes로 업로드됨

**원인:**
- React Native에서 `fetch(fileUri)`로 로컬 파일을 읽으면 데이터가 안 읽혀요

**해결:**
- `FormData`를 사용해서 파일 URI를 직접 전송

**교훈:**
- 웹과 모바일은 파일 처리 방식이 달라요
- 항상 파일 크기를 확인하세요!

#### 문제 2: Azure Speech "INVALID_HEADER" 에러

**원인:**
- M4A 파일을 WAV처럼 읽으려고 해서 발생

**해결:**
- `pydub` + `ffmpeg`로 M4A → WAV 변환

**교훈:**
- 오디오 파일 형식을 항상 확인하세요
- 라이브러리가 요구하는 형식을 맞춰야 해요

#### 문제 3: 모바일에서 "Network Error"

**원인:**
- `localhost`는 컴퓨터 자기 자신만 접속 가능해요
- 휴대폰에서 컴퓨터의 백엔드에 접속하려면 실제 IP가 필요해요

**해결:**
- 백엔드: `--host 0.0.0.0` 추가
- 프론트엔드: `EXPO_PUBLIC_API_URL=http://192.168.x.x:8000`

**교훈:**
- `localhost`와 실제 IP 주소의 차이를 이해하세요
- 모바일 테스트할 때는 실제 IP를 사용하세요

#### 문제 4: Supabase "Invalid API key"

**원인:**
- `anon` 키를 백엔드에서 사용했어요
- 백엔드는 `service_role` 키가 필요해요

**해결:**
- Supabase Dashboard → Settings → API → `service_role` 키 복사

**교훈:**
- API 키 종류를 구분하세요
- `service_role` 키는 절대 공개하면 안 돼요!

---

## 8. 같은 앱을 다시 만들 때 체크리스트

### ✅ Phase 1: 프로젝트 설정

- [ ] 프론트엔드 프로젝트 생성 (`npx create-expo-app`)
- [ ] 백엔드 프로젝트 생성 (`mkdir backend`)
- [ ] 필요한 라이브러리 설치 (`npm install`, `pip install`)
- [ ] `.env` 파일 생성 (프론트엔드, 백엔드)
- [ ] `.gitignore` 설정 (`.env` 제외)

### ✅ Phase 2: Supabase 설정

- [ ] Supabase 프로젝트 생성
- [ ] `supabase_setup.sql` 실행 (테이블 생성)
- [ ] Storage 버킷 생성 (`recordings`)
- [ ] API 키 복사 (URL, anon, service_role)

### ✅ Phase 3: Azure 설정

- [ ] Azure Portal에서 Speech 서비스 생성
- [ ] 지역 선택 (`koreacentral` 권장)
- [ ] 키 복사 (API key, region)

### ✅ Phase 4: 기본 기능 구현

- [ ] 녹음 기능 (`RecordButton.tsx`)
- [ ] 파일 업로드 (`supabase.ts`)
- [ ] 분석 API (`analyze.py`)
- [ ] 결과 표시 (`result/[id].tsx`)

### ✅ Phase 5: 오디오 변환

- [ ] `pydub` 설치 (`pip install pydub`)
- [ ] `ffmpeg` 설치 (시스템 또는 Railway)
- [ ] M4A → WAV 변환 함수 구현

### ✅ Phase 6: 추가 분석

- [ ] 공명 분석 (`formant_analysis.py`)
- [ ] 톤 분석 (`tone_analysis.py`)
- [ ] 결과에 통합

### ✅ Phase 7: 테스트

- [ ] 로컬에서 백엔드 실행 (`uvicorn app.main:app --host 0.0.0.0`)
- [ ] 로컬 IP 확인 (`ifconfig` 또는 `ipconfig`)
- [ ] 프론트엔드에서 연결 테스트
- [ ] 실제 녹음 → 분석 → 결과 확인

### ✅ Phase 8: 배포 준비

- [ ] Railway 설정 파일 추가 (`railway.json`, `nixpacks.toml`, `Procfile`)
- [ ] GitHub에 코드 푸시
- [ ] Railway 프로젝트 생성 (GitHub 연결)
- [ ] Root Directory 설정 (`backend`)
- [ ] 환경 변수 추가 (5개)
- [ ] 빌드 확인

### ✅ Phase 9: 배포 후 확인

- [ ] Railway 배포 URL 확인
- [ ] 프론트엔드 `.env`에 Railway URL 추가
- [ ] 전체 플로우 테스트 (녹음 → 분석 → 결과)
- [ ] 에러 로그 확인

---

## 💡 핵심 교훈

### 1. 단계별로 진행하세요

```
❌ 한 번에 모든 걸 만들려고 하면:
→ 에러가 많아서 디버깅이 어려워요

✅ 단계별로 만들면:
→ 각 단계를 확인하면서 진행할 수 있어요
```

### 2. 에러 메시지를 잘 읽으세요

```
에러 메시지 = 문제의 힌트
- "0 bytes" → 파일이 비어있음
- "INVALID_HEADER" → 파일 형식 문제
- "Network Error" → 연결 문제
```

### 3. 로그를 많이 찍으세요

```typescript
console.log('[DEBUG] 파일 크기:', blob.size);
console.log('[DEBUG] 응답 상태:', response.status);
```

### 4. 작은 것부터 테스트하세요

```
1. 먼저 녹음이 되는지 확인
2. 그다음 업로드가 되는지 확인
3. 마지막으로 분석이 되는지 확인
```

### 5. 환경 변수 관리

```
✅ .env 파일 사용
✅ .gitignore에 .env 추가
✅ Railway/GitHub Secrets 사용
```

---

## 📚 참고 자료

### 공식 문서

- [React Native](https://reactnative.dev/docs/getting-started)
- [Expo](https://docs.expo.dev/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Supabase](https://supabase.com/docs)
- [Azure Speech](https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/)

### 유용한 도구

- [Postman](https://www.postman.com/) - API 테스트
- [Railway Dashboard](https://railway.app/dashboard) - 배포 관리
- [Supabase Dashboard](https://supabase.com/dashboard) - DB 관리

---

## 🎯 마무리

이 문서는 True Voice 앱을 만든 전체 과정을 정리한 거예요.  
같은 앱을 다시 만들거나, 비슷한 프로젝트를 시작할 때 참고하세요!

**가장 중요한 것:**
- 작은 것부터 시작하세요
- 에러를 두려워하지 마세요
- 단계별로 확인하면서 진행하세요

**행운을 빌어요!** 🚀

---

> 📅 작성일: 2025년 12월 27일  
> 📝 마지막 업데이트: 2025년 12월 27일  
> 💬 질문이 있으면 언제든 물어보세요!

