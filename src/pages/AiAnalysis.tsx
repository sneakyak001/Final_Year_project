import { useState, useEffect } from 'react';
import { UploadCloud, Activity, AlertTriangle, FileText, Settings, HeartPulse, Save, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db';
import { useToast } from '../components/Toast';
import PageTransition from '../components/PageTransition';
import { useAgents } from '../context/AgentContext';
import './AiAnalysis.css';

export default function AiAnalysis() {
    const { runPipeline, agentStates, isRunning, lastResult, reset } = useAgents();
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const { showToast } = useToast();

    // To let user pick a patient to attach results to
    const patients = useLiveQuery(() => db.patients.orderBy('name').toArray(), []) || [];
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        document.title = 'HMS Enterprise – AI Diagnostic Lab';
        reset();
    }, [reset]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const imgUrl = URL.createObjectURL(e.target.files[0]);
            setUploadedImage(imgUrl);
            reset();
        }
    };

    const runAnalysis = async () => {
        if (!uploadedImage) return;
        
        await runPipeline({
            imageUrl: uploadedImage,
            symptoms: 'Patient scan uploaded for analysis.',
        });
    };

    const handleSaveToRecord = async () => {
        if (!selectedPatientId) {
            showToast('Please select a patient to attach this analysis to.', 'error');
            return;
        }
        setIsSaving(true);
        try {
            const { logAuditLog } = await import('../db');
            
            const topCondition = lastResult?.diagnosis?.data?.primaryDiagnosis || 'AI Flagged Anomaly';
            const aiConfidence = lastResult?.diagnosis?.data?.conditions?.[0]?.confidence
                ? Math.round(lastResult.diagnosis.data.conditions[0].confidence * 100)
                : 88;

            await db.patients.update(selectedPatientId, {
                status: 'Pending Review',
                risk: (lastResult?.triage?.data?.urgencyScore ?? 0) >= 55 ? 'High' : 'Moderate',
                aiConfidence,
                condition: `${topCondition} (AI Flagged)`,
                lastSync: new Date().toLocaleString(),
            });
            await logAuditLog(
                'AI Analysis Saved',
                selectedPatientId,
                'AI Lab',
                'doctor',
                `AI diagnostic report saved to patient ${selectedPatientId}. Condition: ${topCondition}, Confidence: ${aiConfidence}%.`
            );
            showToast('AI analysis saved to patient record successfully.', 'success');
            reset();
            setUploadedImage(null);
            setSelectedPatientId('');
        } catch {
            showToast('Failed to save analysis. Please try again.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <PageTransition>
            <div className="ai-analysis-page animate-fade-in">
                <div className="page-header mb-6">
                    <div>
                        <h1 className="title-lg flex items-center gap-3">
                            <HeartPulse size={32} className="text-danger" />
                            AI Diagnostic Lab
                        </h1>
                        <p className="text-sm mt-1">Run complex simulated models on patient scans and symptom clusters.</p>
                    </div>
                </div>

                <div className="analysis-grid">
                    <div className="upload-panel card">
                        <h2 className="title-md mb-4 flex items-center gap-2">
                            <UploadCloud size={20} className="text-primary" />
                            Medical Imaging Input
                        </h2>

                        {!uploadedImage ? (
                            <div className="upload-dropzone">
                                <input type="file" id="file-upload" className="hidden-input" accept="image/*" onChange={handleFileUpload} />
                                <label htmlFor="file-upload" className="upload-label">
                                    <div className="upload-icon-wrapper">
                                        <UploadCloud size={40} />
                                    </div>
                                    <h3 className="fw-700 mt-4 text-main">Click to upload X-Ray or MRI</h3>
                                    <p className="text-sm text-muted mt-2">Supports DICOM, JPG, PNG up to 50MB</p>
                                </label>
                            </div>
                        ) : (
                            <div className="scan-preview-container">
                                <div className="scan-controls mb-4">
                                    <button className="btn-ghost btn-sm" onClick={() => { setUploadedImage(null); reset(); }}>
                                        Clear Image
                                    </button>
                                    <button
                                        className="btn-primary"
                                        onClick={runAnalysis}
                                        disabled={isRunning || !!lastResult}
                                    >
                                        <Activity size={18} />
                                        {isRunning ? 'Running Agent Pipeline...' : 'Run Analysis'}
                                    </button>
                                </div>

                                <div className="scan-image-wrapper">
                                    {isRunning && <div className="scanning-overlay">
                                        <div className="scanning-line"></div>
                                        <div className="scanning-text">Agents Analyzing...</div>
                                    </div>}

                                    {lastResult?.imaging?.data?.boundingRegions?.map((r: any, i: number) => (
                                        <div key={i} className="bounding-box" style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }}>
                                            <span className="box-label">{r.label}</span>
                                        </div>
                                    ))}

                                    <img src={uploadedImage} alt="Uploaded medical scan for analysis" className="uploaded-scan-img" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="results-panel card flex flex-col">
                        <div className="card-header border-b pb-4 mb-4">
                            <h2 className="title-md flex items-center gap-2">
                                <FileText size={20} className="text-primary" />
                                Diagnostic Report
                            </h2>
                        </div>

                        {!lastResult && !isRunning && (
                            <div className="empty-state flex-1">
                                <Settings size={48} className="text-muted opacity-50 mb-4" />
                                <h3 className="text-muted fw-600">Awaiting Input</h3>
                                <p className="text-sm text-lighter text-center max-w-xs mt-2">
                                    Upload a medical image and run the analysis to generate a preliminary diagnostic report.
                                </p>
                            </div>
                        )}

                        {isRunning && (
                            <div className="processing-state flex-1">
                                <div className="spinner mb-4"></div>
                                <h3 className="text-main fw-700">Executing Agent Pipeline</h3>
                                <p className="text-sm text-muted mt-2 mb-6">Coordinating specialist AI models...</p>
                                
                                <div className="agent-progress-container w-full px-8">
                                    {agentStates.map(agent => (
                                        <div key={agent.name} className="agent-progress-item flex items-center justify-between mb-3 p-3 border rounded bg-surface">
                                            <div className="flex items-center gap-3">
                                                {agent.status === 'done' ? <CheckCircle size={18} className="text-success" /> 
                                                : agent.status === 'running' ? <Loader2 size={18} className="text-primary spin" />
                                                : <Clock size={18} className="text-muted opacity-50" />}
                                                <span className={`fw-600 ${agent.status === 'running' ? 'text-primary' : agent.status === 'done' ? 'text-success' : 'text-muted'}`}>
                                                    {agent.name}
                                                </span>
                                            </div>
                                            <span className="text-xs text-muted capitalize">{agent.status}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {lastResult && (
                            <div className="report-content fade-in flex-1">
                                <div className={`alert-box mb-6 ${(lastResult.triage?.data?.urgencyScore ?? 0) >= 55 ? 'alert-warning' : 'border-success'}`}>
                                    <AlertTriangle size={20} className={(lastResult.triage?.data?.urgencyScore ?? 0) >= 55 ? '' : 'text-success'} />
                                    <div>
                                        <h4 className="fw-700">{(lastResult.triage?.data?.urgencyScore ?? 0) >= 55 ? 'Significant Abnormality Detected' : 'No Critical Findings'}</h4>
                                        <p className="text-sm mt-1">{lastResult.imaging?.data?.primaryFinding}</p>
                                    </div>
                                </div>

                                <div className="metrics-grid mb-6">
                                    <div className="metric-box">
                                        <span className="text-muted text-sm block">Primary Condition</span>
                                        <span className="fw-800 text-md text-main line-clamp-1">{lastResult.diagnosis?.data?.primaryDiagnosis}</span>
                                    </div>
                                    <div className="metric-box">
                                        <span className="text-muted text-sm block">Triage Urgency</span>
                                        <span className={`fw-800 text-lg ${(lastResult.triage?.data?.urgencyScore ?? 0) >= 55 ? 'text-danger' : 'text-success'}`}>
                                            {lastResult.triage?.data?.urgency}
                                        </span>
                                    </div>
                                </div>

                                <h4 className="fw-700 text-main mb-3">Imaging Biomarkers:</h4>
                                <ul className="biomarker-list mb-6">
                                    {lastResult.imaging?.data?.anomalies.map((a: any, i: number) => (
                                        <li key={i}>
                                            <span className="marker-name flex justify-between">
                                                <span>{a.label}</span>
                                                <span>{Math.round(a.confidence * 100)}%</span>
                                            </span>
                                            <div className="bar-bg"><div className="bar-fill" style={{ width: `${a.confidence * 100}%` }}></div></div>
                                        </li>
                                    ))}
                                    {(lastResult.imaging?.data?.anomalies.length ?? 0) === 0 && (
                                        <li className="text-sm text-muted">No imaging anomalies detected.</li>
                                    )}
                                </ul>

                                <div className="summary-box p-4 rounded border mb-4" style={{ backgroundColor: 'var(--bg-surface-hover)', borderColor: 'var(--border-color)' }}>
                                    <h4 className="fw-600 text-sm text-muted mb-2 flex items-center gap-2">
                                        <FileText size={16} /> Clinical Summary
                                    </h4>
                                    <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>
                                        {lastResult.summary?.data?.summary}
                                    </p>
                                </div>

                                <div className="disclaimer-box p-3 rounded bg-surface border mb-4 flex items-start gap-3">
                                    <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" />
                                    <p className="text-xs text-muted leading-tight">
                                        <strong>Clinical Disclaimer:</strong> This AI diagnostic report is generated by an automated multi-agent orchestration pipeline. It is designed to assist healthcare professionals by highlighting potential imaging anomalies and suggesting differential diagnoses. It is <em>not</em> a substitute for professional medical judgment. All findings must be verified by a qualified clinician before informing patient care decisions.
                                    </p>
                                </div>

                                <div className="mt-6 pt-4 border-t">
                                    <label htmlFor="attach-patient" className="input-label mb-2 block">Attach to Patient Record</label>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <select
                                            id="attach-patient"
                                            className="input-field"
                                            style={{ flex: 1, minWidth: 180 }}
                                            value={selectedPatientId}
                                            onChange={e => setSelectedPatientId(e.target.value)}
                                        >
                                            <option value="">Select a patient...</option>
                                            {patients.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                                            ))}
                                        </select>
                                        <button
                                            className="btn-primary"
                                            onClick={handleSaveToRecord}
                                            disabled={isSaving}
                                            aria-label="Save AI analysis to patient record"
                                        >
                                            <Save size={16} />
                                            {isSaving ? 'Saving...' : 'Save to Record'}
                                        </button>
                                    </div>
                                    {patients.length === 0 && (
                                        <p className="text-sm text-muted mt-2">No patients in the system yet. Add patients from the Patient Directory first.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
