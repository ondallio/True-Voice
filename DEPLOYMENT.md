# 🚀 True Voice 배포 가이드

## 목차
1. [백엔드 배포 (Railway)](#1-백엔드-배포-railway)
2. [프론트엔드 빌드 (Expo EAS)](#2-프론트엔드-빌드-expo-eas)
3. [환경 변수 설정](#3-환경-변수-설정)

---

## 1. 백엔드 배포 (Railway)

### 1.1 Railway 계정 생성
1. [railway.app](https://railway.app) 접속
2. GitHub 계정으로 로그인

### 1.2 새 프로젝트 생성
```bash
# Railway CLI 설치 (선택)
npm install -g @railway/cli

# 로그인
railway login
```

### 1.3 GitHub 연결 배포
1. Railway 대시보드에서 "New Project" 클릭
2. "Deploy from GitHub repo" 선택
3. True Voice 레포지토리 선택
4. backend 폴더 지정

### 1.4 환경 변수 설정
Railway 대시보드 > Variables에서 추가:
```
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_REGION=koreacentral
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
DEV_MODE=false
```

### 1.5 도메인 설정
- Railway가 자동으로 `*.railway.app` 도메인 제공
- Settings > Domains에서 커스텀 도메인 연결 가능

---

## 2. 프론트엔드 빌드 (Expo EAS)

### 2.1 EAS CLI 설치
```bash
npm install -g eas-cli
```

### 2.2 Expo 계정 로그인
```bash
eas login
```

### 2.3 EAS 설정
```bash
cd frontend
eas build:configure
```

### 2.4 eas.json 확인/수정
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

### 2.5 환경 변수 설정
`frontend/.env` 파일:
```
EXPO_PUBLIC_API_URL=https://your-backend.railway.app
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EXPO_PUBLIC_DEV_MODE=false
```

### 2.6 iOS 빌드
```bash
# 개발 빌드
eas build --platform ios --profile development

# 프로덕션 빌드 (App Store 배포용)
eas build --platform ios --profile production
```

### 2.7 Android 빌드
```bash
# 개발 빌드
eas build --platform android --profile development

# 프로덕션 빌드 (Play Store 배포용)
eas build --platform android --profile production
```

### 2.8 앱 스토어 제출
```bash
# iOS (App Store Connect 계정 필요)
eas submit --platform ios

# Android (Google Play Console 계정 필요)
eas submit --platform android
```

---

## 3. 환경 변수 설정

### 3.1 프로덕션 환경 변수 체크리스트

#### 백엔드 (Railway)
| 변수 | 설명 | 예시 |
|------|------|------|
| `AZURE_SPEECH_KEY` | Azure Speech 서비스 키 | `abc123...` |
| `AZURE_REGION` | Azure 리전 | `koreacentral` |
| `SUPABASE_URL` | Supabase 프로젝트 URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase service_role 키 | `eyJ...` |
| `DEV_MODE` | 개발 모드 비활성화 | `false` |

#### 프론트엔드 (EAS)
| 변수 | 설명 | 예시 |
|------|------|------|
| `EXPO_PUBLIC_API_URL` | 백엔드 API URL | `https://your-app.railway.app` |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase URL | `https://xxx.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 | `eyJ...` |
| `EXPO_PUBLIC_DEV_MODE` | 개발 모드 | `false` |

### 3.2 EAS Secrets 사용
민감한 정보는 EAS Secrets로 관리:
```bash
# 시크릿 추가
eas secret:create --name SUPABASE_ANON_KEY --value "your_key"

# 시크릿 목록
eas secret:list
```

---

## 4. 배포 후 체크리스트

- [ ] 백엔드 API 응답 확인
- [ ] Supabase 연결 확인
- [ ] Azure Speech API 작동 확인
- [ ] 녹음 및 분석 테스트
- [ ] TTS 기능 테스트
- [ ] 히스토리 저장 확인
- [ ] 다크 모드 테스트
- [ ] 온보딩 플로우 확인

---

## 5. 문제 해결

### 빌드 실패
```bash
# 캐시 클리어
eas build --platform ios --clear-cache
```

### 환경 변수 미적용
- EAS 대시보드에서 환경 변수 확인
- 빌드 로그에서 변수 주입 확인

### 네트워크 오류
- CORS 설정 확인 (backend/app/main.py)
- Railway 도메인이 CORS에 허용되어 있는지 확인

---

## 6. 유용한 명령어

```bash
# 빌드 상태 확인
eas build:list

# 로그 확인
eas build:view

# 앱 업데이트 (OTA)
eas update --branch production --message "버그 수정"
```

---

배포에 문제가 있으면 [Expo 문서](https://docs.expo.dev/deploy/build-project/)와 [Railway 문서](https://docs.railway.app/)를 참고하세요! 🎉

