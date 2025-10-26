import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Suppress React Native deprecation warnings for shadow and pointerEvents
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args.join(' ');
  if (message.includes('shadow* style props are deprecated') ||
      message.includes('props.pointerEvents is deprecated')) {
    return; // Suppress these warnings
  }
  originalWarn.apply(console, args);
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
