// 히스토리 화면
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  PracticeRecord,
  PracticeStats,
  getHistory,
  getStats,
  expToNextLevel,
  BADGE_INFO,
} from '../lib/history';

export default function HistoryScreen() {
  const [history, setHistory] = useState<PracticeRecord[]>([]);
  const [stats, setStats] = useState<PracticeStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'history'>('stats');

  // 화면 포커스될 때마다 데이터 로드
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const [h, s] = await Promise.all([getHistory(), getStats()]);
    setHistory(h);
    setStats(s);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const mins = date.getMinutes();
    return `${month}/${day} ${hours}:${mins.toString().padStart(2, '0')}`;
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  }

  const expProgress = stats ? expToNextLevel(stats.exp) : { current: 0, required: 100 };

  return (
    <SafeAreaView style={styles.container}>
      {/* 탭 */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>
            📊 통계
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            📝 기록
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'stats' ? (
          // 통계 탭
          <>
            {/* 레벨 카드 */}
            {stats && (
              <View style={styles.levelCard}>
                <View style={styles.levelHeader}>
                  <Text style={styles.levelLabel}>레벨</Text>
                  <Text style={styles.levelValue}>{stats.level}</Text>
                </View>
                <View style={styles.expBar}>
                  <View 
                    style={[
                      styles.expFill, 
                      { width: `${(expProgress.current / expProgress.required) * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.expText}>
                  {expProgress.current} / {expProgress.required} EXP
                </Text>
              </View>
            )}

            {/* 스트릭 */}
            {stats && (
              <View style={styles.streakCard}>
                <View style={styles.streakItem}>
                  <Text style={styles.streakEmoji}>🔥</Text>
                  <Text style={styles.streakValue}>{stats.currentStreak}</Text>
                  <Text style={styles.streakLabel}>연속</Text>
                </View>
                <View style={styles.streakDivider} />
                <View style={styles.streakItem}>
                  <Text style={styles.streakEmoji}>🏆</Text>
                  <Text style={styles.streakValue}>{stats.longestStreak}</Text>
                  <Text style={styles.streakLabel}>최고</Text>
                </View>
                <View style={styles.streakDivider} />
                <View style={styles.streakItem}>
                  <Text style={styles.streakEmoji}>📅</Text>
                  <Text style={styles.streakValue}>{stats.totalDays}</Text>
                  <Text style={styles.streakLabel}>일</Text>
                </View>
              </View>
            )}

            {/* 통계 카드 */}
            {stats && (
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statIcon}>📚</Text>
                  <Text style={styles.statValue}>{stats.totalPractices}</Text>
                  <Text style={styles.statLabel}>총 연습</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statIcon}>📈</Text>
                  <Text style={[styles.statValue, { color: getScoreColor(stats.avgScore) }]}>
                    {stats.avgScore}
                  </Text>
                  <Text style={styles.statLabel}>평균 점수</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statIcon}>⭐</Text>
                  <Text style={[styles.statValue, { color: getScoreColor(stats.bestScore) }]}>
                    {stats.bestScore}
                  </Text>
                  <Text style={styles.statLabel}>최고 점수</Text>
                </View>
              </View>
            )}

            {/* 배지 */}
            {stats && stats.badges.length > 0 && (
              <View style={styles.badgesSection}>
                <Text style={styles.sectionTitle}>🏅 획득한 배지</Text>
                <View style={styles.badgesGrid}>
                  {stats.badges.map((badgeId) => {
                    const badge = BADGE_INFO[badgeId];
                    if (!badge) return null;
                    return (
                      <View key={badgeId} style={styles.badgeItem}>
                        <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                        <Text style={styles.badgeName}>{badge.name}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 배지 미리보기 (미획득) */}
            <View style={styles.badgesSection}>
              <Text style={styles.sectionTitle}>🎯 도전 목표</Text>
              <View style={styles.badgesGrid}>
                {Object.entries(BADGE_INFO)
                  .filter(([id]) => !stats?.badges.includes(id))
                  .slice(0, 6)
                  .map(([id, badge]) => (
                    <View key={id} style={[styles.badgeItem, styles.badgeLocked]}>
                      <Text style={styles.badgeEmojiLocked}>🔒</Text>
                      <Text style={styles.badgeNameLocked}>{badge.name}</Text>
                    </View>
                  ))}
              </View>
            </View>
          </>
        ) : (
          // 기록 탭
          <>
            {history.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>아직 연습 기록이 없습니다</Text>
                <Text style={styles.emptySubtext}>첫 연습을 시작해보세요!</Text>
              </View>
            ) : (
              history.map((record) => (
                <View key={record.id} style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
                    <Text style={[styles.recordScore, { color: getScoreColor(record.avgScore) }]}>
                      {record.avgScore}점
                    </Text>
                  </View>
                  <Text style={styles.recordText} numberOfLines={2}>
                    "{record.text}"
                  </Text>
                  <View style={styles.recordScores}>
                    <View style={styles.recordScoreItem}>
                      <Text style={styles.recordScoreLabel}>발음</Text>
                      <Text style={styles.recordScoreValue}>{record.pronunciationScore}</Text>
                    </View>
                    <View style={styles.recordScoreItem}>
                      <Text style={styles.recordScoreLabel}>공명</Text>
                      <Text style={styles.recordScoreValue}>{record.resonanceScore}</Text>
                    </View>
                    <View style={styles.recordScoreItem}>
                      <Text style={styles.recordScoreLabel}>톤</Text>
                      <Text style={styles.recordScoreValue}>{record.toneScore}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#1f2937',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // 레벨 카드
  levelCard: {
    backgroundColor: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    backgroundColor: '#6366f1',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  levelLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginRight: 8,
  },
  levelValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
  },
  expBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  expFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  expText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    textAlign: 'right',
  },
  // 스트릭
  streakCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
  },
  streakEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  streakValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
  },
  streakLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  streakDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  // 통계 그리드
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  // 배지
  badgesSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: '30%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  badgeLocked: {
    backgroundColor: '#f3f4f6',
  },
  badgeEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  badgeEmojiLocked: {
    fontSize: 28,
    marginBottom: 4,
    opacity: 0.5,
  },
  badgeName: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
  badgeNameLocked: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
  },
  // 빈 상태
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  // 기록 카드
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  recordScore: {
    fontSize: 18,
    fontWeight: '700',
  },
  recordText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  recordScores: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  recordScoreItem: {
    flex: 1,
    alignItems: 'center',
  },
  recordScoreLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 2,
  },
  recordScoreValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  bottomSpacer: {
    height: 40,
  },
});

