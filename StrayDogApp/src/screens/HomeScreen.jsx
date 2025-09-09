import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import api from '../services/api';
import { useAuth } from '../contexts/AuthProvider';

export default function HomeScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [me, setMe] = useState(null);
  const { logout } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/auth/me');
        setMe(res.data.data);
      } catch (e) {
        // ignore
      }
      setStats({ dogsRegistered: 0, recentActivities: [] });
    })();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Good morning!</Text>
        <Text style={styles.subtitle}>Ready to help stray dogs today?</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('AddDog')}>
            <Text style={styles.actionText}>Register Dog</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('Map')}>
            <Text style={styles.actionText}>Open Map</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Stats</Text>
        <Text>Dogs registered: {stats?.dogsRegistered}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <Text>{me?.profile?.firstName} {me?.profile?.lastName}</Text>
        <Text>{me?.email}</Text>
        <TouchableOpacity style={[styles.action, { marginTop: 8, backgroundColor: '#ef4444' }]} onPress={logout}>
          <Text style={styles.actionText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { marginBottom: 12 },
  greeting: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#6b7280' },
  section: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  action: { backgroundColor: '#3b82f6', padding: 12, borderRadius: 8 },
  actionText: { color: '#fff', fontWeight: '600' },
});
