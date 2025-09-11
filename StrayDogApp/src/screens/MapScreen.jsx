import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Alert, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function MapScreen({ navigation }) {
  const [region, setRegion] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);

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
    Alert.alert(
      `Dog ${dog.dogId || 'Unknown'}`,
      `Size: ${dog.size}\nColor: ${dog.color}\nZone: ${dog.zone}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Details', onPress: () => {/* TODO: Navigate to dog detail */} }
      ]
    );
  };

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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
