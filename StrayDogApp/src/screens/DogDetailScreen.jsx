import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Alert,
  Dimensions 
} from 'react-native';
import { shadow } from '../ui/shadow';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

const { width } = Dimensions.get('window');

export default function DogDetailScreen({ route, navigation }) {
  const { dogId } = route.params;
  const [dog, setDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchDogDetails();
  }, [dogId]);

  const fetchDogDetails = async () => {
    try {
      const response = await api.get(`/dogs/${dogId}`);
      setDog(response.data.data);
    } catch (error) {
      console.log('Error fetching dog details:', error);
      Alert.alert('Error', 'Failed to load dog details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const updateDogStatus = async (statusUpdate) => {
    try {
      const response = await api.patch(`/dogs/${dogId}/status`, statusUpdate);
      setDog(response.data.data);
      Alert.alert('Success', 'Dog status updated successfully');
    } catch (error) {
      console.log('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const toggleVaccination = () => {
    Alert.alert(
      'Update Vaccination Status',
      `Mark as ${dog.healthStatus?.isVaccinated ? 'not vaccinated' : 'vaccinated'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => updateDogStatus({
            healthStatus: { 
              ...dog.healthStatus, 
              isVaccinated: !dog.healthStatus?.isVaccinated 
            }
          })
        }
      ]
    );
  };

  const toggleSterilization = () => {
    Alert.alert(
      'Update Sterilization Status',
      `Mark as ${dog.healthStatus?.isSterilized ? 'not sterilized' : 'sterilized'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => updateDogStatus({
            healthStatus: { 
              ...dog.healthStatus, 
              isSterilized: !dog.healthStatus?.isSterilized 
            }
          })
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading dog details...</Text>
      </View>
    );
  }

  if (!dog) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Dog not found</Text>
      </View>
    );
  }

  const StatusBadge = ({ label, isActive, color }) => (
    <View style={[styles.statusBadge, { backgroundColor: isActive ? color : '#f3f4f6' }]}>
      <Text style={[styles.statusBadgeText, { color: isActive ? '#fff' : '#6b7280' }]}>
        {label}
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dog Details</Text>
        <TouchableOpacity>
          <Ionicons name="share-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Images */}
      {dog.images && dog.images.length > 0 && (
        <View style={styles.imageContainer}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setCurrentImageIndex(index);
            }}
          >
            {dog.images.map((image, index) => (
              <Image 
                key={index}
                source={{ uri: image.url }} 
                style={styles.dogImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
          {dog.images.length > 1 && (
            <View style={styles.imageIndicator}>
              <Text style={styles.imageIndicatorText}>
                {currentImageIndex + 1} / {dog.images.length}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Basic Info */}
      <View style={styles.section}>
        <Text style={styles.dogId}>{dog.dogId}</Text>
        <View style={styles.basicInfo}>
          <Text style={styles.basicInfoText}>
            {dog.size} • {dog.color} • {dog.gender}
          </Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={16} color="#10b981" />
            <Text style={styles.locationText}>{dog.zone}</Text>
          </View>
        </View>
        {dog.priority && (
          <View
            style={[
              styles.priorityRibbon,
              dog.priority === 'critical'
                ? styles.priorityCritical
                : dog.priority === 'high'
                ? styles.priorityHigh
                : dog.priority === 'normal'
                ? styles.priorityNormal
                : styles.priorityLow,
            ]}
          >
            <Ionicons name="alert-circle" size={14} color="#fff" />
            <Text style={styles.priorityRibbonText}>{dog.priority.toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* Health Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health Status</Text>
        <View style={styles.statusContainer}>
          <StatusBadge 
            label="Vaccinated" 
            isActive={dog.healthStatus?.isVaccinated} 
            color="#3b82f6" 
          />
          <StatusBadge 
            label="Sterilized" 
            isActive={dog.healthStatus?.isSterilized} 
            color="#10b981" 
          />
          <StatusBadge 
            label="Injured" 
            isActive={dog.healthStatus?.isInjured} 
            color="#ef4444" 
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]} 
            onPress={toggleVaccination}
          >
            <Ionicons name="medical" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>
              {dog.healthStatus?.isVaccinated ? 'Unmark Vaccination' : 'Mark Vaccinated'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.successButton]} 
            onPress={toggleSterilization}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>
              {dog.healthStatus?.isSterilized ? 'Unmark Sterilization' : 'Mark Sterilized'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Information</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Estimated Age:</Text>
          <Text style={styles.detailValue}>{dog.estimatedAge || 'Unknown'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Breed:</Text>
          <Text style={styles.detailValue}>{dog.breed || 'Mixed'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status:</Text>
          <Text style={styles.detailValue}>{dog.status || 'Active'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Registered:</Text>
          <Text style={styles.detailValue}>
            {new Date(dog.createdAt).toLocaleDateString()}
          </Text>
        </View>
        
        {dog.reportedBy && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reported by:</Text>
            <Text style={styles.detailValue}>
              {dog.reportedBy.profile?.firstName} {dog.reportedBy.profile?.lastName}
            </Text>
          </View>
        )}
      </View>

      {/* Notes */}
      {dog.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{dog.notes}</Text>
        </View>
      )}

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <Text style={styles.coordinatesText}>
          Coordinates: {dog.location?.coordinates?.[1]?.toFixed(6)}, {dog.location?.coordinates?.[0]?.toFixed(6)}
        </Text>
        {dog.address && (
          <Text style={styles.addressText}>{dog.address}</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  imageContainer: { position: 'relative' },
  dogImage: { width, height: 300 },
  imageIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageIndicatorText: { color: '#fff', fontSize: 12 },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    ...shadow(2),
  },
  priorityRibbon: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  priorityRibbonText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  priorityCritical: { backgroundColor: '#b91c1c' },
  priorityHigh: { backgroundColor: '#ef4444' },
  priorityNormal: { backgroundColor: '#f59e0b' },
  priorityLow: { backgroundColor: '#10b981' },
  dogId: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  basicInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  basicInfoText: { fontSize: 16, color: '#6b7280' },
  locationContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 14, color: '#10b981', fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 },
  statusContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  actionButtons: { gap: 8 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: { backgroundColor: '#3b82f6' },
  successButton: { backgroundColor: '#10b981' },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  detailValue: { fontSize: 14, color: '#111827', fontWeight: '600' },
  notesText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  coordinatesText: { fontSize: 12, color: '#6b7280', fontFamily: 'monospace' },
  addressText: { fontSize: 14, color: '#111827', marginTop: 4 },
});
