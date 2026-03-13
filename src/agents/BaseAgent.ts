import type { AgentStatus, AgentResult, DiagnosisPayload } from './types';

// ── BaseAgent ─────────────────────────────────────────────────────────────────

/**
 * Abstract base class for all HMS AI Agents.
 * Every specialist agent extends this and implements `execute()`.
 */
export abstract class BaseAgent<TOutput = unknown> {
    abstract readonly name: string;
    abstract readonly description: string;
    abstract readonly icon: string;  // lucide icon name

    protected _status: AgentStatus = 'idle';
    protected _durationMs = 0;

    get status(): AgentStatus { return this._status; }
    get durationMs(): number { return this._durationMs; }

    /**
     * Runs the agent on the given payload.
     * Handles timing and status management — subclasses implement `execute()`.
     */
    async run(payload: DiagnosisPayload): Promise<AgentResult<TOutput>> {
        this._status = 'running';
        const start = performance.now();

        try {
            const data = await this.execute(payload);
            this._durationMs = Math.round(performance.now() - start);
            this._status = 'done';
            return {
                status: 'done',
                data,
                durationMs: this._durationMs,
            };
        } catch (err) {
            this._durationMs = Math.round(performance.now() - start);
            this._status = 'error';
            const error = err instanceof Error ? err.message : 'Unknown error';
            return {
                status: 'error',
                error,
                durationMs: this._durationMs,
            };
        }
    }

    /** Subclasses implement their domain logic here */
    protected abstract execute(payload: DiagnosisPayload): Promise<TOutput>;

    /** Reset state for a fresh run */
    reset(): void {
        this._status = 'idle';
        this._durationMs = 0;
    }
}
