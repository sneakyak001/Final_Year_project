import { useEffect, useRef } from 'react';
import { Activity, Users, FileText, AlertTriangle, CloudOff, ChevronRight, Cpu } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Canvas } from '@react-three/fiber';
import { gsap } from 'gsap';
import db from '../db';
import { useAuth } from '../context/AuthContext';
import { MedicalScene3D } from '../components/MedicalScene3D';
import PageTransition from '../components/PageTransition';
import './Dashboard.css';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const heroRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        document.title = 'HMS Enterprise – Dashboard';
        // GSAP: hero slides down on mount
        if (heroRef.current) {
            gsap.fromTo(heroRef.current,
                { y: -20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.1 }
            );
        }
    }, []);

    const patients = useLiveQuery(() => db.patients.toArray(), []) || [];
    const recentPatients = useLiveQuery(() =>
        db.patients.orderBy('createdAt').reverse().limit(5).toArray(), []
    ) || [];

    const stats = [
        {
            label: 'Total Patients',
            value: patients.length,
            icon: Users,
            color: 'var(--accent-blue)',
            bg: 'var(--accent-blue-light)'
        },
        {
            label: 'Pending AI Review',
            value: patients.filter(p => p.status === 'Awaiting Analysis' || p.status === 'Pending Review').length,
            icon: Activity,
            color: 'var(--accent-warning)',
            bg: 'var(--accent-warning-light)'
        },
        {
            label: 'High Risk Cases',
            value: patients.filter(p => p.risk === 'High').length,
            icon: AlertTriangle,
            color: 'var(--accent-danger)',
            bg: 'var(--accent-danger-light)'
        },
        {
            label: 'Synced Today',
            value: patients.filter(p => {
                const today = new Date();
                const d = new Date(p.createdAt);
                return d.getDate() === today.getDate() &&
                    d.getMonth() === today.getMonth() &&
                    d.getFullYear() === today.getFullYear();
            }).length,
            icon: CloudOff,
            color: 'var(--accent-success)',
            bg: 'var(--accent-success-light)'
        },
    ];

    const getRiskClass = (risk: string) =>
        risk === 'High' ? 'danger' : risk === 'Moderate' ? 'warning' : 'success';

    const firstName = user?.name?.split(' ')[0] ?? 'Doctor';

    return (
        <PageTransition>
            <div className="dashboard">
                {/* ─── 3D Hero Banner ─── */}
                <div ref={heroRef} className="dashboard-hero card">
                    <div className="hero-canvas-wrap">
                        <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
                            <MedicalScene3D />
                        </Canvas>
                    </div>
                    <div className="hero-overlay" />
                    <div className="hero-content">
                        <div className="hero-badge">
                            <Cpu size={14} />
                            AI-Powered Clinical Decision Support
                        </div>
                        <h1 className="hero-title">Good {getGreeting()}, {firstName}.</h1>
                        <p className="hero-subtitle">
                            {patients.length} patient records synced · {patients.filter(p => p.risk === 'High').length} high-risk alerts active
                        </p>
                        <button className="btn-primary mt-4" onClick={() => navigate('/patients')}>
                            <FileText size={16} /> Open Patient Directory
                        </button>
                    </div>
                </div>

                {/* ─── Stats ─── */}
                <motion.div
                    className="stats-grid"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                >
                    {stats.map((stat, idx) => (
                        <motion.div key={idx} variants={itemVariants} className="card stat-card">
                            <div className="stat-icon" style={{ backgroundColor: stat.bg, color: stat.color }}>
                                <stat.icon size={20} />
                            </div>
                            <div className="stat-info">
                                <p>{stat.label}</p>
                                <h3>{stat.value}</h3>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* ─── Main content ─── */}
                <motion.div
                    className="dashboard-content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.35 }}
                >
                    <div className="card recent-patients-card">
                        <div className="card-header border-b">
                            <h2 className="title-md">Recent Field Syncs</h2>
                            <button className="btn-ghost" onClick={() => navigate('/patients')}>View All</button>
                        </div>

                        <div className="table-responsive">
                            {recentPatients.length === 0 ? (
                                <div className="py-12 text-center text-muted">
                                    <p>No patients synced yet. <button className="btn-ghost" style={{ padding: '0 4px', display: 'inline' }} onClick={() => navigate('/patients')}>Add the first patient →</button></p>
                                </div>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Patient ID</th>
                                            <th>Name &amp; Age</th>
                                            <th>Preliminary Assessment</th>
                                            <th>Risk</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentPatients.map((patient) => (
                                            <tr key={patient.id}>
                                                <td className="font-mono text-muted">{patient.id}</td>
                                                <td>
                                                    <div className="table-user">
                                                        <span className="fw-700 text-main">{patient.name}</span>
                                                        <span className="text-sm">{patient.age} yrs</span>
                                                    </div>
                                                </td>
                                                <td className="fw-600">{patient.condition}</td>
                                                <td>
                                                    <span className={`badge badge-${getRiskClass(patient.risk)}`}>
                                                        {patient.risk}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`status-indicator ${patient.status === 'Reviewed' ? 'status-green' : 'status-yellow'}`}>
                                                        {patient.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn-secondary btn-sm"
                                                        onClick={() => navigate(`/patients/${patient.id}`)}
                                                        aria-label={`Review patient ${patient.name}`}
                                                    >
                                                        <ChevronRight size={14} /> Review
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    <div className="card ai-summary-card">
                        <h2 className="title-md mb-4 border-b pb-4">System Alerts</h2>
                        {patients.filter(p => p.risk === 'High').length > 0 ? (
                            <div className="insight-box mt-4 border-l-danger">
                                <div className="insight-icon bg-danger-light text-danger">
                                    <AlertTriangle size={18} />
                                </div>
                                <div>
                                    <h4 className="fw-600">High Risk Alert</h4>
                                    <p className="text-sm mt-1">
                                        {patients.filter(p => p.risk === 'High').length} patient(s) flagged. Immediate review recommended.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="insight-box mt-4 border-l-success">
                                <div className="insight-icon bg-success-light text-success">
                                    <Activity size={18} />
                                </div>
                                <div>
                                    <h4 className="fw-600">All Clear</h4>
                                    <p className="text-sm mt-1">No high-risk patients flagged at this time.</p>
                                </div>
                            </div>
                        )}
                        <div className="insight-box mt-4 border-l-success">
                            <div className="insight-icon bg-success-light text-success">
                                <Activity size={18} />
                            </div>
                            <div>
                                <h4 className="fw-600">Model Accuracy</h4>
                                <p className="text-sm mt-1">X-Ray classification model at 94.2% confidence for TB detection.</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </PageTransition>
    );
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 18) return 'afternoon';
    return 'evening';
}
