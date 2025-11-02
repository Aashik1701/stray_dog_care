import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, FlatList, Switch, ActivityIndicator, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

// Voice is a native module requiring dev client
let Voice = null;
try {
  Voice = require('@react-native-voice/voice').default;
} catch (e) {
  console.log('Voice module not available - requires dev client build');
}

export default function AddDogScreen({ navigation }) {
  const [dogData, setDogData] = useState({ size: '', color: '', gender: '', notes: '', zone: '' });
  const [coords, setCoords] = useState(null); // { latitude, longitude }
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState([]); // array of local URIs
  const [uploadProgress, setUploadProgress] = useState({}); // index -> 0-100
  const [uploading, setUploading] = useState(false);
  const [aiAutofill, setAiAutofill] = useState(true);
  const [nlpLoading, setNlpLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechRecognized, setSpeechRecognized] = useState('');
  const [speechError, setSpeechError] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en-IN');
  
  const supportedLanguages = [
    { code: 'en-IN', name: 'English (India)' },
    { code: 'hi-IN', name: 'हिंदी' },
    { code: 'bn-IN', name: 'বাংলা' },
    { code: 'te-IN', name: 'తెలుగు' },
    { code: 'mr-IN', name: 'मराठी' },
    { code: 'ta-IN', name: 'தமிழ்' },
    { code: 'gu-IN', name: 'ગુજરાતી' },
    { code: 'kn-IN', name: 'ಕನ್ನಡ' },
    { code: 'ml-IN', name: 'മലയാളം' },
    { code: 'pa-IN', name: 'ਪੰਜਾਬੀ' },
  ];

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

    // Setup Voice recognition only if available
    if (Voice) {
      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;

      return () => {
        Voice.destroy().then(Voice.removeAllListeners);
      };
    }
  }, []);

  const onSpeechStart = () => {
    setIsRecording(true);
    setSpeechError('');
  };

  const onSpeechEnd = () => {
    setIsRecording(false);
  };

  const onSpeechResults = (e) => {
    if (e.value && e.value.length > 0) {
      const recognizedText = e.value[0];
      setSpeechRecognized(recognizedText);
      // Append recognized text to existing notes
      setDogData(prev => ({
        ...prev,
        notes: prev.notes ? prev.notes + ' ' + recognizedText : recognizedText
      }));
    }
  };

  const onSpeechError = (e) => {
    setIsRecording(false);
    setSpeechError(e.error);
    Alert.alert('Speech Recognition Error', e.error || 'Failed to recognize speech');
  };

  const startRecording = async () => {
    if (!Voice) {
      Alert.alert(
        'Voice Not Available',
        'Speech recognition requires a development build. Please run: npx expo prebuild && npx expo run:ios (or run:android)',
        [{ text: 'OK' }]
      );
      return;
    }
    try {
      await Voice.start(selectedLanguage);
    } catch (error) {
      console.error('Speech recognition error:', error);
      Alert.alert('Error', 'Failed to start speech recognition');
    }
  };

  const stopRecording = async () => {
    if (!Voice) return;
    try {
      await Voice.stop();
    } catch (error) {
      console.error('Speech stop error:', error);
    }
  };

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

  const handlePreview = async () => {
    if (!aiAutofill) return;
    if (!dogData.notes || dogData.notes.trim().length < 8) {
      return Alert.alert('Add notes', 'Please enter a bit more detail for AI analysis.');
    }
    try {
      setPreviewLoading(true);
      const { data } = await api.post('/nlp/analyze-report', { text: dogData.notes, language: 'en' });
      setPreview(data?.data || null);
    } catch (e) {
      console.log('AI preview failed', e?.response?.data || e.message);
      const errorMessage = e?.response?.data?.message || e?.message || 'Could not analyze at the moment.';
      
      // Check if it's a circuit open or service unavailable error
      const isServiceUnavailable = errorMessage.includes('circuit open') || 
                                   errorMessage.includes('service unavailable') ||
                                   errorMessage.includes('not be running') ||
                                   errorMessage.includes('not running') ||
                                   e?.response?.data?.code === 'NLP_CIRCUIT_OPEN';
      
      if (isServiceUnavailable) {
        Alert.alert(
          'AI Service Unavailable', 
          'The NLP service is not running or unavailable. Please ensure the NLP service is started, or continue without AI features.',
          [
            { text: 'Continue without AI', style: 'cancel' },
            { text: 'Try Again', onPress: () => setTimeout(() => handlePreview(), 500) }
          ]
        );
      } else {
        Alert.alert('AI unavailable', `${errorMessage} You can still save without AI.`);
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!dogData.size) return Alert.alert('Validation', 'Please enter size');
    if (!coords) return Alert.alert('Location', 'Location not available yet');
    if (!dogData.zone) return Alert.alert('Validation', 'Please enter zone');
    if (aiAutofill && !dogData.notes) return Alert.alert('Notes required', 'Please add some notes to auto-fill with AI.');

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
        // Keep root-level notes for backward compatibility
        notes: dogData.notes || undefined,
        // Provide notes to healthStatus for NLP pipeline
        healthStatus: dogData.notes ? { notes: dogData.notes } : undefined,
        zone: dogData.zone,
        coordinates: [coords.longitude, coords.latitude],
        images: uploadedImages,
      };
      // If AI autofill is enabled and notes are provided, use NLP-assisted endpoint
      const useNLP = aiAutofill && !!dogData.notes;
      const endpoint = useNLP ? '/dogs/nlp' : '/dogs';
      if (useNLP) setNlpLoading(true);
      const res = await api.post(endpoint, payload);
      Alert.alert('Success', 'Dog registered successfully');
      navigation.navigate('Home');
    } catch (e) {
      console.log(e?.response?.data || e.message);
      Alert.alert('Error', e?.response?.data?.message || 'Failed to register dog');
    } finally {
      setSubmitting(false);
      setNlpLoading(false);
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
        {/* AI Autofill Toggle */}
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Auto-fill with AI</Text>
            <Text style={styles.toggleHint}>Use your notes to analyze and set priority and health insights.</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Switch value={aiAutofill} onValueChange={setAiAutofill} />
            {nlpLoading && (
              <View style={styles.aiProgress}>
                <ActivityIndicator size="small" color="#10b981" />
                <Text style={styles.aiProgressText}>Analyzing…</Text>
              </View>
            )}
          </View>
        </View>
        <TextInput placeholder="Size (small/medium/large)" style={styles.input} value={dogData.size} onChangeText={(t)=>setDogData(s=>({ ...s, size: t }))} />
        <TextInput placeholder="Color" style={styles.input} value={dogData.color} onChangeText={(t)=>setDogData(s=>({ ...s, color: t }))} />
        <TextInput placeholder="Gender" style={styles.input} value={dogData.gender} onChangeText={(t)=>setDogData(s=>({ ...s, gender: t }))} />
        <TextInput placeholder="Zone (e.g., Zone 7)" style={styles.input} value={dogData.zone} onChangeText={(t)=>setDogData(s=>({ ...s, zone: t }))} />
        {/* Zone suggestions from AI */}
        {!!(aiAutofill && preview?.entities?.locations?.length) && (
          <View style={styles.suggestionRow}>
            <Text style={styles.suggestionLabel}>Suggestions:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {preview.entities.locations.slice(0, 4).map((loc, idx) => (
                <TouchableOpacity key={idx} style={styles.chip} onPress={() => setDogData(s => ({ ...s, zone: loc }))}>
                  <Text style={styles.chipText}>{loc}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        {/* Language Selector */}
        <View style={styles.languageSelector}>
          <Text style={styles.languageLabel}>Speech Language:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.languageScroll}>
            {supportedLanguages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageChip,
                  selectedLanguage === lang.code && styles.languageChipSelected
                ]}
                onPress={() => setSelectedLanguage(lang.code)}
              >
                <Text style={[
                  styles.languageChipText,
                  selectedLanguage === lang.code && styles.languageChipTextSelected
                ]}>
                  {lang.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={styles.notesContainer}>
          <TextInput 
            placeholder="Notes about the dog (tap mic to speak)" 
            style={[styles.notesInput, { height: 100 }]} 
            value={dogData.notes} 
            onChangeText={(t)=>setDogData(s=>({ ...s, notes: t }))} 
            multiline 
            textAlignVertical="top"
          />
          <TouchableOpacity 
            style={[styles.micButton, isRecording && styles.micButtonRecording]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={Platform.OS === 'web' || !Voice}
          >
            <Ionicons 
              name={isRecording ? "stop-circle" : "mic"} 
              size={24} 
              color={isRecording ? "#ef4444" : (!Voice ? "#9ca3af" : "#3b82f6")} 
            />
          </TouchableOpacity>
        </View>
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <ActivityIndicator size="small" color="#ef4444" />
            <Text style={styles.recordingText}>Listening... Speak now</Text>
          </View>
        )}
        {!Voice && Platform.OS !== 'web' && (
          <View style={styles.voiceUnavailableNotice}>
            <Ionicons name="information-circle" size={16} color="#f59e0b" />
            <Text style={styles.voiceUnavailableText}>
              Voice requires dev build: npx expo prebuild
            </Text>
          </View>
        )}
        {speechError ? (
          <Text style={styles.errorText}>Speech Error: {speechError}</Text>
        ) : null}
        {aiAutofill && (
          <TouchableOpacity style={styles.previewButton} onPress={handlePreview} disabled={previewLoading}>
            {previewLoading ? (
              <>
                <ActivityIndicator size="small" color="#111827" />
                <Text style={styles.previewButtonText}>Generating preview…</Text>
              </>
            ) : (
              <Text style={styles.previewButtonText}>Preview with AI</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Compact AI preview card */}
        {aiAutofill && preview && (
          <View style={styles.previewCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.previewTitle}>AI Summary</Text>
              <View style={[styles.badge, getUrgencyStyle(preview.urgency_score ?? preview.urgency)]}>
                <Text style={styles.badgeText}>{formatUrgency(preview.urgency_score ?? preview.urgency)}</Text>
              </View>
            </View>
            <Text style={styles.previewText}>{preview.summary}</Text>
            <View style={styles.previewMeta}>
              <View style={styles.metaItem}>
                <Text style={styles.metaKey}>Category: </Text>
                <Text style={styles.metaVal}>{preview.category}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaKey}>Sentiment: </Text>
                <Text style={styles.metaVal}>{preview.sentiment}</Text>
              </View>
            </View>
            {!!(preview.entities?.symptoms?.length) && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.suggestionLabel}>Symptoms:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {preview.entities.symptoms.slice(0,6).map((s, i) => (
                    <View key={i} style={[styles.chip, { backgroundColor: '#f3f4f6' }]}>
                      <Text style={[styles.chipText, { color: '#374151' }]}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting || uploading}>
        <Text style={styles.submitText}>{submitting ? 'Saving…' : uploading ? 'Uploading…' : 'Save'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function getUrgencyStyle(u) {
  const v = typeof u === 'number' ? u : 0;
  if (v >= 0.85) return { backgroundColor: '#fee2e2' }; // red-100
  if (v >= 0.7) return { backgroundColor: '#ffedd5' }; // orange-100
  if (v >= 0.4) return { backgroundColor: '#dbeafe' }; // sky-100
  return { backgroundColor: '#f3f4f6' }; // gray-100
}

function formatUrgency(u) {
  const v = Math.round(((u ?? 0) * 100));
  if (u >= 0.85) return `Critical · ${v}%`;
  if (u >= 0.7) return `High · ${v}%`;
  if (u >= 0.4) return `Normal · ${v}%`;
  return `Low · ${v}%`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  section: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  toggleTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  toggleHint: { fontSize: 12, color: '#6b7280' },
  aiProgress: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiProgressText: { fontSize: 12, color: '#10b981', fontWeight: '600' },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  suggestionLabel: { fontSize: 12, color: '#6b7280', marginRight: 6 },
  chip: { backgroundColor: '#e0f2fe', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginRight: 6 },
  chipText: { color: '#0369a1', fontSize: 12, fontWeight: '600' },
  previewButton: { flexDirection: 'row', gap: 8, alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#e5e7eb', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginTop: 6 },
  previewButtonText: { color: '#111827', fontWeight: '700' },
  previewCard: { marginTop: 10, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12 },
  previewTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  previewText: { marginTop: 6, fontSize: 13, color: '#374151' },
  previewMeta: { marginTop: 8, flexDirection: 'row', gap: 12 },
  metaItem: { flexDirection: 'row', gap: 4 },
  metaKey: { fontSize: 12, color: '#6b7280' },
  metaVal: { fontSize: 12, color: '#111827', fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
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
  languageSelector: { marginBottom: 12 },
  languageLabel: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 6 },
  languageScroll: { marginBottom: 4 },
  languageChip: { backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginRight: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  languageChipSelected: { backgroundColor: '#dbeafe', borderColor: '#3b82f6' },
  languageChipText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  languageChipTextSelected: { color: '#1d4ed8' },
  notesContainer: { flexDirection: 'row', position: 'relative', marginBottom: 8 },
  notesInput: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, paddingRight: 50, backgroundColor: '#fff' },
  micButton: { position: 'absolute', right: 10, top: 10, padding: 8, borderRadius: 20, backgroundColor: '#f0f9ff' },
  micButtonRecording: { backgroundColor: '#fee2e2' },
  recordingIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, padding: 8, backgroundColor: '#fee2e2', borderRadius: 8 },
  recordingText: { fontSize: 14, color: '#dc2626', fontWeight: '600' },
  voiceUnavailableNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, padding: 8, backgroundColor: '#fef3c7', borderRadius: 8 },
  voiceUnavailableText: { fontSize: 12, color: '#92400e', flex: 1 },
  errorText: { fontSize: 12, color: '#dc2626', marginBottom: 8 },
  submitButton: { backgroundColor: '#10b981', padding: 14, borderRadius: 10, margin: 16, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '700' }
});
