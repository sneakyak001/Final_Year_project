// ── HMS Mobile Database Schema & Types ───────────────────────────────────────
// Uses AsyncStorage for offline-first persistence

export interface MobilePatient {
  id: string;                 // HMS-compatible: PAT-XXXXX
  name: string;
  age: number;
  gender: string;
  location: string;
  condition: string;
  status: string;
  risk: 'Low' | 'Moderate' | 'High';
  phone?: string;
  bloodGroup?: string;
  allergies?: string;
  lastSync: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'conflict';
  createdAt: number;
  updatedAt: number;
  aiConfidence?: number;
}

export interface MobileDiagnosis {
  id: string;
  patientId: string;
  symptoms: string[];
  vitals: {
    temperature?: number;
    heartRate?: number;
    spo2?: number;
    systolicBP?: number;
    diastolicBP?: number;
    respiratoryRate?: number;
  };
  result: DiagnosisResult;
  createdAt: number;
  synced: boolean;
  createdBy?: string;
}

export interface DiagnosisResult {
  primaryDiagnosis: string;
  conditions: Array<{ name: string; confidence: number; icd10?: string }>;
  differentials: string[];
  recommendedTests: string[];
  medications: Array<{ name: string; dosage: string; frequency: string; duration: string }>;
  procedures: string[];
  followUpDays: number;
  referrals: string[];
  urgency: 'Critical' | 'Urgent' | 'Moderate' | 'Routine';
  urgencyScore: number;
  summary: string;
  keyFindings: string[];
  actionItems: string[];
  generatedAt: string;
  totalDurationMs: number;
}

export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  table: 'patients' | 'diagnoses';
  recordId: string;
  payload: string; // JSON
  createdAt: number;
  retries: number;
}

export interface MobileUser {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  name: string;
  role: 'admin' | 'doctor' | 'staff';
  department?: string;
  designation?: string;
  createdAt: number;
}

export const DB_KEYS = {
  PATIENTS: 'hms_mobile_patients',
  DIAGNOSES: 'hms_mobile_diagnoses',
  SYNC_QUEUE: 'hms_mobile_sync_queue',
  USERS: 'hms_mobile_users',
  LAST_SYNC: 'hms_mobile_last_sync',
  SESSION: 'hms_mobile_session',
};
