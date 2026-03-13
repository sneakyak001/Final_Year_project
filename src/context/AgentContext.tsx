import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { AgentState, DiagnosisPayload, PipelineResult } from '../agents/types';
import { orchestrator } from '../agents/orchestrator';

// ── Context Types ─────────────────────────────────────────────────────────────

interface AgentContextValue {
    /** Live per-agent states during a pipeline run */
    agentStates: AgentState[];
    /** Whether a pipeline run is currently in progress */
    isRunning: boolean;
    /** The last completed pipeline result */
    lastResult: PipelineResult | null;
    /** Run the full sequential pipeline */
    runPipeline: (payload: DiagnosisPayload) => Promise<PipelineResult | null>;
    /** Run the parallel pipeline */
    runParallel: (payload: DiagnosisPayload) => Promise<PipelineResult | null>;
    /** Reset state */
    reset: () => void;
    /** The shared orchestrator instance */
    orchestrator: typeof orchestrator;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({ children }: { children: React.ReactNode }) {
    const [agentStates, setAgentStates] = useState<AgentState[]>(
        orchestrator.getAgentStates()
    );
    const [isRunning, setIsRunning] = useState(false);
    const [lastResult, setLastResult] = useState<PipelineResult | null>(null);
    const runningRef = useRef(false);

    const runPipeline = useCallback(async (payload: DiagnosisPayload): Promise<PipelineResult | null> => {
        if (runningRef.current) return null;
        runningRef.current = true;
        setIsRunning(true);
        setLastResult(null);

        try {
            const result = await orchestrator.runPipeline(payload, (states) => {
                setAgentStates([...states]);
            });
            setLastResult(result);
            return result;
        } catch (err) {
            console.error('[AgentOrchestrator] Pipeline error:', err);
            return null;
        } finally {
            runningRef.current = false;
            setIsRunning(false);
        }
    }, []);

    const runParallel = useCallback(async (payload: DiagnosisPayload): Promise<PipelineResult | null> => {
        if (runningRef.current) return null;
        runningRef.current = true;
        setIsRunning(true);
        setLastResult(null);

        try {
            const result = await orchestrator.runParallel(payload, (states) => {
                setAgentStates([...states]);
            });
            setLastResult(result);
            return result;
        } catch (err) {
            console.error('[AgentOrchestrator] Parallel run error:', err);
            return null;
        } finally {
            runningRef.current = false;
            setIsRunning(false);
        }
    }, []);

    const reset = useCallback(() => {
        orchestrator.agents.forEach(a => a.reset());
        setAgentStates(orchestrator.getAgentStates());
        setLastResult(null);
        setIsRunning(false);
        runningRef.current = false;
    }, []);

    return (
        <AgentContext.Provider value={{ agentStates, isRunning, lastResult, runPipeline, runParallel, reset, orchestrator }}>
            {children}
        </AgentContext.Provider>
    );
}

export function useAgents(): AgentContextValue {
    const ctx = useContext(AgentContext);
    if (!ctx) throw new Error('useAgents must be used inside AgentProvider');
    return ctx;
}
