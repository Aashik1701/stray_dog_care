import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  Image, 
  RefreshControl,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function DogsScreen({ navigation }) {
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDogs, setFilteredDogs] = useState([]);

  useEffect(() => {
    fetchDogs();
  }, []);

  useEffect(() => {
    // Filter dogs based on search query
    if (searchQuery.trim() === '') {
      setFilteredDogs(dogs);
    } else {
      const filtered = dogs.filter(dog => 
        dog.dogId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dog.color?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dog.size?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dog.zone?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDogs(filtered);
    }
  }, [dogs, searchQuery]);

  const fetchDogs = async () => {
    try {
      const response = await api.get('/dogs');
      setDogs(response.data.data.dogs || []);
    } catch (error) {
      console.log('Error fetching dogs:', error);
      Alert.alert('Error', 'Failed to load dogs');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDogs();
    setRefreshing(false);
  };

  const getStatusColor = (dog) => {
    if (dog.healthStatus?.isInjured) return '#ef4444';
    if (dog.healthStatus?.isSterilized && dog.healthStatus?.isVaccinated) return '#22c55e';
    if (dog.healthStatus?.isVaccinated) return '#3b82f6';
    return '#f59e0b';
  };

  const getStatusText = (dog) => {
    if (dog.healthStatus?.isInjured) return 'Injured';
    if (dog.healthStatus?.isSterilized && dog.healthStatus?.isVaccinated) return 'Treated';
    if (dog.healthStatus?.isVaccinated) return 'Vaccinated';
    return 'Needs Care';
  };

  const renderDogItem = ({ item: dog }) => (
    <TouchableOpacity 
      style={styles.dogCard}
      onPress={() => navigation.navigate('DogDetail', { dogId: dog._id })}
    >
      <View style={styles.dogHeader}>
        <View style={styles.dogInfo}>
          <Text style={styles.dogId}>{dog.dogId || 'No ID'}</Text>
          <Text style={styles.dogDetails}>
            {dog.size} • {dog.color} • {dog.gender}
          </Text>
          <Text style={styles.dogLocation}>
            <Ionicons name="location-outline" size={12} /> {dog.zone}
          </Text>
        </View>
        
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(dog) }]}>
            <Text style={styles.statusText}>{getStatusText(dog)}</Text>
          </View>
        </View>
      </View>

      {dog.images && dog.images.length > 0 && (
        <Image 
          source={{ uri: dog.images[0].url }} 
          style={styles.dogImage}
          resizeMode="cover"
        />
      )}
      
      {dog.notes && (
        <Text style={styles.notes} numberOfLines={2}>
          {dog.notes}
        </Text>
      )}
      
      <Text style={styles.timestamp}>
        Registered: {new Date(dog.createdAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading dogs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by ID, color, size, zone..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {filteredDogs.length} dogs {searchQuery ? 'found' : 'total'}
        </Text>
      </View>

      {/* Dogs List */}
      <FlatList
        data={filteredDogs}
        keyExtractor={(item) => item._id}
        renderItem={renderDogItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="paw" size={48} color="#6b7280" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No dogs found for your search' : 'No dogs registered yet'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => navigation.navigate('AddDog')}
              >
                <Text style={styles.addButtonText}>Register First Dog</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  dogCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dogInfo: {
    flex: 1,
  },
  dogId: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  dogDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  dogLocation: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 4,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  dogImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginVertical: 8,
  },
  notes: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    marginTop: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
