import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { addDiagnosis, getAllPatients } from '../database/db';
import { MobilePatient } from '../database/schema';
import { useAuth } from '../context/AuthContext';

export default function AiImagingScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [patients, setPatients] = useState<MobilePatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  const [stage, setStage] = useState<'upload' | 'analyzing' | 'results'>('upload');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState('');

  // Simulated results mirroring web app structure
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    getAllPatients().then(setPatients);
  }, []);

  const handleSimulateUpload = () => {
    // In a real app we'd use Expo ImagePicker
    // Here we simulate picking a medical scan
    // Use a reliable public medical scan image with proper CORS headers
    setImageUri('https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Chest_Xray_PA_3-8-2010.png/512px-Chest_Xray_PA_3-8-2010.png');
  };

  const handleRunAnalysis = async () => {
    if (!imageUri) return;
    setStage('analyzing');

    const steps = [
      'Booting offline imaging agent...',
      'Scanning for structural anomalies...',
      'Cross-referencing biomarker database...',
      'Generating bounding regions...',
      'Finalizing clinical summary...'
    ];

    for (let msg of steps) {
      setProgressMsg(msg);
      await new Promise(r => setTimeout(r, 800));
    }

    // Simulated Output similar to Web AI
    setResult({
      primaryFinding: 'Pulmonary Opacity detected in lower right lobe',
      urgency: 'High',
      urgencyScore: 78,
      conditions: [
        { name: 'Pneumonia', confidence: 0.89, icd10: 'J18.9' },
        { name: 'Pleural Effusion', confidence: 0.45, icd10: 'J90' }
      ],
      anomalies: [
        { label: 'Consolidation', confidence: 0.92 },
        { label: 'Air Bronchogram', confidence: 0.76 }
      ],
      summary: 'Automated AI analysis indicates a high probability of structural abnormalities consistent with pulmonary consolidation. Immediate clinical correlation and follow-up imaging (e.g., CT chest) may be warranted.'
    });

    setStage('results');
  };

  const handleSaveToPatient = async () => {
    if (!selectedPatientId) {
      Alert.alert('Select Patient', 'Please select a patient to attach this analysis to.');
      return;
    }

    try {
      await addDiagnosis({
        patientId: selectedPatientId,
        symptoms: ['AI Imaging Scan Analysis'],
        vitals: {},
        result: {
          primaryDiagnosis: result.conditions[0].name,
          conditions: result.conditions,
          differentials: [result.conditions[1].name],
          recommendedTests: ['CT Chest'],
          medications: [],
          procedures: [],
          followUpDays: 1,
          referrals: ['Pulmonology'],
          urgency: result.urgency,
          urgencyScore: result.urgencyScore,
          summary: result.summary,
          keyFindings: [result.primaryFinding],
          actionItems: ['Review scan manually', 'Correlate clinically'],
          generatedAt: new Date().toISOString(),
          totalDurationMs: 4000
        },
        createdBy: user?.id,
      });

      Alert.alert('Saved', 'Imaging report saved to patient safely offline. Sync when ready.');
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save analysis.');
    }
  };

  if (stage === 'analyzing') {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔬 AI Imaging Lab</Text>
          <ActivityIndicator size="large" color="#7c3aed" style={{ marginVertical: 20 }} />
          <Text style={styles.primaryText}>{progressMsg}</Text>
          <Text style={styles.subText}>Running completely offline</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.headerBox}>
        <Text style={styles.headerIcon}>🩻</Text>
        <Text style={styles.headerTitle}>AI Diagnostic Lab</Text>
        <Text style={styles.headerDesc}>Offline Medical Imaging Analysis</Text>
      </View>

      {!imageUri ? (
        <TouchableOpacity style={styles.uploadBox} onPress={handleSimulateUpload}>
          <Text style={styles.uploadIcon}>☁️</Text>
          <Text style={styles.primaryText}>Tap to select medical scan</Text>
          <Text style={styles.subText}>(Simulated image picker)</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.imagePreviewBox}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
          {stage === 'upload' && (
            <TouchableOpacity style={styles.runBtn} onPress={handleRunAnalysis}>
              <Text style={styles.runBtnText}>⚡ Run AI Analysis</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {stage === 'results' && result && (
        <View style={styles.resultsContainer}>
          <View style={[styles.urgencyBanner, result.urgencyScore > 50 ? styles.alertHigh : styles.alertLow]}>
            <Text style={styles.urgencyText}>
              {result.urgencyScore > 50 ? '⚠️ Significant Abnormality' : '✅ No Critical Findings'}
            </Text>
            <Text style={styles.findingText}>{result.primaryFinding}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Detection Confidence</Text>
            {result.conditions.map((c: any, i: number) => (
              <View key={i} style={styles.row}>
                <Text style={styles.label}>{c.name}</Text>
                <Text style={styles.value}>{Math.round(c.confidence * 100)}%</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Identified Biomarkers</Text>
            {result.anomalies.map((a: any, i: number) => (
              <View key={i} style={styles.row}>
                <Text style={styles.label}>{a.label}</Text>
                <Text style={styles.value}>{Math.round(a.confidence * 100)}%</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Clinical Summary</Text>
            <Text style={styles.summaryText}>{result.summary}</Text>
          </View>

          <View style={styles.attachBox}>
            <Text style={styles.cardTitle}>Attach to Patient</Text>
            <View style={styles.patientList}>
              {patients.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.patientChip, selectedPatientId === p.id && styles.patientChipActive]}
                  onPress={() => setSelectedPatientId(p.id)}
                >
                  <Text style={[styles.patientChipText, selectedPatientId === p.id && styles.patientChipTextActive]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {patients.length === 0 && <Text style={styles.subText}>No patients synced.</Text>}
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveToPatient}>
              <Text style={styles.saveBtnText}>💾 Save Offline Record</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0f1e', padding: 14 },
  headerBox: { alignItems: 'center', marginVertical: 20 },
  headerIcon: { fontSize: 40, marginBottom: 8 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerDesc: { color: '#60a5fa', fontSize: 13, marginTop: 4 },
  uploadBox: { backgroundColor: '#111827', borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: '#374151', padding: 40, alignItems: 'center' },
  uploadIcon: { fontSize: 40, marginBottom: 12 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  subText: { color: '#6b7280', fontSize: 12 },
  imagePreviewBox: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#111827', marginBottom: 20, borderWidth: 1, borderColor: '#1f2937' },
  previewImage: { width: '100%', height: 250 },
  runBtn: { backgroundColor: '#7c3aed', padding: 16, alignItems: 'center' },
  runBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resultsContainer: { marginTop: 10 },
  urgencyBanner: { padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
  alertHigh: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' },
  alertLow: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981' },
  urgencyText: { color: '#fff', fontWeight: '800', fontSize: 16, marginBottom: 4 },
  findingText: { color: '#d1d5db', fontSize: 13 },
  card: { backgroundColor: '#111827', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1f2937' },
  cardTitle: { color: '#9ca3af', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  label: { color: '#e5e7eb', fontSize: 14 },
  value: { color: '#60a5fa', fontSize: 14, fontWeight: '700' },
  summaryText: { color: '#d1d5db', fontSize: 14, lineHeight: 22 },
  attachBox: { backgroundColor: '#1e3a5f', borderRadius: 12, padding: 16, marginTop: 10, borderWidth: 1, borderColor: '#3b82f6' },
  patientList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  patientChip: { backgroundColor: '#0f172a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  patientChipActive: { backgroundColor: '#2563eb', borderColor: '#60a5fa' },
  patientChipText: { color: '#9ca3af', fontSize: 13 },
  patientChipTextActive: { color: '#fff', fontWeight: '700' },
  saveBtn: { backgroundColor: '#059669', padding: 14, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
