import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import api from '../services/api';

export default function ResetPasswordScreen({ navigation, route }) {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const prefill = route?.params?.token;
    if (prefill) setToken(prefill);
  }, [route?.params?.token]);

  const onSubmit = async () => {
    if (!token) return Alert.alert('Token required', 'Please paste the reset token you received.');
    if (!newPassword || newPassword.length < 6) return Alert.alert('Weak password', 'Password must be at least 6 characters.');
    if (newPassword !== confirm) return Alert.alert('Mismatch', 'Passwords do not match.');
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/reset-password', { token, newPassword });
      Alert.alert('Success', data?.message || 'Password reset successful', [
        { text: 'OK', onPress: () => navigation.replace('Login') }
      ]);
    } catch (e) {
      console.log('reset-password error', e?.response?.data || e.message);
      Alert.alert('Error', e?.response?.data?.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Paste the reset token and choose a new password.</Text>

        <TextInput
          style={styles.input}
          placeholder="Reset token"
          autoCapitalize="none"
          autoCorrect={false}
          value={token}
          onChangeText={setToken}
        />
        <TextInput
          style={styles.input}
          placeholder="New password"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
        <TouchableOpacity style={[styles.button, submitting && { opacity: 0.7 }]} onPress={onSubmit} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? 'Resetting…' : 'Reset password'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.replace('Login')} style={styles.linkRow}>
          <Text style={styles.linkText}>Back to Sign in</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', padding: 16 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#fff', padding: 20, borderRadius: 12 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, marginBottom: 10 },
  button: { backgroundColor: '#3b82f6', padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  linkRow: { marginTop: 12, alignItems: 'center' },
  linkText: { color: '#3b82f6', fontWeight: '600' },
});
