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

const app = express();
const PORT = 3001;

// ── DB Setup (JSON file store) ────────────────────────────────────────────────
const dbPath = path.join(__dirname, 'sync-data.json');

// Simple native fs DB wrapper to replace lowdb
const db = {
  data: { patients: [], diagnoses: [], lastUpdated: 0 },
  read() {
    try {
      if (fs.existsSync(dbPath)) {
        this.data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      }
    } catch(e) { console.error('Error reading DB', e); }
    return this;
  },
  write() {
    fs.writeFileSync(dbPath, JSON.stringify(this.data, null, 2));
    return this;
  },
  get(key) {
    this.read();
    return {
      value: () => this.data[key],
      push: (item) => { this.data[key].push(item); return this; },
      remove: (query) => { this.data[key] = this.data[key].filter(i => i.id !== query.id); return this; },
      filter: (fn) => ({ value: () => this.data[key].filter(fn) }),
      find: (query) => {
        const item = this.data[key].find(i => i.id === query.id);
        return {
          value: () => item,
          assign: (updates) => { if (item) Object.assign(item, updates); return db; }
        };
      }
    };
  },
  set(key, value) {
    this.read();
    this.data[key] = value;
    return this;
  }
};
db.read().write();

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

// ── Seed Demo Data ────────────────────────────────────────────────────────────
// POST /api/seed — Seed the sync server with realistic demo patients
app.post('/api/seed', (req, res) => {
  const demoPatients = [
    { id: 'PAT-A1B2C3D4E5', name: 'Rajesh Kumar', age: 54, gender: 'Male', location: 'Chennai', condition: 'Hypertension', status: 'Under Treatment', risk: 'High', phone: '9876543210', bloodGroup: 'B+', allergies: 'Penicillin', lastSync: new Date().toISOString(), syncStatus: 'synced', createdAt: Date.now() - 5000, updatedAt: Date.now() - 5000, aiConfidence: 0.87 },
    { id: 'PAT-B2C3D4E5F6', name: 'Priya Venkatesh', age: 32, gender: 'Female', location: 'Coimbatore', condition: 'Type 2 Diabetes', status: 'Stable', risk: 'Moderate', phone: '9123456789', bloodGroup: 'O+', allergies: 'None', lastSync: new Date().toISOString(), syncStatus: 'synced', createdAt: Date.now() - 4000, updatedAt: Date.now() - 4000, aiConfidence: 0.92 },
    { id: 'PAT-C3D4E5F6G7', name: 'Arjun Mehta', age: 28, gender: 'Male', location: 'Madurai', condition: 'Asthma', status: 'Emergency', risk: 'High', phone: '9234567890', bloodGroup: 'A-', allergies: 'Aspirin, Dust', lastSync: new Date().toISOString(), syncStatus: 'synced', createdAt: Date.now() - 3000, updatedAt: Date.now() - 3000, aiConfidence: 0.78 },
    { id: 'PAT-D4E5F6G7H8', name: 'Meera Nair', age: 45, gender: 'Female', location: 'Trichy', condition: 'Anaemia', status: 'Under Treatment', risk: 'Low', phone: '9345678901', bloodGroup: 'AB+', allergies: 'None', lastSync: new Date().toISOString(), syncStatus: 'synced', createdAt: Date.now() - 2000, updatedAt: Date.now() - 2000, aiConfidence: 0.82 },
    { id: 'PAT-E5F6G7H8I9', name: 'Suresh Balaji', age: 67, gender: 'Male', location: 'Salem', condition: 'Chronic Kidney Disease', status: 'Critical', risk: 'High', phone: '9456789012', bloodGroup: 'O-', allergies: 'Sulfa drugs', lastSync: new Date().toISOString(), syncStatus: 'synced', createdAt: Date.now() - 1000, updatedAt: Date.now() - 1000, aiConfidence: 0.95 },
  ];

  const existing = db.get('patients').value();
  const existingMap = new Map(existing.map(p => [p.id, p]));
  for (const p of demoPatients) {
    existingMap.set(p.id, p);
  }
  db.set('patients', Array.from(existingMap.values())).write();
  db.set('lastUpdated', Date.now()).write();
  console.log(`[Seed] Seeded ${demoPatients.length} demo patients ✅`);
  res.json({ success: true, seeded: demoPatients.length, total: db.get('patients').value().length });
});

// ── Reset Data (Dev only) ─────────────────────────────────────────────────────
app.post('/api/reset', (req, res) => {
  db.set('patients', []).set('diagnoses', []).set('lastUpdated', 0).write();
  console.log('[Reset] All data cleared.');
  res.json({ success: true });
});

// ── Utility: Get Local IP Address ─────────────────────────────────────────────
const os = require('os');
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Return IPv4 addresses that are not loopback
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  const serverUrl = `http://${localIp}:${PORT}`;
  
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║       HMS Sync Bridge Server v1.0        ║');
  console.log(`║  Running on: ${serverUrl.padEnd(28)}║`);
  console.log('╠══════════════════════════════════════════╣');
  console.log('║  API Endpoints:                          ║');
  console.log('║  GET  /api/health      → Status check    ║');
  console.log('║  GET  /api/sync/pull   → Mobile pull     ║');
  console.log('║  POST /api/sync/push   → Mobile push     ║');
  console.log('║  POST /api/export      → Web HMS export  ║');
  console.log('║  GET  /api/import      → Web HMS import  ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log(`➡️  ENTER THIS URL IN THE MOBILE APP SYNC SETTINGS:`);
  console.log(`    ${serverUrl}`);
  console.log('');
  console.log('Data stored in: sync-data.json');
  console.log('');
});
