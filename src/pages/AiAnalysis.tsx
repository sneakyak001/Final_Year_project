import { useState, useEffect } from 'react';
import { UploadCloud, Activity, AlertTriangle, FileText, Settings, HeartPulse, Save } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db';
import { useToast } from '../components/Toast';
import PageTransition from '../components/PageTransition';
import './AiAnalysis.css';

export default function AiAnalysis() {
    const [isScanning, setIsScanning] = useState(false);
    const [scanComplete, setScanComplete] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const { showToast } = useToast();

    // To let user pick a patient to attach results to
    const patients = useLiveQuery(() => db.patients.orderBy('name').toArray(), []) || [];
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        document.title = 'HMS Enterprise – AI Diagnostic Lab';
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const imgUrl = URL.createObjectURL(e.target.files[0]);
            setUploadedImage(imgUrl);
            setScanComplete(false);
        }
    };

    const runAnalysis = () => {
        if (!uploadedImage) return;
        setIsScanning(true);
        setTimeout(() => {
            setIsScanning(false);
            setScanComplete(true);
        }, 3500);
    };

    const handleSaveToRecord = async () => {
        if (!selectedPatientId) {
            showToast('Please select a patient to attach this analysis to.', 'error');
            return;
        }
        setIsSaving(true);
        try {
            const { logAuditLog } = await import('../db');
            await db.patients.update(selectedPatientId, {
                status: 'Pending Review',
                risk: 'High',
                aiConfidence: 88,
                condition: 'Pneumonia (AI Flagged)',
                lastSync: new Date().toLocaleString(),
            });
            await logAuditLog(
                'AI Analysis Saved',
                selectedPatientId,
                'AI Lab',
                'doctor',
                `AI diagnostic report saved to patient ${selectedPatientId}. Condition: Pneumonia (AI Flagged), Confidence: 88%.`
            );
            showToast('AI analysis saved to patient record successfully.', 'success');
            setScanComplete(false);
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
                                    <button className="btn-ghost btn-sm" onClick={() => { setUploadedImage(null); setScanComplete(false); }}>
                                        Clear Image
                                    </button>
                                    <button
                                        className="btn-primary"
                                        onClick={runAnalysis}
                                        disabled={isScanning || scanComplete}
                                    >
                                        <Activity size={18} />
                                        {isScanning ? 'Running Deep Learning Model...' : 'Run Analysis'}
                                    </button>
                                </div>

                                <div className="scan-image-wrapper">
                                    {isScanning && <div className="scanning-overlay">
                                        <div className="scanning-line"></div>
                                        <div className="scanning-text">Analyzing pixel density...</div>
                                    </div>}

                                    {scanComplete && <div className="bounding-box pneumonia-detected">
                                        <span className="box-label">Opacity Detected (0.88)</span>
                                    </div>}

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

                        {!scanComplete && !isScanning && (
                            <div className="empty-state flex-1">
                                <Settings size={48} className="text-muted opacity-50 mb-4" />
                                <h3 className="text-muted fw-600">Awaiting Input</h3>
                                <p className="text-sm text-lighter text-center max-w-xs mt-2">
                                    Upload a medical image and run the analysis to generate a preliminary diagnostic report.
                                </p>
                            </div>
                        )}

                        {isScanning && (
                            <div className="processing-state flex-1">
                                <div className="spinner mb-4"></div>
                                <h3 className="text-main fw-700">Processing Image Tensor</h3>
                                <p className="text-sm text-muted mt-2">Extracting features and comparing against 1.2M records...</p>
                            </div>
                        )}

                        {scanComplete && (
                            <div className="report-content fade-in flex-1">
                                <div className="alert-box alert-warning mb-6">
                                    <AlertTriangle size={20} />
                                    <div>
                                        <h4 className="fw-700">Significant Abnormality Detected</h4>
                                        <p className="text-sm mt-1">High probability of lower-lobe consolidation indicative of Pneumonia.</p>
                                    </div>
                                </div>

                                <div className="metrics-grid mb-6">
                                    <div className="metric-box">
                                        <span className="text-muted text-sm block">Condition Probability</span>
                                        <span className="fw-800 text-lg text-main">88.4%</span>
                                    </div>
                                    <div className="metric-box">
                                        <span className="text-muted text-sm block">Model Confidence</span>
                                        <span className="fw-800 text-lg text-success">High</span>
                                    </div>
                                </div>

                                <h4 className="fw-700 text-main mb-3">Detected Biomarkers:</h4>
                                <ul className="biomarker-list">
                                    <li>
                                        <span className="marker-name">Focal Opacity</span>
                                        <div className="bar-bg"><div className="bar-fill" style={{ width: '90%' }}></div></div>
                                    </li>
                                    <li>
                                        <span className="marker-name">Pleural Effusion</span>
                                        <div className="bar-bg"><div className="bar-fill" style={{ width: '35%' }}></div></div>
                                    </li>
                                    <li>
                                        <span className="marker-name">Cardiomegaly</span>
                                        <div className="bar-bg"><div className="bar-fill" style={{ width: '12%' }}></div></div>
                                    </li>
                                </ul>

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
