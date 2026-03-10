import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, Image as ImageIcon, Activity, FileText, Download, Check, RefreshCw } from 'lucide-react';
import { type PatientRec } from '../db';
import { useToast } from '../components/Toast';
import PageTransition from '../components/PageTransition';
import './PatientDetail.css';

export default function PatientDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [patient, setPatient] = useState<PatientRec | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [clinicalNotes, setClinicalNotes] = useState('');
    const [isActing, setIsActing] = useState(false);

    useEffect(() => {
        async function fetchPatient() {
            if (!id) return;
            setIsLoading(true);
            try {
                const { default: db } = await import('../db');
                const found = await db.patients.get(id);
                setPatient(found ?? null);
                if (found) {
                    document.title = `HMS Enterprise – ${found.name}`;
                }
            } catch (error) {
                console.error("Failed to fetch patient:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchPatient();
    }, [id]);

    const [activeTab, setActiveTab] = useState('overview');

    const handleConfirmDiagnosis = async () => {
        if (!patient || isActing) return;
        setIsActing(true);
        try {
            const { default: db, logAuditLog } = await import('../db');
            await db.patients.update(patient.id, {
                status: 'Reviewed',
                risk: patient.risk,
                lastSync: new Date().toLocaleString(),
            });
            await logAuditLog(
                'Diagnosis Confirmed',
                patient.id,
                patient.name,
                'doctor',
                `Doctor confirmed AI diagnosis for patient ${patient.id}. Notes: ${clinicalNotes || 'None provided.'}`
            );
            setPatient(prev => prev ? { ...prev, status: 'Reviewed' } : prev);
            showToast('Diagnosis confirmed and saved to patient record.', 'success');
        } catch {
            showToast('Failed to confirm diagnosis. Please try again.', 'error');
        } finally {
            setIsActing(false);
        }
    };

    const handleRequestNewScan = async () => {
        if (!patient || isActing) return;
        setIsActing(true);
        try {
            const { default: db, logAuditLog } = await import('../db');
            await db.patients.update(patient.id, {
                status: 'Awaiting Analysis',
                lastSync: new Date().toLocaleString(),
            });
            await logAuditLog(
                'New Scan Requested',
                patient.id,
                patient.name,
                'doctor',
                `Doctor requested a new scan for patient ${patient.id}.`
            );
            setPatient(prev => prev ? { ...prev, status: 'Awaiting Analysis' } : prev);
            showToast('New scan request submitted. Field worker will be notified.', 'info');
        } catch {
            showToast('Failed to submit scan request. Please try again.', 'error');
        } finally {
            setIsActing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 text-center text-muted flex flex-col items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <h2 className="title-md">Loading Patient Record...</h2>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="p-8 text-center text-muted" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <h2 className="title-lg mb-2">Patient Not Found</h2>
                <p>The patient record you are looking for does not exist or has been removed.</p>
                <button className="btn-primary mt-4" onClick={() => navigate('/patients')}>
                    <ArrowLeft size={16} /> Back to Directory
                </button>
            </div>
        );
    }

    const isDiagnosisConfirmed = patient.status === 'Reviewed';

    return (
        <PageTransition>
            <div className="patient-detail animate-fade-in">
                <div className="detail-header-nav">
                    <button className="btn-ghost btn-back" onClick={() => navigate('/patients')}>
                        <ArrowLeft size={18} />
                        Back to Directory
                    </button>
                </div>

                <div className="detail-card card">
                    <div className="patient-profile">
                        <div className="profile-avatar avatar l-avatar" aria-hidden="true">
                            {patient.name.charAt(0)}
                        </div>
                        <div className="profile-info">
                            <h1 className="title-lg">{patient.name}</h1>
                            <p className="text-muted text-sm mt-1">
                                {patient.id} • {patient.age} yrs • {patient.gender} • {patient.location}
                            </p>
                            <span className={`badge badge-${patient.risk === 'High' ? 'danger' : patient.risk === 'Moderate' ? 'warning' : 'success'} mt-2`}>
                                Risk: {patient.risk}
                            </span>
                        </div>
                        <div className="profile-actions">
                            <span className={`status-indicator ${isDiagnosisConfirmed ? 'status-green' : 'status-yellow'}`} style={{ padding: '6px 12px' }}>
                                {patient.status}
                            </span>
                            <button className="btn-secondary" aria-label="Edit patient profile">
                                <Edit3 size={16} /> Edit Profile
                            </button>
                        </div>
                    </div>

                    <div className="detail-tabs mt-4">
                        <button
                            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                            onClick={() => setActiveTab('overview')}
                            aria-selected={activeTab === 'overview'}
                        >
                            <FileText size={18} /> Clinical Overview
                        </button>
                        <button
                            className={`tab-btn ai-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
                            onClick={() => setActiveTab('ai')}
                            aria-selected={activeTab === 'ai'}
                        >
                            <Activity size={18} /> AI Analysis Lab
                        </button>
                    </div>
                </div>

                <div className="detail-content-area">
                    {activeTab === 'overview' ? (
                        <div className="overview-tab fade-in">
                            <div className="card vitals-card">
                                <h3 className="title-md mb-4">Latest Vitals (Synced)</h3>
                                <div className="vitals-grid">
                                    <div className="vital-box">
                                        <span className="text-muted text-sm">Blood Pressure</span>
                                        <span className="fw-700 text-main mt-1 text-lg">120/80</span>
                                    </div>
                                    <div className="vital-box">
                                        <span className="text-muted text-sm">Heart Rate</span>
                                        <span className="fw-700 text-main mt-1 text-lg">72 bpm</span>
                                    </div>
                                    <div className="vital-box">
                                        <span className="text-muted text-sm">Temperature</span>
                                        <span className="fw-700 text-main mt-1 text-lg">98.6 °F</span>
                                    </div>
                                    <div className="vital-box">
                                        <span className="text-muted text-sm">SpO2</span>
                                        <span className="fw-700 text-main mt-1 text-lg">98%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="card history-card mt-4">
                                <div className="card-header">
                                    <h3 className="title-md">Field Notes &amp; Symptoms</h3>
                                    <span className="text-sm text-muted">Synced: {patient.lastSync}</span>
                                </div>
                                <div className="notes-container">
                                    <p className="text-main">
                                        Patient presented at village clinic complaining of persistent cough for 3 weeks, mild fever in the evenings, and sudden weight loss.
                                        Field worker captured an X-Ray using the portable unit and ran the initial offline AI model.
                                    </p>
                                    <div className="symptoms-tags mt-4">
                                        <span className="badge badge-warning">Chronic Cough</span>
                                        <span className="badge badge-warning">Night Sweats</span>
                                        <span className="badge badge-danger">Weight Loss</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="ai-tab fade-in">
                            <div className="ai-workspace">
                                <h2 className="title-md mb-4">Diagnostic Assessment</h2>
                                <p className="text-muted mb-4">Review the AI predictions generated offline by the field worker.</p>

                                <div className="ai-panels-grid">
                                    <div className="card scan-panel">
                                        <div className="card-header border-b pb-4 mb-4">
                                            <h3 className="fw-700 text-main flex items-center gap-2">
                                                <ImageIcon size={18} className="text-primary" />
                                                Chest X-Ray Analysis
                                            </h3>
                                            <button className="icon-btn-small" aria-label="Download X-Ray scan"><Download size={16} /></button>
                                        </div>

                                        <div className="scan-image-container">
                                            <div className="xray-placeholder">
                                                <div className="scanning-line"></div>
                                                <div className="bounding-box TB"></div>
                                                <img src="https://images.unsplash.com/photo-1559757175-0eafebfbde05?q=80&w=600&auto=format&fit=crop" alt="Chest X-Ray Scan for analysis" className="xray-img" />
                                            </div>
                                        </div>

                                        <div className="scan-results mt-4">
                                            <div className="result-row border-b pb-2 mb-2">
                                                <span className="text-muted text-sm">Model Prediction:</span>
                                                <span className="fw-700 text-danger">Tuberculosis (Upper Right Lobe)</span>
                                            </div>
                                            <div className="result-row">
                                                <span className="text-muted text-sm">Confidence Score:</span>
                                                <div className="confidence-bar-container">
                                                    <div className="confidence-bar danger" style={{ width: '92%' }}></div>
                                                    <span className="fw-700 text-main">92%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="decision-panel">
                                        <div className="card recommendation-card bg-primary-light border-primary">
                                            <h3 className="fw-700 text-primary flex items-center gap-2 mb-2">
                                                <Activity size={18} />
                                                System Recommendation
                                            </h3>
                                            <p className="text-sm text-main fw-500">
                                                Based on symptom convergence (Cough + Night Sweats + Weight Loss) and high-confidence X-Ray visual markers,
                                                the CDSS strongly recommends immediate intervention and confirmatory sputum testing for Tuberculosis.
                                            </p>
                                        </div>

                                        <div className="card doctor-action-card mt-4">
                                            <h3 className="fw-700 text-main mb-4">Doctor Review &amp; Verification</h3>

                                            {isDiagnosisConfirmed && (
                                                <div style={{ background: 'var(--accent-success-light)', border: '1px solid #A7F3D0', borderRadius: 6, padding: '12px 16px', marginBottom: 16, color: 'var(--accent-success)', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <Check size={16} /> Diagnosis confirmed. Record has been updated.
                                                </div>
                                            )}

                                            <div className="input-group">
                                                <label htmlFor="clinical-notes" className="input-label">Clinical Impression</label>
                                                <textarea
                                                    id="clinical-notes"
                                                    className="input-field textarea"
                                                    rows={4}
                                                    placeholder="Enter your notes and verification..."
                                                    value={clinicalNotes}
                                                    onChange={e => setClinicalNotes(e.target.value)}
                                                    disabled={isDiagnosisConfirmed}
                                                ></textarea>
                                            </div>

                                            <div className="action-buttons mt-4 flex gap-4">
                                                <button
                                                    className="btn-primary flex-1"
                                                    onClick={handleConfirmDiagnosis}
                                                    disabled={isDiagnosisConfirmed || isActing}
                                                    aria-label="Confirm AI diagnosis"
                                                >
                                                    <Check size={16} />
                                                    {isDiagnosisConfirmed ? 'Confirmed' : isActing ? 'Saving...' : 'Confirm Diagnosis'}
                                                </button>
                                                <button
                                                    className="btn-secondary flex-1"
                                                    onClick={handleRequestNewScan}
                                                    disabled={isActing}
                                                    aria-label="Request a new scan from field worker"
                                                >
                                                    <RefreshCw size={16} />
                                                    Request New Scan
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PageTransition>
    );
}
