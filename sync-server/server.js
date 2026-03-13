// ── HMS Sync Bridge Server ────────────────────────────────────────────────────
// Express.js server that acts as the bridge between HMS Mobile (React Native)
// and HMS Web (React + Dexie.js browser app).
// 
// It uses a local JSON file store (via LowDB) as the exchange medium.
// The HMS Web app writes patient data exports here, and the mobile app reads/writes.
//
// Start: node server.js  (runs on port 3001)
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const app = express();
const PORT = 3001;

// ── DB Setup (JSON file store) ────────────────────────────────────────────────
const dbPath = path.join(__dirname, 'sync-data.json');
const adapter = new FileSync(dbPath);
const db = low(adapter);

// Default structure
db.defaults({
  patients: [],
  diagnoses: [],
  lastUpdated: 0,
}).write();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const patients = db.get('patients').value();
  const diagnoses = db.get('diagnoses').value();
  res.json({
    status: 'ok',
    server: 'HMS Sync Bridge v1.0',
    patients: patients.length,
    diagnoses: diagnoses.length,
    lastUpdated: db.get('lastUpdated').value(),
    timestamp: Date.now(),
  });
});

// ── PULL — Mobile fetches data from server ────────────────────────────────────
// GET /api/sync/pull?since=<timestamp>
app.get('/api/sync/pull', (req, res) => {
  const since = parseInt(req.query.since || '0');

  const patients = db.get('patients')
    .filter(p => (p.updatedAt || 0) > since)
    .value();

  const diagnoses = db.get('diagnoses')
    .filter(d => (d.createdAt || 0) > since)
    .value();

  console.log(`[Pull] since=${since} → ${patients.length} patients, ${diagnoses.length} diagnoses`);

  res.json({ patients, diagnoses, serverTime: Date.now() });
});

// ── PUSH — Mobile sends local changes to server ───────────────────────────────
// POST /api/sync/push
// Body: { operation: 'create'|'update'|'delete', table: string, recordId: string, payload: object }
app.post('/api/sync/push', (req, res) => {
  const { operation, table, recordId, payload } = req.body;

  if (!operation || !table || !recordId) {
    return res.status(400).json({ error: 'operation, table, and recordId are required' });
  }

  const collection = db.get(table);

  if (operation === 'create') {
    // Add if not exists, else update
    const existing = collection.find({ id: recordId }).value();
    if (existing) {
      collection.find({ id: recordId }).assign({ ...payload, updatedAt: Date.now() }).write();
    } else {
      collection.push({ ...payload, id: recordId, updatedAt: Date.now() }).write();
    }
  } else if (operation === 'update') {
    collection.find({ id: recordId }).assign({ ...payload, updatedAt: Date.now() }).write();
  } else if (operation === 'delete') {
    db.get(table).remove({ id: recordId }).write();
  }

  db.set('lastUpdated', Date.now()).write();
  console.log(`[Push] ${operation} on ${table}/${recordId} ✅`);

  res.json({ success: true, operation, table, recordId });
});

// ── Web App Export Endpoint ───────────────────────────────────────────────────
// POST /api/export — HMS Web app pushes its full patient list here
// This lets the mobile app pull the latest data from the web app
app.post('/api/export', (req, res) => {
  const { patients, diagnoses } = req.body;

  if (Array.isArray(patients)) {
    // Merge patients: update existing, add new
    const existing = db.get('patients').value();
    const existingMap = new Map(existing.map(p => [p.id, p]));

    for (const p of patients) {
      const localRecord = existingMap.get(p.id);
      if (!localRecord || (p.updatedAt || 0) > (localRecord.updatedAt || 0)) {
        existingMap.set(p.id, { ...p, updatedAt: p.updatedAt || Date.now() });
      }
    }

    db.set('patients', Array.from(existingMap.values())).write();
    console.log(`[Export] Merged ${patients.length} patients from Web HMS`);
  }

  if (Array.isArray(diagnoses)) {
    const existingDx = db.get('diagnoses').value();
    const dxMap = new Map(existingDx.map(d => [d.id, d]));
    for (const d of diagnoses) {
      dxMap.set(d.id, d);
    }
    db.set('diagnoses', Array.from(dxMap.values())).write();
    console.log(`[Export] Merged ${diagnoses.length} diagnoses from Web HMS`);
  }

  db.set('lastUpdated', Date.now()).write();
  res.json({ success: true, patients: db.get('patients').value().length });
});

// ── Web App Import Endpoint ───────────────────────────────────────────────────
// GET /api/import — HMS Web app fetches data from sync bridge
app.get('/api/import', (req, res) => {
  const patients = db.get('patients').value();
  const diagnoses = db.get('diagnoses').value();
  res.json({ patients, diagnoses, lastUpdated: db.get('lastUpdated').value() });
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║       HMS Sync Bridge Server v1.0        ║');
  console.log(`║  Running on http://0.0.0.0:${PORT}          ║`);
  console.log('╠══════════════════════════════════════════╣');
  console.log('║  API Endpoints:                          ║');
  console.log('║  GET  /api/health      → Status check    ║');
  console.log('║  GET  /api/sync/pull   → Mobile pull     ║');
  console.log('║  POST /api/sync/push   → Mobile push     ║');
  console.log('║  POST /api/export      → Web HMS export  ║');
  console.log('║  GET  /api/import      → Web HMS import  ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log('Data stored in: sync-data.json');
  console.log('');
});
