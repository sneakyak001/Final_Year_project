import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot, Play, Zap, ChevronDown, ChevronUp,
    Stethoscope, ScanLine, Pill, AlertOctagon, FileSignature,
    CheckCircle2, Loader2, XCircle, Clock, ArrowRight,
    Database, LayoutDashboard, History,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db';
import { useAgents } from '../context/AgentContext';
import { useToast } from '../components/Toast';
import PageTransition from '../components/PageTransition';
import type { DiagnosisOutput, ImagingOutput, TreatmentOutput, TriageOutput, SummarizationOutput } from '../agents/types';
import './AgentDashboard.css';

// ── Icon helpers ──────────────────────────────────────────────────────────────

const AGENT_ICONS: Record<string, React.ElementType> = {
    Stethoscope, ScanLine, Pill, AlertOctagon, FileSignature,
};

const AgentIcon = ({ name, size = 22 }: { name: string; size?: number }) => {
    const Icon = (AGENT_ICONS[name] ?? Bot) as any;
    return <Icon size={size} />;
};

// ── Status helpers ────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
    const icons = {
        idle: <Clock size={11} />,
        running: <Loader2 size={11} className="spin" />,
        done: <CheckCircle2 size={11} />,
        error: <XCircle size={11} />,
    };
    return (
        <span className={`agent-status-badge status-${status}`}>
            {icons[status as keyof typeof icons] ?? null}
            {status}
        </span>
    );
};

// ── Urgency helper ────────────────────────────────────────────────────────────
const urgencyClass: Record<string, string> = {
    Critical: 'urgency-critical', Urgent: 'urgency-urgent',
    Moderate: 'urgency-moderate', Routine: 'urgency-routine',
};

// ── Result Accordion ──────────────────────────────────────────────────────────

