import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { shadow } from '../ui/shadow';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuth } from '../contexts/AuthProvider';

export default function HomeScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const { logout, user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to be initialized and user to be available
    if (!authLoading && user) {
      fetchData();
    }
  }, [authLoading, user]);

  const fetchData = async () => {
    try {
      // Only fetch stats, use user from auth context instead of fetching /auth/me
      const statsRes = await api.get('/dogs/stats');
      setStats(statsRes.data.data);
    } catch (e) {
      console.log('Error fetching data:', e);
      // Don't clear user state on error - just log it
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const QuickActionCard = ({ icon, title, subtitle, onPress, color = '#3b82f6' }) => (
    <TouchableOpacity style={[styles.actionCard, { borderLeftColor: color }]} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.actionText}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );

  const StatCard = ({ icon, title, value, color = '#3b82f6' }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value || 0}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back!</Text>
          <Text style={styles.subtitle}>
            {user?.profile?.firstName} {user?.profile?.lastName}
          </Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <QuickActionCard
          icon="add-circle-outline"
          title="Register Dog"
          subtitle="Add a new stray dog"
          onPress={() => navigation.navigate('AddDog')}
          color="#10b981"
        />
        <QuickActionCard
          icon="map-outline"
          title="View Map"
          subtitle="See dogs in your area"
          onPress={() => navigation.navigate('Map')}
          color="#3b82f6"
        />
        <QuickActionCard
          icon="list-outline"
          title="Browse Dogs"
          subtitle="View all registered dogs"
          onPress={() => navigation.navigate('Dogs')}
          color="#8b5cf6"
        />
        <QuickActionCard
          icon="key-outline"
          title="Change Password"
          subtitle="Update your account password"
          onPress={() => navigation.navigate('ChangePassword')}
          color="#f59e0b"
        />
      </View>

      {/* Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsRow}>
          <StatCard
            icon="paw"
            title="Total Dogs"
            value={stats?.total}
            color="#3b82f6"
          />
          <StatCard
            icon="checkmark-circle"
            title="Sterilized"
            value={stats?.sterilized}
            color="#10b981"
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            icon="medical"
            title="Vaccinated"
            value={stats?.vaccinated}
            color="#8b5cf6"
          />
          <StatCard
            icon="warning"
            title="Need Care"
            value={stats?.total - (stats?.sterilized || 0)}
            color="#f59e0b"
          />
        </View>
      </View>

      {/* User Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Profile</Text>
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitial}>
                {user?.profile?.firstName?.charAt(0)}{user?.profile?.lastName?.charAt(0)}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.profile?.firstName} {user?.profile?.lastName}
              </Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <Text style={styles.profileRole}>{user?.role?.replace('_', ' ')}</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16,
    paddingVertical: 16,
  },
  greeting: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 16, color: '#6b7280', marginTop: 4 },
  profileButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    ...shadow(1),
  },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    ...shadow(2),
  },
  actionIcon: { marginRight: 12 },
  actionText: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  actionSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...shadow(2),
  },
  statIcon: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: { fontSize: 24, fontWeight: '700', color: '#111827' },
  statTitle: { fontSize: 12, color: '#6b7280', textAlign: 'center' },
  profileCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    ...shadow(2),
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center' },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileInitial: { fontSize: 18, fontWeight: '700', color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  profileEmail: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  profileRole: { 
    fontSize: 12, 
    color: '#3b82f6', 
    marginTop: 4, 
    textTransform: 'capitalize',
    fontWeight: '500',
  },
});
