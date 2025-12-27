// 명언 데이터 및 AI 생성 기능
// 카테고리: 동기부여, 인생, 성공, 지혜, 사랑

export type QuoteCategory = 'motivation' | 'life' | 'success' | 'wisdom' | 'love';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Quote {
  text: string;
  author: string;
  category: QuoteCategory;
  difficulty: Difficulty;
}

// 카테고리 정보
export const CATEGORIES: { id: QuoteCategory; name: string; emoji: string }[] = [
  { id: 'motivation', name: '동기부여', emoji: '🔥' },
  { id: 'life', name: '인생', emoji: '🌱' },
  { id: 'success', name: '성공', emoji: '🏆' },
  { id: 'wisdom', name: '지혜', emoji: '📚' },
  { id: 'love', name: '사랑', emoji: '💕' },
];

// 난이도 정보
export const DIFFICULTIES: { id: Difficulty; name: string; description: string }[] = [
  { id: 'easy', name: '쉬움', description: '짧은 문장' },
  { id: 'medium', name: '보통', description: '중간 길이' },
  { id: 'hard', name: '어려움', description: '긴 문장' },
];

// 명언 데이터베이스
const QUOTES: Quote[] = [
  // 동기부여 - 쉬움
  { text: '할 수 있다고 믿으면 된다', author: '나폴레온 힐', category: 'motivation', difficulty: 'easy' },
  { text: '시작이 반이다', author: '아리스토텔레스', category: 'motivation', difficulty: 'easy' },
  { text: '오늘 하루도 힘내세요', author: '격언', category: 'motivation', difficulty: 'easy' },
  { text: '포기하지 마세요', author: '격언', category: 'motivation', difficulty: 'easy' },
  { text: '당신은 할 수 있습니다', author: '격언', category: 'motivation', difficulty: 'easy' },
  
  // 동기부여 - 보통
  { text: '성공은 매일 반복한 작은 노력의 합이다', author: '로버트 콜리어', category: 'motivation', difficulty: 'medium' },
  { text: '실패는 성공의 어머니입니다', author: '토마스 에디슨', category: 'motivation', difficulty: 'medium' },
  { text: '꿈을 꾸고 그 꿈을 향해 나아가세요', author: '월트 디즈니', category: 'motivation', difficulty: 'medium' },
  { text: '오늘 할 수 있는 일을 내일로 미루지 마라', author: '벤자민 프랭클린', category: 'motivation', difficulty: 'medium' },
  { text: '작은 기회로부터 위대한 일이 시작된다', author: '데모스테네스', category: 'motivation', difficulty: 'medium' },

  // 동기부여 - 어려움
  { text: '성공한 사람이 되려고 하기보다 가치 있는 사람이 되려고 노력하라', author: '알버트 아인슈타인', category: 'motivation', difficulty: 'hard' },
  { text: '당신이 할 수 있다고 믿든 할 수 없다고 믿든 당신 생각이 옳다', author: '헨리 포드', category: 'motivation', difficulty: 'hard' },
  { text: '천 리 길도 한 걸음부터 시작되고 위대한 일도 작은 시작에서 비롯된다', author: '노자', category: 'motivation', difficulty: 'hard' },

  // 인생 - 쉬움
  { text: '인생은 짧다', author: '히포크라테스', category: 'life', difficulty: 'easy' },
  { text: '오늘을 즐겨라', author: '호라티우스', category: 'life', difficulty: 'easy' },
  { text: '삶은 선물입니다', author: '격언', category: 'life', difficulty: 'easy' },
  { text: '행복은 선택이다', author: '격언', category: 'life', difficulty: 'easy' },
  { text: '웃으면 복이 와요', author: '속담', category: 'life', difficulty: 'easy' },

  // 인생 - 보통
  { text: '인생에서 가장 중요한 것은 자신을 아는 것이다', author: '소크라테스', category: 'life', difficulty: 'medium' },
  { text: '삶이 있는 한 희망은 있다', author: '키케로', category: 'life', difficulty: 'medium' },
  { text: '행복은 습관이다 그것을 몸에 지니라', author: '엘버트 허버드', category: 'life', difficulty: 'medium' },
  { text: '인생은 가까이서 보면 비극이고 멀리서 보면 희극이다', author: '찰리 채플린', category: 'life', difficulty: 'medium' },
  { text: '살아있는 한 희망은 있습니다', author: '격언', category: 'life', difficulty: 'medium' },

  // 인생 - 어려움
  { text: '우리가 두려워해야 할 것은 두려움 그 자체뿐이다', author: '프랭클린 루스벨트', category: 'life', difficulty: 'hard' },
  { text: '인생에서 진정으로 중요한 것은 목적지에 도달하는 것이 아니라 그 여정 자체이다', author: '랄프 왈도 에머슨', category: 'life', difficulty: 'hard' },

  // 성공 - 쉬움
  { text: '노력은 배신하지 않는다', author: '격언', category: 'success', difficulty: 'easy' },
  { text: '끈기가 승리한다', author: '격언', category: 'success', difficulty: 'easy' },
  { text: '도전하라', author: '격언', category: 'success', difficulty: 'easy' },
  { text: '준비된 자가 승리한다', author: '격언', category: 'success', difficulty: 'easy' },

  // 성공 - 보통
  { text: '성공의 비결은 목표를 향한 일관성이다', author: '벤자민 디즈레일리', category: 'success', difficulty: 'medium' },
  { text: '실패를 두려워하지 말고 도전하라', author: '마이클 조던', category: 'success', difficulty: 'medium' },
  { text: '위대한 일을 하는 유일한 방법은 자신이 하는 일을 사랑하는 것이다', author: '스티브 잡스', category: 'success', difficulty: 'medium' },
  { text: '기회는 준비된 자에게 온다', author: '루이 파스퇴르', category: 'success', difficulty: 'medium' },

  // 성공 - 어려움
  { text: '성공은 최종적인 것이 아니고 실패는 치명적인 것이 아니다 중요한 것은 계속하려는 용기다', author: '윈스턴 처칠', category: 'success', difficulty: 'hard' },
  { text: '나는 실패한 적이 없다 단지 효과가 없는 만 가지 방법을 발견했을 뿐이다', author: '토마스 에디슨', category: 'success', difficulty: 'hard' },

  // 지혜 - 쉬움
  { text: '아는 것이 힘이다', author: '프랜시스 베이컨', category: 'wisdom', difficulty: 'easy' },
  { text: '배움에는 끝이 없다', author: '격언', category: 'wisdom', difficulty: 'easy' },
  { text: '침묵은 금이다', author: '속담', category: 'wisdom', difficulty: 'easy' },
  { text: '생각이 말이 되고 말이 행동이 된다', author: '격언', category: 'wisdom', difficulty: 'easy' },

  // 지혜 - 보통
  { text: '진정한 지혜는 자신이 모른다는 것을 아는 것이다', author: '소크라테스', category: 'wisdom', difficulty: 'medium' },
  { text: '과거에서 배우고 현재를 살며 미래를 희망하라', author: '알버트 아인슈타인', category: 'wisdom', difficulty: 'medium' },
  { text: '교육은 세상을 바꾸는 가장 강력한 무기이다', author: '넬슨 만델라', category: 'wisdom', difficulty: 'medium' },
  { text: '현명한 사람은 기회를 발견하는 사람이다', author: '프랜시스 베이컨', category: 'wisdom', difficulty: 'medium' },

  // 지혜 - 어려움
  { text: '어리석은 자는 멀리서 행복을 찾고 현명한 자는 자신의 발치에서 행복을 키워간다', author: '제임스 오펜하임', category: 'wisdom', difficulty: 'hard' },
  { text: '지식에 투자하는 것이 가장 좋은 이자를 낸다', author: '벤자민 프랭클린', category: 'wisdom', difficulty: 'hard' },

  // 사랑 - 쉬움
  { text: '사랑은 모든 것을 이긴다', author: '베르길리우스', category: 'love', difficulty: 'easy' },
  { text: '사랑하라 그리고 사랑받아라', author: '격언', category: 'love', difficulty: 'easy' },
  { text: '사랑은 희망입니다', author: '격언', category: 'love', difficulty: 'easy' },
  { text: '진심은 통한다', author: '속담', category: 'love', difficulty: 'easy' },

  // 사랑 - 보통
  { text: '사랑은 눈으로 보지 않고 마음으로 보는 것이다', author: '윌리엄 셰익스피어', category: 'love', difficulty: 'medium' },
  { text: '사랑받고 싶다면 사랑하라 그리고 사랑스럽게 행동하라', author: '벤자민 프랭클린', category: 'love', difficulty: 'medium' },
  { text: '인생에서 가장 아름다운 것은 사랑하는 사람과 함께하는 시간이다', author: '격언', category: 'love', difficulty: 'medium' },

  // 사랑 - 어려움
  { text: '사랑한다는 것은 서로를 바라보는 것이 아니라 함께 같은 방향을 바라보는 것이다', author: '생텍쥐페리', category: 'love', difficulty: 'hard' },
  { text: '진정한 사랑은 영혼의 일부를 다른 사람에게 주는 것이다', author: '격언', category: 'love', difficulty: 'hard' },
];

