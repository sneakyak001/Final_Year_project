import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput
} from 'react-native';
import { runFullSync, pullFromServer, getSyncServerUrl, setSyncServerUrl, getPendingSyncCount } from '../sync/syncManager';
import { getSyncQueue, getLastSync } from '../database/db';
import NetInfo from '@react-native-community/netinfo';
import { SyncQueueItem } from '../database/schema';

export default function SyncScreen() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(0);
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [serverUrl, setServerUrl] = useState('');
  const [editingUrl, setEditingUrl] = useState(false);
  const [syncResult, setSyncResult] = useState<{ pushed: number; pulled: number; error?: string } | null>(null);

  const load = async () => {
    const state = await NetInfo.fetch();
    setIsOnline(state.isConnected ?? false);
    const ls = await getLastSync();
    setLastSync(ls);
    const q = await getSyncQueue();
    setQueue(q);
    const url = await getSyncServerUrl();
    setServerUrl(url);
  };

  useEffect(() => { load(); }, []);

  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'You are offline. Connect to the network to sync.');
      return;
    }
    setIsSyncing(true);
    setSyncResult(null);
    const result = await runFullSync();
    setIsSyncing(false);
    setSyncResult({ pushed: result.pushed, pulled: result.pulled, error: result.error });
    await load();
  };

  const handleSaveUrl = async () => {
    await setSyncServerUrl(serverUrl);
    setEditingUrl(false);
    Alert.alert('Saved', 'Sync server URL updated.');
  };

  const handleSeedAndPull = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const url = await getSyncServerUrl();
      // 1. Seed demo patients on the server
      const seedRes = await fetch(`${url}/api/seed`, { method: 'POST' });
      const seedData = await seedRes.json();
      if (!seedData.success) throw new Error('Seed failed on server');
      // 2. Pull all data into local app
      const result = await runFullSync();
      setSyncResult({ pushed: result.pushed, pulled: result.pulled, error: result.error });
      await load();
      if (!result.error) Alert.alert('✅ Demo Data Loaded!', `Loaded ${result.pulled} patients from sync server. Check the Patients tab!`);
    } catch (e: any) {
      setSyncResult({ pushed: 0, pulled: 0, error: e.message || 'Failed to load demo data. Is the sync server running?' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <ScrollView style={styles.screen}>
      {/* Network Status */}
      <View style={[styles.netCard, { borderColor: isOnline ? '#10b981' : '#ef4444' }]}>
        <Text style={styles.netIcon}>{isOnline ? '📡' : '✈️'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.netTitle}>{isOnline ? 'Online' : 'Offline'}</Text>
          <Text style={styles.netSub}>{isOnline ? 'Ready to sync with HMS' : 'Working in offline mode'}</Text>
        </View>
        <View style={[styles.netDot, { backgroundColor: isOnline ? '#10b981' : '#ef4444' }]} />
      </View>

      {/* Sync Stats */}
      <View style={styles.statsRow}>
        <StatBlock label="Pending" value={queue.length} color="#f59e0b" icon="⏳" />
        <StatBlock label="Last Sync" value={lastSync ? new Date(lastSync).toLocaleTimeString() : 'Never'} color="#60a5fa" icon="🕐" isText />
      </View>

      {/* Sync Result */}
      {syncResult && (
        <View style={[styles.resultCard, { borderColor: syncResult.error ? '#ef4444' : '#10b981' }]}>
          {syncResult.error ? (
            <>
              <Text style={styles.resultTitle}>❌ Sync Failed</Text>
              <Text style={styles.resultErr}>{syncResult.error}</Text>
              <Text style={styles.resultSub}>Check server URL in settings below.</Text>
            </>
          ) : (
            <>
              <Text style={styles.resultTitle}>✅ Sync Complete</Text>
              <Text style={styles.resultStat}>↑ Pushed: {syncResult.pushed} records</Text>
              <Text style={styles.resultStat}>↓ Pulled: {syncResult.pulled} records</Text>
            </>
          )}
        </View>
      )}

      {/* Sync Button */}
      <TouchableOpacity
        style={[styles.syncBtn, isSyncing && { opacity: 0.6 }]}
        onPress={handleSync}
        disabled={isSyncing}
      >
        {isSyncing ? (
          <>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.syncBtnText}>  Syncing...</Text>
          </>
        ) : (
          <Text style={styles.syncBtnText}>🔄  Sync Now</Text>
        )}
      </TouchableOpacity>

      {/* Demo Data Button */}
      <TouchableOpacity
        style={[styles.demoBtn, isSyncing && { opacity: 0.6 }]}
        onPress={handleSeedAndPull}
        disabled={isSyncing}
      >
        <Text style={styles.demoBtnText}>🏥  Load Demo Patients from Server</Text>
        <Text style={styles.demoBtnSub}>Seeds 5 realistic patients & pulls them here</Text>
      </TouchableOpacity>

      {/* Pending Queue */}
      <Text style={styles.sectionTitle}>Pending Sync Queue ({queue.length})</Text>
      {queue.length === 0 ? (
        <View style={styles.emptyCard}><Text style={styles.emptyText}>No pending items. All synced! ✅</Text></View>
      ) : (
        queue.map(item => (
          <View key={item.id} style={styles.queueItem}>
            <Text style={styles.queueOp}>{item.operation.toUpperCase()}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.queueTable}>{item.table}</Text>
              <Text style={styles.queueId}>{item.recordId}</Text>
            </View>
            <Text style={styles.queueTime}>{new Date(item.createdAt).toLocaleTimeString()}</Text>
          </View>
        ))
      )}

      {/* Server Config */}
      <Text style={styles.sectionTitle}>Server Configuration</Text>
      <View style={styles.configCard}>
        <Text style={styles.configLabel}>HMS Sync Server URL</Text>
        {editingUrl ? (
          <>
            <TextInput
              style={styles.urlInput}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.x.x:3001"
              placeholderTextColor="#4b5563"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.urlBtnRow}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveUrl}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingUrl(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.urlText}>{serverUrl}</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditingUrl(true)}>
              <Text style={styles.editBtnText}>✏️ Edit URL</Text>
            </TouchableOpacity>
          </>
        )}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 The sync server bridges the mobile app to the main HMS web app. Both must be on the same network.
            {'\n'}Start the server in: hms-app/sync-server → node server.js
          </Text>
        </View>
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

