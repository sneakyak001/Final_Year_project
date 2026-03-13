import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { runDiagnosisEngine } from '../engine/diagnosisEngine';
import { addDiagnosis, getPatientById } from '../database/db';
import { DiagnosisResult, MobilePatient } from '../database/schema';
import { useAuth } from '../context/AuthContext';

const COMMON_SYMPTOMS = [
  'Fever', 'Cough', 'Chest Pain', 'Shortness of breath', 'Headache',
  'Nausea', 'Vomiting', 'Diarrhea', 'Fatigue', 'Dizziness',
  'Abdominal pain', 'Back pain', 'Joint pain', 'Swelling', 'Palpitations',
  'Loss of appetite', 'Wheezing', 'Chills', 'Sweating', 'Burning urination',
  'Blurred vision', 'Confusion', 'Numbness', 'Rash', 'Bleeding',
];

type Stage = 'symptoms' | 'vitals' | 'running' | 'results';

export default function DiagnoseScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const patientId = route.params?.patientId;
  const [patient, setPatient] = useState<MobilePatient | null>(null);

  const [stage, setStage] = useState<Stage>('symptoms');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptoms, setCustomSymptoms] = useState('');
  const [vitals, setVitals] = useState({
    temperature: '',
    heartRate: '',
    spo2: '',
    systolicBP: '',
    diastolicBP: '',
    respiratoryRate: '',
  });
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [runProgress, setRunProgress] = useState<string[]>([]);

  useEffect(() => {
    if (patientId) getPatientById(patientId).then(p => setPatient(p || null));
  }, [patientId]);

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const handleRunDiagnosis = async () => {
    const allSymptoms = [
      ...selectedSymptoms,
      ...customSymptoms.split(',').map(s => s.trim()).filter(Boolean),
    ];

    if (allSymptoms.length === 0) {
      Alert.alert('No symptoms', 'Please select at least one symptom.');
      return;
    }

    setStage('running');
    const steps = [
      '🔍 Analysing symptom patterns...',
      '❤️ Evaluating vitals...',
      '🧬 Running differential diagnosis...',
      '💊 Generating treatment plan...',
      '⚡ Computing triage urgency...',
      '📝 Generating AI summary...',
    ];

    // Show progress messages
    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 300));
      setRunProgress(prev => [...prev, steps[i]]);
    }

    const parsedVitals = {
      temperature: vitals.temperature ? parseFloat(vitals.temperature) : undefined,
      heartRate: vitals.heartRate ? parseFloat(vitals.heartRate) : undefined,
      spo2: vitals.spo2 ? parseFloat(vitals.spo2) : undefined,
      systolicBP: vitals.systolicBP ? parseFloat(vitals.systolicBP) : undefined,
      diastolicBP: vitals.diastolicBP ? parseFloat(vitals.diastolicBP) : undefined,
      respiratoryRate: vitals.respiratoryRate ? parseFloat(vitals.respiratoryRate) : undefined,
    };

    const diagResult = await runDiagnosisEngine({
      symptoms: allSymptoms,
      vitals: parsedVitals,
      age: patient?.age,
      gender: patient?.gender,
      existingCondition: patient?.condition,
    });

    setResult(diagResult);

    // Save to DB if patient linked
    if (patientId) {
      await addDiagnosis({
        patientId,
        symptoms: allSymptoms,
        vitals: parsedVitals,
        result: diagResult,
        createdBy: user?.id,
      });
    }

    setStage('results');
  };

  const getUrgencyColor = (u: string) =>
    u === 'Critical' ? '#ef4444' : u === 'Urgent' ? '#f59e0b' : u === 'Moderate' ? '#3b82f6' : '#10b981';

  // ── SYMPTOMS STAGE ─────────────────────────────────────────────────────────
  if (stage === 'symptoms') return (
    <ScrollView style={styles.screen}>
      <Text style={styles.stageHeader}>Step 1 of 2: Select Symptoms</Text>
      {patient && (
        <View style={styles.patientBanner}>
          <Text style={styles.patientBannerText}>Patient: {patient.name} • {patient.age}yr • {patient.condition}</Text>
        </View>
      )}

      <Text style={styles.label}>Common Symptoms (tap to select)</Text>
      <View style={styles.symptomsGrid}>
        {COMMON_SYMPTOMS.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.symptomChip, selectedSymptoms.includes(s) && styles.symptomChipActive]}
            onPress={() => toggleSymptom(s)}
          >
            <Text style={[styles.symptomText, selectedSymptoms.includes(s) && styles.symptomTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Additional Symptoms (comma separated)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. eye redness, jaw pain, ..."
        placeholderTextColor="#4b5563"
        value={customSymptoms}
        onChangeText={setCustomSymptoms}
        multiline
      />

      <Text style={styles.selectedCount}>{selectedSymptoms.length} symptoms selected</Text>

      <TouchableOpacity style={styles.nextBtn} onPress={() => setStage('vitals')}>
        <Text style={styles.nextBtnText}>Next: Enter Vitals →</Text>
      </TouchableOpacity>
      <View style={{ height: 80 }} />
    </ScrollView>
  );

  // ── VITALS STAGE ───────────────────────────────────────────────────────────
  if (stage === 'vitals') return (
    <ScrollView style={styles.screen}>
      <Text style={styles.stageHeader}>Step 2 of 2: Vitals (optional)</Text>

      {[
        { key: 'temperature', label: 'Temperature (°C)', hint: 'e.g. 38.5' },
        { key: 'heartRate', label: 'Heart Rate (bpm)', hint: 'e.g. 92' },
        { key: 'spo2', label: 'SpO2 (%)', hint: 'e.g. 97' },
        { key: 'systolicBP', label: 'Systolic BP (mmHg)', hint: 'e.g. 130' },
        { key: 'diastolicBP', label: 'Diastolic BP (mmHg)', hint: 'e.g. 85' },
        { key: 'respiratoryRate', label: 'Respiratory Rate (/min)', hint: 'e.g. 18' },
      ].map(field => (
        <View key={field.key}>
          <Text style={styles.label}>{field.label}</Text>
          <TextInput
            style={styles.input}
            placeholder={field.hint}
            placeholderTextColor="#4b5563"
            keyboardType="numeric"
            value={(vitals as any)[field.key]}
            onChangeText={v => setVitals(prev => ({ ...prev, [field.key]: v }))}
          />
        </View>
      ))}

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStage('symptoms')}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.runBtn} onPress={handleRunDiagnosis}>
          <Text style={styles.runBtnText}>🩺 Run AI Diagnosis</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 80 }} />
    </ScrollView>
  );

  // ── RUNNING STAGE ──────────────────────────────────────────────────────────
  if (stage === 'running') return (
    <View style={[styles.screen, styles.centerContent]}>
      <View style={styles.runningCard}>
        <Text style={styles.runningTitle}>🤖 AI Analysis Running</Text>
        <Text style={styles.runningSubtitle}>Offline Diagnosis Engine Active</Text>
        <ActivityIndicator color="#7c3aed" size="large" style={{ marginVertical: 20 }} />
        {runProgress.map((msg, i) => (
          <Text key={i} style={styles.progressMsg}>{msg}</Text>
        ))}
      </View>
    </View>
  );

  // ── RESULTS STAGE ──────────────────────────────────────────────────────────
  if (stage === 'results' && result) return (
    <ScrollView style={styles.screen}>
      {/* Urgency Banner */}
      <View style={[styles.urgencyBanner, { borderColor: getUrgencyColor(result.urgency) }]}>
        <Text style={styles.urgencyLabel}>TRIAGE URGENCY</Text>
        <Text style={[styles.urgencyValue, { color: getUrgencyColor(result.urgency) }]}>
          {result.urgency}
        </Text>
        <View style={styles.scoreBar}>
          <View style={[styles.scoreBarFill, { width: `${result.urgencyScore}%` as any, backgroundColor: getUrgencyColor(result.urgency) }]} />
        </View>
        <Text style={[styles.urgencyScore, { color: getUrgencyColor(result.urgency) }]}>
          Score: {result.urgencyScore}/100
        </Text>
      </View>

      {/* Primary Diagnosis */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Primary Diagnosis</Text>
        <Text style={styles.primaryDx}>{result.primaryDiagnosis}</Text>
        <Text style={styles.icd10}>
          ICD-10: {result.conditions[0]?.icd10 || 'N/A'} • Confidence: {Math.round((result.conditions[0]?.confidence || 0) * 100)}%
        </Text>
      </View>

      {/* Differential Diagnoses */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Differential Diagnoses</Text>
        {result.conditions.map((c, i) => (
          <View key={i} style={styles.conditionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.condName}>{c.name}</Text>
              <Text style={styles.condIcd}>{c.icd10}</Text>
            </View>
            <View style={styles.confidenceBar}>
              <View style={[styles.confidenceFill, { width: `${c.confidence * 100}%` as any }]} />
              <Text style={styles.confidenceText}>{Math.round(c.confidence * 100)}%</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Recommended Tests */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔬 Recommended Tests</Text>
        {result.recommendedTests.map((t, i) => (
          <Text key={i} style={styles.listItem}>• {t}</Text>
        ))}
      </View>

      {/* Medications */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💊 Medications</Text>
        {result.medications.map((m, i) => (
          <View key={i} style={styles.medCard}>
            <Text style={styles.medName}>{m.name}</Text>
            <Text style={styles.medDose}>{m.dosage} | {m.frequency} | {m.duration}</Text>
          </View>
        ))}
      </View>

      {/* Procedures */}
      {result.procedures.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏥 Procedures</Text>
          {result.procedures.map((p, i) => <Text key={i} style={styles.listItem}>• {p}</Text>)}
        </View>
      )}

      {/* Referrals */}
      {result.referrals.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Referrals</Text>
          {result.referrals.map((r, i) => <Text key={i} style={styles.listItem}>• {r}</Text>)}
        </View>
      )}

      {/* Key Findings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔭 Key Findings</Text>
        {result.keyFindings.map((f, i) => <Text key={i} style={styles.listItem}>• {f}</Text>)}
      </View>

      {/* Action Items */}
      <View style={[styles.card, { borderColor: '#2563eb' }]}>
        <Text style={styles.cardTitle}>✅ Action Items</Text>
        {result.actionItems.map((a, i) => <Text key={i} style={[styles.listItem, { color: '#60a5fa' }]}>→ {a}</Text>)}
      </View>

      {/* Summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📝 AI Summary</Text>
        <Text style={styles.summaryText}>{result.summary}</Text>
        <Text style={styles.disclaimer}>⚠️ AI-generated. Always consult a qualified clinician.</Text>
      </View>

      <TouchableOpacity style={styles.newBtn} onPress={() => {
        setStage('symptoms');
        setSelectedSymptoms([]);
        setCustomSymptoms('');
        setVitals({ temperature: '', heartRate: '', spo2: '', systolicBP: '', diastolicBP: '', respiratoryRate: '' });
        setRunProgress([]);
        setResult(null);
      }}>
        <Text style={styles.newBtnText}>🔄 New Diagnosis</Text>
      </TouchableOpacity>

      <View style={{ height: 80 }} />
    </ScrollView>
  );

  return null;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0f1e', padding: 14 },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  stageHeader: { color: '#60a5fa', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  patientBanner: { backgroundColor: '#1e3a5f', borderRadius: 10, padding: 10, marginBottom: 12 },
  patientBannerText: { color: '#60a5fa', fontSize: 12 },
  label: { color: '#9ca3af', fontSize: 12, marginBottom: 8, marginTop: 12, fontWeight: '600' },
  symptomsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  symptomChip: { paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#111827', borderRadius: 20, borderWidth: 1, borderColor: '#1f2937' },
  symptomChipActive: { backgroundColor: '#2563eb', borderColor: '#3b82f6' },
  symptomText: { color: '#9ca3af', fontSize: 12 },
  symptomTextActive: { color: '#fff', fontWeight: '600' },
  input: { backgroundColor: '#111827', color: '#fff', borderRadius: 10, padding: 13, fontSize: 14, borderWidth: 1, borderColor: '#1f2937', marginBottom: 4 },
  selectedCount: { color: '#6b7280', fontSize: 12, textAlign: 'right', marginTop: 4 },
  nextBtn: { backgroundColor: '#2563eb', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  backBtn: { flex: 1, backgroundColor: '#1f2937', borderRadius: 12, padding: 16, alignItems: 'center' },
  backBtnText: { color: '#9ca3af', fontWeight: '600', fontSize: 14 },
  runBtn: { flex: 2, backgroundColor: '#7c3aed', borderRadius: 12, padding: 16, alignItems: 'center' },
  runBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  runningCard: { backgroundColor: '#111827', borderRadius: 20, padding: 28, alignItems: 'center', width: '90%' },
  runningTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  runningSubtitle: { color: '#6b7280', fontSize: 12, marginBottom: 4 },
  progressMsg: { color: '#60a5fa', fontSize: 13, marginBottom: 4, alignSelf: 'flex-start' },
  urgencyBanner: { backgroundColor: '#111827', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 2, alignItems: 'center' },
  urgencyLabel: { color: '#6b7280', fontSize: 11, letterSpacing: 2, marginBottom: 6 },
  urgencyValue: { fontSize: 32, fontWeight: '900', marginBottom: 10 },
  scoreBar: { width: '100%', height: 6, backgroundColor: '#1f2937', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  scoreBarFill: { height: '100%', borderRadius: 3 },
  urgencyScore: { fontSize: 12, fontWeight: '600' },
  card: { backgroundColor: '#111827', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#1f2937' },
  cardTitle: { color: '#9ca3af', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  primaryDx: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  icd10: { color: '#6b7280', fontSize: 12 },
  conditionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  condName: { color: '#e5e7eb', fontSize: 13, fontWeight: '600' },
  condIcd: { color: '#4b5563', fontSize: 11 },
  confidenceBar: { width: 100, height: 6, backgroundColor: '#1f2937', borderRadius: 3, overflow: 'hidden', position: 'relative' },
  confidenceFill: { height: '100%', backgroundColor: '#2563eb', borderRadius: 3 },
  confidenceText: { color: '#9ca3af', fontSize: 11, marginTop: 2, textAlign: 'right' },
  listItem: { color: '#d1d5db', fontSize: 13, marginBottom: 4, lineHeight: 20 },
  medCard: { backgroundColor: '#1f2937', borderRadius: 10, padding: 10, marginBottom: 8 },
  medName: { color: '#60a5fa', fontWeight: '700', fontSize: 14 },
  medDose: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  summaryText: { color: '#d1d5db', fontSize: 13, lineHeight: 22 },
  disclaimer: { color: '#4b5563', fontSize: 11, marginTop: 8, fontStyle: 'italic' },
  newBtn: { backgroundColor: '#059669', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
