import 'react-native-get-random-values';
import './src/polyfills';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { Text, TextInput, Platform } from 'react-native';

// Apply global font family: Times New Roman on iOS, serif on Android/web
// Preserve any existing defaultProps styles by merging
if (Text.defaultProps == null) {
  Text.defaultProps = {};
}
Text.defaultProps.style = [
  Text.defaultProps.style || {},
  { fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif' }
];

if (TextInput.defaultProps == null) {
  TextInput.defaultProps = {};
}
TextInput.defaultProps.style = [
  TextInput.defaultProps.style || {},
  { fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif' }
];

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </AuthProvider>
  );
}