function StatBlock({ label, value, color, icon, isText }: { label: string; value: any; color: string; icon: string; isText?: boolean }) {
  return (
    <View style={[styles.statBlock, { borderLeftColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, isText && { fontSize: 14 }, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0f1e', padding: 14 },
  netCard: { backgroundColor: '#111827', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14, borderWidth: 2 },
  netIcon: { fontSize: 30 },
  netTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  netSub: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  netDot: { width: 12, height: 12, borderRadius: 6 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statBlock: { flex: 1, backgroundColor: '#111827', borderRadius: 12, padding: 14, borderLeftWidth: 3 },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel: { color: '#6b7280', fontSize: 11 },
  resultCard: { backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1.5 },
  resultTitle: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 6 },
  resultErr: { color: '#f87171', fontSize: 13 },
  resultSub: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  resultStat: { color: '#d1d5db', fontSize: 13, marginBottom: 2 },
  syncBtn: { backgroundColor: '#059669', borderRadius: 14, padding: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 12 },
  syncBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  demoBtn: { backgroundColor: '#2563eb', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#3b82f6' },
  demoBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  demoBtnSub: { color: '#bfdbfe', fontSize: 11, marginTop: 4 },
  sectionTitle: { color: '#9ca3af', fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },
  emptyCard: { backgroundColor: '#111827', borderRadius: 12, padding: 20, alignItems: 'center' },
  emptyText: { color: '#10b981', fontSize: 14 },
  queueItem: { backgroundColor: '#111827', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6, borderWidth: 1, borderColor: '#1f2937' },
  queueOp: { color: '#f59e0b', fontWeight: '800', fontSize: 11, width: 60 },
  queueTable: { color: '#d1d5db', fontSize: 13 },
  queueId: { color: '#6b7280', fontSize: 11 },
  queueTime: { color: '#4b5563', fontSize: 11 },
  configCard: { backgroundColor: '#111827', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#1f2937' },
  configLabel: { color: '#9ca3af', fontSize: 12, marginBottom: 8, fontWeight: '600' },
  urlText: { color: '#60a5fa', fontSize: 14, marginBottom: 8, fontFamily: 'monospace' },
  urlInput: { backgroundColor: '#1f2937', color: '#fff', borderRadius: 8, padding: 12, fontSize: 13, borderWidth: 1, borderColor: '#374151', marginBottom: 8 },
  urlBtnRow: { flexDirection: 'row', gap: 8 },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 8, padding: 10, flex: 1, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  cancelBtn: { backgroundColor: '#1f2937', borderRadius: 8, padding: 10, flex: 1, alignItems: 'center' },
  cancelBtnText: { color: '#9ca3af', fontWeight: '600' },
  editBtn: { backgroundColor: '#1f2937', borderRadius: 8, padding: 10, alignSelf: 'flex-start' },
  editBtnText: { color: '#9ca3af', fontSize: 13 },
  infoBox: { backgroundColor: '#0f172a', borderRadius: 8, padding: 10, marginTop: 12 },
  infoText: { color: '#4b5563', fontSize: 11, lineHeight: 18 },
});
