import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { createUser, logAuditLog, type DoctorRec, type MedicalWorkerRec } from '../db';
import { Global3DBackground } from '../components/Global3DBackground';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
    LogOut, UserPlus, Users, Trash2, LayoutDashboard, Activity,
    Settings, ShieldAlert, Plus, Stethoscope, HeartPulse
} from 'lucide-react';
import PageTransition from '../components/PageTransition';
import './AdminDashboard.css';

// ── Animated Risk Bar Chart ───────────────────────────────────────────────────
function RiskBarChart({ patients }: { patients: Array<{ risk: string }> }) {
    const high = patients.filter(p => p.risk === 'High').length;
    const mid = patients.filter(p => p.risk === 'Moderate').length;
    const low = patients.filter(p => p.risk === 'Low').length;
    const total = patients.length || 1;

    const bars = [
        { label: 'High', value: high, color: '#DC2626', bg: '#FEF2F2' },
        { label: 'Moderate', value: mid, color: '#D97706', bg: '#FFFBEB' },
        { label: 'Low', value: low, color: '#059669', bg: '#ECFDF5' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
            <p className="text-muted text-sm fw-600" style={{ marginBottom: 4 }}>Patient Risk Distribution</p>
            {bars.map(bar => (
                <div key={bar.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 64, fontSize: 12, fontWeight: 600, color: bar.color }}>{bar.label}</span>
                    <div style={{ flex: 1, background: bar.bg, borderRadius: 6, height: 20, overflow: 'hidden' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(bar.value / total) * 100}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            style={{ height: '100%', background: bar.color, borderRadius: 6 }}
                        />
                    </div>
                    <span style={{ width: 28, fontSize: 13, fontWeight: 700, textAlign: 'right', color: bar.color }}>{bar.value}</span>
                </div>
            ))}
            {patients.length === 0 && (
                <p className="text-muted text-sm text-center py-4">No patient data yet.</p>
            )}
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
type Tab = 'overview' | 'doctors' | 'staff' | 'logs' | 'settings';

export default function AdminDashboard() {
    const { user, logout } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [aiThreshold, setAiThreshold] = useState(85);
    const [syncFreq, setSyncFreq] = useState('Immediate (Data Permitting)');

    useEffect(() => { document.title = 'HMS Enterprise – Admin Dashboard'; }, []);

    // ── Fully live, reactive queries (auto-update on any DB change) ──────────
    const doctors = useLiveQuery(() => db.doctors.orderBy('createdAt').reverse().toArray(), []) || [];
    const medWorkers = useLiveQuery(() => db.medicalWorkers.orderBy('createdAt').reverse().toArray(), []) || [];
    const patients = useLiveQuery(() => db.patients.toArray(), []) || [];
    const auditLogs = useLiveQuery(() => db.auditLogs.orderBy('timestamp').reverse().limit(80).toArray(), []) || [];
    const doctorUserCount = useLiveQuery(() => db.users.where('role').equals('doctor').count(), []) ?? 0;
    const staffUserCount = useLiveQuery(() => db.users.where('role').equals('staff').count(), []) ?? 0;

    // Every stat is live — changes the instant you add/remove records
    const stats = {
        totalDoctors: doctorUserCount,
        totalStaff: staffUserCount,
        totalPatients: patients.length,
        highRisk: patients.filter(p => p.risk === 'High').length,
    };

    // ── Doctor form state ─────────────────────────────────────────────────────
    const [showDocForm, setShowDocForm] = useState(false);
    const [newDoc, setNewDoc] = useState({ name: '', department: '', email: '', password: '' });
    const [isAddingDoc, setIsAddingDoc] = useState(false);

    // ── Medical Worker form state ─────────────────────────────────────────────
    const DESIGNATIONS = ['Nurse', 'Lab Technician', 'Pharmacist', 'Ward Assistant', 'Radiographer', 'Physiotherapist', 'Paramedic', 'Other'];
    const SHIFTS = ['Morning', 'Evening', 'Night', 'Rotating'] as const;
    const [showWorkerForm, setShowWorkerForm] = useState(false);
    const [newWorker, setNewWorker] = useState({
        name: '', designation: 'Nurse', department: '', email: '', phone: '',
        password: '', shift: 'Morning' as typeof SHIFTS[number]
    });
    const [isAddingWorker, setIsAddingWorker] = useState(false);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleAddDoctor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDoc.name || !newDoc.department || !newDoc.email || !newDoc.password || isAddingDoc) return;
        setIsAddingDoc(true);
        try {
            const userRec = await createUser(newDoc.email, newDoc.password, newDoc.name, 'doctor',
                { department: newDoc.department, createdBy: user?.id });
            const doc: DoctorRec = {
                id: userRec.id, name: newDoc.name,
                department: newDoc.department, email: newDoc.email,
                createdAt: Date.now()
            };
            await db.doctors.add(doc);
            await logAuditLog('Add Doctor', user?.id || 'sys', user?.name || 'Admin', 'admin',
                `Registered doctor with hashed credentials: ${doc.email}`);
            setNewDoc({ name: '', department: '', email: '', password: '' });
            setShowDocForm(false);
            showToast(`Dr. ${doc.name} registered successfully.`, 'success');
        } catch {
            showToast('Failed. Email may already be in use.', 'error');
        } finally { setIsAddingDoc(false); }
    };

    const handleRemoveDoctor = async (id: string, email: string, name: string) => {
        if (!confirm(`Revoke access for ${name}?`)) return;
        try {
            await db.doctors.delete(id);
            await db.users.delete(id);
            await logAuditLog('Remove Doctor', user?.id || 'sys', user?.name || 'Admin', 'admin',
                `Revoked access and auth for: ${email}`);
            showToast(`Access revoked for ${name}.`, 'info');
        } catch { showToast('Failed to remove doctor.', 'error'); }
    };

    const handleAddWorker = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWorker.name || !newWorker.department || !newWorker.email || !newWorker.password || isAddingWorker) return;
        setIsAddingWorker(true);
        try {
            const userRec = await createUser(newWorker.email, newWorker.password, newWorker.name, 'staff',
                { department: newWorker.department, createdBy: user?.id });
            const worker: MedicalWorkerRec = {
                id: userRec.id, name: newWorker.name,
                designation: newWorker.designation, department: newWorker.department,
                email: newWorker.email, phone: newWorker.phone || undefined,
                shift: newWorker.shift, createdAt: Date.now(), createdBy: user?.id
            };
            await db.medicalWorkers.add(worker);
            await logAuditLog('Add Medical Worker', user?.id || 'sys', user?.name || 'Admin', 'admin',
                `Registered ${worker.designation}: ${worker.email}`);
            setNewWorker({ name: '', designation: 'Nurse', department: '', email: '', phone: '', password: '', shift: 'Morning' });
            setShowWorkerForm(false);
            showToast(`${worker.name} (${worker.designation}) registered.`, 'success');
        } catch {
            showToast('Failed. Email may already be in use.', 'error');
        } finally { setIsAddingWorker(false); }
    };

    const handleRemoveWorker = async (id: string, email: string, name: string) => {
        if (!confirm(`Revoke access for ${name}?`)) return;
        try {
            await db.medicalWorkers.delete(id);
            await db.users.delete(id);
            await logAuditLog('Remove Medical Worker', user?.id || 'sys', user?.name || 'Admin', 'admin',
                `Revoked access and auth for: ${email}`);
            showToast(`Access revoked for ${name}.`, 'info');
        } catch { showToast('Failed to remove staff.', 'error'); }
    };

    // ── Nav tabs ──────────────────────────────────────────────────────────────
    const navTabs: { id: Tab; label: string; Icon: React.ElementType; badge?: number }[] = [
        { id: 'overview', label: 'System Overview', Icon: LayoutDashboard },
        { id: 'doctors', label: 'Doctors', Icon: Stethoscope, badge: stats.totalDoctors },
        { id: 'staff', label: 'Medical Workers', Icon: HeartPulse, badge: stats.totalStaff },
        { id: 'logs', label: 'Audit Logs', Icon: Activity },
        { id: 'settings', label: 'Settings', Icon: Settings },
    ];

    return (
        <PageTransition>
            <div className="admin-app-container relative">
                {/* 3D Background */}
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none' }}>
                    <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
                        <Global3DBackground />
                    </Canvas>
                </div>

                {/* Header */}
                <header className="admin-header relative" style={{ zIndex: 1 }}>
                    <div className="flex items-center gap-4">
                        <div className="logo-icon-bg"><Users color="white" size={18} /></div>
                        <div>
                            <h1 className="title-md">HMS Enterprise Admin</h1>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>
                                {stats.totalDoctors} Doctors · {stats.totalStaff} Staff · {stats.totalPatients} Patients
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <span className="text-sm fw-600">Logged in as: {user?.name}</span>
                        <button onClick={logout} className="btn-ghost flex items-center gap-2" aria-label="Log out">
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </header>

                <main className="admin-main" style={{ position: 'relative', zIndex: 1 }}>
                    {/* Sidebar nav */}
                    <div className="admin-sidebar card p-4">
                        <nav className="flex flex-col gap-2" aria-label="Admin navigation">
                            {navTabs.map(({ id, label, Icon, badge }) => (
                                <button
                                    key={id}
                                    className={`tab-nav-btn ${activeTab === id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(id)}
                                    aria-current={activeTab === id ? 'page' : undefined}
                                >
                                    <Icon size={18} />
                                    <span style={{ flex: 1 }}>{label}</span>
                                    {badge !== undefined && badge > 0 && (
                                        <span className="badge badge-info" style={{ fontSize: 11, padding: '1px 7px' }}>{badge}</span>
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="admin-content">
                        {/* ── Overview ────────────────────────── */}
                        {activeTab === 'overview' && (
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="fade-in">
                                <h2 className="title-lg mb-6">System Overview</h2>
                                <div className="stats-grid grid gap-6 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                    {[
                                        { label: 'Doctors', value: stats.totalDoctors, icon: Stethoscope, color: '#2563EB', bg: '#EFF6FF' },
                                        { label: 'Medical Staff', value: stats.totalStaff, icon: HeartPulse, color: '#7C3AED', bg: '#F5F3FF' },
                                        { label: 'Patients Processed', value: stats.totalPatients, icon: Users, color: '#0284C7', bg: '#F0F9FF' },
                                        { label: 'High Risk Alerts', value: stats.highRisk, icon: ShieldAlert, color: '#DC2626', bg: '#FEF2F2' },
                                    ].map(s => (
                                        <motion.div
                                            key={s.label}
                                            className="stat-card card"
                                            whileHover={{ y: -3 }}
                                        >
                                            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
                                                <s.icon size={22} />
                                            </div>
                                            <div className="stat-info">
                                                <p>{s.label}</p>
                                                <motion.h3
                                                    key={s.value}
                                                    initial={{ scale: 1.3, color: s.color }}
                                                    animate={{ scale: 1, color: s.color === '#DC2626' ? s.color : 'var(--text-main)' }}
                                                    transition={{ type: 'spring', stiffness: 400 }}
                                                >
                                                    {s.value}
                                                </motion.h3>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                                <div className="card p-6">
                                    <RiskBarChart patients={patients} />
                                </div>
                            </motion.div>
                        )}

                        {/* ── Doctor Management ────────────────── */}
                        {activeTab === 'doctors' && (
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="fade-in">
                                <div className="admin-toolbar mb-6 flex justify-between items-center">
                                    <div>
                                        <h2 className="title-lg">Doctor Directory</h2>
                                        <p className="text-muted text-sm mt-1">{stats.totalDoctors} registered · manage clinical practitioner access</p>
                                    </div>
                                    <button className="btn-primary" onClick={() => setShowDocForm(v => !v)} aria-expanded={showDocForm}>
                                        <Plus size={18} /> Add Doctor
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {showDocForm && (
                                        <motion.div initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                                            exit={{ opacity: 0, height: 0, marginBottom: 0 }} className="overflow-hidden">
                                            <form onSubmit={handleAddDoctor} className="card add-doctor-form">
                                                <h3 className="title-md mb-4 border-b pb-2">Register Doctor Account</h3>
                                                <div className="form-grid grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="input-group">
                                                        <label htmlFor="doc-name" className="input-label">Full Name</label>
                                                        <input id="doc-name" className="input-field" placeholder="Dr. Jane Smith" value={newDoc.name} onChange={e => setNewDoc({ ...newDoc, name: e.target.value })} required />
                                                    </div>
                                                    <div className="input-group">
                                                        <label htmlFor="doc-dept" className="input-label">Department</label>
                                                        <input id="doc-dept" className="input-field" placeholder="e.g. Pulmonology" value={newDoc.department} onChange={e => setNewDoc({ ...newDoc, department: e.target.value })} required />
                                                    </div>
                                                    <div className="input-group">
                                                        <label htmlFor="doc-email" className="input-label">Email / Login ID</label>
                                                        <input id="doc-email" className="input-field" type="email" placeholder="doctor@hms.local" value={newDoc.email} onChange={e => setNewDoc({ ...newDoc, email: e.target.value })} required autoComplete="email" />
                                                    </div>
                                                    <div className="input-group">
                                                        <label htmlFor="doc-pwd" className="input-label">Temporary Password</label>
                                                        <input id="doc-pwd" className="input-field" type="password" placeholder="Min. 8 chars" value={newDoc.password} onChange={e => setNewDoc({ ...newDoc, password: e.target.value })} required minLength={6} autoComplete="new-password" />
                                                    </div>
                                                </div>
                                                <div className="flex justify-end gap-2 mt-4">
                                                    <button type="button" className="btn-secondary" onClick={() => setShowDocForm(false)}>Cancel</button>
                                                    <button type="submit" className="btn-primary" disabled={isAddingDoc}>
                                                        {isAddingDoc ? 'Registering...' : 'Register Doctor'}
                                                    </button>
                                                </div>
                                            </form>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="card list-card">
                                    <table className="data-table">
                                        <thead><tr>
                                            <th>ID</th><th>Name</th><th>Department</th><th>Email</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr></thead>
                                        <AnimatePresence>
                                            <tbody>
                                                {doctors.map(doc => (
                                                    <motion.tr key={doc.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}>
                                                        <td className="font-mono text-muted">{doc.id}</td>
                                                        <td className="fw-600 text-main">{doc.name}</td>
                                                        <td><span className="badge badge-info">{doc.department}</span></td>
                                                        <td>{doc.email}</td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            <button className="icon-btn-small" onClick={() => handleRemoveDoctor(doc.id, doc.email, doc.name)} aria-label={`Revoke ${doc.name}`} title="Revoke Access">
                                                                <Trash2 size={15} style={{ color: 'var(--accent-danger)' }} />
                                                            </button>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                                {doctors.length === 0 && (
                                                    <tr><td colSpan={5} className="empty-state py-12 text-center text-muted">No doctors registered yet.</td></tr>
                                                )}
                                            </tbody>
                                        </AnimatePresence>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Medical Workers ──────────────────── */}
                        {activeTab === 'staff' && (
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="fade-in">
                                <div className="admin-toolbar mb-6 flex justify-between items-center">
                                    <div>
                                        <h2 className="title-lg">Medical Support Staff</h2>
                                        <p className="text-muted text-sm mt-1">{stats.totalStaff} registered · nurses, lab techs, pharmacists & more</p>
                                    </div>
                                    <button className="btn-primary" onClick={() => setShowWorkerForm(v => !v)} aria-expanded={showWorkerForm}>
                                        <UserPlus size={18} /> Add Staff Member
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {showWorkerForm && (
                                        <motion.div initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                                            exit={{ opacity: 0, height: 0, marginBottom: 0 }} className="overflow-hidden">
                                            <form onSubmit={handleAddWorker} className="card add-doctor-form">
                                                <h3 className="title-md mb-4 border-b pb-2">Register Medical Staff</h3>
                                                <div className="form-grid grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="input-group">
                                                        <label htmlFor="wrk-name" className="input-label">Full Name</label>
                                                        <input id="wrk-name" className="input-field" placeholder="John Williams" value={newWorker.name} onChange={e => setNewWorker({ ...newWorker, name: e.target.value })} required />
                                                    </div>
                                                    <div className="input-group">
                                                        <label htmlFor="wrk-desg" className="input-label">Designation</label>
                                                        <select id="wrk-desg" className="input-field" value={newWorker.designation} onChange={e => setNewWorker({ ...newWorker, designation: e.target.value })}>
                                                            {DESIGNATIONS.map(d => <option key={d}>{d}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="input-group">
                                                        <label htmlFor="wrk-dept" className="input-label">Department</label>
                                                        <input id="wrk-dept" className="input-field" placeholder="e.g. Radiology" value={newWorker.department} onChange={e => setNewWorker({ ...newWorker, department: e.target.value })} required />
                                                    </div>
                                                    <div className="input-group">
                                                        <label htmlFor="wrk-shift" className="input-label">Shift</label>
                                                        <select id="wrk-shift" className="input-field" value={newWorker.shift} onChange={e => setNewWorker({ ...newWorker, shift: e.target.value as typeof SHIFTS[number] })}>
                                                            {SHIFTS.map(s => <option key={s}>{s}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="input-group">
                                                        <label htmlFor="wrk-email" className="input-label">Email / Login ID</label>
                                                        <input id="wrk-email" className="input-field" type="email" placeholder="staff@hms.local" value={newWorker.email} onChange={e => setNewWorker({ ...newWorker, email: e.target.value })} required autoComplete="email" />
                                                    </div>
                                                    <div className="input-group">
                                                        <label htmlFor="wrk-phone" className="input-label">Phone (optional)</label>
                                                        <input id="wrk-phone" className="input-field" placeholder="+91 99999 00000" value={newWorker.phone} onChange={e => setNewWorker({ ...newWorker, phone: e.target.value })} />
                                                    </div>
                                                    <div className="input-group">
                                                        <label htmlFor="wrk-pwd" className="input-label">Temporary Password</label>
                                                        <input id="wrk-pwd" className="input-field" type="password" placeholder="Min. 8 chars" value={newWorker.password} onChange={e => setNewWorker({ ...newWorker, password: e.target.value })} required minLength={6} autoComplete="new-password" />
                                                    </div>
                                                </div>
                                                <div className="flex justify-end gap-2 mt-4">
                                                    <button type="button" className="btn-secondary" onClick={() => setShowWorkerForm(false)}>Cancel</button>
                                                    <button type="submit" className="btn-primary" disabled={isAddingWorker}>
                                                        {isAddingWorker ? 'Registering...' : 'Register Staff Member'}
                                                    </button>
                                                </div>
                                            </form>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="card list-card">
                                    <table className="data-table">
                                        <thead><tr>
                                            <th>Name</th><th>Designation</th><th>Department</th>
                                            <th>Shift</th><th>Email</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr></thead>
                                        <AnimatePresence>
                                            <tbody>
                                                {medWorkers.map(w => (
                                                    <motion.tr key={w.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}>
                                                        <td className="fw-600 text-main">{w.name}</td>
                                                        <td><span className="badge badge-success">{w.designation}</span></td>
                                                        <td><span className="badge badge-info">{w.department}</span></td>
                                                        <td>
                                                            <span className={`badge ${w.shift === 'Night' ? 'badge-warning' : 'badge-info'}`}>{w.shift}</span>
                                                        </td>
                                                        <td className="text-muted">{w.email}</td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            <button className="icon-btn-small" onClick={() => handleRemoveWorker(w.id, w.email, w.name)} aria-label={`Revoke ${w.name}`} title="Revoke Access">
                                                                <Trash2 size={15} style={{ color: 'var(--accent-danger)' }} />
                                                            </button>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                                {medWorkers.length === 0 && (
                                                    <tr><td colSpan={6} className="empty-state py-12 text-center text-muted">No medical staff registered yet.</td></tr>
                                                )}
                                            </tbody>
                                        </AnimatePresence>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Audit Logs ───────────────────────── */}
                        {activeTab === 'logs' && (
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="fade-in">
                                <h2 className="title-lg mb-6">System Audit Logs</h2>
                                <div className="card list-card">
                                    <table className="data-table text-sm">
                                        <thead><tr>
                                            <th>Timestamp</th><th>Action</th><th>User</th><th>Details</th>
                                        </tr></thead>
                                        <tbody>
                                            {auditLogs.map(log => (
                                                <tr key={log.id}>
                                                    <td className="text-muted whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                                    <td><span className="badge badge-warning">{log.action}</span></td>
                                                    <td className="fw-600">{log.userName} <span className="text-muted" style={{ fontSize: 11, fontWeight: 400 }}>({log.role})</span></td>
                                                    <td className="text-muted">{log.details}</td>
                                                </tr>
                                            ))}
                                            {auditLogs.length === 0 && (
                                                <tr><td colSpan={4} className="empty-state py-12 text-center text-muted">No audit logs yet.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Settings ─────────────────────────── */}
                        {activeTab === 'settings' && (
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="fade-in">
                                <h2 className="title-lg mb-6">Global Configurations</h2>
                                <div className="card p-6 border-l-4 border-l-primary mb-4">
                                    <h3 className="title-md mb-2">AI Confidence Threshold</h3>
                                    <p className="text-sm text-muted mb-4">Minimum confidence for AI to auto-flag a scan as high-risk without doctor review.</p>
                                    <div className="flex items-center gap-4">
                                        <input type="range" min="70" max="99" value={aiThreshold}
                                            onChange={e => setAiThreshold(Number(e.target.value))}
                                            className="w-64" aria-label={`AI threshold: ${aiThreshold}%`} />
                                        <span className="fw-700">{aiThreshold}%</span>
                                    </div>
                                </div>
                                <div className="card p-6 border-l-4 border-l-warning">
                                    <h3 className="title-md mb-2">Offline Sync Frequency</h3>
                                    <p className="text-sm text-muted mb-4">How often field devices attempt to sync records when online.</p>
                                    <select className="input-field w-64" value={syncFreq} onChange={e => setSyncFreq(e.target.value)} aria-label="Sync frequency">
                                        <option>Immediate (Data Permitting)</option>
                                        <option>Every 1 Hour</option>
                                        <option>Daily at Midnight</option>
                                    </select>
                                </div>
                                <div className="flex justify-end mt-6">
                                    <button className="btn-primary" onClick={() => showToast('Settings saved.', 'success')}>Save Settings</button>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </main>
            </div>
        </PageTransition>
    );
}
