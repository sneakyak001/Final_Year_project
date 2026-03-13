import type {
    DiagnosisPayload,
    PipelineResult,
    AgentState,
    DiagnosisOutput,
    ImagingOutput,
    TreatmentOutput,
    TriageOutput,
    SummarizationOutput,
} from './types';
import { DiagnosisAgent, ImagingAgent, TreatmentAgent, TriageAgent, SummarizationAgent } from './agents';
import db, { logAuditLog } from '../db';

// ── Orchestrator ──────────────────────────────────────────────────────────────

export type PipelineStatusCallback = (states: AgentState[]) => void;

export class AgentOrchestrator {
    readonly diagnosisAgent = new DiagnosisAgent();
    readonly imagingAgent = new ImagingAgent();
    readonly treatmentAgent = new TreatmentAgent();
    readonly triageAgent = new TriageAgent();
    readonly summarizationAgent = new SummarizationAgent();

    /** Ordered agent list for pipeline display */
    get agents() {
        return [
            this.diagnosisAgent,
            this.imagingAgent,
            this.treatmentAgent,
            this.triageAgent,
            this.summarizationAgent,
        ];
    }

    /** Snapshot of all agent states for UI rendering */
    getAgentStates(): AgentState[] {
        return this.agents.map(a => ({
            name: a.name,
            description: a.description,
            icon: a.icon,
            status: a.status,
            durationMs: a.durationMs,
        }));
    }

    /**
     * Sequential pipeline:
     * Agents run one after another. Each agent's output enriches the payload
     * for the next agent. Status callback fires after each step.
     */
    async runPipeline(
        payload: DiagnosisPayload,
        onStatusUpdate?: PipelineStatusCallback
    ): Promise<PipelineResult> {
        const pipelineStart = performance.now();

        // Reset all agents
        this.agents.forEach(a => a.reset());
        onStatusUpdate?.(this.getAgentStates());

        let currentPayload = { ...payload };

        // Step 1 – Diagnosis
        const diagnosis = await this.diagnosisAgent.run(currentPayload);
        onStatusUpdate?.(this.getAgentStates());

        // Enrich payload with primary diagnosis for downstream agents
        if (diagnosis.data && currentPayload.patient) {
            currentPayload = {
                ...currentPayload,
                patient: {
                    ...currentPayload.patient,
                    condition: (diagnosis.data as DiagnosisOutput).primaryDiagnosis,
                },
            };
        }

        // Step 2 – Imaging (can run even without image — returns "no image" result)
        const imaging = await this.imagingAgent.run(currentPayload);
        onStatusUpdate?.(this.getAgentStates());

        // Step 3 – Treatment
        const treatment = await this.treatmentAgent.run(currentPayload);
        onStatusUpdate?.(this.getAgentStates());

        // Step 4 – Triage
        const triage = await this.triageAgent.run(currentPayload);
        onStatusUpdate?.(this.getAgentStates());

        // Step 5 – Summarization
        const summary = await this.summarizationAgent.run(currentPayload);
        onStatusUpdate?.(this.getAgentStates());

        const totalDurationMs = Math.round(performance.now() - pipelineStart);
        const completedAt = new Date().toISOString();

        const result: PipelineResult = {
            patientId: payload.patient?.id,
            diagnosis: diagnosis as typeof diagnosis & { data: DiagnosisOutput },
            imaging: imaging as typeof imaging & { data: ImagingOutput },
            treatment: treatment as typeof treatment & { data: TreatmentOutput },
            triage: triage as typeof triage & { data: TriageOutput },
            summary: summary as typeof summary & { data: SummarizationOutput },
            totalDurationMs,
            completedAt,
        };

        // Persist to DB
        await this._persistResults(result, payload.patient?.id);

        return result;
    }

    /**
     * Parallel run: DiagnosisAgent + ImagingAgent + TriageAgent run concurrently.
     * TreatmentAgent and SummarizationAgent run after.
     */
    async runParallel(
        payload: DiagnosisPayload,
        onStatusUpdate?: PipelineStatusCallback
    ): Promise<PipelineResult> {
        const pipelineStart = performance.now();
        this.agents.forEach(a => a.reset());
        onStatusUpdate?.(this.getAgentStates());

        // Phase 1 – concurrent
        const [diagnosis, imaging, triage] = await Promise.all([
            this.diagnosisAgent.run(payload),
            this.imagingAgent.run(payload),
            this.triageAgent.run(payload),
        ]);
        onStatusUpdate?.(this.getAgentStates());

        let enrichedPayload = { ...payload };
        if (diagnosis.data && enrichedPayload.patient) {
            enrichedPayload = {
                ...enrichedPayload,
                patient: {
                    ...enrichedPayload.patient,
                    condition: (diagnosis.data as DiagnosisOutput).primaryDiagnosis,
                },
            };
        }

        // Phase 2 – sequential, depends on phase 1
        const treatment = await this.treatmentAgent.run(enrichedPayload);
        onStatusUpdate?.(this.getAgentStates());
        const summary = await this.summarizationAgent.run(enrichedPayload);
        onStatusUpdate?.(this.getAgentStates());

        const totalDurationMs = Math.round(performance.now() - pipelineStart);
        const result: PipelineResult = {
            patientId: payload.patient?.id,
            diagnosis: diagnosis as typeof diagnosis & { data: DiagnosisOutput },
            imaging: imaging as typeof imaging & { data: ImagingOutput },
            treatment: treatment as typeof treatment & { data: TreatmentOutput },
            triage: triage as typeof triage & { data: TriageOutput },
            summary: summary as typeof summary & { data: SummarizationOutput },
            totalDurationMs,
            completedAt: new Date().toISOString(),
        };

        await this._persistResults(result, payload.patient?.id);
        return result;
    }

    private async _persistResults(result: PipelineResult, patientId?: string): Promise<void> {
        try {
            // Save agent run logs to DB
            for (const agent of this.agents) {
                await (db as any).agentLogs?.add({
                    patientId: patientId ?? 'unknown',
                    agentName: agent.name,
                    status: agent.status,
                    durationMs: agent.durationMs,
                    timestamp: Date.now(),
                });
            }

            // Save full report
            await (db as any).aiReports?.add({
                patientId: patientId ?? 'unknown',
                result: JSON.stringify(result),
                timestamp: Date.now(),
            });

            // Write audit log
            if (patientId) {
                await logAuditLog(
                    'AI Pipeline Run',
                    patientId,
                    'AI Orchestrator',
                    'ai',
                    `Full 5-agent pipeline completed in ${result.totalDurationMs}ms`
                );
            }
        } catch {
            // Graceful — DB tables may not exist yet in old schema
        }
    }
}

// Singleton instance
export const orchestrator = new AgentOrchestrator();
