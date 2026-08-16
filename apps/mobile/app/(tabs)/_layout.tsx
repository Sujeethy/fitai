import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';

/**
 * Icons matter more here than they usually would: this is tapped one-handed,
 * mid-workout, often without reading. A shape is recognised faster than a word.
 */
const ICONS = {
  index: 'dumbbell',
  weight: 'scale-bathroom',
  history: 'history',
  settings: 'cog-outline',
} as const;

type TabName = keyof typeof ICONS;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0c0c0d',
          borderTopColor: '#1f1f22',
          borderTopWidth: 1,
          height: Platform.OS === 'android' ? 64 : undefined,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#34d399',
        tabBarInactiveTintColor: '#6b6b70',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        // Fades between tabs instead of cutting, which makes the app feel less abrupt.
        animation: 'shift',
      }}
    >
      {(['index', 'weight', 'history', 'settings'] as TabName[]).map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: TITLES[name],
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={ICONS[name]}
                size={focused ? 26 : 24}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const TITLES: Record<TabName, string> = {
  index: 'Today',
  weight: 'Weight',
  history: 'History',
  settings: 'Settings',
};
