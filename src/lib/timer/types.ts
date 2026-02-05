/**
 * Timer phase - either work or pause
 */
export type Phase = 'work' | 'pause';

/**
 * Timer running state
 */
export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

/**
 * Complete timer state
 */
export interface TimerState {
	phase: Phase;
	status: TimerStatus;
	remainingMs: number;
	totalMs: number;
}

/**
 * Timer events that can trigger state transitions
 */
export type TimerEvent =
	| { type: 'START' }
	| { type: 'PAUSE' }
	| { type: 'RESUME' }
	| { type: 'RESET' }
	| { type: 'TICK'; now: number }
	| { type: 'FINISH' }
	| { type: 'SWITCH_PHASE'; phase: Phase; durationMs: number };

/**
 * Timer configuration
 */
export interface TimerConfig {
	workDurationMs: number;
	pauseDurationMs: number;
	autoStartPause: boolean;
}
