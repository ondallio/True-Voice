// 녹음 버튼 컴포넌트
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';

// 녹음 상태 타입
type RecordingStatus = 'idle' | 'recording' | 'stopping' | 'uploading';

// Props 타입
interface RecordButtonProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  disabled?: boolean;
}

export default function RecordButton({
  onRecordingComplete,
  disabled = false,
}: RecordButtonProps) {
  // 녹음 객체
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  // 웹 녹음용 MediaRecorder
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  // 현재 상태
  const [status, setStatus] = useState<RecordingStatus>('idle');
  // 녹음 시간 (초)
  const [duration, setDuration] = useState(0);
  // 권한 상태
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // 권한 요청
  useEffect(() => {
    async function requestPermission() {
      try {
        console.log('[DEBUG] 플랫폼:', Platform.OS);
        
        if (Platform.OS === 'web') {
          // 웹에서는 navigator.mediaDevices 사용
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop()); // 바로 스트림 정지
          setHasPermission(true);
          console.log('[DEBUG] 웹 마이크 권한 획득');
        } else {
          // 먼저 현재 권한 상태 확인
          const { status: existingStatus } = await Audio.getPermissionsAsync();
          console.log('[DEBUG] 현재 권한 상태:', existingStatus);
          
          let finalStatus = existingStatus;
          if (existingStatus !== 'granted') {
            const { status } = await Audio.requestPermissionsAsync();
            finalStatus = status;
            console.log('[DEBUG] 권한 요청 결과:', status);
          }
          
          setHasPermission(finalStatus === 'granted');
          if (finalStatus !== 'granted') {
            Alert.alert('권한 필요', '마이크 권한이 필요합니다. 설정에서 권한을 허용해주세요.');
          } else {
            console.log('[DEBUG] 마이크 권한 획득 완료');
          }
        }
      } catch (error) {
        console.error('[ERROR] 권한 요청 오류:', error);
        setHasPermission(false);
        if (Platform.OS === 'web') {
          alert('마이크 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
        }
      }
    }
    requestPermission();
  }, []);

  // 녹음 시간 타이머
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (status === 'recording') {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  // 웹에서 녹음 시작
  async function startWebRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // 100ms마다 데이터 수집
      mediaRecorderRef.current = mediaRecorder;
      setStatus('recording');
      setDuration(0);
      console.log('웹 녹음 시작');
    } catch (error) {
      console.error('웹 녹음 시작 오류:', error);
      alert('녹음을 시작할 수 없습니다. 마이크 권한을 확인해주세요.');
    }
  }

  // 웹에서 녹음 중지
  async function stopWebRecording() {
    if (!mediaRecorderRef.current) return;

    setStatus('stopping');

    return new Promise<void>((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        console.log('웹 녹음 완료:', audioUrl);
        
        // 스트림 정지
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        mediaRecorderRef.current = null;
        setStatus('idle');
        
        // 콜백 호출
        onRecordingComplete(audioUrl, duration * 1000);
        resolve();
      };

      mediaRecorder.stop();
    });
  }

  // 네이티브 녹음 시작
  async function startNativeRecording() {
    if (!hasPermission) {
      Alert.alert('권한 필요', '마이크 권한이 없습니다.');
      return;
    }

    try {
      // 오디오 모드 설정
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // 녹음 옵션 설정 (iOS: m4a, Android: wav)
      // iOS에서는 AAC 형식이 더 안정적입니다
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
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };
      
      console.log('[DEBUG] 녹음 옵션:', JSON.stringify(recordingOptions));

      // 녹음 시작
      console.log('[DEBUG] 녹음 생성 시작...');
      const { recording: newRecording } = await Audio.Recording.createAsync(
        recordingOptions
      );
      
      // 녹음 시작 확인
      const initialStatus = await newRecording.getStatusAsync();
      console.log('[DEBUG] 녹음 초기 상태:', initialStatus);
      console.log('[DEBUG] 녹음 중 여부:', initialStatus.isRecording);
      
      setRecording(newRecording);
      setStatus('recording');
      setDuration(0);
      console.log('[DEBUG] 네이티브 녹음 시작 완료!');
    } catch (error) {
      console.error('녹음 시작 오류:', error);
      Alert.alert('오류', '녹음을 시작할 수 없습니다.');
    }
  }

  // 네이티브 녹음 중지
  async function stopNativeRecording() {
    if (!recording) return;

    setStatus('stopping');

    try {
      // 녹음 상태 확인
      const status = await recording.getStatusAsync();
      console.log('[DEBUG] 녹음 상태:', status);
      console.log('[DEBUG] 녹음 시간:', status.durationMillis, 'ms');
      
      // 녹음 중지
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('[DEBUG] 녹음 완료 URI:', uri);

      // 파일 정보 확인
      if (uri) {
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          console.log('[DEBUG] 녹음 파일 크기:', blob.size, 'bytes');
          console.log('[DEBUG] 녹음 파일 타입:', blob.type);
          
          if (blob.size === 0) {
            console.error('[ERROR] 녹음 파일이 비어있습니다!');
            Alert.alert('오류', '녹음 파일이 비어있습니다. 마이크 권한을 확인해주세요.');
            setRecording(null);
            setStatus('idle');
            return;
          }
        } catch (e) {
          console.error('[DEBUG] 파일 정보 확인 실패:', e);
        }
      }

      // 오디오 모드 복원
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      setRecording(null);
      setStatus('idle');

      // 콜백 호출
      if (uri) {
        onRecordingComplete(uri, duration * 1000); // 밀리초로 변환
      }
    } catch (error) {
      console.error('녹음 중지 오류:', error);
      setStatus('idle');
      Alert.alert('오류', '녹음을 중지할 수 없습니다.');
    }
  }

  // 녹음 시작
  async function startRecording() {
    if (Platform.OS === 'web') {
      await startWebRecording();
    } else {
      await startNativeRecording();
    }
  }

  // 녹음 중지
  async function stopRecording() {
    if (Platform.OS === 'web') {
      await stopWebRecording();
    } else {
      await stopNativeRecording();
    }
  }

  // 버튼 클릭 핸들러
  function handlePress() {
    if (status === 'idle') {
      startRecording();
    } else if (status === 'recording') {
      stopRecording();
    }
  }

  // 시간 포맷팅
  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // 상태 텍스트
  function getStatusText(): string {
    switch (status) {
      case 'idle':
        return '터치하여 녹음 시작';
      case 'recording':
        return '녹음 중... 터치하여 중지';
      case 'stopping':
        return '처리 중...';
      case 'uploading':
        return '업로드 중...';
      default:
        return '';
    }
  }

  // 버튼 비활성화 여부
  const isDisabled = disabled || status === 'stopping' || status === 'uploading';

  return (
    <View style={styles.container}>
      {/* 녹음 버튼 */}
      <TouchableOpacity
        style={[
          styles.button,
          status === 'recording' && styles.buttonRecording,
          isDisabled && styles.buttonDisabled,
        ]}
        onPress={handlePress}
        disabled={isDisabled}
        activeOpacity={0.7}
      >
        {status === 'stopping' || status === 'uploading' ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : (
          <View
            style={[
              styles.innerCircle,
              status === 'recording' && styles.innerCircleRecording,
            ]}
          />
        )}
      </TouchableOpacity>

      {/* 녹음 시간 */}
      {status === 'recording' && (
        <Text style={styles.duration}>{formatDuration(duration)}</Text>
      )}

      {/* 상태 텍스트 */}
      <Text style={styles.statusText}>{getStatusText()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonRecording: {
    backgroundColor: '#c0392b',
    transform: [{ scale: 1.1 }],
  },
  buttonDisabled: {
    backgroundColor: '#95a5a6',
  },
  innerCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
  },
  innerCircleRecording: {
    borderRadius: 5,
    width: 25,
    height: 25,
  },
  duration: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    fontVariant: ['tabular-nums'],
  },
  statusText: {
    marginTop: 12,
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
});
