# 온보딩/로딩 로직 분석 보고서

> **상태:** 문제점 분석 완료 - 향후 검토 예정
> **작성일:** 2024-12-28
> **분석 대상:** Frontend 초기 로딩 및 녹음 플로우

---

## 1. 앱 시작 흐름

```
앱 시작
   ↓
_layout.tsx (StatusBar, Stack 네비게이션)
   ↓
index.tsx (HomeScreen 렌더링)
   ↓
[병렬 실행] 3개 useEffect:
├── #1: AsyncStorage에서 저장된 문장 로드
├── #2: AI 모드 진입 시 명언 생성
└── #3: RecordButton - 마이크 권한 요청
```

---

## 2. 주요 파일 위치

| 파일 | 경로 | 역할 |
|------|------|------|
| Root Layout | `frontend/app/_layout.tsx` | 스택 네비게이션 정의 |
| Home Screen | `frontend/app/index.tsx` | 온보딩 + 메인 UI |
| Result Screen | `frontend/app/result/[id].tsx` | 분석 결과 표시 |
| Record Button | `frontend/components/RecordButton.tsx` | 녹음 처리 로직 |
| API Client | `frontend/lib/api.ts` | 백엔드 통신 |
| Supabase Config | `frontend/lib/supabase.ts` | 저장소 업로드 |

---

## 3. 발견된 문제점

### 3.1 권한 요청 경쟁 조건 (Race Condition)

**현상:**
```
T=0ms:   앱 시작, requestPermission() 비동기 실행
T=5ms:   사용자가 녹음 버튼 클릭 가능 ← 권한 확인 전!
T=150ms: 권한 확인 완료
```

**코드 위치:** `RecordButton.tsx`

```typescript
// 문제 코드
const [hasPermission, setHasPermission] = useState<boolean | null>(null);

// 버튼 비활성화 조건 - hasPermission 체크 없음!
const isDisabled = disabled || status === 'stopping' || status === 'uploading';
```

**영향:** 권한 로드 중(`null`) 상태에서 녹음 시도 가능 → Alert만 표시

---

### 3.2 화면 깜빡임 (FOUC - Flash of Unstyled Content)

**현상:**
```
T=0ms:     HomeScreen 렌더링 (savedSentences = [])
T=50ms:    사용자가 "저장" 탭 클릭 가능 (데이터 없음)
T=100ms:   AsyncStorage 로드 완료 → UI 업데이트
           → 화면 레이아웃 변화 (깜빡임)
```

**코드 위치:** `index.tsx`

```typescript
// 문제 코드 - 로딩 상태 없음
useEffect(() => {
  loadSavedSentences();  // 비동기, 로딩 표시 없음
}, []);
```

---

### 3.3 동시 분석 작업 충돌

**현상:**
```
T=0s:   첫 번째 분석 시작 (setIsAnalyzing=true)
T=2s:   두 번째 녹음 완료 → 분석 시작
T=2.5s: 첫 번째 완료 → setIsAnalyzing(false) ❌
        두 번째는 아직 진행 중인데 UI 잠금 해제!
```

**코드 위치:** `index.tsx`

```typescript
// 문제 코드 - 동시 작업 추적 없음
async function handleRecordingComplete(uri: string, durationMs: number) {
  setIsAnalyzing(true);
  try {
    // 분석 작업...
  } finally {
    setIsAnalyzing(false);  // 어떤 작업이든 완료되면 해제
  }
}
```

---

### 3.4 API 타임아웃 없음

**현상:** 네트워크 불안정 시 무한 대기 가능 (기본 180초)

**코드 위치:** `api.ts`

