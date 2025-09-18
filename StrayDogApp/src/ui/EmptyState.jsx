import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './theme';

export default function EmptyState({ icon = 'paw', title = 'Nothing here', subtitle }) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={colors.muted} />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 40 },
  title: { fontSize: 16, fontWeight: '600', marginTop: 12, color: colors.muted },
  subtitle: { fontSize: 14, marginTop: 4, color: colors.muted, textAlign: 'center' }
});