// 필터링된 명언 가져오기
export function getQuotes(
  category?: QuoteCategory,
  difficulty?: Difficulty
): Quote[] {
  let filtered = [...QUOTES];
  
  if (category) {
    filtered = filtered.filter(q => q.category === category);
  }
  
  if (difficulty) {
    filtered = filtered.filter(q => q.difficulty === difficulty);
  }
  
  return filtered;
}

// 랜덤 명언 가져오기
export function getRandomQuote(
  category?: QuoteCategory,
  difficulty?: Difficulty
): Quote {
  const quotes = getQuotes(category, difficulty);
  
  if (quotes.length === 0) {
    // 기본 명언 반환
    return {
      text: '오늘 하루도 힘내세요',
      author: '격언',
      category: 'motivation',
      difficulty: 'easy',
    };
  }
  
  const randomIndex = Math.floor(Math.random() * quotes.length);
  return quotes[randomIndex];
}

// 카테고리 이름 가져오기
export function getCategoryName(category: QuoteCategory): string {
  const cat = CATEGORIES.find(c => c.id === category);
  return cat ? cat.name : category;
}

// 카테고리 이모지 가져오기
export function getCategoryEmoji(category: QuoteCategory): string {
  const cat = CATEGORIES.find(c => c.id === category);
  return cat ? cat.emoji : '📝';
}

// 난이도 이름 가져오기
export function getDifficultyName(difficulty: Difficulty): string {
  const diff = DIFFICULTIES.find(d => d.id === difficulty);
  return diff ? diff.name : difficulty;
}

