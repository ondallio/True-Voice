// 녹음 버튼 컴포넌트 - 미니멀 디자인
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';

type RecordingStatus = 'idle' | 'recording' | 'stopping' | 'uploading';

interface RecordButtonProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  disabled?: boolean;
}

export default function RecordButton({
  onRecordingComplete,
  disabled = false,
}: RecordButtonProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // 펄스 애니메이션
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  // 권한 요청
  useEffect(() => {
    async function requestPermission() {
      try {
        if (Platform.OS === 'web') {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
          setHasPermission(true);
        } else {
          const { status: existingStatus } = await Audio.getPermissionsAsync();
          let finalStatus = existingStatus;
          if (existingStatus !== 'granted') {
            const { status } = await Audio.requestPermissionsAsync();
            finalStatus = status;
          }
          setHasPermission(finalStatus === 'granted');
          if (finalStatus !== 'granted') {
            Alert.alert('권한 필요', '마이크 권한이 필요합니다.');
          }
        }
      } catch (error) {
        setHasPermission(false);
      }
    }
    requestPermission();
  }, []);

  // 녹음 타이머
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (status === 'recording') {
      interval = setInterval(() => setDuration((prev) => prev + 1), 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [status]);

  // 펄스 애니메이션
  useEffect(() => {
    if (status === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
      
      Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(ringAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      ringAnim.setValue(0);
    }
  }, [status]);

  // 웹 녹음
  async function startWebRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      setStatus('recording');
      setDuration(0);
    } catch (error) {
      alert('녹음을 시작할 수 없습니다.');
    }
  }

  async function stopWebRecording() {
    if (!mediaRecorderRef.current) return;
    setStatus('stopping');
    return new Promise<void>((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        mediaRecorderRef.current = null;
        setStatus('idle');
        onRecordingComplete(audioUrl, duration * 1000);
        resolve();
      };
      mediaRecorder.stop();
    });
  }

  // 네이티브 녹음
  async function startNativeRecording() {
    if (!hasPermission) {
      Alert.alert('권한 필요', '마이크 권한이 없습니다.');
      return;
    }
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recordingOptions: Audio.RecordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        web: { mimeType: 'audio/webm', bitsPerSecond: 128000 },
      };
      const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);
      setRecording(newRecording);
      setStatus('recording');
      setDuration(0);
    } catch (error) {
      Alert.alert('오류', '녹음을 시작할 수 없습니다.');
    }
  }

  async function stopNativeRecording() {
    if (!recording) return;
    setStatus('stopping');
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      setRecording(null);
      setStatus('idle');
      if (uri) onRecordingComplete(uri, duration * 1000);
    } catch (error) {
      setStatus('idle');
      Alert.alert('오류', '녹음을 중지할 수 없습니다.');
    }
  }

  async function startRecording() {
    Platform.OS === 'web' ? await startWebRecording() : await startNativeRecording();
  }

  async function stopRecording() {
    Platform.OS === 'web' ? await stopWebRecording() : await stopNativeRecording();
  }

  function handlePress() {
    status === 'idle' ? startRecording() : status === 'recording' && stopRecording();
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  const isDisabled = disabled || status === 'stopping' || status === 'uploading';
  const isRecording = status === 'recording';

  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  });
  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 0.3, 0],
  });

  return (
    <View style={styles.container}>
      {/* 녹음 시간 */}
      {isRecording && (
        <View style={styles.timerContainer}>
          <View style={styles.recordingDot} />
          <Text style={styles.timer}>{formatDuration(duration)}</Text>
        </View>
      )}

      {/* 버튼 */}
      <View style={styles.buttonWrapper}>
        {/* 펄스 링 */}
        {isRecording && (
          <Animated.View 
            style={[
              styles.pulseRing,
              { transform: [{ scale: ringScale }], opacity: ringOpacity }
            ]} 
          />
        )}
        
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[
              styles.button,
              isRecording && styles.buttonRecording,
              isDisabled && styles.buttonDisabled,
            ]}
            onPress={handlePress}
            disabled={isDisabled}
            activeOpacity={0.8}
          >
            {status === 'stopping' || status === 'uploading' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View style={[styles.inner, isRecording && styles.innerRecording]} />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* 안내 텍스트 */}
      <Text style={[styles.hint, isRecording && styles.hintRecording]}>
        {isRecording ? '터치하여 완료' : '터치하여 녹음'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  timer: {
    fontSize: 28,
    fontWeight: '600',
    color: '#ef4444',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  buttonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#fecaca',
  },
  button: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonRecording: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
  },
  inner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  innerRecording: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  hint: {
    marginTop: 16,
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  hintRecording: {
    color: '#ef4444',
  },
});
