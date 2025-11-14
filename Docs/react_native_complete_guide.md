
# REACT NATIVE MOBILE APP - COMPLETE SETUP GUIDE
## Cross-Platform Stray Dog Management App

### 📱 APP FEATURES OVERVIEW

#### 🏠 Home Screen
- **Quick Actions**: Register new dog, report incident, view nearby dogs
- **Statistics Summary**: Personal stats, recent activities
- **Map Preview**: Dogs in current area with status indicators
- **Notifications**: Alerts and updates from system

#### 📍 Dog Registration
- **Photo Capture**: Take multiple photos with camera
- **GPS Location**: Automatic location capture with manual adjustment
- **Health Assessment**: Visual indicators, behavior notes
- **Basic Info**: Size, color, distinguishing features
- **Offline Support**: Save data locally, sync when online

#### 🗺️ Map Interface
- **Interactive Map**: All dogs with color-coded status
- **Current Location**: User's position with nearby dogs
- **Filtering**: Show/hide by status, health, date
- **Navigation**: Directions to specific dogs
- **Clustering**: Group nearby dogs for better visualization

#### 📋 Dog Management
- **Dog List**: All registered dogs with search/filter
- **Individual Profiles**: Detailed view with edit capabilities
- **Status Updates**: Quick actions for health status changes
- **Photo Gallery**: Swipeable image viewer
- **Medical History**: Treatment records, vaccination dates

#### 👤 Profile & Settings
- **User Profile**: Personal information and statistics
- **Sync Status**: Online/offline data synchronization
- **App Settings**: Notifications, map preferences, data usage
- **Help & Support**: User guide, contact information

### QUICK SETUP (5 minutes)

```bash
# Install Expo CLI globally
npm install -g expo-cli @expo/ngrok@^4.1.0

# Create new project
expo init StrayDogApp --template blank
cd StrayDogApp

# Install navigation dependencies
expo install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
expo install react-native-screens react-native-safe-area-context
expo install react-native-gesture-handler react-native-reanimated

# Install essential dependencies
expo install expo-camera expo-media-library expo-location
expo install @react-native-async-storage/async-storage
expo install expo-image-picker expo-file-system
expo install react-native-maps

# Install UI and utility libraries
npm install axios react-query
npm install react-hook-form
npm install react-native-elements react-native-vector-icons
npm install @react-native-community/netinfo
npm install react-native-toast-message

# Start development server
expo start
```

### PROJECT STRUCTURE

```
src/
├── components/
│   ├── common/          # Reusable components
│   ├── forms/           # Form components
│   └── ui/              # UI components
├── screens/             # Screen components
├── navigation/          # Navigation setup
├── services/            # API and data services
├── hooks/               # Custom React hooks
├── store/               # State management
├── utils/               # Utility functions
└── constants/           # App constants
```

### CORE COMPONENTS

#### 1. Main Navigation

```jsx
// src/navigation/AppNavigator.jsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import DogsScreen from '../screens/DogsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AddDogScreen from '../screens/AddDogScreen';
import DogDetailScreen from '../screens/DogDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Dogs') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Dogs" component={DogsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="Main" 
          component={TabNavigator} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="AddDog" 
          component={AddDogScreen}
          options={{ title: 'Register New Dog' }}
        />
        <Stack.Screen 
          name="DogDetail" 
          component={DogDetailScreen}
          options={{ title: 'Dog Details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

#### 2. Home Screen

```jsx
// src/screens/HomeScreen.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import QuickActionCard from '../components/common/QuickActionCard';
import StatsCard from '../components/common/StatsCard';
import RecentActivityList from '../components/common/RecentActivityList';

