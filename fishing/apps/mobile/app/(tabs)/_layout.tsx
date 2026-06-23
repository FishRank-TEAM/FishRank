import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function TabIcon({ label }: { label: string }) {
  return <Text style={{ fontSize: 18 }}>{label}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#003d6b' },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#48cae4',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: { backgroundColor: '#002847' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '랭킹',
          tabBarIcon: () => <TabIcon label="🏆" />,
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: '인증 촬영',
          tabBarIcon: () => <TabIcon label="📷" />,
        }}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: '마이',
          tabBarIcon: () => <TabIcon label="👤" />,
        }}
      />
    </Tabs>
  );
}
