import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	createInitialState,
	timerReducer,
	getNextPhaseTransition,
	formatTime,
	validateDurationMinutes,
	minutesToMs,
	msToMinutes
} from './state-machine';
import type { TimerState, TimerConfig } from './types';

const defaultConfig: TimerConfig = {
	workDurationMs: 25 * 60 * 1000, // 25 minutes
	pauseDurationMs: 5 * 60 * 1000, // 5 minutes
	autoStartPause: true
};

describe('createInitialState', () => {
	it('creates state with work phase and idle status', () => {
		const state = createInitialState(defaultConfig);
		expect(state.phase).toBe('work');
		expect(state.status).toBe('idle');
		expect(state.remainingMs).toBe(defaultConfig.workDurationMs);
		expect(state.totalMs).toBe(defaultConfig.workDurationMs);
	});

	it('uses configured work duration', () => {
		const customConfig = { ...defaultConfig, workDurationMs: 30 * 60 * 1000 };
		const state = createInitialState(customConfig);
		expect(state.remainingMs).toBe(30 * 60 * 1000);
	});
});

describe('timerReducer', () => {
	let initialState: TimerState;

	beforeEach(() => {
		initialState = createInitialState(defaultConfig);
	});

	describe('START event', () => {
		it('transitions from idle to running', () => {
			const newState = timerReducer(initialState, { type: 'START' }, defaultConfig);
			expect(newState.status).toBe('running');
		});

		it('transitions from finished to running', () => {
			const finishedState = { ...initialState, status: 'finished' as const };
			const newState = timerReducer(finishedState, { type: 'START' }, defaultConfig);
			expect(newState.status).toBe('running');
		});

		it('does not change state if already running', () => {
			const runningState = { ...initialState, status: 'running' as const };
			const newState = timerReducer(runningState, { type: 'START' }, defaultConfig);
			expect(newState).toEqual(runningState);
		});

		it('does not change state if paused', () => {
			const pausedState = { ...initialState, status: 'paused' as const };
			const newState = timerReducer(pausedState, { type: 'START' }, defaultConfig);
			expect(newState).toEqual(pausedState);
		});
	});

	describe('PAUSE event', () => {
		it('transitions from running to paused', () => {
			const runningState = { ...initialState, status: 'running' as const };
			const newState = timerReducer(runningState, { type: 'PAUSE' }, defaultConfig);
			expect(newState.status).toBe('paused');
		});

		it('does not change state if idle', () => {
			const newState = timerReducer(initialState, { type: 'PAUSE' }, defaultConfig);
			expect(newState).toEqual(initialState);
		});
	});

	describe('RESUME event', () => {
		it('transitions from paused to running', () => {
			const pausedState = { ...initialState, status: 'paused' as const };
			const newState = timerReducer(pausedState, { type: 'RESUME' }, defaultConfig);
			expect(newState.status).toBe('running');
		});

		it('does not change state if not paused', () => {
			const newState = timerReducer(initialState, { type: 'RESUME' }, defaultConfig);
			expect(newState).toEqual(initialState);
		});
	});

	describe('RESET event', () => {
		it('resets to initial state', () => {
			const modifiedState: TimerState = {
				phase: 'pause',
				status: 'running',
				remainingMs: 1000,
				totalMs: 5 * 60 * 1000
			};
			const newState = timerReducer(modifiedState, { type: 'RESET' }, defaultConfig);
			expect(newState).toEqual(createInitialState(defaultConfig));
		});
	});

	describe('FINISH event', () => {
		it('transitions from running to finished with zero remaining', () => {
			const runningState = { ...initialState, status: 'running' as const, remainingMs: 100 };
			const newState = timerReducer(runningState, { type: 'FINISH' }, defaultConfig);
			expect(newState.status).toBe('finished');
			expect(newState.remainingMs).toBe(0);
		});

		it('does not change state if not running', () => {
			const newState = timerReducer(initialState, { type: 'FINISH' }, defaultConfig);
			expect(newState).toEqual(initialState);
		});
	});

	describe('SWITCH_PHASE event', () => {
		it('switches to pause phase with correct duration', () => {
			const newState = timerReducer(
				initialState,
				{ type: 'SWITCH_PHASE', phase: 'pause', durationMs: 5 * 60 * 1000 },
				defaultConfig
			);
			expect(newState.phase).toBe('pause');
			expect(newState.status).toBe('idle');
			expect(newState.remainingMs).toBe(5 * 60 * 1000);
			expect(newState.totalMs).toBe(5 * 60 * 1000);
		});

		it('switches to work phase', () => {
			const pauseState: TimerState = {
				phase: 'pause',
				status: 'finished',
				remainingMs: 0,
				totalMs: 5 * 60 * 1000
			};
			const newState = timerReducer(
				pauseState,
				{ type: 'SWITCH_PHASE', phase: 'work', durationMs: 25 * 60 * 1000 },
				defaultConfig
			);
			expect(newState.phase).toBe('work');
			expect(newState.remainingMs).toBe(25 * 60 * 1000);
		});
	});
});

