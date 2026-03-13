import type { DiagnosisPayload, DiagnosisOutput, ImagingOutput, TreatmentOutput, TriageOutput, SummarizationOutput } from './types';
import { BaseAgent } from './BaseAgent';

// ── AGENT 1: DiagnosisAgent ────────────────────────────────────────────────────

const CONDITION_PATTERNS: Record<string, { conditions: { name: string; confidence: number; icd10: string }[]; tests: string[] }> = {
    'fever|cough|chest': {
        conditions: [
            { name: 'Pneumonia', confidence: 0.84, icd10: 'J18.9' },
            { name: 'Acute Bronchitis', confidence: 0.71, icd10: 'J20.9' },
            { name: 'COVID-19', confidence: 0.65, icd10: 'U07.1' },
        ],
        tests: ['Chest X-Ray', 'CBC', 'PCR Swab', 'Blood Culture'],
    },
    'headache|nausea|fatigue': {
        conditions: [
            { name: 'Migraine', confidence: 0.78, icd10: 'G43.9' },
            { name: 'Viral Syndrome', confidence: 0.62, icd10: 'B34.9' },
            { name: 'Dehydration', confidence: 0.55, icd10: 'E86.0' },
        ],
        tests: ['CBC', 'Metabolic Panel', 'CT Head (if severe)'],
    },
    'chest pain|shortness|dyspnea': {
        conditions: [
            { name: 'Acute Coronary Syndrome', confidence: 0.82, icd10: 'I24.9' },
            { name: 'Pulmonary Embolism', confidence: 0.68, icd10: 'I26.9' },
            { name: 'Aortic Dissection', confidence: 0.21, icd10: 'I71.0' },
        ],
        tests: ['12-Lead ECG', 'Troponin', 'D-Dimer', 'CT Angiography'],
    },
    'abdominal|pain|vomit': {
        conditions: [
            { name: 'Acute Appendicitis', confidence: 0.74, icd10: 'K37' },
            { name: 'Gastroenteritis', confidence: 0.69, icd10: 'K52.9' },
            { name: 'Peptic Ulcer Disease', confidence: 0.58, icd10: 'K27.9' },
        ],
        tests: ['Ultrasound Abdomen', 'CBC', 'LFTs', 'Lipase'],
    },
    default: {
        conditions: [
            { name: 'Viral Upper Respiratory Infection', confidence: 0.60, icd10: 'J06.9' },
            { name: 'Functional Disorder', confidence: 0.45, icd10: 'R69' },
        ],
        tests: ['CBC', 'Metabolic Panel'],
    },
};

export class DiagnosisAgent extends BaseAgent<DiagnosisOutput> {
    readonly name = 'DiagnosisAgent';
    readonly description = 'Maps symptoms and vitals to probable conditions with ICD-10 codes';
    readonly icon = 'Stethoscope';

    protected async execute(payload: DiagnosisPayload): Promise<DiagnosisOutput> {
        await delay(1200);

        const text = [payload.symptoms ?? '', payload.patient?.condition ?? ''].join(' ').toLowerCase();

        let match = CONDITION_PATTERNS.default;
        for (const [pattern, result] of Object.entries(CONDITION_PATTERNS)) {
            if (pattern === 'default') continue;
            if (pattern.split('|').some(kw => text.includes(kw))) {
                match = result;
                break;
            }
        }

        // Modulate confidence by vitals
        const conditions = match.conditions.map(c => {
            let conf = c.confidence;
            if (payload.vitals?.temperature && payload.vitals.temperature > 38.5) conf = Math.min(1, conf + 0.05);
            if (payload.vitals?.spo2 && payload.vitals.spo2 < 94) conf = Math.min(1, conf + 0.08);
            return { ...c, confidence: Math.round(conf * 100) / 100 };
        });

        return {
            conditions,
            primaryDiagnosis: conditions[0].name,
            differentials: conditions.slice(1).map(c => c.name),
            recommendedTests: match.tests,
        };
    }
}

// ── AGENT 2: ImagingAgent ──────────────────────────────────────────────────────

export class ImagingAgent extends BaseAgent<ImagingOutput> {
    readonly name = 'ImagingAgent';
    readonly description = 'Analyses medical images for anomalies and generates bounding regions';
    readonly icon = 'ScanLine';

