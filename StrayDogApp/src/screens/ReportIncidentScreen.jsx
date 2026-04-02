import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
];

function safeFormatUrgency(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return value.toFixed(2);
}

export default function ReportIncidentScreen() {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('en');
  const [recording, setRecording] = useState(null);
  const [audioUri, setAudioUri] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultMeta, setResultMeta] = useState(null);

  const canSubmit = useMemo(() => {
    return !!text.trim() || !!audioUri;
  }, [text, audioUri]);

  useEffect(() => {
    return () => {
      if (recording) {
        try {
          recording.stopAndUnloadAsync();
        } catch {
          // no-op
        }
      }
    };
  }, [recording]);

  const requestMicPermission = async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission needed', 'Microphone permission is required to record audio reports.');
      return false;
    }
    return true;
  };

  const startRecording = async () => {
    if (isRecording) return;

    try {
      const ok = await requestMicPermission();
      if (!ok) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();

      setRecording(rec);
      setAudioUri('');
      setIsRecording(true);
    } catch (e) {
      console.error('Failed to start recording:', e);
      Alert.alert('Recording failed', 'Could not start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording || !isRecording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI() || '';
      setAudioUri(uri);
    } catch (e) {
      console.error('Failed to stop recording:', e);
      Alert.alert('Recording failed', 'Could not stop recording cleanly.');
    } finally {
      setRecording(null);
      setIsRecording(false);
    }
  };

  const clearAudio = () => {
    setAudioUri('');
  };

  const submitReport = async () => {
    if (!canSubmit || submitting) {
      if (!canSubmit) {
        Alert.alert('Missing input', 'Add text or record audio before submitting.');
      }
      return;
    }

    setSubmitting(true);
    setResultMeta(null);

    try {
      let response;

      if (audioUri) {
        const form = new FormData();
        if (text.trim()) form.append('text', text.trim());
        form.append('language', language);
        form.append('audio', {
          uri: audioUri,
          name: `report-${Date.now()}.m4a`,
          type: 'audio/m4a',
        });

        response = await api.post('/reports', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        response = await api.post('/reports', {
          text: text.trim(),
          language,
        });
      }

      const report = response?.data?.data || {};
      const meta = response?.data?.meta || {};
      const urgency =
        typeof meta.urgency_score === 'number'
          ? meta.urgency_score
          : (typeof report.urgency_score === 'number' ? report.urgency_score : null);
      const duplicateDetected = !!(meta.duplicate_detected || report.duplicate_of);

      const nextMeta = {
        reportId: report?._id || null,
        urgency,
        duplicateDetected,
        asrFallback: !!meta?.asr?.fallback,
      };
      setResultMeta(nextMeta);

      const lines = ['Report submitted successfully.'];
      const formattedUrgency = safeFormatUrgency(urgency);
      if (formattedUrgency !== null) lines.push(`Urgency score: ${formattedUrgency}`);
      if (duplicateDetected) lines.push('Potential duplicate detected.');
      if (meta?.asr?.fallback) lines.push('ASR fallback was used for this audio.');

      Alert.alert('Submitted', lines.join('\n'));
      setText('');
      setAudioUri('');
      setRecording(null);
      setIsRecording(false);
    } catch (e) {
      console.error('Failed to submit report:', e?.response?.data || e?.message || e);
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Could not submit report.';
      Alert.alert('Submission failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Report Incident</Text>
      <Text style={styles.subtitle}>
        Submit a field report with text and optional audio. Audio is transcribed using backend ASR.
      </Text>

      <View style={styles.section}>
        <Text style={styles.label}>Report Text</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={5}
          style={styles.textArea}
          placeholder="Describe what you observed"
          textAlignVertical="top"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Language</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {LANGUAGE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.code}
              style={[styles.languageChip, language === opt.code && styles.languageChipActive]}
              onPress={() => setLanguage(opt.code)}
            >
              <Text style={[styles.languageChipText, language === opt.code && styles.languageChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Audio</Text>
        <View style={styles.audioRow}>
          {!isRecording ? (
            <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
              <Ionicons name="mic" size={20} color="#fff" />
              <Text style={styles.recordButtonText}>Start Recording</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.recordButton, styles.stopButton]} onPress={stopRecording}>
              <Ionicons name="stop" size={20} color="#fff" />
              <Text style={styles.recordButtonText}>Stop Recording</Text>
            </TouchableOpacity>
          )}
        </View>

        {isRecording && (
          <View style={styles.recordingIndicator}>
            <ActivityIndicator size="small" color="#ef4444" />
            <Text style={styles.recordingText}>Recording in progress...</Text>
          </View>
        )}

        {!!audioUri && (
          <View style={styles.audioInfoCard}>
            <Text style={styles.audioInfoTitle}>Audio attached</Text>
            <Text style={styles.audioInfoPath}>{audioUri.split('/').pop()}</Text>
            <TouchableOpacity onPress={clearAudio} style={styles.clearAudioBtn}>
              <Text style={styles.clearAudioText}>Remove audio</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!!resultMeta && (
        <View style={[styles.section, styles.resultCard, resultMeta.duplicateDetected && styles.warningCard]}>
          <Text style={styles.resultTitle}>Latest Submission</Text>
          <Text style={styles.resultLine}>Report ID: {resultMeta.reportId || 'N/A'}</Text>
          <Text style={styles.resultLine}>
            Urgency: {safeFormatUrgency(resultMeta.urgency) ?? 'N/A'}
          </Text>
          <Text style={[styles.resultLine, resultMeta.duplicateDetected && styles.warningText]}>
            Duplicate: {resultMeta.duplicateDetected ? 'Potential duplicate detected' : 'No duplicate flagged'}
          </Text>
          <Text style={styles.resultLine}>
            ASR fallback: {resultMeta.asrFallback ? 'Yes' : 'No'}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitButton, (!canSubmit || submitting) && styles.submitButtonDisabled]}
        onPress={submitReport}
        disabled={!canSubmit || submitting}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="send" size={18} color="#fff" />
            <Text style={styles.submitButtonText}>Submit Report</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 18,
    lineHeight: 20,
  },
  section: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  languageChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  languageChipActive: {
    borderColor: '#0ea5e9',
    backgroundColor: '#e0f2fe',
  },
  languageChipText: {
    color: '#334155',
    fontWeight: '500',
  },
  languageChipTextActive: {
    color: '#0369a1',
    fontWeight: '700',
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  stopButton: {
    backgroundColor: '#dc2626',
  },
  recordButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  recordingIndicator: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingText: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  audioInfoCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#d1fae5',
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    padding: 10,
  },
  audioInfoTitle: {
    color: '#065f46',
    fontWeight: '700',
    marginBottom: 4,
  },
  audioInfoPath: {
    color: '#065f46',
    fontSize: 13,
  },
  clearAudioBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  clearAudioText: {
    color: '#991b1b',
    fontWeight: '600',
  },
  resultCard: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  warningCard: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e3a8a',
    marginBottom: 8,
  },
  resultLine: {
    color: '#1e293b',
    marginBottom: 4,
  },
  warningText: {
    color: '#991b1b',
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
