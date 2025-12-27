// 특정 발음 연습 데이터
export interface DrillCategory {
  id: string;
  name: string;
  emoji: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface DrillSentence {
  categoryId: string;
  text: string;
  focus: string; // 집중해야 할 발음
  tip: string;
}

// 발음 연습 카테고리
export const DRILL_CATEGORIES: DrillCategory[] = [
  {
    id: 'rieul',
    name: 'ㄹ 발음',
    emoji: '👅',
    description: 'ㄹ과 ㄴ 구분하기',
    difficulty: 'medium',
  },
  {
    id: 'batchim',
    name: '받침',
    emoji: '🔤',
    description: '받침 정확하게 발음하기',
    difficulty: 'hard',
  },
  {
    id: 'double_vowel',
    name: '이중모음',
    emoji: '🔊',
    description: 'ㅘ, ㅝ, ㅢ 등 이중모음',
    difficulty: 'medium',
  },
  {
    id: 'aspirated',
    name: '격음/경음',
    emoji: '💨',
    description: 'ㅋㅌㅍㅊ vs ㄲㄸㅃㅆㅉ',
    difficulty: 'easy',
  },
  {
    id: 'intonation',
    name: '억양',
    emoji: '🎵',
    description: '자연스러운 억양 연습',
    difficulty: 'hard',
  },
  {
    id: 'speed',
    name: '속도',
    emoji: '⚡',
    description: '빠른 문장 또박또박',
    difficulty: 'hard',
  },
];

// 발음 연습 문장
export const DRILL_SENTENCES: DrillSentence[] = [
  // ㄹ 발음
  {
    categoryId: 'rieul',
    text: '날씨가 너무 좋아요',
    focus: 'ㄹ',
    tip: '혀를 윗잇몸에 가볍게 대세요',
  },
  {
    categoryId: 'rieul',
    text: '서울에서 살고 있어요',
    focus: 'ㄹ',
    tip: '서울의 ㄹ은 혀를 말아서 발음해요',
  },
  {
    categoryId: 'rieul',
    text: '빨간 풍선을 불었어요',
    focus: 'ㄹ/ㄴ',
    tip: 'ㄹ과 ㄴ의 차이를 명확히 하세요',
  },
  {
    categoryId: 'rieul',
    text: '달력을 넘기며 날짜를 확인해요',
    focus: 'ㄹ',
    tip: '달력과 날짜의 ㄹ 발음에 주의하세요',
  },
  {
    categoryId: 'rieul',
    text: '놀이공원에서 롤러코스터를 탔어요',
    focus: 'ㄹ',
    tip: '롤러코스터의 연속된 ㄹ 발음을 연습하세요',
  },
  
  // 받침
  {
    categoryId: 'batchim',
    text: '맛있는 밥을 먹었습니다',
    focus: 'ㅂ 받침',
    tip: '밥의 ㅂ 받침을 확실히 닫으세요',
  },
  {
    categoryId: 'batchim',
    text: '책상 위에 책이 있어요',
    focus: 'ㄱ 받침',
    tip: '책의 ㄱ 받침을 또렷이 발음하세요',
  },
  {
    categoryId: 'batchim',
    text: '한국어를 공부합니다',
    focus: 'ㄱ/ㅂ 받침',
    tip: '한국과 공부의 받침에 주의하세요',
  },
  {
    categoryId: 'batchim',
    text: '낮에는 덥고 밤에는 추워요',
    focus: 'ㅎ/ㅁ 받침',
    tip: '낮의 ㅎ과 밤의 ㅁ 받침을 구분하세요',
  },
  {
    categoryId: 'batchim',
    text: '옷을 입고 밖으로 나갔어요',
    focus: 'ㅅ/ㄱ 받침',
    tip: '옷과 밖의 받침을 명확히 하세요',
  },
  
  // 이중모음
  {
    categoryId: 'double_vowel',
    text: '의사 선생님께 문의했어요',
    focus: 'ㅢ',
    tip: 'ㅡ + ㅣ를 빠르게 이어서 발음하세요',
  },
  {
    categoryId: 'double_vowel',
    text: '화요일에 회의가 있어요',
    focus: 'ㅘ/ㅚ/ㅢ',
    tip: '각 이중모음의 입모양을 확인하세요',
  },
  {
    categoryId: 'double_vowel',
    text: '귀가 아파서 병원에 갔어요',
    focus: 'ㅟ',
    tip: 'ㅜ + ㅣ를 연속으로 발음하세요',
  },
  {
    categoryId: 'double_vowel',
    text: '웬일인지 왜 그런지 모르겠어요',
    focus: 'ㅞ/ㅙ',
    tip: '입을 둥글게 시작해서 옆으로 벌리세요',
  },
  
  // 격음/경음
  {
    categoryId: 'aspirated',
    text: '코끼리가 코를 흔들어요',
    focus: 'ㅋ/ㄲ',
    tip: 'ㅋ는 숨을 많이, ㄲ는 힘을 주세요',
  },
  {
    categoryId: 'aspirated',
    text: '토끼가 뛰어다녀요',
    focus: 'ㅌ/ㄸ',
    tip: 'ㅌ와 ㄸ의 차이를 느껴보세요',
  },
  {
    categoryId: 'aspirated',
    text: '파란 빠빠가 멋있어요',
    focus: 'ㅍ/ㅃ',
    tip: 'ㅍ는 입술을 터뜨리며, ㅃ는 힘주세요',
  },
  {
    categoryId: 'aspirated',
    text: '차가운 짜장면을 먹었어요',
    focus: 'ㅊ/ㅉ',
    tip: 'ㅊ는 바람을 내보내며 발음하세요',
  },
  
  // 억양
  {
    categoryId: 'intonation',
    text: '오늘 뭐 해요?',
    focus: '의문문',
    tip: '문장 끝을 올려서 발음하세요',
  },
  {
    categoryId: 'intonation',
    text: '정말 맛있네요!',
    focus: '감탄문',
    tip: '감정을 담아 강조하세요',
  },
  {
    categoryId: 'intonation',
    text: '저는 학생이에요. 공부를 열심히 해요.',
    focus: '평서문',
    tip: '문장 끝을 자연스럽게 내리세요',
  },
  {
    categoryId: 'intonation',
    text: '같이 갈래요, 아니면 혼자 갈래요?',
    focus: '선택 의문문',
    tip: '앞부분을 올리고 뒷부분을 내리세요',
  },
  
  // 속도
  {
    categoryId: 'speed',
    text: '간장공장공장장은 강공장장이다',
    focus: '빠른 발음',
    tip: '천천히 시작해서 점점 빠르게 해보세요',
  },
  {
    categoryId: 'speed',
    text: '경찰청 철창살은 쇠철창살이다',
    focus: '빠른 발음',
    tip: '각 음절을 또박또박 발음하세요',
  },
  {
    categoryId: 'speed',
    text: '저기 가는 저 상장사가 새 상 상장사냐 헌 상 상장사냐',
    focus: '빠른 발음',
    tip: '반복되는 소리를 구분해서 발음하세요',
  },
  {
    categoryId: 'speed',
    text: '내가 그린 기린 그림은 잘 그린 기린 그림이다',
    focus: '빠른 발음',
    tip: 'ㄱ과 ㄹ의 연속을 명확히 하세요',
  },
];

// 카테고리별 문장 가져오기
export function getDrillsByCategory(categoryId: string): DrillSentence[] {
  return DRILL_SENTENCES.filter(s => s.categoryId === categoryId);
}

// 랜덤 문장 가져오기
export function getRandomDrill(categoryId?: string): DrillSentence | null {
  const sentences = categoryId 
    ? DRILL_SENTENCES.filter(s => s.categoryId === categoryId)
    : DRILL_SENTENCES;
  
  if (sentences.length === 0) return null;
  return sentences[Math.floor(Math.random() * sentences.length)];
}

