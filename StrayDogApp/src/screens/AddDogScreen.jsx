import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, FlatList } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function AddDogScreen({ navigation }) {
  const [dogData, setDogData] = useState({ size: '', color: '', gender: '', notes: '', zone: '' });
  const [coords, setCoords] = useState(null); // { latitude, longitude }
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState([]); // array of local URIs
  const [uploadProgress, setUploadProgress] = useState({}); // index -> 0-100
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({});
        setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!dogData.size) return Alert.alert('Validation', 'Please enter size');
    if (!coords) return Alert.alert('Location', 'Location not available yet');
    if (!dogData.zone) return Alert.alert('Validation', 'Please enter zone');

    setSubmitting(true);
    try {
      // 1) Upload images if any
      let uploadedImages = [];
      if (images.length > 0) {
        setUploading(true);
        setUploadProgress({});
        // Upload in a single batch but still track progress overall using axios onUploadProgress
        const form = new FormData();
        images.forEach((uri, idx) => {
          const name = uri.split('/').pop() || `photo_${idx}.jpg`;
            const ext = name.split('.').pop()?.toLowerCase();
            const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
            form.append('images', { uri, name, type });
            // initialize progress
            setUploadProgress(p => ({ ...p, [idx]: 0 }));
        });

        try {
          const uploadRes = await api.post('/uploads/images', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (e) => {
              if (!e.total) return;
              const percent = Math.round((e.loaded / e.total) * 100);
              // apply same percent to all images (single multipart request)
              setUploadProgress(p => {
                const updated = { ...p };
                images.forEach((_, idx) => { updated[idx] = percent; });
                return updated;
              });
            }
          });
          uploadedImages = uploadRes.data.data || [];
        } catch (err) {
          Alert.alert('Upload Failed', 'Could not upload images. You can retry or continue without images.');
          return; // abort submit if upload fails
        } finally {
          setUploading(false);
        }
      }

      // 2) Create dog with uploaded image metadata
      const payload = {
        size: dogData.size,
        color: dogData.color || undefined,
        gender: dogData.gender || undefined,
        notes: dogData.notes || undefined,
        zone: dogData.zone,
        coordinates: [coords.longitude, coords.latitude],
        images: uploadedImages,
      };
      const res = await api.post('/dogs', payload);
      Alert.alert('Success', 'Dog registered successfully');
      navigation.navigate('Home');
    } catch (e) {
      console.log(e?.response?.data || e.message);
      Alert.alert('Error', e?.response?.data?.message || 'Failed to register dog');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {/* Photos Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photos</Text>
        <View style={styles.photoContainer}>
          <FlatList
            data={images}
            horizontal
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item, index }) => (
              <View style={styles.imageWrapper}>
                <Image source={{ uri: item }} style={styles.photo} />
                {uploading && (
                  <View style={styles.progressOverlay}>
                    <Text style={styles.progressText}>{uploadProgress[index] || 0}%</Text>
                  </View>
                )}
                <TouchableOpacity 
                  style={styles.removeButton} 
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}
            ListFooterComponent={
              <View style={styles.photoActions}>
                <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                  <Ionicons name="camera" size={24} color="#3b82f6" />
                  <Text style={styles.photoButtonText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                  <Ionicons name="images" size={24} color="#3b82f6" />
                  <Text style={styles.photoButtonText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      </View>

      {/* Location Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.locationInfo}>
          <Ionicons name="location" size={20} color="#10b981" />
          <Text style={styles.locationText}>
            {coords ? `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}` : 'Getting location...'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dog Details</Text>
        <TextInput placeholder="Size (small/medium/large)" style={styles.input} value={dogData.size} onChangeText={(t)=>setDogData(s=>({ ...s, size: t }))} />
        <TextInput placeholder="Color" style={styles.input} value={dogData.color} onChangeText={(t)=>setDogData(s=>({ ...s, color: t }))} />
        <TextInput placeholder="Gender" style={styles.input} value={dogData.gender} onChangeText={(t)=>setDogData(s=>({ ...s, gender: t }))} />
        <TextInput placeholder="Zone (e.g., Zone 7)" style={styles.input} value={dogData.zone} onChangeText={(t)=>setDogData(s=>({ ...s, zone: t }))} />
        <TextInput placeholder="Notes" style={[styles.input, { height: 100 }]} value={dogData.notes} onChangeText={(t)=>setDogData(s=>({ ...s, notes: t }))} multiline />
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting || uploading}>
        <Text style={styles.submitText}>{submitting ? 'Saving…' : uploading ? 'Uploading…' : 'Save'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  section: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  photoContainer: { marginTop: 8 },
  imageWrapper: { position: 'relative', marginRight: 8 },
  photo: { width: 80, height: 80, borderRadius: 8 },
  progressOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  progressText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  removeButton: { position: 'absolute', top: -8, right: -8 },
  photoActions: { flexDirection: 'column', gap: 8, marginLeft: 8 },
  photoButton: { 
    alignItems: 'center', 
    padding: 12, 
    borderWidth: 2, 
    borderColor: '#3b82f6', 
    borderRadius: 8, 
    borderStyle: 'dashed',
    width: 80,
    height: 80,
    justifyContent: 'center'
  },
  photoButtonText: { fontSize: 10, color: '#3b82f6', marginTop: 4 },
  locationInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    padding: 12, 
    backgroundColor: '#f0fdf4', 
    borderRadius: 8 
  },
  locationText: { fontSize: 14, color: '#166534' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginBottom: 8, backgroundColor: '#fff' },
  submitButton: { backgroundColor: '#10b981', padding: 14, borderRadius: 10, margin: 16, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '700' }
});
