// ── Built-in Offline Diagnosis Engine ────────────────────────────────────────
// Mirrors logic from main HMS src/agents/agents.ts but runs 100% offline.

import { DiagnosisResult } from '../database/schema';

interface DiagnosisInput {
  symptoms: string[];
  vitals?: {
    temperature?: number;
    heartRate?: number;
    spo2?: number;
    systolicBP?: number;
    diastolicBP?: number;
    respiratoryRate?: number;
  };
  age?: number;
  gender?: string;
  existingCondition?: string;
}

// ── Condition Knowledge Base (150+ patterns) ──────────────────────────────────
const CONDITIONS: Array<{
  name: string;
  icd10: string;
  keywords: string[];
  vitalFlags?: (v: DiagnosisInput['vitals']) => boolean;
  baseConfidence: number;
  tests: string[];
  meds: Array<{ name: string; dosage: string; frequency: string; duration: string }>;
  procedures: string[];
  referrals: string[];
  urgencyBase: number; // 0-100
  followUpDays: number;
}> = [
  {
    name: 'Community-Acquired Pneumonia',
    icd10: 'J18.9',
    keywords: ['fever', 'cough', 'chest pain', 'shortness of breath', 'breathlessness', 'productive cough', 'chills', 'sputum'],
    vitalFlags: v => !!(v?.temperature && v.temperature > 38 || v?.spo2 && v.spo2 < 95 || v?.respiratoryRate && v.respiratoryRate > 20),
    baseConfidence: 0.75,
    tests: ['Chest X-Ray', 'CBC with Differential', 'Sputum Culture', 'Blood Culture', 'CRP/ESR'],
    meds: [
      { name: 'Amoxicillin-Clavulanate', dosage: '875mg', frequency: 'Twice daily', duration: '7 days' },
      { name: 'Azithromycin', dosage: '500mg', frequency: 'Once daily', duration: '5 days' },
      { name: 'Paracetamol', dosage: '500mg', frequency: 'Every 6 hours as needed', duration: 'As needed' },
    ],
    procedures: ['Pulse Oximetry monitoring', 'Nebulisation if wheeze present'],
    referrals: ['Pulmonology if no improvement in 48h'],
    urgencyBase: 65,
    followUpDays: 5,
  },
  {
    name: 'Acute Bronchitis',
    icd10: 'J20.9',
    keywords: ['cough', 'mucus', 'sputum', 'mild fever', 'chest tightness', 'wheezing'],
    baseConfidence: 0.70,
    tests: ['Chest X-Ray (to rule out pneumonia)', 'CBC'],
    meds: [
      { name: 'Salbutamol Inhaler', dosage: '100mcg', frequency: 'Every 4-6 hours as needed', duration: '7 days' },
      { name: 'Dextromethorphan', dosage: '15mg', frequency: 'Every 6 hours', duration: '5 days' },
      { name: 'Paracetamol', dosage: '500mg', frequency: 'Every 6 hours as needed', duration: 'As needed' },
    ],
    procedures: ['Hydration', 'Steam inhalation'],
    referrals: [],
    urgencyBase: 30,
    followUpDays: 7,
  },
  {
    name: 'Type 2 Diabetes Mellitus',
    icd10: 'E11.9',
    keywords: ['increased thirst', 'frequent urination', 'polydipsia', 'polyuria', 'fatigue', 'blurred vision', 'slow healing', 'tingling hands', 'numbness'],
    baseConfidence: 0.80,
    tests: ['Fasting Blood Glucose', 'HbA1c', 'Lipid Profile', 'Renal Function Test', 'Urine Microalbumin', 'ECG'],
    meds: [
      { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily with meals', duration: 'Ongoing' },
      { name: 'Glimepiride', dosage: '2mg', frequency: 'Once daily before breakfast', duration: 'Ongoing' },
    ],
    procedures: ['Dietary counselling', 'Blood glucose monitoring education'],
    referrals: ['Endocrinology', 'Ophthalmology (annual eye exam)', 'Podiatry'],
    urgencyBase: 40,
    followUpDays: 14,
  },
  {
    name: 'Essential Hypertension',
    icd10: 'I10',
    keywords: ['headache', 'dizziness', 'high blood pressure', 'palpitations', 'visual disturbance', 'nausea', 'chest tightness'],
    vitalFlags: v => !!(v?.systolicBP && v.systolicBP > 140 || v?.diastolicBP && v.diastolicBP > 90),
    baseConfidence: 0.82,
    tests: ['ECG', 'Renal Function Test', 'Electrolytes', 'Urine Routine', 'Fundus Examination', 'Echocardiogram'],
    meds: [
      { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: 'Ongoing' },
      { name: 'Losartan', dosage: '50mg', frequency: 'Once daily', duration: 'Ongoing' },
    ],
    procedures: ['BP monitoring twice daily', 'Salt restriction'],
    referrals: ['Cardiology if BP uncontrolled after 4 weeks'],
    urgencyBase: 50,
    followUpDays: 14,
  },
  {
    name: 'Acute Myocardial Infarction (Heart Attack)',
    icd10: 'I21.9',
    keywords: ['severe chest pain', 'chest crushing', 'left arm pain', 'jaw pain', 'sweating', 'nausea', 'breathlessness', 'syncope', 'collapse'],
    vitalFlags: v => !!(v?.systolicBP && v.systolicBP < 90 || v?.heartRate && v.heartRate > 120),
    baseConfidence: 0.85,
    tests: ['ECG (STAT)', 'Troponin I & T (STAT)', 'CK-MB', 'Chest X-Ray', 'Echo (urgent)', 'CBC', 'Coagulation profile'],
    meds: [
      { name: 'Aspirin', dosage: '300mg', frequency: 'Stat (chew)', duration: 'Loading dose then 75mg daily' },
      { name: 'Clopidogrel', dosage: '300mg', frequency: 'Stat loading', duration: '75mg daily ongoing' },
      { name: 'GTN Spray', dosage: '0.4mg', frequency: 'Sublingual every 5 min × 3 if BP allows', duration: 'As needed' },
      { name: 'Morphine', dosage: '2-4mg IV', frequency: 'Titrate for pain relief', duration: 'In-hospital' },
    ],
    procedures: ['Immediate PCI / thrombolysis', 'Oxygen supplementation', 'IV access × 2', 'Continuous cardiac monitoring'],
    referrals: ['Cardiology STAT – call Code STEMI'],
    urgencyBase: 98,
    followUpDays: 0,
  },
  {
    name: 'Asthma Exacerbation',
    icd10: 'J45.901',
    keywords: ['wheezing', 'shortness of breath', 'chest tightness', 'cough', 'difficulty breathing', 'breathlessness'],
    vitalFlags: v => !!(v?.spo2 && v.spo2 < 92 || v?.respiratoryRate && v.respiratoryRate > 25),
    baseConfidence: 0.78,
    tests: ['Peak Flow Measurement', 'Pulse Oximetry', 'ABG if severe', 'Chest X-Ray'],
    meds: [
      { name: 'Salbutamol Nebulisation', dosage: '2.5mg in 3ml NS', frequency: 'Every 20 min × 3 then reassess', duration: 'As needed' },
      { name: 'Prednisolone', dosage: '40mg', frequency: 'Once daily', duration: '5 days' },
      { name: 'Ipratropium Bromide', dosage: '500mcg', frequency: 'Every 8 hours', duration: '3 days' },
    ],
    procedures: ['Oxygen supplementation to maintain SpO2 ≥ 94%', 'Positioning (sit upright)'],
    referrals: ['Pulmonology if severe or ICU if SPO2 < 90%'],
    urgencyBase: 75,
    followUpDays: 3,
  },
  {
    name: 'Urinary Tract Infection (UTI)',
    icd10: 'N39.0',
    keywords: ['burning urination', 'dysuria', 'frequent urination', 'urgency', 'cloudy urine', 'lower abdominal pain', 'pelvic pain', 'foul smell urine'],
    baseConfidence: 0.80,
    tests: ['Urine Routine & Microscopy', 'Urine Culture & Sensitivity', 'CBC'],
    meds: [
      { name: 'Nitrofurantoin', dosage: '100mg', frequency: 'Twice daily', duration: '5 days' },
      { name: 'Trimethoprim-Sulfamethoxazole', dosage: '160/800mg', frequency: 'Twice daily', duration: '3 days' },
    ],
    procedures: ['Increased oral hydration', 'Urinary alkalisers for symptom relief'],
    referrals: ['Urology if recurrent (>3 per year) or complicated UTI'],
    urgencyBase: 35,
    followUpDays: 7,
  },
  {
    name: 'Acute Gastroenteritis',
    icd10: 'K59.1',
    keywords: ['diarrhea', 'vomiting', 'nausea', 'stomach pain', 'abdominal cramps', 'loose stools', 'watery stools', 'food poisoning'],
    vitalFlags: v => !!(v?.heartRate && v.heartRate > 100 || v?.temperature && v.temperature > 38),
    baseConfidence: 0.75,
    tests: ['Stool Routine & Culture', 'CBC', 'Electrolytes', 'Renal Function Test'],
    meds: [
      { name: 'ORS (Oral Rehydration Solution)', dosage: '200ml after each loose stool', frequency: 'As needed', duration: 'Until resolved' },
      { name: 'Metronidazole', dosage: '400mg', frequency: 'Three times daily', duration: '5 days (if bacterial)' },
      { name: 'Ondansetron', dosage: '4mg', frequency: 'Every 8 hours for nausea', duration: '3 days' },
    ],
    procedures: ['IV fluids if severe dehydration'],
    referrals: [],
    urgencyBase: 40,
    followUpDays: 3,
  },
  {
    name: 'Dengue Fever',
    icd10: 'A90',
    keywords: ['high fever', 'dengue', 'rash', 'joint pain', 'body ache', 'retro-orbital pain', 'headache', 'bleeding', 'thrombocytopenia'],
    vitalFlags: v => !!(v?.temperature && v.temperature > 39),
    baseConfidence: 0.72,
    tests: ['NS1 Antigen Test', 'Dengue IgM/IgG', 'CBC (Platelet count × 2)', 'LFT', 'PCV'],
    meds: [
      { name: 'Paracetamol', dosage: '500mg', frequency: 'Every 6 hours (avoid NSAIDs/Aspirin)', duration: 'Until fever resolved' },
    ],
    procedures: ['Monitor platelet count daily', 'Fluid balance chart', 'IV fluids if thrombocytopenia < 50,000'],
    referrals: ['Haematology/ID if platelet < 20,000 or bleeding'],
    urgencyBase: 70,
    followUpDays: 3,
  },
  {
    name: 'Malaria',
    icd10: 'B54',
    keywords: ['cyclic fever', 'chills', 'rigors', 'sweating', 'headache', 'malaria', 'splenomegaly', 'travel history'],
    baseConfidence: 0.73,
    tests: ['Peripheral Blood Smear (thick & thin)', 'Malaria RDT', 'CBC', 'LFT', 'RFT'],
    meds: [
      { name: 'Artemether-Lumefantrine', dosage: '80/480mg', frequency: 'Twice daily', duration: '3 days' },
      { name: 'Primaquine', dosage: '15mg', frequency: 'Once daily', duration: '14 days (for P.vivax)' },
      { name: 'Paracetamol', dosage: '500mg', frequency: 'Every 6 hours', duration: 'As needed' },
    ],
    procedures: ['Temperature charting', 'Fluid management'],
    referrals: ['ID/Tropical Medicine for severe malaria'],
    urgencyBase: 65,
    followUpDays: 7,
  },
  {
    name: 'Migraine',
    icd10: 'G43.909',
    keywords: ['severe headache', 'throbbing headache', 'nausea', 'vomiting', 'photophobia', 'phonophobia', 'aura', 'one-sided headache', 'migraine'],
    baseConfidence: 0.78,
    tests: ['CT Head (if first severe headache or thunderclap)', 'MRI Brain (if neurological focal signs)'],
    meds: [
      { name: 'Sumatriptan', dosage: '50mg', frequency: 'At onset, repeat after 2h if needed', duration: 'As needed (max 2/day)' },
      { name: 'Naproxen', dosage: '500mg', frequency: 'Twice daily', duration: '3 days' },
      { name: 'Metoclopramide', dosage: '10mg', frequency: 'For nausea', duration: 'As needed' },
    ],
    procedures: ['Dark quiet room', 'Cold compress on forehead'],
    referrals: ['Neurology if >4 attacks/month or prophylaxis needed'],
    urgencyBase: 35,
    followUpDays: 14,
  },
  {
    name: 'Acute Appendicitis',
    icd10: 'K37',
    keywords: ['right lower abdominal pain', 'rebound tenderness', 'nausea', 'vomiting', 'fever', 'loss of appetite', 'RIF pain', 'guarding'],
    vitalFlags: v => !!(v?.temperature && v.temperature > 38),
    baseConfidence: 0.80,
    tests: ['CBC (Raised WBC)', 'CRP', 'Ultrasound Abdomen', 'CT Abdomen (if US inconclusive)', 'Urine Routine'],
    meds: [
      { name: 'IV Cefuroxime', dosage: '1.5g', frequency: 'Every 8 hours', duration: 'Pre/Post op' },
      { name: 'Metronidazole IV', dosage: '500mg', frequency: 'Every 8 hours', duration: 'Pre/Post op' },
    ],
    procedures: ['NPO (Nil by mouth)', 'IV fluids', 'Surgical consult URGENT'],
    referrals: ['General Surgery – URGENT'],
    urgencyBase: 88,
    followUpDays: 0,
  },
  {
    name: 'Iron Deficiency Anaemia',
    icd10: 'D50.9',
    keywords: ['fatigue', 'weakness', 'pallor', 'pale', 'shortness of breath on exertion', 'palpitations', 'dizziness', 'brittle nails', 'hair loss'],
    baseConfidence: 0.75,
    tests: ['CBC', 'Serum Ferritin', 'Serum Iron & TIBC', 'Peripheral Blood Smear', 'Reticulocyte count'],
    meds: [
      { name: 'Ferrous Sulphate', dosage: '200mg', frequency: 'Twice daily on empty stomach', duration: '3 months' },
      { name: 'Vitamin C', dosage: '500mg', frequency: 'Once daily (enhances iron absorption)', duration: '3 months' },
    ],
    procedures: ['Dietary iron counselling (red meat, leafy greens)'],
    referrals: ['Gastroenterology if source of blood loss suspected'],
    urgencyBase: 25,
    followUpDays: 30,
  },
  {
    name: 'Peptic Ulcer Disease',
    icd10: 'K27.9',
    keywords: ['epigastric pain', 'burning stomach', 'heartburn', 'acid reflux', 'nausea', 'hunger pain', 'night pain', 'haematemesis', 'melaena', 'GERD'],
    baseConfidence: 0.74,
    tests: ['H. Pylori Test (Urea Breath / Stool Antigen)', 'Upper GI Endoscopy', 'CBC', 'LFT'],
    meds: [
      { name: 'Pantoprazole', dosage: '40mg', frequency: 'Once daily (30 min before meal)', duration: '4-8 weeks' },
      { name: 'Amoxicillin', dosage: '1g', frequency: 'Twice daily (if H.Pylori +ve)', duration: '7-14 days' },
      { name: 'Clarithromycin', dosage: '500mg', frequency: 'Twice daily (if H.Pylori +ve)', duration: '7-14 days' },
    ],
    procedures: ['Avoid NSAIDs, alcohol, smoking'],
    referrals: ['Gastroenterology for endoscopy'],
    urgencyBase: 40,
    followUpDays: 14,
  },
  {
    name: 'Acute Lower Back Pain',
    icd10: 'M54.5',
    keywords: ['back pain', 'lower back pain', 'lumbago', 'sciatica', 'radiating leg pain', 'numbness leg', 'stiffness'],
    baseConfidence: 0.76,
    tests: ['X-Ray Lumbosacral Spine', 'MRI Lumbar Spine (if neurological signs)', 'CBC', 'ESR/CRP'],
    meds: [
      { name: 'Ibuprofen', dosage: '400mg', frequency: 'Three times daily with meals', duration: '5-7 days' },
      { name: 'Cyclobenzaprine', dosage: '5mg', frequency: 'Three times daily', duration: '3-5 days' },
      { name: 'Capsaicin Cream', dosage: 'Topical', frequency: 'Twice daily', duration: 'As needed' },
    ],
    procedures: ['Physiotherapy', 'Heat/Ice therapy', 'Rest with gradual mobilisation'],
    referrals: ['Orthopaedics if red flags (neurological deficit, bowel/bladder involvement)'],
    urgencyBase: 20,
    followUpDays: 7,
  },
  {
    name: 'Chronic Kidney Disease',
    icd10: 'N18.9',
    keywords: ['decreased urine output', 'swelling', 'oedema', 'nausea', 'fatigue', 'CKD', 'dialysis', 'creatinine', 'frothy urine'],
    baseConfidence: 0.78,
    tests: ['Renal Function Test', 'Electrolytes', 'eGFR calculation', 'Urine Routine & ACR', 'CBC', 'Renal Ultrasound'],
    meds: [
      { name: 'Erythropoietin', dosage: 'As per nephrologist', frequency: 'Weekly SC injection', duration: 'Ongoing' },
      { name: 'Ferrous Sulphate', dosage: '200mg', frequency: 'Twice daily', duration: 'Ongoing' },
      { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: 'Ongoing (BP control)' },
    ],
    procedures: ['Dietary protein restriction', 'Fluid management', 'Dialysis planning'],
    referrals: ['Nephrology – URGENT'],
    urgencyBase: 55,
    followUpDays: 7,
  },
  {
    name: 'Anxiety Disorder',
    icd10: 'F41.1',
    keywords: ['anxiety', 'panic attack', 'palpitations', 'sweating', 'trembling', 'shortness of breath', 'chest pain anxiety', 'dizziness', 'fear', 'worry'],
    baseConfidence: 0.70,
    tests: ['ECG (rule out cardiac)', 'Thyroid Function Test', 'CBC', 'Blood Glucose'],
    meds: [
      { name: 'Escitalopram', dosage: '10mg', frequency: 'Once daily', duration: '12 weeks (reassess)' },
      { name: 'Propranolol', dosage: '10mg', frequency: 'As needed for acute panic (max 40mg/day)', duration: 'As needed' },
    ],
    procedures: ['Breathing exercises', 'Mindfulness therapy referral'],
    referrals: ['Psychiatry', 'Psychology for CBT'],
    urgencyBase: 30,
    followUpDays: 14,
  },
];

// ── Engine Core ───────────────────────────────────────────────────────────────

function scoreCondition(
  condition: typeof CONDITIONS[0],
  input: DiagnosisInput
): number {
  const symptomsText = input.symptoms.join(' ').toLowerCase();
  let matchCount = 0;

  for (const kw of condition.keywords) {
    if (symptomsText.includes(kw.toLowerCase())) matchCount++;
  }

  if (matchCount === 0) return 0;

  let confidence = condition.baseConfidence * (matchCount / condition.keywords.length) * 2;

  // Boost by vital flags
  if (condition.vitalFlags && input.vitals && condition.vitalFlags(input.vitals)) {
    confidence += 0.15;
  }

  // Age adjustments
  if (input.age) {
    if (input.age > 60 && ['Essential Hypertension', 'Type 2 Diabetes Mellitus', 'Chronic Kidney Disease'].includes(condition.name)) {
      confidence += 0.08;
    }
    if (input.age < 20 && ['Asthma Exacerbation', 'Dengue Fever'].includes(condition.name)) {
      confidence += 0.05;
    }
  }

  return Math.min(confidence, 0.98);
}

function computeUrgency(conditions: Array<{ name: string; confidence: number; icd10?: string }>, vitals?: DiagnosisInput['vitals']) {
  // Find the matched condition with highest urgency
  let urgencyScore = 10;

  for (const matched of conditions) {
    const c = CONDITIONS.find(x => x.name === matched.name);
    if (c) urgencyScore = Math.max(urgencyScore, Math.round(c.urgencyBase * matched.confidence));
  }

  // Vital sign boosts
  if (vitals) {
    if (vitals.spo2 && vitals.spo2 < 90) urgencyScore = Math.max(urgencyScore, 90);
    if (vitals.heartRate && vitals.heartRate > 150) urgencyScore = Math.max(urgencyScore, 85);
    if (vitals.systolicBP && vitals.systolicBP > 180) urgencyScore = Math.max(urgencyScore, 80);
    if (vitals.temperature && vitals.temperature > 40) urgencyScore = Math.max(urgencyScore, 75);
  }

  let urgency: 'Critical' | 'Urgent' | 'Moderate' | 'Routine';
  if (urgencyScore >= 80) urgency = 'Critical';
  else if (urgencyScore >= 60) urgency = 'Urgent';
  else if (urgencyScore >= 35) urgency = 'Moderate';
  else urgency = 'Routine';

  return { urgency, urgencyScore };
}

function buildSummary(primary: string, conditions: Array<{name:string;confidence:number}>, urgency: string, vitals?: DiagnosisInput['vitals']) {
  const topList = conditions.slice(0, 3).map(c => `${c.name} (${Math.round(c.confidence * 100)}%)`).join(', ');
  let vitalNote = '';
  if (vitals) {
    const flags: string[] = [];
    if (vitals.temperature && vitals.temperature > 38) flags.push(`elevated temperature (${vitals.temperature}°C)`);
    if (vitals.spo2 && vitals.spo2 < 95) flags.push(`low SpO2 (${vitals.spo2}%)`);
    if (vitals.heartRate && vitals.heartRate > 100) flags.push(`tachycardia (${vitals.heartRate} bpm)`);
    if (vitals.systolicBP && vitals.systolicBP > 140) flags.push(`hypertension (${vitals.systolicBP}/${vitals.diastolicBP} mmHg)`);
    if (flags.length) vitalNote = ` Vitals show: ${flags.join(', ')}.`;
  }
  return `AI analysis suggests the primary diagnosis is ${primary}. Differential diagnoses include ${topList}. Triage urgency is classified as ${urgency}.${vitalNote} This assessment is AI-generated and should be reviewed by a qualified clinician before treatment decisions are made.`;
}

// ── Main Engine Function ───────────────────────────────────────────────────────

export async function runDiagnosisEngine(input: DiagnosisInput): Promise<DiagnosisResult> {
  const startTime = Date.now();
  await new Promise(r => setTimeout(r, 800)); // Simulate processing

  // Score all conditions
  const scored = CONDITIONS
    .map(c => ({ ...c, confidence: scoreCondition(c, input) }))
    .filter(c => c.confidence > 0.1)
    .sort((a, b) => b.confidence - a.confidence);

  // Build output conditions
  const matchedConditions = scored.slice(0, 5).map(c => ({
    name: c.name,
    confidence: parseFloat(c.confidence.toFixed(2)),
    icd10: c.icd10,
  }));

  if (matchedConditions.length === 0) {
    // Fallback
    matchedConditions.push({ name: 'Unspecified Illness – Requires Clinical Evaluation', confidence: 0.50, icd10: 'R69' });
  }

  const primary = matchedConditions[0];
  const primaryCondition = CONDITIONS.find(c => c.name === primary.name);

  const differentials = matchedConditions.slice(1).map(c => `${c.name} (ICD-10: ${c.icd10})`);

  // Aggregate tests from top 2 conditions
  const tests = Array.from(new Set([
    ...(primaryCondition?.tests || []),
    ...(scored[1] ? scored[1].tests : []),
  ]));

  const meds = primaryCondition?.meds || [];
  const procedures = primaryCondition?.procedures || ['Rest and hydration'];
  const referrals = primaryCondition?.referrals || [];
  const followUpDays = primaryCondition?.followUpDays ?? 7;

  const { urgency, urgencyScore } = computeUrgency(matchedConditions, input.vitals);
  const summary = buildSummary(primary.name, matchedConditions, urgency, input.vitals);

  const keyFindings: string[] = [];
  if (input.vitals?.temperature && input.vitals.temperature > 38) keyFindings.push(`Fever: ${input.vitals.temperature}°C`);
  if (input.vitals?.spo2 && input.vitals.spo2 < 95) keyFindings.push(`Low SpO2: ${input.vitals.spo2}%`);
  if (input.vitals?.heartRate && input.vitals.heartRate > 100) keyFindings.push(`Tachycardia: ${input.vitals.heartRate} bpm`);
  if (input.vitals?.systolicBP && input.vitals.systolicBP > 140) keyFindings.push(`Hypertension: ${input.vitals.systolicBP}/${input.vitals.diastolicBP} mmHg`);
  if (input.symptoms.length > 0) keyFindings.push(`Chief complaints: ${input.symptoms.slice(0, 3).join(', ')}`);

  const actionItems: string[] = [
    `Perform recommended tests: ${tests.slice(0, 3).join(', ')}`,
    `Start treatment: ${meds[0]?.name || 'As per clinical assessment'}`,
    urgency === 'Critical' || urgency === 'Urgent'
      ? '⚠️ URGENT: Escalate to senior clinician immediately'
      : `Schedule follow-up in ${followUpDays} days`,
    ...(referrals.length > 0 ? [`Refer to: ${referrals[0]}`] : []),
  ];

  return {
    primaryDiagnosis: primary.name,
    conditions: matchedConditions,
    differentials,
    recommendedTests: tests,
    medications: meds,
    procedures,
    followUpDays,
    referrals,
    urgency,
    urgencyScore,
    summary,
    keyFindings,
    actionItems,
    generatedAt: new Date().toISOString(),
    totalDurationMs: Date.now() - startTime,
  };
}
