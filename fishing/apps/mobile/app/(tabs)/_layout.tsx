import { Tabs } from 'expo-router';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients } from '@/theme/colors';
import { text } from '@/theme/text';
import { shadow } from '@/theme/layout';

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons
        name={focused ? name : (`${name}-outline` as IconName)}
        size={22}
        color={focused ? colors.brandGreen : colors.textMuted}
      />
    </View>
  );
}

function CaptureFab(props: { onPress?: () => void; accessibilityState?: { selected?: boolean } }) {
  const selected = props.accessibilityState?.selected;
  return (
    <Pressable
      onPress={props.onPress}
      style={styles.fabOuter}
      accessibilityRole="button"
      accessibilityLabel="인증 촬영"
    >
      <View style={[styles.fab, selected && styles.fabActive]}>
        <Ionicons name="add" size={28} color="#fff" />
      </View>
    </Pressable>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        lazy: true,
        freezeOnBlur: true,
        headerBackground: () => (
          <LinearGradient
            colors={[...gradients.ocean]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          />
        ),
        headerTintColor: '#fff',
        headerTitleStyle: { ...text.bold(17), color: '#fff' },
        tabBarActiveTintColor: colors.brandGreen,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { ...text.bold(11), marginTop: 2 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 6),
          height: 56 + Math.max(insets.bottom, 6),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '랭킹',
          headerShown: false,
          lazy: false,
          tabBarIcon: ({ focused }) => <TabIcon name="trophy" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: '인증 촬영',
          lazy: true,
          tabBarIcon: () => null,
          tabBarLabel: () => null,
          tabBarButton: (props) => <CaptureFab {...props} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: '커뮤니티',
          headerShown: false,
          lazy: false,
          tabBarIcon: ({ focused }) => <TabIcon name="chatbubbles" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: '내 정보',
          headerShown: false,
          lazy: false,
          tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 40,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  iconWrapActive: {
    backgroundColor: colors.oceanLight,
  },
  fabOuter: {
    top: Platform.OS === 'ios' ? -18 : -12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.surface,
    ...shadow.card,
  },
  fabActive: {
    backgroundColor: colors.brandNavy,
  },
});
