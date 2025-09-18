import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from './theme';

export default function Loading({ size = 'large' }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }
});
