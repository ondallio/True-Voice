// 앱 레이아웃 설정
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#f8f9fa',
          },
          headerTintColor: '#2c3e50',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {/* 홈/녹음 화면 */}
        <Stack.Screen
          name="index"
          options={{
            title: '발음 교정',
            headerShown: true,
          }}
        />
        {/* 결과 화면 */}
        <Stack.Screen
          name="result/[id]"
          options={{
            title: '분석 결과',
            headerShown: true,
          }}
        />
      </Stack>
    </>
  );
}
