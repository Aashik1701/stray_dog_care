import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GoogleMap, LoadScript, InfoWindowF, MarkerClustererF, AdvancedMarker, Pin } from '@react-google-maps/api';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 }; // Bangalore

// IMPORTANT: Keep Google Maps libraries as a stable reference to avoid reloading
// LoadScript on every render. Passing a new array each render triggers a reload.
// See warning: "LoadScript has been reloaded unintentionally!"
// Include 'marker' to enable AdvancedMarkerElement usage in the future.
const GOOGLE_LIBRARIES = ['places', 'marker'];

export default function MapScreen({ navigation }) {
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(13);
  const [dogs, setDogs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  // Try browser geolocation
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setZoom(14);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // Fetch dogs
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/dogs');
        const list = res?.data?.data?.dogs || [];
        if (mounted) setDogs(list);
      } catch (e) {
        console.log('Map (web) failed to load dogs', e?.response?.data || e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  const containerStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);
  const options = useMemo(
    () => ({
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      gestureHandling: 'greedy',
    }),
    []
  );

  const apiKey = useMemo(() => {
    return process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
  }, []);

  const onMarkerClick = useCallback((dog) => {
    setSelected(dog);
  }, []);

  const getMarkerColor = useCallback((dog) => {
    if (dog?.healthStatus?.isInjured) return 'red';
    if (dog?.healthStatus?.isSterilized) return 'green';
    if (dog?.healthStatus?.isVaccinated) return 'blue';
    return 'orange';
  }, []);

  // Using AdvancedMarker + Pin, no need for legacy SVG icon definition

  if (!apiKey) {
    return (
      <View style={[styles.center, { padding: 24 }]}>
        <Text style={styles.title}>Google Maps API key missing</Text>
        <Text style={styles.subtitle}>
          Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in your environment or app.json under expo.extra.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LoadScript googleMapsApiKey={apiKey} libraries={GOOGLE_LIBRARIES}> 
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={zoom}
          options={options}
          onClick={() => setSelected(null)}
        >
          <MarkerClustererF>
            {(clusterer) => (
              <>
                {dogs.map((dog) => {
                  const coords = dog?.location?.coordinates;
                  if (!Array.isArray(coords) || coords.length < 2) return null;
                  const lat = coords[1];
                  const lng = coords[0];
                  const color = getMarkerColor(dog);
                  return (
                    <AdvancedMarker
                      key={dog._id}
                      position={{ lat, lng }}
                      onClick={() => onMarkerClick(dog)}
                      title={`Dog ${dog.dogId || dog._id}`}
                      clusterer={clusterer}
                    >
                      <Pin
                        background={color}
                        borderColor="#ffffff"
                        glyphColor="#ffffff"
                      />
                    </AdvancedMarker>
                  );
                })}
              </>
            )}
          </MarkerClustererF>

          {selected && selected.location?.coordinates && (
            <InfoWindowF
              position={{
                lat: selected.location.coordinates[1],
                lng: selected.location.coordinates[0],
              }}
              onCloseClick={() => setSelected(null)}
            >
              <div style={{ maxWidth: 220 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  Dog {selected.dogId || selected._id}
                </div>
                <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.4 }}>
                  {selected.size} • {selected.color} • {selected.zone || 'N/A'}
                </div>
                <button
                  onClick={() => navigation?.navigate?.('DogDetail', { id: selected._id })}
                  style={{
                    marginTop: 8,
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  View details
                </button>
              </div>
            </InfoWindowF>
          )}
        </GoogleMap>
      </LoadScript>

      <TouchableOpacity style={styles.fab} onPress={() => navigation?.navigate?.('AddDog')}>
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
  },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
});
