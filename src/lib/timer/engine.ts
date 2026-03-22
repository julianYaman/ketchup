import type { TimerState, TimerConfig, Phase } from './types';
import { timerReducer, createInitialState, getNextPhaseTransition } from './state-machine';

export type TimerCallback = (state: TimerState) => void;

/**
 * Timer Engine - handles the actual timing logic with drift-resistant implementation.
 * 
 * Uses monotonic timestamps (Date.now()) to compute remaining time, ensuring
 * accuracy even when the browser tab is backgrounded or the system is under load.
 */
export class TimerEngine {
	private state: TimerState;
	private config: TimerConfig;
	private startTimestamp: number | null = null;
	private elapsedBeforePause: number = 0;
	private animationFrameId: number | null = null;
	private completionTimeoutId: ReturnType<typeof setTimeout> | null = null;
	private callbacks: Set<TimerCallback> = new Set();
	private handleVisibilityChange = () => {
		if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
			this.updateRemainingTime();
		}
	};

	constructor(config: TimerConfig) {
		this.config = config;
		this.state = createInitialState(config);

		if (typeof document !== 'undefined') {
			document.addEventListener('visibilitychange', this.handleVisibilityChange);
		}
	}

	/**
	 * Subscribe to state changes
	 */
	subscribe(callback: TimerCallback): () => void {
		this.callbacks.add(callback);
		callback(this.state);
		return () => this.callbacks.delete(callback);
	}

	/**
	 * Notify all subscribers of state change
	 */
	private notify(): void {
		for (const callback of this.callbacks) {
			callback(this.state);
		}
	}

	/**
	 * Get current state
	 */
	getState(): TimerState {
		return this.state;
	}

	/**
	 * Update configuration
	 */
	updateConfig(config: TimerConfig): void {
		this.config = config;
		// If idle, update the remaining time to match new config
		if (this.state.status === 'idle') {
			const durationMs = this.state.phase === 'work' 
				? config.workDurationMs 
				: config.pauseDurationMs;
			this.state = {
				...this.state,
				remainingMs: durationMs,
				totalMs: durationMs
			};
			this.notify();
		}
	}

	/**
	 * Start or resume the timer
	 */
	start(): void {
		if (this.state.status === 'idle' || this.state.status === 'finished') {
			this.state = timerReducer(this.state, { type: 'START' }, this.config);
			this.startTimestamp = Date.now();
			this.elapsedBeforePause = this.state.totalMs - this.state.remainingMs;
			this.startTicking();
			this.scheduleCompletion();
			this.notify();
		} else if (this.state.status === 'paused') {
			this.state = timerReducer(this.state, { type: 'RESUME' }, this.config);
			this.startTimestamp = Date.now();
			// elapsedBeforePause is already set from when we paused
			this.startTicking();
			this.scheduleCompletion();
			this.notify();
		}
	}

	/**
	 * Pause the timer
	 */
	pause(): void {
		if (this.state.status === 'running') {
			this.stopActiveTiming();
			// Calculate elapsed time and store it
			if (this.startTimestamp !== null) {
				const elapsed = Date.now() - this.startTimestamp;
				this.elapsedBeforePause += elapsed;
			}
			this.startTimestamp = null;
			this.state = timerReducer(this.state, { type: 'PAUSE' }, this.config);
			this.notify();
		}
	}

	/**
	 * Toggle between play and pause
	 */
	toggle(): void {
		if (this.state.status === 'running') {
			this.pause();
		} else {
			this.start();
		}
	}

	/**
	 * Reset the timer to initial state
	 */
	reset(): void {
		this.stopActiveTiming();
		this.startTimestamp = null;
		this.elapsedBeforePause = 0;
		this.state = timerReducer(this.state, { type: 'RESET' }, this.config);
		this.notify();
	}

	/**
	 * Switch to a specific phase
	 */
	switchToPhase(phase: Phase): void {
		this.stopActiveTiming();
		this.startTimestamp = null;
		this.elapsedBeforePause = 0;
		const durationMs = phase === 'work' ? this.config.workDurationMs : this.config.pauseDurationMs;
		this.state = timerReducer(
			this.state,
			{ type: 'SWITCH_PHASE', phase, durationMs },
			this.config
		);
		this.notify();
	}

	/**
	 * Start the tick loop using requestAnimationFrame
	 */
	private startTicking(): void {
		if (this.animationFrameId !== null) return;

		const tick = () => {
			this.updateRemainingTime();
			this.animationFrameId = requestAnimationFrame(tick);
		};

		this.animationFrameId = requestAnimationFrame(tick);
	}

	/**
	 * Stop the tick loop
	 */
	private stopTicking(): void {
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	/**
	 * Clear the completion timeout.
	 */
	private clearCompletionSchedule(): void {
		if (this.completionTimeoutId !== null) {
			clearTimeout(this.completionTimeoutId);
			this.completionTimeoutId = null;
		}
	}

	/**
	 * Stop all active timing mechanisms.
	 */
	private stopActiveTiming(): void {
		this.stopTicking();
		this.clearCompletionSchedule();
	}

	/**
	 * Schedule completion based on the current remaining time.
	 */
	private scheduleCompletion(): void {
		this.clearCompletionSchedule();
		if (this.state.status !== 'running') return;

		const delay = Math.max(0, this.state.remainingMs);
		this.completionTimeoutId = setTimeout(() => {
			this.completionTimeoutId = null;
			this.updateRemainingTime();

			if (this.state.status === 'running') {
				this.scheduleCompletion();
			}
		}, delay);
	}

	/**
	 * Update remaining time based on elapsed time since start.
	 * This drift-resistant approach calculates time from timestamps
	 * rather than relying on interval accuracy.
	 */
	private updateRemainingTime(): void {
		if (this.state.status !== 'running' || this.startTimestamp === null) return;

		const now = Date.now();
		const elapsedSinceStart = now - this.startTimestamp;
		const totalElapsed = this.elapsedBeforePause + elapsedSinceStart;
		const remaining = Math.max(0, this.state.totalMs - totalElapsed);

		// Only notify if the displayed value would change (every ~100ms is enough)
		const oldSeconds = Math.ceil(this.state.remainingMs / 1000);
		const newSeconds = Math.ceil(remaining / 1000);

		if (remaining !== this.state.remainingMs) {
			this.state = {
				...this.state,
				remainingMs: remaining
			};

			// Notify on second boundaries to reduce unnecessary updates
			if (oldSeconds !== newSeconds || remaining === 0) {
				this.notify();
			}
		}

		// Check if timer finished
		if (remaining === 0) {
			this.handlePhaseComplete();
		}
	}

	/**
	 * Handle completion of current phase
	 */
	private handlePhaseComplete(): void {
		this.stopActiveTiming();
		this.state = timerReducer(this.state, { type: 'FINISH' }, this.config);
		this.notify();

		// Determine next phase
		const transition = getNextPhaseTransition(this.state.phase, this.config);
		
		// Switch to next phase
		this.startTimestamp = null;
		this.elapsedBeforePause = 0;
		this.state = timerReducer(
			this.state,
			{ type: 'SWITCH_PHASE', phase: transition.phase, durationMs: transition.durationMs },
			this.config
		);

		// Auto-start if configured
		if (transition.autoStart) {
			this.state = timerReducer(this.state, { type: 'START' }, this.config);
			this.startTimestamp = Date.now();
			this.startTicking();
			this.scheduleCompletion();
		}

		this.notify();
	}

	/**
	 * Clean up resources
	 */
	destroy(): void {
		this.stopActiveTiming();
		if (typeof document !== 'undefined') {
			document.removeEventListener('visibilitychange', this.handleVisibilityChange);
		}
		this.callbacks.clear();
	}
}