    protected async execute(payload: DiagnosisPayload): Promise<ImagingOutput> {
        await delay(1800);

        if (!payload.imageUrl) {
            return {
                anomalies: [],
                primaryFinding: 'No image provided',
                severity: 'Normal',
                boundingRegions: [],
            };
        }

        // Simulate heuristic image assessment
        const anomalies = [
            { label: 'Focal Opacity', confidence: 0.88, region: 'Lower-right lobe' },
            { label: 'Pleural Effusion', confidence: 0.34, region: 'Right costophrenic angle' },
            { label: 'Cardiomegaly', confidence: 0.12, region: 'Cardiac silhouette' },
        ];

        const severity = anomalies[0].confidence > 0.75 ? 'Severe' : anomalies[0].confidence > 0.5 ? 'Moderate' : 'Mild';

        return {
            anomalies,
            primaryFinding: `${anomalies[0].label} detected in ${anomalies[0].region}`,
            severity,
            boundingRegions: [
                { x: 55, y: 40, w: 20, h: 15, label: 'Opacity (0.88)' },
                { x: 70, y: 68, w: 12, h: 8, label: 'Effusion (0.34)' },
            ],
        };
    }
}

// ── AGENT 3: TreatmentAgent ────────────────────────────────────────────────────

const TREATMENT_MAP: Record<string, TreatmentOutput> = {
    Pneumonia: {
        medications: [
            { name: 'Amoxicillin-Clavulanate', dosage: '875mg', frequency: 'Twice daily', duration: '7 days' },
            { name: 'Azithromycin', dosage: '500mg', frequency: 'Once daily', duration: '5 days' },
            { name: 'Paracetamol', dosage: '1g', frequency: 'Every 6 hours PRN', duration: 'As needed' },
        ],
        procedures: ['Chest Physiotherapy', 'Supplemental O2 if SpO2 < 94%'],
        followUpDays: 7,
        referrals: ['Pulmonology (if no improvement in 48h)'],
        notes: 'Encourage fluid intake. Repeat CXR in 6 weeks.',
    },
    'Acute Coronary Syndrome': {
        medications: [
            { name: 'Aspirin', dosage: '300mg', frequency: 'Stat, then 75mg OD', duration: 'Indefinite' },
            { name: 'Clopidogrel', dosage: '75mg', frequency: 'Once daily', duration: 'Per cardiology' },
            { name: 'Atorvastatin', dosage: '80mg', frequency: 'Once nightly', duration: 'Indefinite' },
        ],
        procedures: ['ECG monitoring', 'IV Access', 'Cardiac catheterisation (if STEMI)'],
        followUpDays: 2,
        referrals: ['Cardiology – Urgent'],
        notes: 'Activate STEMI protocol if ST elevation present.',
    },
    default: {
        medications: [
            { name: 'Paracetamol', dosage: '500-1000mg', frequency: 'Every 4-6 hours PRN', duration: 'As needed' },
            { name: 'ORS Sachets', dosage: '1 sachet in 200ml water', frequency: 'After each loose stool', duration: 'Until resolved' },
        ],
        procedures: ['Rest', 'Adequate hydration'],
        followUpDays: 5,
        referrals: [],
        notes: 'Return if symptoms worsen or do not resolve within 3-5 days.',
    },
};

export class TreatmentAgent extends BaseAgent<TreatmentOutput> {
    readonly name = 'TreatmentAgent';
    readonly description = 'Generates evidence-based treatment protocols and medication plans';
    readonly icon = 'Pill';

    protected async execute(payload: DiagnosisPayload): Promise<TreatmentOutput> {
        await delay(1000);

        // Use condition from payload if set by orchestrator
        const condition = payload.patient?.condition ?? '';
        const plan = TREATMENT_MAP[condition] ?? TREATMENT_MAP.default;
        return plan;
    }
}

// ── AGENT 4: TriageAgent ───────────────────────────────────────────────────────

export class TriageAgent extends BaseAgent<TriageOutput> {
    readonly name = 'TriageAgent';
    readonly description = 'Calculates urgency score and prioritises emergency care';
    readonly icon = 'AlertOctagon';

