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

## 🎯 정리: 자주 하는 실수들

| 실수 | 원인 | 해결책 |
|------|------|--------|
| 파일 크기 0 bytes | fetch로 로컬 파일 읽기 | FormData 사용 |
| INVALID_HEADER | M4A 파일을 WAV로 읽으려 함 | pydub으로 변환 |
| Network Error | localhost 사용 | 실제 IP 주소 사용 |
| Invalid API key | 잘못된 키 사용 | service_role 키 확인 |
| deprecated 경고 | 라이브러리 버전 변경 | /legacy import |
| Blob 에러 | RN의 Blob 제한 | FormData 사용 |

---

## 💡 디버깅 팁

### 1. 항상 로그를 확인하세요
```javascript
console.log('[DEBUG] 파일 크기:', blob.size);
console.log('[DEBUG] 응답 상태:', response.status);
```

### 2. 단계별로 테스트하세요
1. 먼저 녹음이 되는지 확인
2. 그다음 업로드가 되는지 확인
3. 마지막으로 분석이 되는지 확인

### 3. 에러 메시지를 잘 읽으세요
에러 메시지에 힌트가 있어요!
- "0 bytes" → 파일이 비어있음
- "INVALID_HEADER" → 파일 형식 문제
- "Network Error" → 네트워크 연결 문제

---

## 📚 더 공부하고 싶다면

- [React Native 공식 문서](https://reactnative.dev/docs/getting-started)
- [Expo 파일 시스템](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- [Supabase 문서](https://supabase.com/docs)
- [Azure Speech 문서](https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/)

---

> 📅 마지막 업데이트: 2025년 12월 27일
>
> 💬 질문이 있으면 언제든 물어보세요!

