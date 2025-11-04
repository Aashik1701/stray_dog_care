import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GoogleMap, InfoWindowF, MarkerClustererF, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import api from '../services/api';

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 }; // Bangalore

// IMPORTANT: Keep Google Maps libraries as a stable reference to avoid reloading
// Include only what's needed to reduce chance of loader issues.
const GOOGLE_LIBRARIES = ['places'];

export default function MapScreen({ navigation }) {
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(13);
  const [dogs, setDogs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
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
    // Prefer Expo config extra, fallback to public env vars
    const fromConfig = Constants?.expoConfig?.extra?.googleMapsApiKey;
    return (
      fromConfig ||
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      ''
    );
  }, []);

  // Load Google Maps JS API explicitly and guard rendering until loaded
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_LIBRARIES,
  });

  const onMarkerClick = useCallback((dog) => {
    setSelected(dog);
    setShowOverlay(false);
  }, []);

  const getMarkerColor = useCallback((dog) => {
    if (dog?.healthStatus?.isInjured) return 'red';
    if (dog?.healthStatus?.isSterilized) return 'green';
    if (dog?.healthStatus?.isVaccinated) return 'blue';
    return 'orange';
  }, []);

  // SVG data URL marker icon to avoid AdvancedMarker dependency
  const getMarkerIcon = useCallback((color) => {
    const svg = encodeURIComponent(
      `<?xml version="1.0" encoding="UTF-8"?>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="url(#shadow)">
          <circle cx="18" cy="18" r="10" fill="${color}" stroke="white" stroke-width="2" />
        </g>
        <defs>
          <filter id="shadow" x="0" y="0" width="36" height="36" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
            <feFlood flood-opacity="0" result="BackgroundImageFix"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>
            <feOffset dy="2"/>
            <feGaussianBlur stdDeviation="3"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.3 0"/>
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
          </filter>
        </defs>
      </svg>`
    );
    return {
      url: `data:image/svg+xml;charset=UTF-8,${svg}`,
      scaledSize: { width: 36, height: 36 },
      anchor: { x: 18, y: 18 },
    };
  }, []);

  // Using AdvancedMarker + Pin, no need for legacy SVG icon definition

  const formatAddress = useCallback((addr) => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    if (typeof addr === 'object') {
      const { street, area, city, state, postalCode, country } = addr || {};
      return [street, area, city, state, postalCode, country].filter(Boolean).join(', ');
    }
    return String(addr);
  }, []);

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

  if (loadError) {
    return (
      <View style={[styles.center, { padding: 24 }]}> 
        <Text style={styles.title}>Failed to load Google Maps</Text>
        <Text style={styles.subtitle}>
          {String(loadError.message || loadError)}
        </Text>
      </View>
    );
  }

  if (!isLoaded) {
    return (
      <View style={styles.center}>
        <Text>Loading map…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        options={options}
        onClick={() => {
          setSelected(null);
          setShowOverlay(false);
        }}
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
                  <MarkerF
                    key={dog._id}
                    position={{ lat, lng }}
                    onClick={() => onMarkerClick(dog)}
                    title={`Dog ${dog.dogId || dog._id}`}
                    clusterer={clusterer}
                    icon={getMarkerIcon(color)}
                  />
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
                onClick={() => setShowOverlay(true)}
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
                Show details here
              </button>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>

      <TouchableOpacity style={styles.fab} onPress={() => navigation?.navigate?.('AddDog')}>
        <Ionicons name="add" size={26} color="#fff" />
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
              onPress={() => navigation?.navigate?.('DogDetail', { dogId: selected._id })}
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
  overlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    zIndex: 10,
    gap: 8,
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overlayTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  overlayRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  overlayText: { fontSize: 14, color: '#374151' },
  overlayChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  overlayChipText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  overlayAddress: { fontSize: 13, color: '#111827' },
  overlayActions: { marginTop: 6, flexDirection: 'row', gap: 8 },
  overlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  overlayButtonText: { color: '#fff', fontWeight: '600' },
});
