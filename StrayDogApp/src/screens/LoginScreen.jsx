import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../contexts/AuthProvider';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    // No validation needed - just sign in with demo user
    setSubmitting(true);
    try {
      await login(email.trim() || 'demo@straydogcare.com', password || 'demo123');
    } catch (e) {
      console.log(e);
      Alert.alert('Login failed', e?.response?.data?.message || 'Check credentials and try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.title}>Sign in (Demo Mode)</Text>
        <Text style={styles.subtitle}>Leave fields empty to use demo account</Text>
        <TextInput
          style={styles.input}
          placeholder="Email or username (optional)"
          nativeID="login-email"
          accessibilityLabel="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          inputMode="email"
          textContentType="emailAddress"
          autoComplete="email"
          importantForAutofill="yes"
          returnKeyType="next"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (optional)"
          nativeID="login-password"
          accessibilityLabel="Password"
          secureTextEntry
          autoCorrect={false}
          textContentType="password"
          autoComplete="current-password"
          importantForAutofill="yes"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={[styles.button, submitting && { opacity: 0.7 }]} onPress={onSubmit} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? 'Signing in…' : 'Sign in'}</Text>
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
  button: { backgroundColor: '#3b82f6', padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
});
