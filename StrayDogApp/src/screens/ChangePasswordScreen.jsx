import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import api from '../services/api';

export default function ChangePasswordScreen({ navigation }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const valid = useMemo(() => {
    return (
      currentPassword?.length >= 1 &&
      newPassword?.length >= 6 &&
      confirmPassword === newPassword
    );
  }, [currentPassword, newPassword, confirmPassword]);

  const onSubmit = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      Alert.alert('Success', 'Password changed successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Unable to change password. Please try again.';
      Alert.alert('Change password failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.title}>Change Password</Text>
        <Text style={styles.subtitle}>Enter your current password and a new one</Text>

        <TextInput
          style={styles.input}
          placeholder="Current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          autoCorrect={false}
          textContentType="password"
          autoComplete="current-password"
          returnKeyType="next"
        />

        <TextInput
          style={styles.input}
          placeholder="New password (min 6 characters)"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoCorrect={false}
          textContentType="newPassword"
          autoComplete="new-password"
          returnKeyType="next"
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCorrect={false}
          textContentType="newPassword"
          autoComplete="new-password"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />

        <TouchableOpacity style={[styles.button, (!valid || submitting) && { opacity: 0.7 }]} onPress={onSubmit} disabled={!valid || submitting}>
          <Text style={styles.buttonText}>{submitting ? 'Updating…' : 'Update password'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', padding: 16 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#fff', padding: 20, borderRadius: 12 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, marginBottom: 10 },
  button: { backgroundColor: '#3b82f6', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontWeight: '700' },
});
