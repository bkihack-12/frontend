import React from 'react';
import { Tabs } from 'expo-router';
import { TabBar } from '../../components/TabBar';

export const unstable_settings = {
  initialRouteName: 'spolecznosc',
};

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={() => <TabBar />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="ruch" options={{ title: 'Ruch' }} />
      <Tabs.Screen name="spolecznosc" options={{ title: 'Społeczność' }} />
      <Tabs.Screen name="miasto" options={{ title: 'Miasto' }} />
      <Tabs.Screen name="transport" options={{ title: 'Transport' }} />
    </Tabs>
  );
}
