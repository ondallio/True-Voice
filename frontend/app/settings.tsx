// 설정 화면
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useTheme, ThemeMode } from '../lib/theme';
import { clearHistory } from '../lib/history';

export default function SettingsScreen() {
  const { mode, isDark, colors, setMode } = useTheme();

  const themeOptions: { id: ThemeMode; label: string; icon: string }[] = [
    { id: 'light', label: '라이트', icon: '☀️' },
    { id: 'dark', label: '다크', icon: '🌙' },
    { id: 'system', label: '시스템', icon: '📱' },
  ];

  function handleClearHistory() {
    Alert.alert(
      '기록 초기화',
      '모든 연습 기록과 통계가 삭제됩니다.\n계속하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
            Alert.alert('완료', '모든 기록이 삭제되었습니다.');
          }
        },
      ]
    );
  }

  const styles = createStyles(colors, isDark);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* 테마 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎨 테마</Text>
          <View style={styles.themeOptions}>
            {themeOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.themeOption,
                  mode === option.id && styles.themeOptionActive,
                ]}
                onPress={() => setMode(option.id)}
              >
                <Text style={styles.themeIcon}>{option.icon}</Text>
                <Text style={[
                  styles.themeLabel,
                  mode === option.id && styles.themeLabelActive,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 데이터 관리 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 데이터</Text>
          <TouchableOpacity style={styles.dangerButton} onPress={handleClearHistory}>
            <Text style={styles.dangerButtonIcon}>🗑️</Text>
            <View>
              <Text style={styles.dangerButtonText}>기록 초기화</Text>
              <Text style={styles.dangerButtonSubtext}>모든 연습 기록 삭제</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 앱 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ 정보</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>버전</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>개발</Text>
              <Text style={styles.infoValue}>True Voice Team</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    // 테마 옵션
    themeOptions: {
      flexDirection: 'row',
      gap: 10,
    },
    themeOption: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    themeOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    themeIcon: {
      fontSize: 28,
      marginBottom: 8,
    },
    themeLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    themeLabelActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    // 위험 버튼
    dangerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      gap: 12,
    },
    dangerButtonIcon: {
      fontSize: 24,
    },
    dangerButtonText: {
      fontSize: 15,
      color: colors.error,
      fontWeight: '600',
    },
    dangerButtonSubtext: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 2,
    },
    // 정보
    infoCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    infoLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    infoValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    bottomSpacer: {
      height: 40,
    },
  });
}

