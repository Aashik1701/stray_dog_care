import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import api from '../services/api';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return Alert.alert('Email required', 'Please enter your account email.');
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: trimmed });
      const message = data?.message || 'If an account exists, a reset link has been sent.';
      const token = data?.token;
      Alert.alert('Request received', message);
      // If dev token provided, jump to reset screen with token prefilled
      navigation.navigate('ResetPassword', { token: token || '' });
    } catch (e) {
      console.log('forgot-password error', e?.response?.data || e.message);
      Alert.alert('Error', e?.response?.data?.message || 'Failed to request password reset');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>Enter your email and we'll help you reset your password.</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
        <TouchableOpacity style={[styles.button, submitting && { opacity: 0.7 }]} onPress={onSubmit} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? 'Submitting…' : 'Send reset link'}</Text>
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
