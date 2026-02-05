import type { TimerState, TimerEvent, TimerConfig, Phase } from './types';

/**
 * Creates the initial timer state
 */
export function createInitialState(config: TimerConfig): TimerState {
	return {
		phase: 'work',
		status: 'idle',
		remainingMs: config.workDurationMs,
		totalMs: config.workDurationMs
	};
}

/**
 * Pure state machine reducer for timer transitions.
 * This function is pure and has no side effects, making it easy to test.
 */
export function timerReducer(
	state: TimerState,
	event: TimerEvent,
	config: TimerConfig
): TimerState {
	switch (event.type) {
		case 'START':
			if (state.status === 'idle' || state.status === 'finished') {
				return {
					...state,
					status: 'running'
				};
			}
			return state;

		case 'PAUSE':
			if (state.status === 'running') {
				return {
					...state,
					status: 'paused'
				};
			}
			return state;

		case 'RESUME':
			if (state.status === 'paused') {
				return {
					...state,
					status: 'running'
				};
			}
			return state;

		case 'RESET':
			return createInitialState(config);

		case 'TICK':
			// TICK is handled by the timer engine, not the pure reducer
			return state;

		case 'FINISH':
			if (state.status === 'running') {
				return {
					...state,
					status: 'finished',
					remainingMs: 0
				};
			}
			return state;

		case 'SWITCH_PHASE':
			return {
				phase: event.phase,
				status: config.autoStartPause || event.phase === 'work' ? 'idle' : 'idle',
				remainingMs: event.durationMs,
				totalMs: event.durationMs
			};

		default:
			return state;
	}
}

/**
 * Determines what happens when a phase finishes
 */
export function getNextPhaseTransition(
	currentPhase: Phase,
	config: TimerConfig
): { phase: Phase; durationMs: number; autoStart: boolean } {
	if (currentPhase === 'work') {
		return {
			phase: 'pause',
			durationMs: config.pauseDurationMs,
			autoStart: config.autoStartPause
		};
	} else {
		return {
			phase: 'work',
			durationMs: config.workDurationMs,
			autoStart: false // Never auto-start work by default
		};
	}
}

/**
 * Formats milliseconds as MM:SS string
 */
export function formatTime(ms: number): string {
	const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Validates that a duration in minutes is within acceptable bounds
 */
export function validateDurationMinutes(minutes: number): { valid: boolean; clamped: number } {
	const min = 1;
	const max = 120;
	const clamped = Math.min(max, Math.max(min, Math.round(minutes)));
	return {
		valid: minutes >= min && minutes <= max && Number.isFinite(minutes),
		clamped
	};
}

/**
 * Converts minutes to milliseconds
 */
export function minutesToMs(minutes: number): number {
	return minutes * 60 * 1000;
}

/**
 * Converts milliseconds to minutes
 */
export function msToMinutes(ms: number): number {
	return ms / 60 / 1000;
}
