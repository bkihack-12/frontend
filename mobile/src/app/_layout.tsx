import React from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../state/AuthContext';
import { AppDataProvider } from '../state/AppDataContext';
import { ToastProvider } from '../state/ToastContext';
import { AuthSheet } from '../components/AuthSheet';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppDataProvider>
          <ToastProvider>
            <View
              style={{
                flex: 1,
                backgroundColor: Platform.OS === 'web' ? '#E9EDF2' : colors.cream,
              }}
            >
              <View
                style={{
                  flex: 1,
                  width: '100%',
                  maxWidth: Platform.OS === 'web' ? 520 : undefined,
                  alignSelf: 'center',
                  backgroundColor: colors.cream,
                  overflow: 'hidden',
                }}
              >
                <StatusBar style="dark" />
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }} />
                <AuthSheet />
              </View>
            </View>
          </ToastProvider>
        </AppDataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
