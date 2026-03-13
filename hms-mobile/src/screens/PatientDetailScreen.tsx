import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getPatientById, getDiagnosesByPatient } from '../database/db';
import { MobilePatient, MobileDiagnosis } from '../database/schema';

export default function PatientDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { patientId } = route.params;
  const [patient, setPatient] = useState<MobilePatient | null>(null);
  const [diagnoses, setDiagnoses] = useState<MobileDiagnosis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const p = await getPatientById(patientId);
      const dx = await getDiagnosesByPatient(patientId);
      setPatient(p || null);
      setDiagnoses(dx);
      setLoading(false);
    })();
  }, [patientId]);

  if (loading) return <View style={styles.center}><ActivityIndicator color="#60a5fa" size="large" /></View>;
  if (!patient) return <View style={styles.center}><Text style={styles.errText}>Patient not found</Text></View>;

  const getRiskColor = (r: string) => r === 'High' ? '#ef4444' : r === 'Moderate' ? '#f59e0b' : '#10b981';

  return (
    <ScrollView style={styles.screen}>
      {/* Patient Header */}
      <View style={styles.headerCard}>
        <View style={[styles.avatar, { backgroundColor: getRiskColor(patient.risk) + '30' }]}>
          <Text style={[styles.avatarText, { color: getRiskColor(patient.risk) }]}>
            {patient.name.charAt(0)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{patient.name}</Text>
          <Text style={styles.pid}>{patient.id}</Text>
          <View style={[styles.riskBadge, { backgroundColor: getRiskColor(patient.risk) + '25' }]}>
            <Text style={[styles.riskText, { color: getRiskColor(patient.risk) }]}>
              {patient.risk} Risk
            </Text>
          </View>
        </View>
        <View style={styles.syncIndicator}>
          <Text style={{ fontSize: 18 }}>{patient.syncStatus === 'synced' ? '✅' : '⏳'}</Text>
          <Text style={styles.syncLabel}>{patient.syncStatus}</Text>
        </View>
      </View>

      {/* Info Grid */}
      <View style={styles.grid}>
        <InfoTile label="Age" value={`${patient.age} yrs`} />
        <InfoTile label="Gender" value={patient.gender} />
        <InfoTile label="Blood Group" value={patient.bloodGroup || 'N/A'} />
        <InfoTile label="Location" value={patient.location} />
        <InfoTile label="Status" value={patient.status} />
        <InfoTile label="Phone" value={patient.phone || 'N/A'} />
      </View>

      {/* Condition */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Primary Condition</Text>
        <Text style={styles.conditionText}>{patient.condition}</Text>
        {patient.allergies && (
          <View style={styles.allergyBox}>
            <Text style={styles.allergyLabel}>⚠️ Allergies: </Text>
            <Text style={styles.allergyText}>{patient.allergies}</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#7c3aed' }]}
          onPress={() => navigation.navigate('Diagnose', { patientId })}
        >
          <Text style={styles.actionBtnText}>🩺 Run AI Diagnosis</Text>
        </TouchableOpacity>
      </View>

      {/* Diagnosis History */}
      <Text style={styles.sectionTitle}>Diagnosis History</Text>
      {diagnoses.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No diagnoses yet. Tap "Run AI Diagnosis" to start.</Text>
        </View>
      ) : (
        diagnoses.map(dx => (
          <View key={dx.id} style={styles.dxCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={styles.dxPrimary}>{dx.result.primaryDiagnosis}</Text>
              <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(dx.result.urgency) + '25' }]}>
                <Text style={[styles.urgencyText, { color: getUrgencyColor(dx.result.urgency) }]}>
                  {dx.result.urgency}
                </Text>
              </View>
            </View>
            <Text style={styles.dxDate}>{new Date(dx.createdAt).toLocaleString()}</Text>
            <Text style={styles.dxSummary} numberOfLines={2}>{dx.result.summary}</Text>
            <View style={styles.dxMeta}>
              <Text style={styles.dxMetaText}>
                Top conditions: {dx.result.conditions.slice(0, 2).map(c => `${c.name} (${Math.round(c.confidence * 100)}%)`).join(' • ')}
              </Text>
            </View>
            {dx.synced
              ? <Text style={styles.syncedTag}>✅ Synced to HMS</Text>
              : <Text style={styles.pendingTag}>⏳ Pending sync</Text>}
          </View>
        ))
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

function getUrgencyColor(u: string) {
  return u === 'Critical' ? '#ef4444' : u === 'Urgent' ? '#f59e0b' : u === 'Moderate' ? '#3b82f6' : '#10b981';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0f1e', padding: 14 },
  center: { flex: 1, backgroundColor: '#0a0f1e', alignItems: 'center', justifyContent: 'center' },
  errText: { color: '#ef4444', fontSize: 16 },
  headerCard: { backgroundColor: '#111827', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14, borderWidth: 1, borderColor: '#1f2937' },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 26, fontWeight: '800' },
  name: { color: '#fff', fontSize: 18, fontWeight: '800' },
  pid: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  riskBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 6 },
  riskText: { fontSize: 11, fontWeight: '700' },
  syncIndicator: { alignItems: 'center' },
  syncLabel: { color: '#6b7280', fontSize: 10, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  tile: { backgroundColor: '#111827', borderRadius: 10, padding: 12, flex: 1, minWidth: '30%', borderWidth: 1, borderColor: '#1f2937' },
  tileLabel: { color: '#6b7280', fontSize: 10, marginBottom: 4 },
  tileValue: { color: '#fff', fontSize: 13, fontWeight: '600' },
  section: { backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#1f2937' },
  sectionTitle: { color: '#9ca3af', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
  conditionText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  allergyBox: { flexDirection: 'row', marginTop: 8, backgroundColor: '#451a03', padding: 8, borderRadius: 8 },
  allergyLabel: { color: '#fb923c', fontWeight: '700', fontSize: 12 },
  allergyText: { color: '#fca5a5', fontSize: 12, flex: 1 },
  actionRow: { marginBottom: 16 },
  actionBtn: { borderRadius: 14, padding: 16, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyCard: { backgroundColor: '#111827', borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#1f2937' },
  emptyText: { color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  dxCard: { backgroundColor: '#111827', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#1f2937' },
  dxPrimary: { color: '#fff', fontWeight: '700', fontSize: 14, flex: 1, marginRight: 8 },
  urgencyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  urgencyText: { fontSize: 10, fontWeight: '700' },
  dxDate: { color: '#6b7280', fontSize: 11, marginBottom: 6 },
  dxSummary: { color: '#9ca3af', fontSize: 12, lineHeight: 18 },
  dxMeta: { marginTop: 6 },
  dxMetaText: { color: '#4b5563', fontSize: 11 },
  syncedTag: { color: '#10b981', fontSize: 10, marginTop: 6 },
  pendingTag: { color: '#f59e0b', fontSize: 10, marginTop: 6 },
});
