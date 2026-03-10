import { useState, useEffect } from 'react';
import { Search, Filter, Activity, User, ChevronRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { type PatientRec } from '../db';
import { useToast } from '../components/Toast';
import PageTransition from '../components/PageTransition';
import './Patients.css';

export default function Patients() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        document.title = 'HMS Enterprise – Patient Directory';
    }, []);

    // Fetch patients from Dexie database reactively
    const patients = useLiveQuery(() => db.patients.orderBy('createdAt').reverse().toArray(), []) || [];

    const [newPt, setNewPt] = useState({ name: '', age: '', gender: 'Female', location: '', condition: 'Pending Uploads' });

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.condition.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const generatePatientId = () => {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `PT-${timestamp.slice(-4)}${random}`;
    };

    const handleAddPatient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPt.name || !newPt.age || isAdding) return;

        setIsAdding(true);
        const pt: PatientRec = {
            id: generatePatientId(),
            name: newPt.name,
            age: parseInt(newPt.age, 10),
            gender: newPt.gender,
            location: newPt.location || 'Clinic A',
            condition: newPt.condition,
            status: 'Awaiting Analysis',
            risk: 'Low',
            lastSync: new Date().toLocaleString(),
            createdAt: Date.now()
        };

        try {
            await db.patients.add(pt);
            setNewPt({ name: '', age: '', gender: 'Female', location: '', condition: 'Pending Uploads' });
            setShowAddForm(false);
            showToast(`Patient "${pt.name}" registered successfully.`, 'success');
        } catch (error) {
            console.error("Failed to add patient to database:", error);
            showToast('Failed to save patient record. Please try again.', 'error');
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <PageTransition>
            <div className="patients-page animate-fade-in">
                <div className="page-header">
                    <div>
                        <h1 className="title-lg">Patient Directory</h1>
                        <p className="text-sm">Manage all synchronized patient records from field workers.</p>
                    </div>
                    <button className="btn-primary" onClick={() => setShowAddForm(true)} aria-label="Register new patient">
                        <User size={18} />
                        Add Patient
                    </button>
                </div>

                <AnimatePresence>
                    {showAddForm && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden mb-6"
                        >
                            <form onSubmit={handleAddPatient} className="card add-doctor-form" style={{ borderColor: 'var(--accent-blue)' }}>
                                <div className="flex justify-between items-center mb-4 border-b pb-2">
                                    <h3 className="title-md">Register New Patient</h3>
                                    <button type="button" onClick={() => setShowAddForm(false)} className="btn-ghost" style={{ padding: 4 }} aria-label="Close form"><X size={18} /></button>
                                </div>

                                <div className="form-grid">
                                    <div className="input-group">
                                        <label htmlFor="pt-name" className="input-label">Full Name</label>
                                        <input id="pt-name" className="input-field" placeholder="e.g. Ramesh Kumar" value={newPt.name} onChange={e => setNewPt({ ...newPt, name: e.target.value })} required />
                                    </div>
                                    <div className="input-group">
                                        <label htmlFor="pt-age" className="input-label">Age</label>
                                        <input id="pt-age" type="number" min="1" max="150" className="input-field" value={newPt.age} onChange={e => setNewPt({ ...newPt, age: e.target.value })} required />
                                    </div>
                                    <div className="input-group">
                                        <label htmlFor="pt-gender" className="input-label">Gender</label>
                                        <select id="pt-gender" className="input-field" value={newPt.gender} onChange={e => setNewPt({ ...newPt, gender: e.target.value })}>
                                            <option>Female</option>
                                            <option>Male</option>
                                            <option>Other</option>
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label htmlFor="pt-location" className="input-label">Location / Clinic</label>
                                        <input id="pt-location" className="input-field" placeholder="e.g. Village Clinic B" value={newPt.location} onChange={e => setNewPt({ ...newPt, location: e.target.value })} />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                                    <button type="submit" className="btn-primary" disabled={isAdding}>
                                        {isAdding ? 'Saving...' : 'Save Record'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="card controls-card">
                    <div className="search-bar expanded-search">
                        <Search size={18} color="var(--text-muted)" aria-hidden="true" />
                        <input
                            type="search"
                            placeholder="Search by Patient Name, ID, or Condition..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            aria-label="Search patients"
                        />
                    </div>
                    <button className="btn-secondary" aria-label="Open filter options">
                        <Filter size={18} /> Filters
                    </button>
                </div>

                <div className="patients-grid">
                    <AnimatePresence>
                        {filteredPatients.map(patient => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                key={patient.id}
                                className="card patient-card"
                                onClick={() => navigate(`/patients/${patient.id}`)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={e => e.key === 'Enter' && navigate(`/patients/${patient.id}`)}
                                aria-label={`View patient ${patient.name}`}
                            >
                                <div className="patient-card-header">
                                    <div className="patient-basic-info">
                                        <div className="avatar l-avatar" aria-hidden="true">
                                            {patient.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-main fw-700">{patient.name}</h3>
                                            <div className="text-sm mt-1">{patient.id} • {patient.age} yrs • {patient.gender}</div>
                                        </div>
                                    </div>
                                    <span className={`badge badge-${patient.risk === 'High' ? 'danger' : patient.risk === 'Moderate' ? 'warning' : 'success'}`}>
                                        Risk: {patient.risk}
                                    </span>
                                </div>

                                <div className="patient-card-body">
                                    <div className="info-row">
                                        <span className="text-muted text-sm">Location:</span>
                                        <span className="fw-600">{patient.location}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="text-muted text-sm">Preliminary Assessment:</span>
                                        <span className="fw-600 truncate">{patient.condition}</span>
                                    </div>

                                    {patient.status === 'Pending Review' && patient.aiConfidence && (
                                        <div className="ai-alert mt-4">
                                            <div className="ai-alert-icon">
                                                <Activity size={16} />
                                            </div>
                                            <div className="ai-alert-text">
                                                <span className="fw-700">AI Confidence: {patient.aiConfidence}%</span>
                                                <span className="text-sm">Doctor review urgently required.</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="patient-card-footer mt-4 pt-4 border-t">
                                    <span className="text-sm text-muted">Last Synced: {patient.lastSync}</span>
                                    <button className="icon-btn-small" aria-label={`Open ${patient.name}'s record`}>
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {patients.length === 0 && (
                        <div className="col-span-full py-12 text-center text-muted card">
                            <p>No patients registered. Add a patient to get started.</p>
                        </div>
                    )}

                    {patients.length > 0 && filteredPatients.length === 0 && (
                        <div className="col-span-full py-12 text-center text-muted card">
                            <p>No patients match "<strong>{searchTerm}</strong>". Try a different search term.</p>
                            <button className="btn-ghost mt-3" onClick={() => setSearchTerm('')}>Clear Search</button>
                        </div>
                    )}
                </div>
            </div>
        </PageTransition>
    );
}
