// 학습 히스토리 관리
import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@practice_history';
const STATS_KEY = '@practice_stats';

// 연습 기록 타입
export interface PracticeRecord {
  id: string;
  date: string; // ISO string
  text: string;
  pronunciationScore: number;
  resonanceScore: number;
  toneScore: number;
  avgScore: number;
  feedback: string;
}

// 통계 타입
export interface PracticeStats {
  totalPractices: number;
  totalDays: number;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
  avgScore: number;
  bestScore: number;
  level: number;
  exp: number;
  badges: string[];
}

// 기본 통계
const DEFAULT_STATS: PracticeStats = {
  totalPractices: 0,
  totalDays: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastPracticeDate: null,
  avgScore: 0,
  bestScore: 0,
  level: 1,
  exp: 0,
  badges: [],
};

// 레벨 계산
export function calculateLevel(exp: number): number {
  // 레벨업에 필요한 경험치: 100 * level
  let level = 1;
  let requiredExp = 100;
  while (exp >= requiredExp) {
    exp -= requiredExp;
    level++;
    requiredExp = 100 * level;
  }
  return level;
}

// 다음 레벨까지 필요한 경험치
export function expToNextLevel(exp: number): { current: number; required: number } {
  let level = 1;
  let requiredExp = 100;
  let totalRequired = 100;
  while (exp >= totalRequired) {
    level++;
    requiredExp = 100 * level;
    totalRequired += requiredExp;
  }
  const current = exp - (totalRequired - requiredExp);
  return { current, required: requiredExp };
}

// 히스토리 불러오기
export async function getHistory(): Promise<PracticeRecord[]> {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('히스토리 로드 오류:', e);
    return [];
  }
}

// 기록 추가
export async function addPracticeRecord(record: Omit<PracticeRecord, 'id'>): Promise<void> {
  try {
    const history = await getHistory();
    const newRecord: PracticeRecord = {
      ...record,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    history.unshift(newRecord); // 최신이 앞으로
    
    // 최대 100개 유지
    if (history.length > 100) {
      history.pop();
    }
    
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    
    // 통계 업데이트
    await updateStats(newRecord);
  } catch (e) {
    console.error('기록 추가 오류:', e);
  }
}

// 통계 불러오기
export async function getStats(): Promise<PracticeStats> {
  try {
    const data = await AsyncStorage.getItem(STATS_KEY);
    return data ? JSON.parse(data) : DEFAULT_STATS;
  } catch (e) {
    console.error('통계 로드 오류:', e);
    return DEFAULT_STATS;
  }
}

// 통계 업데이트
async function updateStats(record: PracticeRecord): Promise<void> {
  try {
    const stats = await getStats();
    const today = new Date().toISOString().split('T')[0];
    const lastDate = stats.lastPracticeDate?.split('T')[0];
    
    // 연습 횟수 증가
    stats.totalPractices++;
    
    // 경험치 추가 (점수에 비례)
    const expGained = Math.round(record.avgScore / 10);
    stats.exp += expGained;
    stats.level = calculateLevel(stats.exp);
    
    // 스트릭 계산
    if (lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastDate === yesterdayStr) {
        // 연속 유지
        stats.currentStreak++;
      } else if (!lastDate) {
        // 첫 연습
        stats.currentStreak = 1;
      } else {
        // 연속 끊김
        stats.currentStreak = 1;
      }
      
      stats.totalDays++;
      stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    }
    
    stats.lastPracticeDate = new Date().toISOString();
    
    // 평균 및 최고 점수 업데이트
    const history = await getHistory();
    if (history.length > 0) {
      stats.avgScore = Math.round(
        history.reduce((sum, r) => sum + r.avgScore, 0) / history.length
      );
      stats.bestScore = Math.max(...history.map(r => r.avgScore));
    }
    
    // 배지 체크
    stats.badges = checkBadges(stats, record);
    
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('통계 업데이트 오류:', e);
  }
}

// 배지 확인
function checkBadges(stats: PracticeStats, record: PracticeRecord): string[] {
  const badges = [...stats.badges];
  
  // 첫 연습
  if (stats.totalPractices === 1 && !badges.includes('first_practice')) {
    badges.push('first_practice');
  }
  
  // 10회 연습
  if (stats.totalPractices >= 10 && !badges.includes('practice_10')) {
    badges.push('practice_10');
  }
  
  // 50회 연습
  if (stats.totalPractices >= 50 && !badges.includes('practice_50')) {
    badges.push('practice_50');
  }
  
  // 90점 이상
  if (record.avgScore >= 90 && !badges.includes('score_90')) {
    badges.push('score_90');
  }
  
  // 7일 연속
  if (stats.currentStreak >= 7 && !badges.includes('streak_7')) {
    badges.push('streak_7');
  }
  
  // 30일 연속
  if (stats.currentStreak >= 30 && !badges.includes('streak_30')) {
    badges.push('streak_30');
  }
  
  // 레벨 5
  if (stats.level >= 5 && !badges.includes('level_5')) {
    badges.push('level_5');
  }
  
  // 레벨 10
  if (stats.level >= 10 && !badges.includes('level_10')) {
    badges.push('level_10');
  }
  
  return badges;
}

// 배지 정보
export const BADGE_INFO: Record<string, { name: string; emoji: string; description: string }> = {
  first_practice: { name: '첫 걸음', emoji: '🎉', description: '첫 연습을 완료했습니다' },
  practice_10: { name: '꾸준함', emoji: '📚', description: '10회 연습을 완료했습니다' },
  practice_50: { name: '노력가', emoji: '💪', description: '50회 연습을 완료했습니다' },
  score_90: { name: '완벽주의', emoji: '🌟', description: '90점 이상을 달성했습니다' },
  streak_7: { name: '일주일', emoji: '🔥', description: '7일 연속 연습했습니다' },
  streak_30: { name: '한 달', emoji: '🏆', description: '30일 연속 연습했습니다' },
  level_5: { name: '성장중', emoji: '🌱', description: '레벨 5에 도달했습니다' },
  level_10: { name: '마스터', emoji: '👑', description: '레벨 10에 도달했습니다' },
};

// 히스토리 초기화 (디버그용)
export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
  await AsyncStorage.removeItem(STATS_KEY);
}

