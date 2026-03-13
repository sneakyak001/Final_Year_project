// ── Agent System Types ────────────────────────────────────────────────────────

export type AgentStatus = 'idle' | 'running' | 'done' | 'error';

/** Payload passed into and between agents during an orchestration run */
export interface DiagnosisPayload {
    /** Free-text symptoms or clinical note */
    symptoms?: string;
    /** Patient metadata from DB */
    patient?: {
        id: string;
        name: string;
        age: number;
        gender: string;
        condition: string;
        risk: string;
    };
    /** Image URL (data URL or object URL) for imaging agent */
    imageUrl?: string;
    /** Vitals: temperature, HR, SpO2, BP etc. */
    vitals?: {
        temperature?: number;   // °C
        heartRate?: number;     // bpm
        spo2?: number;          // %
        systolicBP?: number;    // mmHg
        diastolicBP?: number;   // mmHg
        respiratoryRate?: number;
    };
}

/** Generic result returned by every agent */
export interface AgentResult<T = unknown> {
    status: 'done' | 'error';
    data?: T;
    error?: string;
    durationMs: number;
    /** Optional plain-English reasoning trace */
    reasoning?: string;
}

/** Describes a single agent's current live state during orchestration */
export interface AgentState {
    name: string;
    description: string;
    icon: string;        // lucide icon name as string
    status: AgentStatus;
    durationMs?: number;
    error?: string;
}

// ── Specialist Agent Output Types ─────────────────────────────────────────────

export interface DiagnosisOutput {
    conditions: Array<{ name: string; confidence: number; icd10?: string }>;
    primaryDiagnosis: string;
    differentials: string[];
    recommendedTests: string[];
}

export interface ImagingOutput {
    anomalies: Array<{ label: string; confidence: number; region: string }>;
    primaryFinding: string;
    severity: 'Normal' | 'Mild' | 'Moderate' | 'Severe';
    boundingRegions: Array<{ x: number; y: number; w: number; h: number; label: string }>;
}

export interface TreatmentOutput {
    medications: Array<{ name: string; dosage: string; frequency: string; duration: string }>;
    procedures: string[];
    followUpDays: number;
    referrals: string[];
    notes: string;
}

export interface TriageOutput {
    urgency: 'Critical' | 'Urgent' | 'Moderate' | 'Routine';
    urgencyScore: number;   // 0–100
    reasons: string[];
    estimatedWaitMinutes: number;
}

export interface SummarizationOutput {
    summary: string;        // GP-readable paragraph
    keyFindings: string[];
    actionItems: string[];
    generatedAt: string;
}

/** Combined output of a full orchestration pipeline run */
export interface PipelineResult {
    patientId?: string;
    diagnosis?: AgentResult<DiagnosisOutput>;
    imaging?: AgentResult<ImagingOutput>;
    treatment?: AgentResult<TreatmentOutput>;
    triage?: AgentResult<TriageOutput>;
    summary?: AgentResult<SummarizationOutput>;
    totalDurationMs: number;
    completedAt: string;
}