```typescript
// 문제 코드 - timeout 설정 없음
const response = await fetch(`${API_URL}/api/analyze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ... }),
});
```

---

### 3.5 분석 플로우 총 소요 시간

| 단계 | 예상 시간 | 특성 |
|------|----------|------|
| 녹음 중지 | 100ms | 동기 |
| 파일 업로드 | 500-3000ms | 네트워크 의존 |
| DB 저장 | 200-500ms | 네트워크 의존 |
| 분석 요청 | 500-2000ms | 네트워크 의존 |
| **총합** | **1.3-5.5초** | **5초 이상 로딩 가능** |

---

### 3.6 중복 권한 요청

**현상:** 사용자가 권한 다이얼로그를 최대 2번 볼 수 있음

```
1차: useEffect에서 requestPermission()
2차: startWebRecording()에서 getUserMedia()
```

---

### 3.7 에러 복구 로직 부재

**현상:**
```
업로드 중 네트워크 끊김:
1. uploadRecording() → 부분 성공
2. createRecording() → 실패
3. 결과: 고아 파일 생성 (저장소 낭비)
```

**재시도 로직 없음** → 실패 시 처음부터 다시 녹음 필요

---

### 3.8 상태 복잡도

**HomeScreen의 useState 개수:** 10개

```typescript
const [inputMode, setInputMode] = useState<InputMode>('suggested');
const [textIndex, setTextIndex] = useState(0);
const [customText, setCustomText] = useState('');
const [savedSentences, setSavedSentences] = useState<string[]>([]);
const [savedIndex, setSavedIndex] = useState(0);
const [isAnalyzing, setIsAnalyzing] = useState(false);
const [statusMessage, setStatusMessage] = useState('');
const [selectedCategory, setSelectedCategory] = useState<QuoteCategory | undefined>(undefined);
const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
```

**문제:** 상태 동기화 복잡 → 버그 가능성 증가

---

## 4. 권장 개선사항

### 4.1 우선순위 높음 (High)

| 개선 항목 | 코드 예시 |
|----------|----------|
| 권한 확인 후 버튼 활성화 | `const isDisabled = hasPermission !== true;` |
| API 타임아웃 추가 | `AbortController` + `setTimeout(10000)` |
| 동시 작업 방지 | `activeAnalysisId` 추적 |

```typescript
// 권한 확인
const isDisabled = disabled ||
  status === 'stopping' ||
  hasPermission === null ||
  hasPermission === false;

// API 타임아웃
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);
const response = await fetch(url, { signal: controller.signal });
clearTimeout(timeoutId);

// 동시 작업 방지
let activeAnalysisId: string | null = null;
async function handleRecordingComplete(...) {
  const analysisId = Date.now().toString();
  activeAnalysisId = analysisId;
  try {
    // 작업 수행
  } finally {
    if (activeAnalysisId === analysisId) {
      setIsAnalyzing(false);
    }
  }
}
```

### 4.2 우선순위 중간 (Medium)

| 개선 항목 | 설명 |
|----------|------|
| 로딩 상태 추가 | `savedSentencesLoaded` 플래그 |
| 스켈레톤 로더 | 데이터 로드 중 표시 |
| 에러 재시도 | 1회 자동 재시도 |

### 4.3 우선순위 낮음 (Low)

| 개선 항목 | 설명 |
|----------|------|
| 결과 데이터 전달 최적화 | ID만 전달 → API 조회 |
| 상태 관리 리팩토링 | useReducer 또는 Context |
| 접근성 개선 | aria-label 추가 |

---

## 5. 종합 평가

| 항목 | 현재 상태 | 심각도 |
|------|----------|--------|
| 기본 기능 작동 | ✅ 정상 | - |
| 권한 처리 | ⚠️ 경쟁 조건 | 중 |
| 비동기 작업 체인 | ⚠️ 타임아웃 없음 | 중 |
| 에러 복구 | ❌ 재시도 없음 | 중 |
| 동시 작업 처리 | ⚠️ 충돌 가능 | 중 |
| 메모리 관리 | ✅ 대부분 정리됨 | 낮 |
| UX 반응성 | ⚠️ 5초+ 로딩 | 낮 |
| 코드 복잡도 | ⚠️ useState 10개 | 낮 |

---

## 6. 향후 검토 항목

- [ ] 권한 요청 로직 개선
- [ ] API 타임아웃 구현
- [ ] 동시 분석 작업 방지
- [ ] 로딩 상태 UI 개선
- [ ] 에러 재시도 로직 추가
- [ ] 상태 관리 리팩토링 검토

---

## 7. 관련 문서

- [설정 로직 문제점 분석](../settings-issues-analysis.md)