    protected async execute(payload: DiagnosisPayload): Promise<TriageOutput> {
        await delay(700);

        let score = 20; // baseline Routine
        const reasons: string[] = [];

        const v = payload.vitals;
        if (v) {
            if (v.temperature && v.temperature >= 39.5) { score += 25; reasons.push('High fever (≥39.5°C)'); }
            if (v.spo2 && v.spo2 < 90) { score += 35; reasons.push('Critical hypoxia (SpO2 <90%)'); }
            else if (v.spo2 && v.spo2 < 94) { score += 20; reasons.push('Mild hypoxia (SpO2 <94%)'); }
            if (v.heartRate && v.heartRate > 120) { score += 15; reasons.push('Tachycardia (HR >120 bpm)'); }
            if (v.systolicBP && v.systolicBP < 90) { score += 30; reasons.push('Hypotension (SBP <90 mmHg)'); }
            if (v.respiratoryRate && v.respiratoryRate > 25) { score += 20; reasons.push('Tachypnea (RR >25)'); }
        }

        if (payload.patient?.risk === 'High') { score += 15; reasons.push('Pre-existing high-risk classification'); }

        const symptoms = (payload.symptoms ?? '').toLowerCase();
        if (symptoms.includes('chest pain') || symptoms.includes('cannot breathe')) {
            score += 25; reasons.push('Chest pain / respiratory distress reported');
        }

        score = Math.min(100, score);

        let urgency: TriageOutput['urgency'];
        let estimatedWaitMinutes: number;
        if (score >= 80) { urgency = 'Critical'; estimatedWaitMinutes = 0; }
        else if (score >= 55) { urgency = 'Urgent'; estimatedWaitMinutes = 15; }
        else if (score >= 35) { urgency = 'Moderate'; estimatedWaitMinutes = 60; }
        else { urgency = 'Routine'; estimatedWaitMinutes = 120; }

        if (reasons.length === 0) reasons.push('Stable vitals, no acute distress reported');

        return { urgency, urgencyScore: score, reasons, estimatedWaitMinutes };
    }
}

// ── AGENT 5: SummarizationAgent ───────────────────────────────────────────────

export class SummarizationAgent extends BaseAgent<SummarizationOutput> {
    readonly name = 'SummarizationAgent';
    readonly description = 'Synthesises pipeline outputs into a readable clinical summary';
    readonly icon = 'FileSignature';

    protected async execute(payload: DiagnosisPayload): Promise<SummarizationOutput> {
        await delay(900);

        const patientName = payload.patient?.name ?? 'the patient';
        const age = payload.patient?.age;
        const condition = payload.patient?.condition ?? 'unspecified condition';
        const symptoms = payload.symptoms ?? 'no specific symptoms provided';
        const risk = payload.patient?.risk ?? 'Unknown';

        const summary =
            `Clinical summary for ${patientName}${age ? `, ${age} years old` : ''}. ` +
            `Presenting with ${symptoms}. Current recorded condition: ${condition}. ` +
            `Risk classification: ${risk}. ` +
            `The multi-agent diagnostic pipeline has completed analysis. ` +
            `The DiagnosisAgent has identified probable conditions and recommended investigations. ` +
            `The TriageAgent has assessed urgency based on reported vitals and history. ` +
            `The TreatmentAgent has generated an evidence-based management plan. ` +
            `Please review the individual agent reports below and correlate with clinical findings. ` +
            `This AI-generated report is intended as clinical decision support, not a substitute for physician judgement.`;

        const keyFindings = [
            `Presenting complaint: ${symptoms}`,
            `Primary condition on record: ${condition}`,
            `Risk level: ${risk}`,
            payload.imageUrl ? 'Medical imaging provided for analysis' : 'No imaging study submitted',
        ];

        const actionItems = [
            'Review DiagnosisAgent recommended investigations',
            'Confirm TriageAgent urgency classification',
            'Initiate TreatmentAgent medication plan after physician review',
            'Schedule follow-up per treatment protocol',
        ];

        return {
            summary,
            keyFindings,
            actionItems,
            generatedAt: new Date().toISOString(),
        };
    }
}

// ── Utility ───────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