describe('getNextPhaseTransition', () => {
	it('returns pause phase after work with autoStart when enabled', () => {
		const transition = getNextPhaseTransition('work', defaultConfig);
		expect(transition.phase).toBe('pause');
		expect(transition.durationMs).toBe(defaultConfig.pauseDurationMs);
		expect(transition.autoStart).toBe(true);
	});

	it('returns pause phase after work without autoStart when disabled', () => {
		const config = { ...defaultConfig, autoStartPause: false };
		const transition = getNextPhaseTransition('work', config);
		expect(transition.phase).toBe('pause');
		expect(transition.autoStart).toBe(false);
	});

	it('returns work phase after pause without autoStart', () => {
		const transition = getNextPhaseTransition('pause', defaultConfig);
		expect(transition.phase).toBe('work');
		expect(transition.durationMs).toBe(defaultConfig.workDurationMs);
		expect(transition.autoStart).toBe(false);
	});
});

describe('formatTime', () => {
	it('formats zero milliseconds', () => {
		expect(formatTime(0)).toBe('00:00');
	});

	it('formats seconds correctly', () => {
		expect(formatTime(1000)).toBe('00:01');
		expect(formatTime(30000)).toBe('00:30');
		expect(formatTime(59000)).toBe('00:59');
	});

	it('formats minutes correctly', () => {
		expect(formatTime(60000)).toBe('01:00');
		expect(formatTime(5 * 60 * 1000)).toBe('05:00');
		expect(formatTime(25 * 60 * 1000)).toBe('25:00');
	});

	it('formats combined minutes and seconds', () => {
		expect(formatTime(1 * 60 * 1000 + 30 * 1000)).toBe('01:30');
		expect(formatTime(25 * 60 * 1000 + 45 * 1000)).toBe('25:45');
	});

	it('rounds up milliseconds to next second', () => {
		expect(formatTime(1)).toBe('00:01');
		expect(formatTime(999)).toBe('00:01');
		expect(formatTime(1001)).toBe('00:02');
	});

	it('handles negative values', () => {
		expect(formatTime(-1000)).toBe('00:00');
	});

	it('handles large values', () => {
		expect(formatTime(120 * 60 * 1000)).toBe('120:00');
	});
});

describe('validateDurationMinutes', () => {
	it('validates correct values', () => {
		expect(validateDurationMinutes(1)).toEqual({ valid: true, clamped: 1 });
		expect(validateDurationMinutes(25)).toEqual({ valid: true, clamped: 25 });
		expect(validateDurationMinutes(120)).toEqual({ valid: true, clamped: 120 });
	});

	it('clamps values below minimum', () => {
		expect(validateDurationMinutes(0)).toEqual({ valid: false, clamped: 1 });
		expect(validateDurationMinutes(-5)).toEqual({ valid: false, clamped: 1 });
	});

	it('clamps values above maximum', () => {
		expect(validateDurationMinutes(121)).toEqual({ valid: false, clamped: 120 });
		expect(validateDurationMinutes(1000)).toEqual({ valid: false, clamped: 120 });
	});

	it('rounds non-integer values', () => {
		expect(validateDurationMinutes(25.4)).toEqual({ valid: true, clamped: 25 });
		expect(validateDurationMinutes(25.6)).toEqual({ valid: true, clamped: 26 });
	});

	it('handles NaN and Infinity', () => {
		expect(validateDurationMinutes(NaN).valid).toBe(false);
		expect(validateDurationMinutes(Infinity).valid).toBe(false);
	});
});

describe('minutesToMs', () => {
	it('converts minutes to milliseconds', () => {
		expect(minutesToMs(1)).toBe(60000);
		expect(minutesToMs(25)).toBe(1500000);
		expect(minutesToMs(0.5)).toBe(30000);
	});
});

describe('msToMinutes', () => {
	it('converts milliseconds to minutes', () => {
		expect(msToMinutes(60000)).toBe(1);
		expect(msToMinutes(1500000)).toBe(25);
		expect(msToMinutes(30000)).toBe(0.5);
	});
});
