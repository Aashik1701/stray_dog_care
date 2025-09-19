import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Map is not available on web yet</Text>
      <Text style={styles.subtitle}>
        The mobile app (iOS/Android) includes full map functionality. On web, please use the Dogs tab to browse entries.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
});
