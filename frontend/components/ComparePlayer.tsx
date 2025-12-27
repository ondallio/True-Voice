// 발음 비교 플레이어 - 내 녹음 vs 표준 발음
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

interface ComparePlayerProps {
  myAudioUrl: string;
  referenceText: string;
  voice?: 'female' | 'male' | 'female2';
}

export default function ComparePlayer({ 
  myAudioUrl, 
  referenceText, 
  voice = 'female' 
}: ComparePlayerProps) {
  const [mySound, setMySound] = useState<Audio.Sound | null>(null);
  const [ttsSound, setTtsSound] = useState<Audio.Sound | null>(null);
  const [isLoadingTts, setIsLoadingTts] = useState(false);
  const [ttsLoaded, setTtsLoaded] = useState(false);
  
  const [playingMy, setPlayingMy] = useState(false);
  const [playingTts, setPlayingTts] = useState(false);
  const [compareMode, setCompareMode] = useState<'alternate' | 'side'>('alternate');
  
  // 애니메이션
  const myPulse = useRef(new Animated.Value(1)).current;
  const ttsPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      if (mySound) mySound.unloadAsync();
      if (ttsSound) ttsSound.unloadAsync();
    };
  }, [mySound, ttsSound]);

  // 펄스 애니메이션
  useEffect(() => {
    if (playingMy) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(myPulse, { toValue: 1.1, duration: 500, useNativeDriver: true }),
          Animated.timing(myPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      myPulse.setValue(1);
    }
  }, [playingMy]);

  useEffect(() => {
    if (playingTts) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(ttsPulse, { toValue: 1.1, duration: 500, useNativeDriver: true }),
          Animated.timing(ttsPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      ttsPulse.setValue(1);
    }
  }, [playingTts]);

  // TTS 로드
  async function loadTts() {
    if (ttsLoaded || isLoadingTts) return;
    
    setIsLoadingTts(true);
    try {
      const response = await fetch(`${API_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: referenceText, voice, speed: 'normal' }),
      });

      if (!response.ok) throw new Error('TTS 실패');

      let audioUri: string;
      if (Platform.OS === 'web') {
        const blob = await response.blob();
        audioUri = URL.createObjectURL(blob);
      } else {
        const data = await response.arrayBuffer();
        const bytes = new Uint8Array(data);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const fileUri = `${FileSystem.cacheDirectory}tts_compare_${Date.now()}.mp3`;
        await FileSystem.writeAsStringAsync(fileUri, btoa(binary), {
          encoding: FileSystem.EncodingType.Base64,
        });
        audioUri = fileUri;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setPlayingTts(false);
          }
        }
      );
      setTtsSound(sound);
      setTtsLoaded(true);
    } catch (err) {
      console.error('TTS 로드 오류:', err);
    } finally {
      setIsLoadingTts(false);
    }
  }

  // 내 녹음 재생
  async function playMy() {
    try {
      // 다른 거 정지
      if (ttsSound && playingTts) {
        await ttsSound.stopAsync();
        setPlayingTts(false);
      }

      if (mySound) {
        if (playingMy) {
          await mySound.stopAsync();
          setPlayingMy(false);
        } else {
          await mySound.setPositionAsync(0);
          await mySound.playAsync();
          setPlayingMy(true);
        }
      } else {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
        const { sound } = await Audio.Sound.createAsync(
          { uri: myAudioUrl },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded && status.didJustFinish) {
              setPlayingMy(false);
            }
          }
        );
        setMySound(sound);
        setPlayingMy(true);
      }
    } catch (err) {
      console.error('내 녹음 재생 오류:', err);
    }
  }

  // TTS 재생
  async function playTts() {
    if (!ttsLoaded) {
      await loadTts();
      return;
    }

    try {
      // 다른 거 정지
      if (mySound && playingMy) {
        await mySound.stopAsync();
        setPlayingMy(false);
      }

      if (ttsSound) {
        if (playingTts) {
          await ttsSound.stopAsync();
          setPlayingTts(false);
        } else {
          await ttsSound.setPositionAsync(0);
          await ttsSound.playAsync();
          setPlayingTts(true);
        }
      }
    } catch (err) {
      console.error('TTS 재생 오류:', err);
    }
  }

  // 번갈아 재생
  async function playAlternate() {
    if (!ttsLoaded) await loadTts();
    
    // TTS 먼저 → 내 녹음
    try {
      // TTS 재생
      if (ttsSound) {
        setPlayingTts(true);
        await ttsSound.setPositionAsync(0);
        await ttsSound.playAsync();
        
        // TTS 끝나면 내 녹음 재생
        ttsSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setPlayingTts(false);
            // 0.5초 후 내 녹음 재생
            setTimeout(async () => {
              if (mySound) {
                setPlayingMy(true);
                await mySound.setPositionAsync(0);
                await mySound.playAsync();
              } else {
                const { sound } = await Audio.Sound.createAsync(
                  { uri: myAudioUrl },
                  { shouldPlay: true },
                  (s) => {
                    if (s.isLoaded && s.didJustFinish) setPlayingMy(false);
                  }
                );
                setMySound(sound);
                setPlayingMy(true);
              }
            }, 500);
          }
        });
      }
    } catch (err) {
      console.error('번갈아 재생 오류:', err);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎧 발음 비교</Text>
      
      {/* 비교 버튼들 */}
      <View style={styles.compareButtons}>
        {/* 표준 발음 */}
        <Animated.View style={{ transform: [{ scale: ttsPulse }] }}>
          <TouchableOpacity
            style={[styles.compareBtn, styles.ttsBtn, playingTts && styles.btnActive]}
            onPress={playTts}
            disabled={isLoadingTts}
          >
            {isLoadingTts ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.btnIcon}>{playingTts ? '⏹' : '👩'}</Text>
                <Text style={styles.btnLabel}>표준</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* 번갈아 듣기 */}
        <TouchableOpacity
          style={[styles.compareBtn, styles.alternateBtn]}
          onPress={playAlternate}
          disabled={isLoadingTts}
        >
          <Text style={styles.btnIcon}>🔄</Text>
          <Text style={styles.btnLabel}>비교</Text>
        </TouchableOpacity>

        {/* 내 녹음 */}
        <Animated.View style={{ transform: [{ scale: myPulse }] }}>
          <TouchableOpacity
            style={[styles.compareBtn, styles.myBtn, playingMy && styles.btnActive]}
            onPress={playMy}
          >
            <Text style={styles.btnIcon}>{playingMy ? '⏹' : '🎤'}</Text>
            <Text style={styles.btnLabel}>나</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Text style={styles.hint}>
        표준 → 비교 → 나 순서로 들어보세요
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  compareButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  compareBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ttsBtn: {
    backgroundColor: '#8b5cf6',
    shadowColor: '#8b5cf6',
  },
  myBtn: {
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
  },
  alternateBtn: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  btnActive: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  btnIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  btnLabel: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 12,
  },
});

