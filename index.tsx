import React from 'react';
import { registerRootComponent } from 'expo';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import PasswordGenerator from './app/index';

function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0b141e' }}>
        <PasswordGenerator />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

registerRootComponent(App);
