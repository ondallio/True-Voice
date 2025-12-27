# 🔧 True Voice 문제 해결 가이드

> 이 문서는 True Voice 앱을 개발하면서 만난 문제들과 해결 방법을 정리한 것입니다.
> 중학생도 이해할 수 있도록 쉽게 설명했어요! 📚

---

## 📋 목차

1. [녹음 파일이 0 bytes로 업로드되는 문제](#1-녹음-파일이-0-bytes로-업로드되는-문제)
2. [Azure Speech에서 "INVALID_HEADER" 에러](#2-azure-speech에서-invalid_header-에러)
3. [모바일에서 "Network Error" 발생](#3-모바일에서-network-error-발생)
4. [Supabase "Invalid API key" 에러](#4-supabase-invalid-api-key-에러)
5. [expo-file-system "deprecated" 경고](#5-expo-file-system-deprecated-경고)
6. [React Native에서 Blob 생성 에러](#6-react-native에서-blob-생성-에러)
7. [포먼트 분석 "Not an audio file" 에러](#7-포먼트-분석-not-an-audio-file-에러)
8. [Railway 빌드 실패](#8-railway-빌드-실패)
9. [Azure Speech "No speech recognized" 에러](#9-azure-speech-no-speech-recognized-에러)
10. [포트 충돌 "Address already in use"](#10-포트-충돌-address-already-in-use)
11. [TypeScript 타입 에러 (NodeJS.Timeout)](#11-typescript-타입-에러-nodejstimeout)
12. [온보딩 페이지 넘어가지 않는 문제](#12-온보딩-페이지-넘어가지-않는-문제)
13. [Git 관련 문제들](#13-git-관련-문제들)
14. [환경 변수 설정 혼동](#14-환경-변수-설정-혼동)
15. [npm install 에러 (peer dependency)](#15-npm-install-에러-peer-dependency)

---

## 1. 녹음 파일이 0 bytes로 업로드되는 문제

### 😱 무슨 문제였나요?
휴대폰에서 녹음한 파일이 Supabase Storage에 올라가긴 하는데, 파일 크기가 0 bytes였어요.
즉, 파일 이름만 있고 실제 소리 데이터는 없었던 거예요!

### 🔍 왜 이런 일이 생겼나요?
**React Native**에서는 웹 브라우저와 다르게 파일을 읽는 방법이 달라요.

```
❌ 웹에서는 이렇게 하면 돼요:
const response = await fetch(fileUri);
const blob = await response.blob();  // 웹에서는 잘 됨!

❌ 하지만 React Native에서는:
const response = await fetch(fileUri);
const blob = await response.blob();  // 빈 데이터가 됨!
```

휴대폰의 파일 시스템은 웹과 다르게 작동하기 때문에, `fetch`로 로컬 파일을 읽으면 데이터가 제대로 안 읽혀요.

### ✅ 어떻게 해결했나요?
**FormData**를 사용해서 파일 URI를 직접 전송했어요!

```javascript
// React Native에서는 이렇게 해야 해요!
const formData = new FormData();
formData.append('', {
  uri: fileUri,        // 파일 경로
  name: 'recording.m4a', // 파일 이름
  type: 'audio/mp4',   // 파일 종류
});

// REST API로 직접 업로드
await fetch('https://supabase-url/storage/...', {
  method: 'POST',
  body: formData,
});
```

### 📝 기억할 점
- **웹**과 **모바일**은 파일을 다루는 방식이 달라요
- React Native에서는 `FormData`를 사용해서 파일을 업로드해요
- 파일 크기가 0인지 항상 확인하세요!

---

## 2. Azure Speech에서 "INVALID_HEADER" 에러

### 😱 무슨 문제였나요?
녹음 파일이 정상적으로 업로드됐는데, Azure에서 분석하려고 하면 이런 에러가 났어요:
```
SPXERR_INVALID_HEADER
```

### 🔍 왜 이런 일이 생겼나요?
**오디오 파일 형식** 문제였어요!

- 📱 **iPhone에서 녹음**: M4A 형식 (AAC 코덱)
- 🤖 **Azure Speech SDK가 원하는 것**: WAV 형식

Azure Speech는 WAV 파일만 읽을 수 있어요. M4A 파일을 WAV처럼 읽으려고 하니까 "헤더가 이상해요!"라고 에러를 낸 거예요.

```
🎵 오디오 파일 구조 (간단히)
┌─────────────────────────────┐
│ 헤더 (파일 정보)             │  ← 여기가 다름!
├─────────────────────────────┤
│ 실제 소리 데이터             │
└─────────────────────────────┘

WAV 헤더: "RIFF....WAVEfmt...."
M4A 헤더: "....ftyp...."  (완전 다름!)
```

### ✅ 어떻게 해결했나요?
**pydub**와 **ffmpeg**을 사용해서 M4A를 WAV로 변환했어요!

```python
from pydub import AudioSegment

def convert_to_wav(audio_data, source_format):
    # M4A 파일 읽기
    audio = AudioSegment.from_file(temp_file, format="m4a")
    
    # Azure가 좋아하는 설정으로 변환
    # - 16kHz (1초에 16000번 샘플링)
    # - 16bit (음질)
    # - mono (스피커 1개)
    audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
    
    # WAV로 저장
    audio.export(wav_buffer, format="wav")
```

### 📝 기억할 점
- 오디오 파일에는 여러 **형식**이 있어요 (WAV, MP3, M4A, WebM...)
- Azure Speech는 **WAV 형식**만 지원해요
- **pydub** + **ffmpeg**으로 형식을 변환할 수 있어요

---

## 3. 모바일에서 "Network Error" 발생

### 😱 무슨 문제였나요?
Expo Go 앱에서 녹음 후 분석을 요청하면 "Network Error"가 발생했어요.

### 🔍 왜 이런 일이 생겼나요?
**localhost** 문제였어요!

```
컴퓨터 (백엔드 서버)
  └── http://localhost:8000  ← 컴퓨터 자기 자신만 접속 가능!

휴대폰 (Expo Go)
  └── http://localhost:8000  ← 휴대폰 자기 자신을 찾음! (서버 없음!)
```

`localhost`는 "나 자신"이라는 뜻이에요:
- 컴퓨터에서 localhost = 컴퓨터 자신
- 휴대폰에서 localhost = 휴대폰 자신

휴대폰에서 컴퓨터의 백엔드에 접속하려면 컴퓨터의 **실제 IP 주소**가 필요해요!

### ✅ 어떻게 해결했나요?

**1단계: 컴퓨터 IP 주소 찾기**
```bash
# Mac에서
ifconfig | grep "inet " | grep -v 127.0.0.1
# 예: 192.168.219.122
```

**2단계: 백엔드를 모든 곳에서 접속 가능하게 설정**
```bash
# --host 0.0.0.0 추가!
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**3단계: 프론트엔드 환경변수 수정**
```env
# frontend/.env
EXPO_PUBLIC_API_URL=http://192.168.219.122:8000
```

### 📝 기억할 점
- `localhost` = "나 자신" (다른 기기에서는 접속 불가)
- `0.0.0.0` = "모든 곳에서 접속 허용"
- 모바일 테스트할 때는 **실제 IP 주소**를 사용하세요!

---

## 4. Supabase "Invalid API key" 에러

### 😱 무슨 문제였나요?
백엔드에서 Supabase에 접속하려고 하면:
```
SupabaseException: Invalid API key
```

### 🔍 왜 이런 일이 생겼나요?
Supabase에는 **두 종류의 API 키**가 있어요:

| 키 종류 | 용도 | 권한 |
|---------|------|------|
| `anon` (공개키) | 프론트엔드용 | 제한적 (RLS 적용) |
| `service_role` (비밀키) | 백엔드용 | 전체 권한 |

백엔드에서 `anon` 키를 사용하면 권한이 부족해서 에러가 나요!

```
❌ 잘못된 설정:
SUPABASE_SERVICE_KEY=eyJhbGciOi...anon키...

✅ 올바른 설정:
SUPABASE_SERVICE_KEY=eyJhbGciOi...service_role키...
```

### ✅ 어떻게 해결했나요?
Supabase Dashboard → Settings → API에서 **service_role 키**를 복사해서 사용했어요.

### ⚠️ 중요한 주의사항!
```
🔒 service_role 키는 절대로 공개하면 안 돼요!
- GitHub에 올리면 안 돼요
- 프론트엔드 코드에 넣으면 안 돼요
- 오직 백엔드에서만 사용하세요!
```

### 📝 기억할 점
- 프론트엔드: `anon` 키 사용 (공개해도 괜찮음)
- 백엔드: `service_role` 키 사용 (절대 공개 금지!)
- 키 종류를 헷갈리면 에러가 나요!

---

## 5. expo-file-system "deprecated" 경고

### 😱 무슨 문제였나요?
```
Method getInfoAsync imported from "expo-file-system" is deprecated.
```

### 🔍 왜 이런 일이 생겼나요?
`expo-file-system` 라이브러리가 새 버전으로 업데이트되면서, 기존 API가 "곧 없어질 예정(deprecated)"이 됐어요.

### ✅ 어떻게 해결했나요?
**legacy(예전 버전)** API를 사용하도록 import 경로를 바꿨어요:

```javascript
// ❌ 새 버전 (에러 발생)
import * as FileSystem from 'expo-file-system';

// ✅ 예전 버전 (잘 작동)
import * as FileSystem from 'expo-file-system/legacy';
```

### 📝 기억할 점
- 라이브러리는 계속 업데이트돼요
- "deprecated"는 "곧 없어질 예정"이라는 뜻이에요
- 당장은 `/legacy`를 사용하고, 나중에 새 API로 마이그레이션하면 돼요

---

## 6. React Native에서 Blob 생성 에러

### 😱 무슨 문제였나요?
```
Error: Creating blobs from 'ArrayBuffer' and 'ArrayBufferView' are not supported
```

### 🔍 왜 이런 일이 생겼나요?
웹 브라우저에서는 이렇게 Blob을 만들 수 있어요:
```javascript
const bytes = new Uint8Array([...]);
const blob = new Blob([bytes], { type: 'audio/mp4' });  // 웹에서는 OK!
```

하지만 React Native에서는 Blob 생성 방식이 제한되어 있어서 같은 코드가 안 돼요!

### ✅ 어떻게 해결했나요?
Blob을 만들지 않고, **FormData로 파일 URI를 직접 전송**했어요:

```javascript
// Blob 대신 FormData 사용!
const formData = new FormData();
formData.append('', {
  uri: fileUri,  // 파일 경로만 전달
  name: 'recording.m4a',
  type: 'audio/mp4',
});
```

### 📝 기억할 점
- React Native는 웹 브라우저가 아니에요!
- 같은 JavaScript라도 환경에 따라 다르게 작동해요
- React Native에서는 FormData를 활용하세요

---

## 7. 포먼트 분석 "Not an audio file" 에러

### 😱 무슨 문제였나요?
Azure Speech 분석은 성공했는데, 공명(포먼트) 분석에서 이런 에러가 났어요:
```
포먼트 분석 오류: Not an audio file.
```

### 🔍 왜 이런 일이 생겼나요?
**파일 형식** 문제였어요!

- 포먼트 분석 라이브러리(`parselmouth`)는 **WAV 파일**만 읽을 수 있어요
- 하지만 원본 녹음 파일은 **M4A 형식**이었어요
- M4A 파일을 그대로 `parselmouth`에 전달하면 "이건 오디오 파일이 아니에요!"라고 에러를 내요

```
❌ 잘못된 흐름:
M4A 파일 → Azure 분석 (성공) → M4A 파일 → 포먼트 분석 (실패!)

✅ 올바른 흐름:
M4A 파일 → WAV 변환 → Azure 분석 (성공) → WAV 파일 → 포먼트 분석 (성공!)
```

### ✅ 어떻게 해결했나요?
**WAV로 변환된 오디오 데이터**를 포먼트 분석에 전달했어요!

```python
# routers/analyze.py
# 1. Azure 분석 (이미 M4A → WAV 변환됨)
pronunciation_result = assess_pronunciation(audio_data, reference_text, audio_format)
converted_audio_data = pronunciation_result.converted_audio  # WAV 형식!

# 2. 포먼트 분석 (WAV 파일 사용)
formant_result = analyze_formants(converted_audio_data)  # ✅ WAV 전달!
```

### 📝 기억할 점
- 오디오 분석 라이브러리들은 각자 원하는 형식이 달라요
- 한 번 변환한 WAV 파일을 재사용하면 효율적이에요
- 변환된 파일을 변수에 저장해두면 좋아요

---

## 8. Railway 빌드 실패

### 😱 무슨 문제였나요?
Railway에서 백엔드를 배포하려고 하면 빌드가 실패했어요:
```
Build failed: Command failed
```

### 🔍 왜 이런 일이 생겼나요?
여러 가지 원인이 있을 수 있어요:

1. **FFmpeg가 없어요**
   - `pydub`가 오디오 변환을 하려면 `ffmpeg`가 필요해요
   - Railway는 기본적으로 `ffmpeg`를 설치하지 않아요

2. **Root Directory 설정 안 됨**
   - Railway가 프로젝트 루트에서 빌드를 시작해요
   - 하지만 백엔드 코드는 `backend/` 폴더에 있어요

3. **필요한 라이브러리 누락**
   - `requirements.txt`에 `pydub`가 없었을 수 있어요

### ✅ 어떻게 해결했나요?

**1단계: Railway 설정 파일 추가**

`backend/nixpacks.toml` 파일 생성:
```toml
[phases.setup]
nixPkgs = ["ffmpeg"]  # FFmpeg 설치!

[phases.install]
cmds = ["pip install -r requirements.txt"]

[start]
cmd = "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
```

**2단계: requirements.txt에 pydub 추가**
```txt
pydub==0.25.1
```

**3단계: Railway Settings에서 Root Directory 설정**
- Settings 탭 → Root Directory: `backend`

**4단계: Procfile 추가 (선택사항)**
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### 📝 기억할 점
- Railway는 `nixpacks.toml`을 읽어서 빌드해요
- Root Directory를 설정하지 않으면 프로젝트 루트에서 빌드를 시작해요
- FFmpeg 같은 시스템 패키지는 `nixpacks.toml`에 명시해야 해요

---

## 9. Azure Speech "No speech recognized" 에러

### 😱 무슨 문제였나요?
녹음 파일은 정상적으로 업로드됐는데, Azure Speech에서 분석할 때:
```
No speech recognized
```
에러가 발생했어요.

### 🔍 왜 이런 일이 생겼나요?
**음성이 감지되지 않았어요!**

가능한 원인들:
1. **너무 조용하게 말했어요** - 마이크가 소리를 못 잡았어요
2. **마이크가 멀어요** - 마이크에서 너무 떨어져서 말했어요
3. **마이크 권한 문제** - 앱이 마이크에 접근하지 못했어요
4. **조용한 환경** - 주변 소음이 너무 적어서 음성으로 인식 안 됐어요

### ✅ 어떻게 해결했나요?
**사용자 친화적인 에러 메시지**를 표시했어요!

```python
# backend/app/services/azure_speech.py
try:
    result = speech_recognizer.recognize_once()
except Exception as e:
    if "No speech recognized" in str(e):
        raise ValueError("음성이 감지되지 않았습니다. 마이크에 가까이 대고 크게 말해보세요.")
    raise
```

```typescript
// frontend/lib/api.ts
if (errorMessage.includes('No speech recognized')) {
  throw new Error('🎤 음성이 감지되지 않았어요!\n\n마이크에 가까이 대고 크고 또렷하게 말해보세요.');
}
```

### 📝 기억할 점
- 에러 메시지를 사용자가 이해하기 쉽게 바꿔주세요
- "왜 실패했는지"와 "어떻게 해결할지"를 알려주세요
- 이모지를 사용하면 더 친근해 보여요! 🎤

---

## 10. 포트 충돌 "Address already in use"

### 😱 무슨 문제였나요?
백엔드를 실행하려고 하면:
```
ERROR: [Errno 48] Address already in use
```

### 🔍 왜 이런 일이 생겼나요?
**포트 8000번이 이미 사용 중**이었어요!

가능한 원인:
- 이전에 실행한 서버가 아직 돌아가고 있어요
- 다른 프로그램이 8000번 포트를 사용하고 있어요

### ✅ 어떻게 해결했나요?

**Mac/Linux에서:**
```bash
# 8000번 포트를 사용하는 프로세스 찾기
lsof -ti:8000

# 프로세스 종료
lsof -ti:8000 | xargs kill -9

# 또는 한 번에
lsof -ti:8000 | xargs kill -9
```

**Windows에서:**
```bash
# 8000번 포트를 사용하는 프로세스 찾기
netstat -ano | findstr :8000

# 프로세스 ID 확인 후 종료
taskkill /PID <프로세스ID> /F
```

**또는 다른 포트 사용:**
```bash
uvicorn app.main:app --reload --port 8001
```

### 📝 기억할 점
- 서버를 종료할 때는 `Ctrl+C`로 깔끔하게 종료하세요
- 포트 충돌이 자주 생기면 다른 포트를 사용하세요
- `lsof` (Mac/Linux) 또는 `netstat` (Windows)로 포트 사용 확인 가능해요

---

## 11. TypeScript 타입 에러 (NodeJS.Timeout)

### 😱 무슨 문제였나요?
TypeScript 컴파일 시 이런 에러가 났어요:
```
Type 'number' is not assignable to type 'Timeout'.
```

### 🔍 왜 이런 일이 생겼나요?
**타입 정의 문제**였어요!

```typescript
// ❌ 문제가 있는 코드
let interval: NodeJS.Timeout | null = null;
interval = setInterval(() => {}, 1000);  // 에러!
```

- `setInterval`은 브라우저에서는 `number`를 반환해요
- Node.js에서는 `NodeJS.Timeout`을 반환해요
- React Native 환경에서는 타입이 맞지 않을 수 있어요

### ✅ 어떻게 해결했나요?
**타입을 명시적으로 지정**했어요!

```typescript
// ✅ 해결된 코드
let interval: NodeJS.Timeout | null = null;
interval = setInterval(() => {}, 1000) as NodeJS.Timeout;
```

또는:
```typescript
// ✅ 더 간단한 방법
let interval: ReturnType<typeof setInterval> | null = null;
interval = setInterval(() => {}, 1000);
```

### 📝 기억할 점
- TypeScript는 타입을 엄격하게 체크해요
- 환경에 따라 타입이 달라질 수 있어요
- `as` 키워드로 타입을 명시할 수 있어요 (하지만 조심해서 사용하세요!)

---

## 12. 온보딩 페이지 넘어가지 않는 문제

### 😱 무슨 문제였나요?
온보딩 화면에서 "다음" 버튼을 눌러도 페이지가 넘어가지 않았어요.

### 🔍 왜 이런 일이 생겼나요?
**FlatList 스크롤 문제**였어요!

- `FlatList`의 `scrollToIndex`가 정확하게 작동하지 않았어요
- `getItemLayout`이 없어서 스크롤 위치를 계산하지 못했어요

### ✅ 어떻게 해결했나요?
**`scrollToOffset`을 사용**하고 **`getItemLayout`을 추가**했어요!

```typescript
// ❌ 문제가 있는 코드
const goToNext = () => {
  flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
};

// ✅ 해결된 코드
const goToNext = () => {
  const nextIndex = currentIndex + 1;
  const offset = nextIndex * ITEM_HEIGHT;  // 아이템 높이 계산
  flatListRef.current?.scrollToOffset({ offset, animated: true });
};

// getItemLayout 추가
const getItemLayout = (_: any, index: number) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index,
  index,
});
```

### 📝 기억할 점
- `FlatList`는 성능 최적화를 위해 가상화를 사용해요
- `getItemLayout`을 제공하면 스크롤이 더 정확해져요
- `scrollToOffset`이 `scrollToIndex`보다 더 안정적일 수 있어요

---

## 13. Git 관련 문제들

### 문제 1: "fatal: not a git repository"

**에러:**
```
fatal: not a git repository (or any of the parent directories): .git
```

**해결:**
```bash
# 프로젝트 루트에서 git 초기화
git init
```

### 문제 2: "warning: adding embedded git repository"

**에러:**
```
warning: adding embedded git repository: frontend
```

**원인:**
- `frontend/` 폴더 안에 `.git` 폴더가 있어요
- 중첩된 Git 저장소 문제예요

**해결:**
```bash
# frontend 폴더 안의 .git 삭제
rm -rf frontend/.git

# 다시 add
git add .
```

### 문제 3: Git push 인증 실패

**에러:**
```
fatal: could not read Username for 'https://github.com': Device not configured
```

**해결:**
- GitHub Personal Access Token 사용
- 또는 SSH 키 설정
- 또는 `git config --global http.sslVerify false` (개발 환경에서만!)

### 📝 기억할 점
- Git 저장소는 하나만 있어야 해요 (중첩 금지!)
- `.gitignore`에 `.env` 파일을 추가하세요
- 인증 문제는 토큰이나 SSH 키로 해결하세요

---

## 14. 환경 변수 설정 혼동

### 😱 무슨 문제였나요?
Supabase 환경 변수를 설정할 때 **어떤 값을 넣어야 할지 헷갈렸어요**.

### 🔍 왜 헷갈렸나요?
Supabase Dashboard에는 **3가지 값**이 있어요:

| 항목 | 값 예시 | 용도 |
|------|---------|------|
| **Project URL** | `https://xxx.supabase.co` | `SUPABASE_URL` |
| **anon public** | `eyJhbGci...` | 프론트엔드용 |
| **service_role** | `eyJhbGci...` | 백엔드용 (비밀!) |

### ✅ 올바른 설정 방법

**프론트엔드 (.env):**
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co  # Project URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...         # anon public 키
```

**백엔드 (.env):**
```env
SUPABASE_URL=https://xxx.supabase.co              # Project URL
SUPABASE_SERVICE_KEY=eyJhbGci...                   # service_role 키 (비밀!)
```

### ⚠️ 중요한 주의사항!

```
❌ 잘못된 질문:
"SUPABASE_URL이 publishable key인가요?"

✅ 올바른 이해:
- SUPABASE_URL = Project URL (https://xxx.supabase.co)
- publishable key = anon public 키 (프론트엔드용)
- service_role 키 = 백엔드용 (절대 공개 금지!)
```

### 📝 기억할 점
- **Project URL**과 **API 키**는 다른 거예요!
- `SUPABASE_URL`에는 URL을 넣어요 (키가 아님!)
- `service_role` 키는 절대 GitHub에 올리면 안 돼요!

---

## 15. npm install 에러 (peer dependency)

### 😱 무슨 문제였나요?
`npm install`을 실행하면:
```
npm error code ERESOLVE
npm error ERESOLVE unable to resolve dependency tree
```

### 🔍 왜 이런 일이 생겼나요?
**의존성 충돌** 문제였어요!

- 패키지 A는 React 18을 요구해요
- 패키지 B는 React 17을 요구해요
- 둘 다 설치할 수 없어서 에러가 나요

### ✅ 어떻게 해결했나요?

**방법 1: --legacy-peer-deps 사용**
```bash
npm install --legacy-peer-deps
```

**방법 2: --force 사용 (권장하지 않음)**
```bash
npm install --force
```

**방법 3: package.json 수정**
```json
{
  "overrides": {
    "react": "18.0.0"
  }
}
```

### 📝 기억할 점
- `--legacy-peer-deps`는 대부분의 경우 해결책이에요
- 하지만 근본적인 해결은 패키지 버전을 맞추는 거예요
- `package-lock.json`을 삭제하고 다시 설치해볼 수도 있어요

---

## 🎯 정리: 자주 하는 실수들

| 실수 | 원인 | 해결책 |
|------|------|--------|
| 파일 크기 0 bytes | fetch로 로컬 파일 읽기 | FormData 사용 |
| INVALID_HEADER | M4A 파일을 WAV로 읽으려 함 | pydub으로 변환 |
| Network Error | localhost 사용 | 실제 IP 주소 사용 |
| Invalid API key | 잘못된 키 사용 | service_role 키 확인 |
| deprecated 경고 | 라이브러리 버전 변경 | /legacy import |
| Blob 에러 | RN의 Blob 제한 | FormData 사용 |
| Not an audio file | M4A를 포먼트 분석에 전달 | WAV 변환 후 전달 |
| Railway 빌드 실패 | FFmpeg 없음, Root Directory 미설정 | nixpacks.toml, Settings 확인 |
| No speech recognized | 음성 감지 안 됨 | 사용자 안내 메시지 |
| 포트 충돌 | 이미 사용 중인 포트 | 프로세스 종료 또는 다른 포트 |
| TypeScript 타입 에러 | 환경별 타입 차이 | 타입 명시 또는 as 사용 |
| 온보딩 안 넘어감 | FlatList 스크롤 문제 | scrollToOffset + getItemLayout |
| Git 중첩 저장소 | .git 폴더 중복 | 중첩된 .git 삭제 |
| 환경 변수 혼동 | URL과 키 구분 안 됨 | Project URL vs API 키 구분 |
| npm install 실패 | 의존성 충돌 | --legacy-peer-deps 사용 |

---

## 💡 디버깅 팁

### 1. 항상 로그를 확인하세요

**프론트엔드:**
```javascript
console.log('[DEBUG] 파일 크기:', blob.size);
console.log('[DEBUG] 응답 상태:', response.status);
console.log('[DEBUG] 파일 URI:', fileUri);
```

**백엔드:**
```python
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

logger.debug(f'파일 크기: {len(audio_data)} bytes')
logger.debug(f'파일 형식: {audio_format}')
```

### 2. 단계별로 테스트하세요

**녹음 → 업로드 → 분석** 순서로 확인하세요:

1. ✅ **녹음이 되는지 확인**
   - 파일이 생성되는지 확인
   - 파일 크기가 0이 아닌지 확인

2. ✅ **업로드가 되는지 확인**
   - Supabase Storage에 파일이 올라갔는지 확인
   - 파일 크기가 일치하는지 확인

3. ✅ **분석이 되는지 확인**
   - 백엔드 로그 확인
   - Azure Speech 응답 확인

### 3. 에러 메시지를 잘 읽으세요

에러 메시지에 힌트가 있어요!

| 에러 메시지 | 의미 | 해결 방법 |
|------------|------|----------|
| "0 bytes" | 파일이 비어있음 | FormData 사용 |
| "INVALID_HEADER" | 파일 형식 문제 | pydub으로 변환 |
| "Network Error" | 네트워크 연결 문제 | IP 주소 확인 |
| "Invalid API key" | 잘못된 키 | service_role 확인 |
| "Not an audio file" | 오디오 파일 아님 | WAV 형식 확인 |
| "No speech recognized" | 음성 감지 안 됨 | 마이크 확인 |
| "Address already in use" | 포트 사용 중 | 프로세스 종료 |

### 4. 개발 모드를 활용하세요

**개발 모드 (`DEV_MODE=true`)를 사용하면:**
- 실제 API 호출 없이 테스트 가능
- 빠르게 UI/UX 확인 가능
- 에러 없이 전체 플로우 확인 가능

```env
# frontend/.env
EXPO_PUBLIC_DEV_MODE=true

# backend/.env
DEV_MODE=true
```

### 5. 브라우저 개발자 도구 활용

**Chrome DevTools:**
- Network 탭: API 요청/응답 확인
- Console 탭: 에러 메시지 확인
- Application 탭: 로컬 스토리지 확인

### 6. Railway 로그 확인

**Railway Dashboard에서:**
- Deployments 탭 → View Logs
- 빌드 로그와 런타임 로그 확인
- 에러 메시지의 전체 스택 트레이스 확인

### 7. 단위 테스트 작성

**작은 함수부터 테스트:**
```python
# 테스트 예시
def test_convert_to_wav():
    m4a_data = b'...'
    wav_data = convert_to_wav(m4a_data, 'm4a')
    assert wav_data.startswith(b'RIFF')
```

### 8. 환경 변수 확인

**항상 환경 변수가 제대로 설정됐는지 확인:**
```bash
# 프론트엔드
cat frontend/.env

# 백엔드
cat backend/.env
```

### 9. Git 상태 확인

**변경사항을 추적하세요:**
```bash
git status
git diff  # 변경된 내용 확인
```

### 10. 커뮤니티 활용

**막혔을 때:**
- Stack Overflow 검색
- 공식 문서 확인
- GitHub Issues 확인
- Discord/Slack 커뮤니티 질문

---

## 📚 더 공부하고 싶다면

### 공식 문서

- **React Native**: https://reactnative.dev/docs/getting-started
- **Expo**: https://docs.expo.dev/
- **FastAPI**: https://fastapi.tiangolo.com/
- **Supabase**: https://supabase.com/docs
- **Azure Speech**: https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/
- **Railway**: https://docs.railway.app/

### 유용한 도구

- **Postman**: API 테스트 도구
- **Insomnia**: API 테스트 도구 (Postman 대안)
- **ngrok**: 로컬 서버를 인터넷에 노출 (테스트용)
- **React Native Debugger**: React Native 디버깅 도구

### 학습 자료

- **React Native 공식 튜토리얼**: https://reactnative.dev/docs/tutorial
- **Expo 공식 튜토리얼**: https://docs.expo.dev/tutorial/introduction/
- **FastAPI 튜토리얼**: https://fastapi.tiangolo.com/tutorial/
- **TypeScript 핸드북**: https://www.typescriptlang.org/docs/handbook/intro.html

### 커뮤니티

- **React Native Discord**: https://discord.gg/reactnative
- **Expo Discord**: https://chat.expo.dev/
- **Stack Overflow**: https://stackoverflow.com/questions/tagged/react-native
- **GitHub Discussions**: 각 라이브러리의 GitHub 저장소

---

## 🎓 문제 해결 체크리스트

문제가 생겼을 때 이 순서대로 확인하세요:

### 1단계: 에러 메시지 읽기
- [ ] 에러 메시지를 전체적으로 읽었나요?
- [ ] 에러가 어디서 발생했나요? (프론트엔드/백엔드)
- [ ] 에러 메시지의 키워드를 확인했나요?

### 2단계: 로그 확인
- [ ] 브라우저 콘솔을 확인했나요?
- [ ] 백엔드 로그를 확인했나요?
- [ ] Railway 로그를 확인했나요? (배포 시)

### 3단계: 환경 확인
- [ ] 환경 변수가 제대로 설정됐나요?
- [ ] 필요한 서비스가 실행 중인가요? (Supabase, Azure)
- [ ] 네트워크 연결이 정상인가요?

### 4단계: 코드 확인
- [ ] 최근에 변경한 코드가 있나요?
- [ ] Git diff로 변경사항을 확인했나요?
- [ ] 타입 에러는 없는가요?

### 5단계: 문서 확인
- [ ] 공식 문서를 확인했나요?
- [ ] 이 트러블슈팅 가이드를 확인했나요?
- [ ] Stack Overflow에서 비슷한 문제를 찾았나요?

### 6단계: 테스트
- [ ] 개발 모드로 테스트해봤나요?
- [ ] 단계별로 테스트해봤나요?
- [ ] 다른 환경에서도 같은 문제가 발생하나요?

---

## 🔄 자주 묻는 질문 (FAQ)

### Q1: 개발 모드와 프로덕션 모드의 차이는 뭔가요?

**A:** 개발 모드(`DEV_MODE=true`)에서는:
- 실제 API 호출 없이 목업 데이터 사용
- 빠른 테스트 가능
- 에러 없이 UI/UX 확인 가능

프로덕션 모드(`DEV_MODE=false`)에서는:
- 실제 API 호출
- 실제 데이터 사용
- 실제 사용자 환경과 동일

### Q2: Railway 배포 후에도 로컬에서 개발할 수 있나요?

**A:** 네! Railway는 프로덕션 환경이고, 로컬은 개발 환경이에요.
- 로컬: 빠른 개발과 테스트
- Railway: 실제 사용자에게 서비스 제공

### Q3: 환경 변수를 어디에 저장해야 하나요?

**A:**
- **로컬 개발**: `.env` 파일 (`.gitignore`에 추가!)
- **Railway**: Dashboard → Variables 탭
- **GitHub**: 절대 올리지 마세요! (비밀 정보)

### Q4: 에러가 계속 발생하면 어떻게 해야 하나요?

**A:**
1. 개발 모드로 전환해서 기본 기능 확인
2. 단계별로 하나씩 테스트
3. 최근 변경사항 되돌리기 (`git revert`)
4. 커뮤니티에 질문하기

### Q5: 파일 크기가 0 bytes인지 어떻게 확인하나요?

**A:**
```javascript
// 프론트엔드
const fileInfo = await FileSystem.getInfoAsync(fileUri);
console.log('파일 크기:', fileInfo.size);

// 백엔드
print(f'파일 크기: {len(audio_data)} bytes')
```

---

> 📅 마지막 업데이트: 2025년 12월 27일
>
> 💬 질문이 있으면 언제든 물어보세요!
>
> 🔄 이 문서는 계속 업데이트됩니다. 새로운 문제를 발견하면 추가해주세요!

