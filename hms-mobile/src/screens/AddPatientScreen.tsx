import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { addPatient } from '../database/db';
import { useAuth } from '../context/AuthContext';

export default function AddPatientScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: '', age: '', gender: 'Male', location: '',
    condition: '', status: 'Stable', risk: 'Low' as 'Low' | 'Moderate' | 'High',
    phone: '', bloodGroup: '', allergies: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.age || !form.condition.trim()) {
      Alert.alert('Missing Fields', 'Name, Age, and Condition are required.');
      return;
    }
    setSaving(true);
    try {
      await addPatient({
        name: form.name.trim(),
        age: parseInt(form.age),
        gender: form.gender,
        location: form.location.trim() || 'Unknown',
        condition: form.condition.trim(),
        status: form.status,
        risk: form.risk,
        phone: form.phone.trim() || undefined,
        bloodGroup: form.bloodGroup.trim() || undefined,
        allergies: form.allergies.trim() || undefined,
        aiConfidence: undefined,
      });
      Alert.alert('✅ Saved', 'Patient added and queued for sync.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save patient');
    } finally {
      setSaving(false);
    }
  };

  const OptionPicker = ({ label, options, value, onSelect }: any) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map((opt: string) => (
          <TouchableOpacity
            key={opt}
            style={[styles.optionBtn, value === opt && styles.optionBtnActive]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[styles.optionText, value === opt && styles.optionTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.pageTitle}>New Patient Registration</Text>
      <Text style={styles.pageSub}>Data saved offline. Will sync when connected.</Text>

      {/* Required */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Patient Information</Text>

        <Text style={styles.label}>Full Name *</Text>
        <TextInput style={styles.input} placeholder="e.g. Arun Kumar" placeholderTextColor="#4b5563"
          value={form.name} onChangeText={v => set('name', v)} />

        <Text style={styles.label}>Age *</Text>
        <TextInput style={styles.input} placeholder="e.g. 35" placeholderTextColor="#4b5563"
          keyboardType="number-pad" value={form.age} onChangeText={v => set('age', v)} />

        <OptionPicker label="Gender" options={['Male', 'Female', 'Other']} value={form.gender} onSelect={(v: string) => set('gender', v)} />

        <Text style={styles.label}>Location</Text>
        <TextInput style={styles.input} placeholder="City / Village" placeholderTextColor="#4b5563"
          value={form.location} onChangeText={v => set('location', v)} />

        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} placeholder="+91 98765 43210" placeholderTextColor="#4b5563"
          keyboardType="phone-pad" value={form.phone} onChangeText={v => set('phone', v)} />
      </View>

      {/* Clinical */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Clinical Information</Text>

        <Text style={styles.label}>Primary Condition / Diagnosis *</Text>
        <TextInput style={styles.input} placeholder="e.g. Type 2 Diabetes, Hypertension"
          placeholderTextColor="#4b5563" value={form.condition} onChangeText={v => set('condition', v)} />

        <OptionPicker label="Current Status" options={['Stable', 'Critical', 'Under Observation', 'Recovering']}
          value={form.status} onSelect={(v: string) => set('status', v)} />

        <OptionPicker label="Risk Level" options={['Low', 'Moderate', 'High']}
          value={form.risk} onSelect={(v: string) => set('risk', v as any)} />

        <OptionPicker label="Blood Group"
          options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']}
          value={form.bloodGroup} onSelect={(v: string) => set('bloodGroup', v)} />

        <Text style={styles.label}>Known Allergies</Text>
        <TextInput style={styles.input} placeholder="e.g. Penicillin, Sulfa drugs, None"
          placeholderTextColor="#4b5563" value={form.allergies} onChangeText={v => set('allergies', v)} />
      </View>

      <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving...' : '💾  Save Patient'}</Text>
      </TouchableOpacity>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0f1e', padding: 14 },
  pageTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  pageSub: { color: '#4b5563', fontSize: 12, marginBottom: 16 },
  section: { backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#1f2937' },
  sectionHeader: { color: '#60a5fa', fontWeight: '700', fontSize: 13, marginBottom: 14 },
  label: { color: '#9ca3af', fontSize: 12, marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: '#1f2937', color: '#fff', borderRadius: 10, padding: 13, fontSize: 14, borderWidth: 1, borderColor: '#374151', marginBottom: 4 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#1f2937', borderRadius: 20, borderWidth: 1, borderColor: '#374151' },
  optionBtnActive: { backgroundColor: '#2563eb', borderColor: '#3b82f6' },
  optionText: { color: '#9ca3af', fontSize: 12 },
  optionTextActive: { color: '#fff', fontWeight: '700' },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 14 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
