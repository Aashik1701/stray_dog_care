import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthProvider';
import api from '../services/api';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [usernameAvailable, setUsernameAvailable] = useState(undefined); // true/false/undefined
  const [emailAvailable, setEmailAvailable] = useState(undefined);
  const debounceTimer = useRef();

  const isEmailValid = (val) => /\S+@\S+\.\S+/.test(val);
  const digitsOnly = (val) => (val || '').replace(/\D/g, '');
  const isPhoneValid = (val) => digitsOnly(val).length === 10;
  const isUsernameValid = (val) => (val || '').trim().length >= 3;
  const isPasswordValid = (val) => (val || '').length >= 6;

  const formValid = useMemo(() => (
    firstName && lastName &&
    isPhoneValid(phoneNumber) &&
    isEmailValid(email) &&
    isUsernameValid(username) &&
    isPasswordValid(password) &&
    (usernameAvailable !== false) &&
    (emailAvailable !== false)
  ), [firstName, lastName, phoneNumber, email, username, password, usernameAvailable, emailAvailable]);

  // Debounced availability checks
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        const params = {};
        if (isUsernameValid(username)) params.username = username.trim();
        if (isEmailValid(email)) params.email = email.trim();
        if (Object.keys(params).length === 0) return;
        const res = await api.get('/auth/availability', { params });
        const data = res.data?.data || {};
        if (params.username) setUsernameAvailable(data.username);
        else setUsernameAvailable(undefined);
        if (params.email) setEmailAvailable(data.email);
        else setEmailAvailable(undefined);
      } catch {
        // Ignore network errors for availability checks
      }
    }, 350);
    return () => clearTimeout(debounceTimer.current);
  }, [username, email]);

  const onSubmit = async () => {
    const nextErrors = {};
    if (!firstName) nextErrors.firstName = 'Required';
    if (!lastName) nextErrors.lastName = 'Required';
    if (!isPhoneValid(phoneNumber)) nextErrors.phoneNumber = 'Enter 10-digit phone number';
    if (!isEmailValid(email)) nextErrors.email = 'Enter a valid email';
    if (!isUsernameValid(username)) nextErrors.username = 'Username must be at least 3 characters';
    if (!isPasswordValid(password)) nextErrors.password = 'Password must be at least 6 characters';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return Alert.alert('Fix the highlighted fields', 'Please correct the form and try again.');
    }
    setSubmitting(true);
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: digitsOnly(phoneNumber)
      });
      // On success, AuthProvider sets user+token and navigator will switch to Main automatically
    } catch (e) {
      console.log(e);
      const msg = e?.response?.data?.message || 'Please try again.';
      Alert.alert('Registration failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Sign up to start using the app</Text>

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="First name"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Last name"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          <TextInput
            style={[styles.input, errors.phoneNumber && styles.inputError]}
            placeholder="Phone number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            returnKeyType="next"
          />

          <TextInput
            style={[
              styles.input,
              (errors.email || emailAvailable === false) && styles.inputError,
              emailAvailable === true && styles.inputOk
            ]}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            inputMode="email"
            textContentType="emailAddress"
            autoComplete="email"
            returnKeyType="next"
          />
          {email?.length > 0 && (
            <Text style={styles.helpText}>
              {emailAvailable === false ? 'Email is already in use' : emailAvailable === true ? 'Email looks available' : ' '}
            </Text>
          )}

          <TextInput
            style={[
              styles.input,
              (errors.username || usernameAvailable === false) && styles.inputError,
              usernameAvailable === true && styles.inputOk
            ]}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
          {username?.length > 0 && (
            <Text style={styles.helpText}>
              {usernameAvailable === false ? 'Username is taken' : usernameAvailable === true ? 'Username is available' : ' '}
            </Text>
          )}

          <TextInput
            style={[styles.input, errors.password && styles.inputError]}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCorrect={false}
            textContentType="newPassword"
            autoComplete="new-password"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />

          <TouchableOpacity style={[styles.button, (submitting || !formValid) && { opacity: 0.7 }]} onPress={onSubmit} disabled={submitting || !formValid}>
            <Text style={styles.buttonText}>{submitting ? 'Creating account…' : 'Create account'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.replace('Login')} style={styles.linkRow}>
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 480, backgroundColor: '#fff', padding: 20, borderRadius: 12 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 12, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, marginBottom: 10 },
  button: { backgroundColor: '#10b981', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontWeight: '700' },
  linkRow: { marginTop: 12, alignItems: 'center' },
  linkText: { color: '#3b82f6', fontWeight: '600' },
  helpText: { marginTop: -6, marginBottom: 6, fontSize: 12, color: '#6b7280' },
  inputOk: { borderColor: '#10b981' },
  inputError: { borderColor: '#ef4444' },
});
