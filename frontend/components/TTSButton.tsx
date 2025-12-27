// TTS 버튼 컴포넌트 - 미니멀 디자인
import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

const VOICES = [
  { id: 'female', name: '선희', emoji: '👩' },
  { id: 'male', name: '인준', emoji: '👨' },
  { id: 'female2', name: '유진', emoji: '👩‍🦰' },
] as const;

type VoiceId = typeof VOICES[number]['id'];

interface TTSButtonProps {
  text: string;
  speed?: 'slow' | 'normal' | 'fast';
  size?: 'small' | 'medium' | 'large';
  showVoiceSelector?: boolean;
}

export default function TTSButton({
  text,
  speed = 'normal',
  size = 'medium',
  showVoiceSelector = true,
}: TTSButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceId>('female');

  useEffect(() => {
    return () => { if (sound) sound.unloadAsync(); };
  }, [sound]);

  async function handlePlay() {
    if (!text?.trim()) return;

    if (isPlaying && sound) {
      await sound.stopAsync();
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const response = await fetch(`${API_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), voice: selectedVoice, speed }),
      });

      if (!response.ok) throw new Error('TTS 요청 실패');

      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

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
        const fileUri = `${FileSystem.cacheDirectory}tts_${Date.now()}.mp3`;
        await FileSystem.writeAsStringAsync(fileUri, btoa(binary), {
          encoding: FileSystem.EncodingType.Base64,
        });
        audioUri = fileUri;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) setIsPlaying(false);
        }
      );
      setSound(newSound);
      setIsPlaying(true);
    } catch (err) {
      console.error('TTS 오류:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const currentVoice = VOICES.find(v => v.id === selectedVoice);

  return (
    <View style={styles.container}>
      {showVoiceSelector && (
        <View style={styles.voiceRow}>
          {VOICES.map((voice) => (
            <TouchableOpacity
              key={voice.id}
              style={[styles.voiceChip, selectedVoice === voice.id && styles.voiceChipActive]}
              onPress={() => setSelectedVoice(voice.id)}
            >
              <Text style={styles.voiceEmoji}>{voice.emoji}</Text>
              <Text style={[styles.voiceName, selectedVoice === voice.id && styles.voiceNameActive]}>
                {voice.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.playButton,
          size === 'small' && styles.playButtonSmall,
          size === 'large' && styles.playButtonLarge,
          isPlaying && styles.playButtonActive,
        ]}
        onPress={handlePlay}
        disabled={isLoading || !text}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Text style={styles.playIcon}>{isPlaying ? '⏹' : '▶'}</Text>
            <Text style={[styles.playText, size === 'small' && styles.playTextSmall]}>
              {isPlaying ? '정지' : '듣기'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// 작은 아이콘 버튼
export function TTSIconButton({
  text,
  voice = 'female',
  speed = 'normal',
}: {
  text: string;
  voice?: VoiceId;
  speed?: 'slow' | 'normal' | 'fast';
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    return () => { if (sound) sound.unloadAsync(); };
  }, [sound]);

  async function handlePlay() {
    if (!text) return;
    if (isPlaying && sound) {
      await sound.stopAsync();
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const response = await fetch(`${API_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), voice, speed }),
      });

      if (!response.ok) throw new Error('TTS 실패');
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

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
        const fileUri = `${FileSystem.cacheDirectory}tts_${Date.now()}.mp3`;
        await FileSystem.writeAsStringAsync(fileUri, btoa(binary), {
          encoding: FileSystem.EncodingType.Base64,
        });
        audioUri = fileUri;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) setIsPlaying(false);
        }
      );
      setSound(newSound);
      setIsPlaying(true);
    } catch (err) {
      console.error('TTS 오류:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <TouchableOpacity
      style={[styles.iconBtn, isPlaying && styles.iconBtnActive]}
      onPress={handlePlay}
      disabled={isLoading || !text}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#6366f1" />
      ) : (
        <Text style={styles.iconBtnText}>{isPlaying ? '⏹' : '🔊'}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  voiceRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  voiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  voiceChipActive: {
    backgroundColor: '#ede9fe',
    borderColor: '#a78bfa',
  },
  voiceEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  voiceName: {
    fontSize: 12,
    color: '#6b7280',
  },
  voiceNameActive: {
    color: '#7c3aed',
    fontWeight: '600',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  playButtonSmall: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  playButtonLarge: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 28,
  },
  playButtonActive: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  playIcon: {
    fontSize: 14,
    color: '#fff',
  },
  playText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  playTextSmall: {
    fontSize: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    backgroundColor: '#fef2f2',
  },
  iconBtnText: {
    fontSize: 16,
  },
});
