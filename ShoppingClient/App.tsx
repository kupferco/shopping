import React from 'react';
import { View, SafeAreaView, StyleSheet } from 'react-native';
import PriceTagCapture from './src/components/PriceTagCapture';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <PriceTagCapture />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});