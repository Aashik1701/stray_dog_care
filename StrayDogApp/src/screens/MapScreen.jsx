import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { shadow } from '../ui/shadow';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function MapScreen({ navigation }) {
  const [region, setRegion] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    getCurrentLocation();
    fetchDogs();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      
      const location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not get current location');
    }
  };

  const fetchDogs = async () => {
    try {
      const response = await api.get('/dogs');
      setDogs(response.data.data.dogs || []);
    } catch (error) {
      console.log('Error fetching dogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMarkerColor = (dog) => {
    if (dog.healthStatus?.isInjured) return '#ef4444';
    if (dog.healthStatus?.isSterilized) return '#22c55e';
    if (dog.healthStatus?.isVaccinated) return '#3b82f6';
    return '#f59e0b';
  };

  const onMarkerPress = (dog) => {
    setSelected(dog);
    setShowOverlay(true);
  };

  const formatAddress = useCallback((addr) => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    if (typeof addr === 'object') {
      const { street, area, city, state, postalCode, country } = addr || {};
      return [street, area, city, state, postalCode, country].filter(Boolean).join(', ');
    }
    return String(addr);
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {region && (
        <MapView
          style={styles.map}
          region={region}
          provider={PROVIDER_GOOGLE}
          showsUserLocation
          showsMyLocationButton
          onRegionChange={setRegion}
          onPress={() => {
            setSelected(null);
            setShowOverlay(false);
          }}
        >
          {dogs.map((dog, index) => {
            if (!dog.location?.coordinates) return null;
            
            return (
              <Marker
                key={dog._id || index}
                coordinate={{
                  latitude: dog.location.coordinates[1],
                  longitude: dog.location.coordinates[0],
                }}
                title={`Dog ${dog.dogId || index + 1}`}
                description={`${dog.size} • ${dog.color} • ${dog.zone}`}
                pinColor={getMarkerColor(dog)}
                onPress={() => onMarkerPress(dog)}
              />
            );
          })}
        </MapView>
      )}
      
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('AddDog')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

        {selected && showOverlay && (
          <View style={styles.overlay}>
            <View style={styles.overlayHeader}>
              <Text style={styles.overlayTitle}>Dog {selected.dogId || selected._id}</Text>
              <TouchableOpacity onPress={() => setShowOverlay(false)}>
                <Ionicons name="close" size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.overlayRow}> 
              <Ionicons name="paw" size={16} color="#3b82f6" />
              <Text style={styles.overlayText}>
                {selected.size} • {selected.color} • {selected.gender || 'Unknown'}
              </Text>
            </View>

            {selected.priority && (
              <View style={[styles.overlayChip, 
                selected.priority === 'critical' ? { backgroundColor: '#b91c1c' } :
                selected.priority === 'high' ? { backgroundColor: '#ef4444' } :
                selected.priority === 'normal' ? { backgroundColor: '#f59e0b' } : { backgroundColor: '#10b981' }
              ]}>
                <Ionicons name="alert-circle" size={14} color="#fff" />
                <Text style={styles.overlayChipText}>{String(selected.priority).toUpperCase()}</Text>
              </View>
            )}

            <View style={styles.overlayRow}>
              <Ionicons name="location" size={16} color="#10b981" />
              <Text style={styles.overlayText}>{selected.zone || 'N/A'}</Text>
            </View>

            {!!selected.address && (
              <Text style={styles.overlayAddress}>{formatAddress(selected.address)}</Text>
            )}

            <View style={styles.overlayActions}>
              <TouchableOpacity 
                style={[styles.overlayButton, { backgroundColor: '#3b82f6' }]}
                onPress={() => navigation.navigate('DogDetail', { dogId: selected._id })}
              >
                <Ionicons name="open-outline" size={18} color="#fff" />
                <Text style={styles.overlayButtonText}>Open full details</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  map: { flex: 1 },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow(3, { opacity: 0.2 }),
  },
  overlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    ...shadow(4, { opacity: 0.25 }),
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  overlayTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  overlayRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  overlayText: { fontSize: 14, color: '#374151', marginLeft: 6 },
  overlayChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 6,
  },
  overlayChipText: { color: '#fff', fontWeight: '800', fontSize: 12, marginLeft: 6 },
  overlayAddress: { fontSize: 13, color: '#111827', marginTop: 6 },
  overlayActions: { marginTop: 8, flexDirection: 'row' },
  overlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  overlayButtonText: { color: '#fff', fontWeight: '600', marginLeft: 6 },
});
