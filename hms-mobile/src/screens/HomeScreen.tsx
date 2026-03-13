import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getAllPatients } from '../database/db';
import { getPendingSyncCount } from '../sync/syncManager';
import { MobilePatient } from '../database/schema';

type Stats = { total: number; high: number; moderate: number; low: number; pending: number };

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<Stats>({ total: 0, high: 0, moderate: 0, low: 0, pending: 0 });
  const [recentPatients, setRecentPatients] = useState<MobilePatient[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncPending, setSyncPending] = useState(0);

  const load = async () => {
    const patients = await getAllPatients();
    const pendingSync = await getPendingSyncCount();
    setStats({
      total: patients.length,
      high: patients.filter(p => p.risk === 'High').length,
      moderate: patients.filter(p => p.risk === 'Moderate').length,
      low: patients.filter(p => p.risk === 'Low').length,
      pending: patients.filter(p => p.syncStatus === 'pending').length,
    });
    setRecentPatients(patients.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5));
    setSyncPending(pendingSync);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const getRiskColor = (risk: string) =>
    risk === 'High' ? '#ef4444' : risk === 'Moderate' ? '#f59e0b' : '#10b981';

  return (
    <ScrollView style={styles.screen} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60a5fa" />}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.username}>{user?.name} 👋</Text>
          <Text style={styles.role}>{user?.role?.toUpperCase()} • HMS Mobile</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Sync Banner */}
      {syncPending > 0 && (
        <TouchableOpacity style={styles.syncBanner} onPress={() => navigation.navigate('Sync')}>
          <Text style={styles.syncBannerText}>⏳ {syncPending} changes pending sync  →</Text>
        </TouchableOpacity>
      )}

      {/* Stats Grid */}
      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.statsGrid}>
        <StatCard label="Total Patients" value={stats.total} color="#3b82f6" icon="👥" />
        <StatCard label="High Risk" value={stats.high} color="#ef4444" icon="🔴" />
        <StatCard label="Moderate" value={stats.moderate} color="#f59e0b" icon="🟡" />
        <StatCard label="Low Risk" value={stats.low} color="#10b981" icon="🟢" />
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <QuickAction icon="➕" label="Add Patient" onPress={() => navigation.navigate('AddPatient')} color="#2563eb" />
        <QuickAction icon="🩺" label="Diagnose" onPress={() => navigation.navigate('Diagnose', {})} color="#7c3aed" />
        <QuickAction icon="🔄" label="Sync" onPress={() => navigation.navigate('Sync')} color="#059669" badge={syncPending} />
        <QuickAction icon="📋" label="Patients" onPress={() => navigation.navigate('Patients')} color="#0891b2" />
      </View>

      {/* Recent Patients */}
      <Text style={styles.sectionTitle}>Recent Patients</Text>
      {recentPatients.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No patients yet. Add your first patient!</Text>
        </View>
      ) : (
        recentPatients.map(p => (
          <TouchableOpacity key={p.id} style={styles.patientRow} onPress={() => navigation.navigate('PatientDetail', { patientId: p.id })}>
            <View style={[styles.riskDot, { backgroundColor: getRiskColor(p.risk) }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.patientName}>{p.name}</Text>
              <Text style={styles.patientMeta}>{p.age}yr • {p.gender} • {p.condition}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.riskBadge, { color: getRiskColor(p.risk) }]}>{p.risk}</Text>
              {p.syncStatus === 'pending' && <Text style={styles.pendingDot}>⏳</Text>}
            </View>
          </TouchableOpacity>
        ))
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress, color, badge }: { icon: string; label: string; onPress: () => void; color: string; badge?: number }) {
  return (
    <TouchableOpacity style={[styles.qaBtn, { backgroundColor: color }]} onPress={onPress}>
      <Text style={styles.qaIcon}>{icon}</Text>
      <Text style={styles.qaLabel}>{label}</Text>
      {badge && badge > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0f1e', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, marginTop: 8 },
  greeting: { color: '#6b7280', fontSize: 13 },
  username: { color: '#fff', fontSize: 20, fontWeight: '800' },
  role: { color: '#3b82f6', fontSize: 11, marginTop: 2 },
  logoutBtn: { backgroundColor: '#1f2937', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#374151' },
  logoutText: { color: '#9ca3af', fontSize: 12 },
  syncBanner: { backgroundColor: '#1e3a5f', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#2563eb' },
  syncBannerText: { color: '#60a5fa', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  sectionTitle: { color: '#9ca3af', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 10, marginTop: 16, textTransform: 'uppercase' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  statCard: { backgroundColor: '#111827', borderRadius: 12, padding: 14, flex: 1, minWidth: '44%', borderLeftWidth: 3 },
  statIcon: { fontSize: 20, marginBottom: 6 },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { color: '#9ca3af', fontSize: 11, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  qaBtn: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', position: 'relative' },
  qaIcon: { fontSize: 22 },
  qaLabel: { color: '#fff', fontSize: 11, marginTop: 4, fontWeight: '600' },
  badge: { position: 'absolute', top: 6, right: 6, backgroundColor: '#ef4444', borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  patientRow: { backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#1f2937' },
  riskDot: { width: 10, height: 10, borderRadius: 5 },
  patientName: { color: '#fff', fontWeight: '700', fontSize: 15 },
  patientMeta: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  riskBadge: { fontSize: 11, fontWeight: '700' },
  pendingDot: { fontSize: 10, marginTop: 2 },
  emptyCard: { backgroundColor: '#111827', borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 14 },
});
