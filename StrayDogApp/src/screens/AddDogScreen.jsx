import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import * as Location from 'expo-location';
import api from '../services/api';

export default function AddDogScreen({ navigation }) {
  const [dogData, setDogData] = useState({ size: '', color: '', gender: '', notes: '', zone: '' });
  const [coords, setCoords] = useState(null); // { latitude, longitude }
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({});
        setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const handleSubmit = async () => {
    if (!dogData.size) return Alert.alert('Validation', 'Please enter size');
    if (!coords) return Alert.alert('Location', 'Location not available yet');
    if (!dogData.zone) return Alert.alert('Validation', 'Please enter zone');

    setSubmitting(true);
    try {
      const payload = {
        size: dogData.size,
        color: dogData.color || undefined,
        gender: dogData.gender || undefined,
        notes: dogData.notes || undefined,
        zone: dogData.zone,
        coordinates: [coords.longitude, coords.latitude],
      };
      const res = await api.post('/dogs', payload);
      Alert.alert('Success', 'Dog registered successfully');
      navigation.navigate('Home');
    } catch (e) {
      console.log(e?.response?.data || e.message);
      Alert.alert('Error', e?.response?.data?.message || 'Failed to register dog');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dog Details</Text>
        <TextInput placeholder="Size (small/medium/large)" style={styles.input} value={dogData.size} onChangeText={(t)=>setDogData(s=>({ ...s, size: t }))} />
        <TextInput placeholder="Color" style={styles.input} value={dogData.color} onChangeText={(t)=>setDogData(s=>({ ...s, color: t }))} />
        <TextInput placeholder="Gender" style={styles.input} value={dogData.gender} onChangeText={(t)=>setDogData(s=>({ ...s, gender: t }))} />
  <TextInput placeholder="Zone (e.g., Zone 7)" style={styles.input} value={dogData.zone} onChangeText={(t)=>setDogData(s=>({ ...s, zone: t }))} />
  <TextInput placeholder="Notes" style={[styles.input, { height: 100 }]} value={dogData.notes} onChangeText={(t)=>setDogData(s=>({ ...s, notes: t }))} multiline />
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.submitText}>{submitting ? 'Saving…' : 'Save'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  section: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginBottom: 8, backgroundColor: '#fff' },
  submitButton: { backgroundColor: '#10b981', padding: 14, borderRadius: 10, margin: 16, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '700' }
});
