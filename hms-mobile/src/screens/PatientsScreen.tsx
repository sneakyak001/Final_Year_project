import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAllPatients } from '../database/db';
import { MobilePatient } from '../database/schema';

export default function PatientsScreen() {
  const navigation = useNavigation<any>();
  const [patients, setPatients] = useState<MobilePatient[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'High' | 'Moderate' | 'Low'>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const all = await getAllPatients();
      setPatients(all.sort((a, b) => b.updatedAt - a.updatedAt));
      setLoading(false);
    })();
  }, []);

  const filtered = patients.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.condition.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || p.risk === filter;
    return matchSearch && matchFilter;
  });

  const getRiskColor = (r: string) =>
    r === 'High' ? '#ef4444' : r === 'Moderate' ? '#f59e0b' : '#10b981';

  const renderItem = ({ item }: { item: MobilePatient }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('PatientDetail', { patientId: item.id })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
        <View style={[styles.avatar, { backgroundColor: getRiskColor(item.risk) + '30' }]}>
          <Text style={[styles.avatarText, { color: getRiskColor(item.risk) }]}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>{item.id} • {item.age}yr • {item.gender}</Text>
          <Text style={styles.condition}>{item.condition}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View style={[styles.riskBadge, { backgroundColor: getRiskColor(item.risk) + '20' }]}>
          <Text style={[styles.riskText, { color: getRiskColor(item.risk) }]}>{item.risk}</Text>
        </View>
        {item.syncStatus === 'pending' && <Text style={styles.syncTag}>⏳ Pending</Text>}
        {item.syncStatus === 'synced' && <Text style={styles.syncedTag}>✅ Synced</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      {/* Search */}
      <TextInput
        style={styles.search}
        placeholder="Search patients, conditions, ID..."
        placeholderTextColor="#4b5563"
        value={search}
        onChangeText={setSearch}
      />

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['All', 'High', 'Moderate', 'Low'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.count}>{filtered.length} patients</Text>

      {loading ? (
        <ActivityIndicator color="#60a5fa" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={p => p.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No patients found</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddPatient')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0f1e', padding: 14 },
  search: { backgroundColor: '#111827', color: '#fff', borderRadius: 12, padding: 13, fontSize: 14, borderWidth: 1, borderColor: '#1f2937', marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1f2937' },
  filterTabActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterText: { color: '#9ca3af', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  count: { color: '#4b5563', fontSize: 12, marginBottom: 8 },
  card: { backgroundColor: '#111827', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#1f2937' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  name: { color: '#fff', fontWeight: '700', fontSize: 15 },
  meta: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  condition: { color: '#9ca3af', fontSize: 12, marginTop: 3 },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  riskText: { fontSize: 11, fontWeight: '700' },
  syncTag: { color: '#f59e0b', fontSize: 10 },
  syncedTag: { color: '#10b981', fontSize: 10 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#4b5563', fontSize: 16 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabText: { color: '#fff', fontSize: 30, lineHeight: 32 },
});
