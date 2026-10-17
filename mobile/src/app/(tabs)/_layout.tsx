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
      screenOptions={{ headerShown: false, title: 'NaszToruń' }}
    >
      <Tabs.Screen name="ruch" options={{ title: 'NaszToruń' }} />
      <Tabs.Screen name="spolecznosc" options={{ title: 'NaszToruń' }} />
      <Tabs.Screen name="miasto" options={{ title: 'NaszToruń' }} />
      <Tabs.Screen name="transport" options={{ title: 'NaszToruń' }} />
      <Tabs.Screen name="glos" options={{ title: 'NaszToruń' }} />
    </Tabs>
  );
}