export default function HomeScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    requestLocationPermission();
    fetchDashboardData();
  }, []);

  const requestLocationPermission = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location access is required for this app to work properly.');
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    setLocation(location);
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch user-specific stats and activities
      const response = await fetch('/api/user/dashboard');
      const data = await response.json();
      setStats(data.stats);
      setActivities(data.activities);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchDashboardData().finally(() => setRefreshing(false));
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Good morning!</Text>
        <Text style={styles.subtitle}>Ready to help stray dogs today?</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <QuickActionCard
            icon="add-circle"
            title="Register Dog"
            subtitle="Add new stray dog"
            onPress={() => navigation.navigate('AddDog')}
            color="#3b82f6"
          />
          <QuickActionCard
            icon="map"
            title="View Map"
            subtitle="Dogs in your area"
            onPress={() => navigation.navigate('Map')}
            color="#22c55e"
          />
          <QuickActionCard
            icon="alert-circle"
            title="Report Issue"
            subtitle="Emergency or incident"
            onPress={() => {/* Handle emergency report */}}
            color="#f59e0b"
          />
          <QuickActionCard
            icon="heart"
            title="Health Check"
            subtitle="Update dog status"
            onPress={() => navigation.navigate('Dogs')}
            color="#ef4444"
          />
        </View>
      </View>

      {/* Statistics */}
      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Impact</Text>
          <View style={styles.statsRow}>
            <StatsCard
              title="Dogs Registered"
              value={stats.dogsRegistered}
              icon="paw"
              color="#3b82f6"
            />
            <StatsCard
              title="This Month"
              value={stats.thisMonth}
              icon="calendar"
              color="#22c55e"
            />
          </View>
        </View>
      )}

      {/* Recent Activities */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activities</Text>
        <RecentActivityList activities={activities} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
```

#### 3. Dog Registration Screen

```jsx
// src/screens/AddDogScreen.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

export default function AddDogScreen({ navigation }) {
  const [images, setImages] = useState([]);
  const [location, setLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [dogData, setDogData] = useState({
    size: '',
    color: '',
    gender: '',
    healthNotes: '',
    vaccinated: false,
    sterilized: false,
    injured: false,
  });

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      let location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setLocation(coords);
      setSelectedLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not get current location');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const handleSubmit = async () => {
    if (images.length === 0) {
      Alert.alert('Error', 'Please add at least one photo');
      return;
    }

    if (!selectedLocation) {
      Alert.alert('Error', 'Please select a location on the map');
      return;
    }

    try {
      const dogRecord = {
        ...dogData,
        images,
        location: selectedLocation,
        timestamp: new Date().toISOString(),
      };

      // Submit to API
      const response = await fetch('/api/dogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dogRecord),
      });

      if (response.ok) {
        Alert.alert('Success', 'Dog registered successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to register dog. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Photos Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photos *</Text>
        <View style={styles.photoContainer}>
          {images.map((uri, index) => (
            <Image key={index} source={{ uri }} style={styles.photo} />
          ))}
          <TouchableOpacity style={styles.addPhotoButton} onPress={takePhoto}>
            <Ionicons name="camera" size={30} color="#6b7280" />
            <Text style={styles.addPhotoText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
            <Ionicons name="image" size={30} color="#6b7280" />
            <Text style={styles.addPhotoText}>Choose Photo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Location Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location *</Text>
        <View style={styles.mapContainer}>
          {location && (
            <MapView
              style={styles.map}
              initialRegion={location}
              onPress={(e) => setSelectedLocation(e.nativeEvent.coordinate)}
            >
              {selectedLocation && (
                <Marker coordinate={selectedLocation} />
              )}
            </MapView>
          )}
        </View>
        <Text style={styles.mapHint}>Tap on the map to select exact location</Text>
      </View>

      {/* Dog Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dog Details</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Size</Text>
          <View style={styles.optionsRow}>
            {['Small', 'Medium', 'Large'].map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.optionButton,
                  dogData.size === size && styles.optionButtonSelected
                ]}
                onPress={() => setDogData({...dogData, size})}
              >
                <Text style={[
                  styles.optionText,
                  dogData.size === size && styles.optionTextSelected
                ]}>{size}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Color</Text>
          <TextInput
            style={styles.textInput}
            value={dogData.color}
            onChangeText={(color) => setDogData({...dogData, color})}
            placeholder="e.g., Brown, Black, Mixed"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.optionsRow}>
            {['Male', 'Female', 'Unknown'].map((gender) => (
              <TouchableOpacity
                key={gender}
                style={[
                  styles.optionButton,
                  dogData.gender === gender && styles.optionButtonSelected
                ]}
                onPress={() => setDogData({...dogData, gender})}
              >
                <Text style={[
                  styles.optionText,
                  dogData.gender === gender && styles.optionTextSelected
                ]}>{gender}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Health Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health Status</Text>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Vaccinated</Text>
          <Switch
            value={dogData.vaccinated}
            onValueChange={(vaccinated) => setDogData({...dogData, vaccinated})}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Sterilized</Text>
          <Switch
            value={dogData.sterilized}
            onValueChange={(sterilized) => setDogData({...dogData, sterilized})}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Injured/Sick</Text>
          <Switch
            value={dogData.injured}
            onValueChange={(injured) => setDogData({...dogData, injured})}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Health Notes</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={dogData.healthNotes}
            onChangeText={(healthNotes) => setDogData({...dogData, healthNotes})}
            placeholder="Any observations about the dog's health or behavior..."
            multiline={true}
            numberOfLines={3}
          />
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitText}>Register Dog</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  photoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  mapHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  optionButtonSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
  },
  optionTextSelected: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: '#374151',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
```

#### 4. Map Screen

```jsx
// src/screens/MapScreen.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

export default function MapScreen({ navigation }) {
  const [region, setRegion] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [selectedDog, setSelectedDog] = useState(null);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    getCurrentLocation();
    fetchDogs();
  }, []);

  const getCurrentLocation = async () => {
    try {
      let location = await Location.getCurrentPositionAsync({});
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
      const response = await fetch('/api/dogs');
      const data = await response.json();
      setDogs(data);
    } catch (error) {
      console.error('Error fetching dogs:', error);
    }
  };

  const getMarkerColor = (dog) => {
    if (dog.healthStatus.injured) return '#ef4444';
    if (dog.healthStatus.sterilized) return '#22c55e';
    if (dog.healthStatus.vaccinated) return '#3b82f6';
    return '#f59e0b';
  };

  const filteredDogs = dogs.filter(dog => {
    switch (filterType) {
      case 'sterilized': return dog.healthStatus.sterilized;
      case 'unsterilized': return !dog.healthStatus.sterilized;
      case 'injured': return dog.healthStatus.injured;
      default: return true;
    }
  });

  return (
    <View style={styles.container}>
      {region && (
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          region={region}
          onRegionChangeComplete={setRegion}
        >
          {filteredDogs.map((dog) => (
            <Marker
              key={dog._id}
              coordinate={{
                latitude: dog.location.latitude,
                longitude: dog.location.longitude,
              }}
              pinColor={getMarkerColor(dog)}
              onPress={() => setSelectedDog(dog)}
            />
          ))}
        </MapView>
      )}

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {[
          { key: 'all', label: 'All', color: '#6b7280' },
          { key: 'sterilized', label: 'Sterilized', color: '#22c55e' },
          { key: 'unsterilized', label: 'Unsterilized', color: '#f59e0b' },
          { key: 'injured', label: 'Injured', color: '#ef4444' },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              filterType === filter.key && { backgroundColor: filter.color }
            ]}
            onPress={() => setFilterType(filter.key)}
          >
            <Text style={[
              styles.filterText,
              filterType === filter.key && { color: '#fff' }
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Add Dog FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddDog')}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Dog Details Popup */}
      {selectedDog && (
        <View style={styles.popup}>
          <View style={styles.popupContent}>
            <Text style={styles.popupTitle}>Dog #{selectedDog.dogId}</Text>
            <Text style={styles.popupText}>
              Status: {selectedDog.healthStatus.sterilized ? 'Sterilized' : 'Not Sterilized'}
            </Text>
            <Text style={styles.popupText}>
              Last Updated: {new Date(selectedDog.updatedAt).toLocaleDateString()}
            </Text>
            <View style={styles.popupButtons}>
              <TouchableOpacity
                style={styles.popupButton}
                onPress={() => {
                  setSelectedDog(null);
                  navigation.navigate('DogDetail', { dogId: selectedDog._id });
                }}
              >
                <Text style={styles.popupButtonText}>View Details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.popupButton, styles.popupButtonSecondary]}
                onPress={() => setSelectedDog(null)}
              >
                <Text style={styles.popupButtonTextSecondary}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  filterContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
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
  popup: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingTop: 50,
  },
  popupContent: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  popupText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  popupButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  popupButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  popupButtonSecondary: {
    backgroundColor: '#f3f4f6',
  },
  popupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  popupButtonTextSecondary: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
});
```

### APP.JS SETUP

```jsx
// App.js
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
      <Toast />
    </>
  );
}
```

### DEVELOPMENT COMMANDS

```bash
# Start development server
expo start

# Run on iOS simulator
expo start --ios

# Run on Android emulator
expo start --android

# Build for production
expo build:android
expo build:ios
```

### KEY FEATURES IMPLEMENTED

✅ **Cross-Platform**: Single codebase for iOS and Android
✅ **GPS Integration**: Automatic location detection and mapping
✅ **Camera Integration**: Photo capture and gallery selection
✅ **Offline Support**: Local data storage with sync capability
✅ **Interactive Maps**: Dog locations with filtering and clustering
✅ **Real-time Updates**: Live data synchronization
✅ **Modern UI**: Clean, intuitive interface design
✅ **Performance Optimized**: Smooth animations and transitions

### ESTIMATED DEVELOPMENT TIME

- **Basic Setup**: 1 day
- **Navigation & Screens**: 2-3 days
- **Camera & Photos**: 2 days
- **Maps Integration**: 2-3 days
- **Forms & Data**: 3-4 days
- **Polish & Testing**: 2-3 days

**Total: 2-3 weeks for complete mobile app**
