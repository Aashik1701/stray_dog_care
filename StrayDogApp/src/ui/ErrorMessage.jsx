import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from './theme';

export default function ErrorMessage({ message, onRetry }) {
  if (!message) return null;
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, margin: 16, borderWidth: 1, borderColor: '#fecaca' },
  text: { color: colors.danger, marginBottom: 4 },
  button: { alignSelf: 'flex-start', backgroundColor: colors.danger, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  buttonText: { color: '#fff', fontWeight: '600' }
});