function ResultAccordion({ title, icon, children }: {
    title: string; icon: React.ReactNode; children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className="result-accordion">
            <div className="result-accordion-header" onClick={() => setOpen(!open)}>
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="fw-700">{title}</span>
                </div>
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="result-accordion-body">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AgentDashboard() {
    const { agentStates, isRunning, lastResult, runPipeline, runParallel, reset } = useAgents();
    const { showToast } = useToast();
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [symptoms, setSymptoms] = useState('');
    const [mode, setMode] = useState<'sequential' | 'parallel'>('sequential');
    const [activeTab, setActiveTab] = useState<'agents' | 'run' | 'history'>('agents');

    const patients = useLiveQuery(() => db.patients.orderBy('name').toArray(), []) || [];
    const agentLogs = useLiveQuery(() => db.agentLogs.orderBy('timestamp').reverse().limit(30).toArray(), []) || [];

    useEffect(() => { document.title = 'HMS Enterprise – AI Agents'; }, []);

    const handleRun = async () => {
        if (!selectedPatientId && !symptoms) {
            showToast('Select a patient or enter symptoms to run the pipeline.', 'error');
            return;
        }

        const patient = patients.find(p => p.id === selectedPatientId);

        const payload = {
            patient: patient ? {
                id: patient.id, name: patient.name, age: patient.age,
                gender: patient.gender, condition: patient.condition, risk: patient.risk,
            } : undefined,
            symptoms: symptoms || patient?.condition,
        };

        showToast('AI pipeline started…', 'info' as never);
        const result = mode === 'sequential' ? await runPipeline(payload) : await runParallel(payload);

        if (result) {
            showToast(`Pipeline complete in ${result.totalDurationMs}ms ✓`, 'success');
        } else {
            showToast('Pipeline encountered an error.', 'error');
        }
    };

    return (
        <PageTransition>
            <div className="agent-dashboard animate-fade-in">

                {/* ── Header ── */}
                <div className="page-header mb-2">
                    <div>
                        <h1 className="title-lg flex items-center gap-3">
                            <Bot size={30} className="text-primary" />
                            AI Agent Orchestrator
                        </h1>
                        <p className="text-sm mt-1 text-muted">Multi-agent clinical decision pipeline — powered by HMS AI Engine</p>
                    </div>
                </div>

                {/* ── Tab Nav ── */}
                <div className="mode-toggle" style={{ maxWidth: 420 }}>
                    {([['agents', 'Agent Registry', LayoutDashboard], ['run', 'Run Pipeline', Play], ['history', 'Run History', History]] as const).map(([tab, label, Icon]) => (
                        <button key={tab} className={`mode-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                            <span className="flex items-center gap-1 justify-center"><Icon size={14} /> {label}</span>
                        </button>
                    ))}
                </div>

                {/* ── TAB: Agent Registry ── */}
                {activeTab === 'agents' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="mb-4">
                            <h2 className="title-md mb-1">Registered Agents</h2>
                            <p className="text-sm text-muted">Each agent is a specialist AI module. The orchestrator coordinates them into a unified pipeline.</p>
                        </div>
                        <div className="agents-grid">
                            {agentStates.map((agent) => (
                                <motion.div
                                    key={agent.name}
                                    className={`card agent-card ${agent.status}`}
                                    layout
                                >
                                    <div className="agent-card-top">
                                        <div className="agent-icon-wrap">
                                            <AgentIcon name={agent.icon} />
                                        </div>
                                        <StatusBadge status={agent.status} />
                                    </div>
                                    <div>
                                        <div className="agent-name">{agent.name}</div>
                                        <div className="agent-desc text-muted mt-1">{agent.description}</div>
                                    </div>
                                    {agent.durationMs !== undefined && agent.durationMs > 0 && (
                                        <div className="agent-duration">⏱ {agent.durationMs}ms</div>
                                    )}
                                </motion.div>
                            ))}
                        </div>

                        {/* Architecture Diagram */}
                        <div className="card mt-6">
                            <h2 className="title-md mb-4 flex items-center gap-2"><Database size={18} className="text-primary" /> Orchestration Architecture</h2>
                            <div className="arch-diagram">
                                <div className="arch-box input-box">
                                    <Bot size={20} className="mb-1" />
                                    Clinical Input<br />(Patient / Symptoms / Image)
                                </div>
                                <div className="arch-arrow"><ArrowRight size={18} /></div>
                                <div className="arch-box orchestrator-box">
                                    <Zap size={20} className="mb-1" />
                                    AgentOrchestrator<br /><span style={{ fontSize: 10, opacity: 0.7 }}>Sequential · Parallel</span>
                                </div>
                                <div className="arch-arrow"><ArrowRight size={18} /></div>
                                <div className="arch-agents-column">
                                    {(['DiagnosisAgent', 'ImagingAgent', 'TreatmentAgent', 'TriageAgent', 'SummarizationAgent']).map(n => (
                                        <div key={n} className="arch-box agent-box" style={{ minWidth: 150, padding: '6px 12px' }}>
                                            {n}
                                        </div>
                                    ))}
                                </div>
                                <div className="arch-arrow"><ArrowRight size={18} /></div>
                                <div className="arch-box output-box">
                                    <FileSignature size={20} className="mb-1" />
                                    Diagnostic Report<br />+ Patient Record Update
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ── TAB: Run Pipeline ── */}
                {activeTab === 'run' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pipeline-panel">
                        <div className="card pipeline-controls">
                            <h2 className="title-md mb-3 flex items-center gap-2"><Play size={18} className="text-primary" /> Configure & Run</h2>

                            {/* Mode */}
                            <div>
                                <label className="input-label mb-1 block">Execution Mode</label>
                                <div className="mode-toggle">
                                    <button className={`mode-btn ${mode === 'sequential' ? 'active' : ''}`} onClick={() => setMode('sequential')}>
                                        Sequential Pipeline
                                    </button>
                                    <button className={`mode-btn ${mode === 'parallel' ? 'active' : ''}`} onClick={() => setMode('parallel')}>
                                        Parallel Run
                                    </button>
                                </div>
                                <p className="text-sm text-muted mt-2">
                                    {mode === 'sequential'
                                        ? "Agents run one-by-one. Each agent's output enriches the next agent's context."
                                        : "Diagnosis, Imaging & Triage run concurrently. Treatment & Summary follow."}
                                </p>
                            </div>

                            {/* Patient */}
                            <div>
                                <label className="input-label mb-1 block" htmlFor="ag-patient">Patient (optional)</label>
                                <select id="ag-patient" className="input-field" value={selectedPatientId} onChange={e => setSelectedPatientId(e.target.value)}>
                                    <option value="">-- None / Free-text symptoms --</option>
                                    {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
                                </select>
                            </div>

                            {/* Symptoms */}
                            <div>
                                <label className="input-label mb-1 block" htmlFor="ag-symptoms">Symptoms / Clinical Note</label>
                                <textarea
                                    id="ag-symptoms"
                                    className="input-field"
                                    rows={3}
                                    placeholder="e.g. fever 39°C, cough, chest pain, shortness of breath…"
                                    value={symptoms}
                                    onChange={e => setSymptoms(e.target.value)}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    className="btn-primary"
                                    onClick={handleRun}
                                    disabled={isRunning}
                                    style={{ flex: 1 }}
                                    id="run-pipeline-btn"
                                >
                                    {isRunning ? <><Loader2 size={16} className="spin" /> Running…</> : <><Zap size={16} /> Run Pipeline</>}
                                </button>
                                <button className="btn-ghost" onClick={reset} disabled={isRunning} title="Reset agent states">
                                    Reset
                                </button>
                            </div>
                        </div>

                        {/* Right – Live Steps */}
                        <div className="card">
                            <h2 className="title-md mb-4 flex items-center gap-2"><Zap size={18} className="text-primary" /> Live Pipeline Steps</h2>
                            <div className="pipeline-flow">
                                {agentStates.map((agent, idx) => (
                                    <div key={agent.name}>
                                        <div className={`flow-step step-${agent.status}`}>
                                            <AgentIcon name={agent.icon} size={18} />
                                            <span className="fw-600" style={{ flex: 1 }}>{agent.name}</span>
                                            <StatusBadge status={agent.status} />
                                            {agent.durationMs !== undefined && agent.durationMs > 0 && (
                                                <span className="text-muted" style={{ fontSize: 11 }}>{agent.durationMs}ms</span>
                                            )}
                                        </div>
                                        {idx < agentStates.length - 1 && <div className="flow-arrow">↓</div>}
                                    </div>
                                ))}
                            </div>

                            {/* Results */}
                            {lastResult && (
                                <div className="results-section mt-6">
                                    <h3 className="fw-700 text-main mb-2">Pipeline Results</h3>
                                    <p className="text-sm text-muted mb-4">Completed in {lastResult.totalDurationMs}ms</p>

                                    {/* Diagnosis */}
                                    {lastResult.diagnosis?.data && (
                                        <ResultAccordion title="DiagnosisAgent" icon={<Stethoscope size={16} className="text-primary" />}>
                                            <p className="fw-700 mb-2">{(lastResult.diagnosis.data as DiagnosisOutput).primaryDiagnosis}</p>
                                            <table className="result-table">
                                                <thead><tr><th>Condition</th><th>Confidence</th><th>ICD-10</th></tr></thead>
                                                <tbody>
                                                    {(lastResult.diagnosis.data as DiagnosisOutput).conditions.map(c => (
                                                        <tr key={c.name}>
                                                            <td>{c.name}</td>
                                                            <td>
                                                                <div className="conf-bar-wrap">
                                                                    <div className="conf-bar-bg"><div className="conf-bar" style={{ width: `${c.confidence * 100}%` }} /></div>
                                                                    <span>{Math.round(c.confidence * 100)}%</span>
                                                                </div>
                                                            </td>
                                                            <td className="font-mono text-muted">{c.icd10}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <div className="mt-3">
                                                <span className="fw-600 text-sm">Tests: </span>
                                                <div className="pill-list mt-1">
                                                    {(lastResult.diagnosis.data as DiagnosisOutput).recommendedTests.map(t => <span key={t} className="pill">{t}</span>)}
                                                </div>
                                            </div>
                                        </ResultAccordion>
                                    )}

                                    {/* Imaging */}
                                    {lastResult.imaging?.data && (
                                        <ResultAccordion title="ImagingAgent" icon={<ScanLine size={16} className="text-primary" />}>
                                            <p className="fw-700">{(lastResult.imaging.data as ImagingOutput).primaryFinding}</p>
                                            <p className="text-sm text-muted mt-1">Severity: <strong>{(lastResult.imaging.data as ImagingOutput).severity}</strong></p>
                                            {(lastResult.imaging.data as ImagingOutput).anomalies.length > 0 && (
                                                <table className="result-table mt-3">
                                                    <thead><tr><th>Anomaly</th><th>Confidence</th><th>Region</th></tr></thead>
                                                    <tbody>
                                                        {(lastResult.imaging.data as ImagingOutput).anomalies.map(a => (
                                                            <tr key={a.label}>
                                                                <td>{a.label}</td>
                                                                <td>{Math.round(a.confidence * 100)}%</td>
                                                                <td className="text-muted">{a.region}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </ResultAccordion>
                                    )}

                                    {/* Triage */}
                                    {lastResult.triage?.data && (
                                        <ResultAccordion title="TriageAgent" icon={<AlertOctagon size={16} className="text-primary" />}>
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className="fw-700 text-lg">Urgency:</span>
                                                <span className={`fw-800 text-lg ${urgencyClass[(lastResult.triage.data as TriageOutput).urgency]}`}>
                                                    {(lastResult.triage.data as TriageOutput).urgency}
                                                </span>
                                                <span className="text-muted text-sm">Score: {(lastResult.triage.data as TriageOutput).urgencyScore}/100</span>
                                            </div>
                                            <ul style={{ paddingLeft: 16, fontSize: 13 }}>
                                                {(lastResult.triage.data as TriageOutput).reasons.map(r => <li key={r}>{r}</li>)}
                                            </ul>
                                            <p className="text-sm mt-3 text-muted">Est. wait: {(lastResult.triage.data as TriageOutput).estimatedWaitMinutes} min</p>
                                        </ResultAccordion>
                                    )}

                                    {/* Treatment */}
                                    {lastResult.treatment?.data && (
                                        <ResultAccordion title="TreatmentAgent" icon={<Pill size={16} className="text-primary" />}>
                                            <table className="result-table">
                                                <thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead>
                                                <tbody>
                                                    {(lastResult.treatment.data as TreatmentOutput).medications.map(m => (
                                                        <tr key={m.name}>
                                                            <td className="fw-600">{m.name}</td>
                                                            <td>{m.dosage}</td>
                                                            <td>{m.frequency}</td>
                                                            <td>{m.duration}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <p className="text-sm mt-3 text-muted">{(lastResult.treatment.data as TreatmentOutput).notes}</p>
                                        </ResultAccordion>
                                    )}

                                    {/* Summary */}
                                    {lastResult.summary?.data && (
                                        <ResultAccordion title="SummarizationAgent – Clinical Report" icon={<FileSignature size={16} className="text-primary" />}>
                                            <p style={{ lineHeight: 1.7, fontSize: 13 }}>{(lastResult.summary.data as SummarizationOutput).summary}</p>
                                            <div className="mt-3">
                                                <div className="fw-700 text-sm mb-2">Action Items:</div>
                                                <ul style={{ paddingLeft: 16, fontSize: 13 }}>
                                                    {(lastResult.summary.data as SummarizationOutput).actionItems.map(a => <li key={a}>{a}</li>)}
                                                </ul>
                                            </div>
                                        </ResultAccordion>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* ── TAB: History ── */}
                {activeTab === 'history' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="card">
                            <h2 className="title-md mb-4 flex items-center gap-2"><History size={18} className="text-primary" /> Agent Run Logs</h2>
                            {agentLogs.length === 0 ? (
                                <div className="history-empty">
                                    <Bot size={40} className="text-muted opacity-40 mb-3" />
                                    <p className="text-muted">No agent runs recorded yet. Go to the Run Pipeline tab to start.</p>
                                </div>
                            ) : (
                                <table className="result-table">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Agent</th>
                                            <th>Patient ID</th>
                                            <th>Status</th>
                                            <th>Duration</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {agentLogs.map((log) => (
                                            <tr key={log.id}>
                                                <td className="text-muted font-mono">{new Date(log.timestamp).toLocaleString()}</td>
                                                <td className="fw-600">{log.agentName}</td>
                                                <td className="font-mono text-muted">{log.patientId}</td>
                                                <td><StatusBadge status={log.status} /></td>
                                                <td>{log.durationMs}ms</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </motion.div>
                )}
            </div>
        </PageTransition>
    );
}
