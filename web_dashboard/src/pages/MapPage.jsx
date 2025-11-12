import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, MarkerClustererF, InfoWindowF, Autocomplete, MarkerF } from '@react-google-maps/api';
import api from '../services/api';
import socketService from '../services/socket';
import { useToast } from '../contexts/ToastContext';

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };
const LIBRARIES = ['places', 'marker'];

const containerStyle = { width: '100%', height: '100%' };

export default function MapPage() {
  const toast = useToast();
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(12);
  const [dogs, setDogs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ injured: true, vaccinated: true, sterilized: true });

  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();

  const { isLoaded } = useJsApiLoader({
    id: 'dashboard-map-loader',
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getDogs();
        const list = res?.data?.dogs || res?.data?.data?.dogs || [];
        if (mounted) setDogs(list);
      } catch (e) {
        console.error('Dashboard Map: failed to load dogs', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Real-time updates: Listen for new dog registrations
  useEffect(() => {
    // Listen for dog.created event
    const unsubscribeCreated = socketService.on('dog.created', (newDog) => {
      console.log('[MapPage] New dog registered:', newDog);
      
      // Show notification
      toast.success(`🐕 New dog spotted on the map in ${newDog.zone || 'your area'}!`);
      
      // Add the new dog to the map immediately
      setDogs(prevDogs => {
        // Check if dog already exists to avoid duplicates
        const exists = prevDogs.some(d => d._id === newDog.id || d._id === newDog._id);
        if (exists) return prevDogs;
        
        // Add new dog with proper location format
        const dogWithLocation = {
          _id: newDog.id || newDog._id,
          dogId: newDog.dogId,
          location: {
            type: 'Point',
            coordinates: newDog.coordinates || [0, 0] // Backend should send coordinates
          },
          healthStatus: newDog.healthStatus || {},
          zone: newDog.zone,
          status: newDog.status,
          createdAt: newDog.createdAt
        };
        
        return [dogWithLocation, ...prevDogs];
      });
    });

    // Listen for dog-registered event (legacy)
    const unsubscribeRegistered = socketService.on('dog-registered', (data) => {
      console.log('[MapPage] Dog registered (legacy):', data);
      toast.success('🐕 New dog added to the map!');
      
      // Refresh all dogs from API to ensure we have complete data
      api.getDogs().then(res => {
        const list = res?.data?.dogs || res?.data?.data?.dogs || [];
        setDogs(list);
      }).catch(err => console.error('Error refreshing dogs:', err));
    });

    // Cleanup
    return () => {
      unsubscribeCreated();
      unsubscribeRegistered();
    };
  }, [toast]);


  const mapOptions = useMemo(() => ({
    mapTypeControl: false,
    fullscreenControl: false,
    streetViewControl: false,
    gestureHandling: 'greedy',
  }), []);

  const getColor = useCallback((dog) => {
    if (dog?.healthStatus?.isInjured) return '#ef4444'; // red
    if (dog?.healthStatus?.isSterilized) return '#22c55e'; // green
    if (dog?.healthStatus?.isVaccinated) return '#3b82f6'; // blue
    return '#f59e0b'; // amber
  }, []);

  // Colored SVG marker icon as a data URL (works across all versions)
  const getMarkerIcon = useCallback((color) => {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <g>
        <path d="M16 2c-5 0-9 4-9 9 0 6.8 9 17 9 17s9-10.2 9-17c0-5-4-9-9-9z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
        <circle cx="16" cy="13" r="4" fill="#ffffff"/>
      </g>
    </svg>`;
    const encoded = encodeURIComponent(svg)
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29');
    return `data:image/svg+xml;charset=UTF-8,${encoded}`;
  }, []);

  const filteredDogs = useMemo(() => {
    return dogs.filter((d) => {
      const injured = !!d?.healthStatus?.isInjured;
      const vaccinated = !!d?.healthStatus?.isVaccinated;
      const sterilized = !!d?.healthStatus?.isSterilized;
      if (injured && !filters.injured) return false;
      if (vaccinated && !filters.vaccinated) return false;
      if (sterilized && !filters.sterilized) return false;
      return true;
    });
  }, [dogs, filters]);

  const onPlaceSelected = useCallback((place) => {
    const loc = place?.geometry?.location;
    if (loc) {
      setCenter({ lat: loc.lat(), lng: loc.lng() });
      setZoom(14);
    }
  }, []);

  const autocompleteRef = useRef(null);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full p-6 text-gray-500">
        Loading map...
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-full p-6 text-center">
        <div>
          <div className="mb-2 text-lg font-semibold">Google Maps API key missing</div>
          <p className="max-w-xl text-gray-600">
            Set <code className="px-1 py-0.5 rounded bg-gray-100">VITE_GOOGLE_MAPS_API_KEY</code> in your environment
            (e.g. create <code className="px-1 py-0.5 rounded bg-gray-100">.env</code> or <code className="px-1 py-0.5 rounded bg-gray-100">.env.local</code>)
            and restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        options={mapOptions}
        onClick={() => setSelected(null)}
      >
        <MarkerClustererF>
          {(clusterer) => (
            <>
              {filteredDogs.map((dog) => {
                const coords = dog?.location?.coordinates;
                if (!Array.isArray(coords) || coords.length < 2) return null;
                const lat = coords[1];
                const lng = coords[0];
                const color = getColor(dog);
                return (
                  <MarkerF
                    key={dog._id}
                    position={{ lat, lng }}
                    title={`Dog ${dog.dogId || dog._id}`}
                    clusterer={clusterer}
                    onClick={() => setSelected(dog)}
                    icon={{ url: getMarkerIcon(color) }}
                  />
                );
              })}
            </>
          )}
        </MarkerClustererF>

        {selected?.location?.coordinates && (
          <InfoWindowF
            position={{ lat: selected.location.coordinates[1], lng: selected.location.coordinates[0] }}
            onCloseClick={() => setSelected(null)}
          >
            <div style={{ maxWidth: 240 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Dog {selected.dogId || selected._id}</div>
              <div style={{ fontSize: 12, color: '#374151' }}>
                {selected.size} • {selected.color} • {selected.zone || 'N/A'}
              </div>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>

      {/* Search box */}
      <div className="absolute left-1/2 -translate-x-1/2 top-4 z-10 w-[min(520px,90%)]">
        <Autocomplete
          onLoad={(ac) => (autocompleteRef.current = ac)}
          onPlaceChanged={() => {
            const place = autocompleteRef.current?.getPlace?.();
            if (place) onPlaceSelected(place);
          }}
        >
          <input
            type="text"
            aria-label="Search places"
            placeholder="Search places..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white/90 backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Autocomplete>
      </div>

      {/* Filters */}
      <div className="absolute z-10 grid gap-2 p-3 rounded-md shadow top-4 right-4 bg-white/90 backdrop-blur">
        <label htmlFor="filter-injured" className="flex items-center gap-2 text-sm">
          <input id="filter-injured" aria-label="Toggle injured filter" type="checkbox" checked={filters.injured} onChange={(e) => setFilters(f => ({...f, injured: e.target.checked}))} />
          <span className="inline-flex items-center gap-2"><span className="w-3 h-3 bg-red-500 rounded-full"></span> Injured</span>
        </label>
        <label htmlFor="filter-vaccinated" className="flex items-center gap-2 text-sm">
          <input id="filter-vaccinated" aria-label="Toggle vaccinated filter" type="checkbox" checked={filters.vaccinated} onChange={(e) => setFilters(f => ({...f, vaccinated: e.target.checked}))} />
          <span className="inline-flex items-center gap-2"><span className="w-3 h-3 bg-blue-500 rounded-full"></span> Vaccinated</span>
        </label>
        <label htmlFor="filter-sterilized" className="flex items-center gap-2 text-sm">
          <input id="filter-sterilized" aria-label="Toggle sterilized filter" type="checkbox" checked={filters.sterilized} onChange={(e) => setFilters(f => ({...f, sterilized: e.target.checked}))} />
          <span className="inline-flex items-center gap-2"><span className="w-3 h-3 bg-green-500 rounded-full"></span> Sterilized</span>
        </label>
      </div>
    </div>
  );
}
