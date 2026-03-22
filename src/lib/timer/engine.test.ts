import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimerEngine } from './engine';
import type { TimerConfig, TimerState } from './types';

const defaultConfig: TimerConfig = {
	workDurationMs: 25 * 60 * 1000,
	pauseDurationMs: 5 * 60 * 1000,
	autoStartPause: true
};

// Mock requestAnimationFrame and cancelAnimationFrame
let rafCallbacks: Map<number, FrameRequestCallback> = new Map();
let rafId = 0;

beforeEach(() => {
	rafCallbacks.clear();
	rafId = 0;
	
	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
		const id = ++rafId;
		rafCallbacks.set(id, callback);
		return id;
	});
	
	vi.stubGlobal('cancelAnimationFrame', (id: number) => {
		rafCallbacks.delete(id);
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

// Helper to simulate animation frames
function flushRaf() {
	const callbacks = Array.from(rafCallbacks.values());
	rafCallbacks.clear();
	callbacks.forEach(cb => cb(performance.now()));
}

describe('TimerEngine', () => {
	describe('initialization', () => {
		it('creates engine with initial state', () => {
			const engine = new TimerEngine(defaultConfig);
			const state = engine.getState();
			
			expect(state.phase).toBe('work');
			expect(state.status).toBe('idle');
			expect(state.remainingMs).toBe(defaultConfig.workDurationMs);
		});

		it('subscribes to state changes', () => {
			const engine = new TimerEngine(defaultConfig);
			const callback = vi.fn();
			
			engine.subscribe(callback);
			
			// Should be called immediately with current state
			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith(engine.getState());
		});

		it('unsubscribes correctly', () => {
			const engine = new TimerEngine(defaultConfig);
			const callback = vi.fn();
			
			const unsubscribe = engine.subscribe(callback);
			callback.mockClear();
			
			unsubscribe();
			engine.start();
			
			// Should not be called after unsubscribe
			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe('start/pause/resume', () => {
		it('starts the timer', () => {
			const engine = new TimerEngine(defaultConfig);
			engine.start();
			
			expect(engine.getState().status).toBe('running');
		});

		it('pauses the timer', () => {
			const engine = new TimerEngine(defaultConfig);
			engine.start();
			engine.pause();
			
			expect(engine.getState().status).toBe('paused');
		});

		it('resumes the timer', () => {
			const engine = new TimerEngine(defaultConfig);
			engine.start();
			engine.pause();
			engine.start(); // start also resumes
			
			expect(engine.getState().status).toBe('running');
		});

		it('toggles between play and pause', () => {
			const engine = new TimerEngine(defaultConfig);
			
			engine.toggle();
			expect(engine.getState().status).toBe('running');
			
			engine.toggle();
			expect(engine.getState().status).toBe('paused');
			
			engine.toggle();
			expect(engine.getState().status).toBe('running');
		});
	});

	describe('reset', () => {
		it('resets to initial work state', () => {
			const engine = new TimerEngine(defaultConfig);
			engine.start();
			engine.reset();
			
			const state = engine.getState();
			expect(state.phase).toBe('work');
			expect(state.status).toBe('idle');
			expect(state.remainingMs).toBe(defaultConfig.workDurationMs);
		});
	});

	describe('switchToPhase', () => {
		it('switches to pause phase', () => {
			const engine = new TimerEngine(defaultConfig);
			engine.switchToPhase('pause');
			
			const state = engine.getState();
			expect(state.phase).toBe('pause');
			expect(state.status).toBe('idle');
			expect(state.remainingMs).toBe(defaultConfig.pauseDurationMs);
		});

		it('switches to work phase', () => {
			const engine = new TimerEngine(defaultConfig);
			engine.switchToPhase('pause');
			engine.switchToPhase('work');
			
			const state = engine.getState();
			expect(state.phase).toBe('work');
			expect(state.remainingMs).toBe(defaultConfig.workDurationMs);
		});
	});

	describe('config updates', () => {
		it('updates config when idle', () => {
			const engine = new TimerEngine(defaultConfig);
			
			const newConfig: TimerConfig = {
				...defaultConfig,
				workDurationMs: 30 * 60 * 1000
			};
			
			engine.updateConfig(newConfig);
			
			expect(engine.getState().remainingMs).toBe(30 * 60 * 1000);
		});

		it('does not update remaining time when running', () => {
			const engine = new TimerEngine(defaultConfig);
			engine.start();
			
			const newConfig: TimerConfig = {
				...defaultConfig,
				workDurationMs: 30 * 60 * 1000
			};
			
			engine.updateConfig(newConfig);
			
			// Should still have the original remaining time (approximately)
			expect(engine.getState().totalMs).toBe(defaultConfig.workDurationMs);
		});
	});

	describe('drift-resistant timing', () => {
		it('calculates remaining time from timestamps, not intervals', () => {
			vi.useFakeTimers();
			const engine = new TimerEngine(defaultConfig);
			const callback = vi.fn();
			engine.subscribe(callback);
			callback.mockClear();

			engine.start();
			
			// Advance time by 1 second
			vi.advanceTimersByTime(1000);
			flushRaf();
			
			const state = engine.getState();
			// Remaining should be roughly 24:59 (allowing small tolerance for test timing)
			expect(state.remainingMs).toBeLessThanOrEqual(defaultConfig.workDurationMs - 900);
			expect(state.remainingMs).toBeGreaterThan(defaultConfig.workDurationMs - 2000);
		});

		it('preserves accuracy after pause/resume', () => {
			vi.useFakeTimers();
			const engine = new TimerEngine(defaultConfig);

			engine.start();
			
			// Run for 5 seconds
			vi.advanceTimersByTime(5000);
			flushRaf();
			
			engine.pause();
			const pausedRemaining = engine.getState().remainingMs;
			
			// Wait while paused (should not affect timer)
			vi.advanceTimersByTime(10000);
			expect(engine.getState().remainingMs).toBe(pausedRemaining);
			
			// Resume and run for another 5 seconds
			engine.start();
			vi.advanceTimersByTime(5000);
			flushRaf();
			
			// Should have lost ~10 seconds total (5 before pause + 5 after)
			const finalRemaining = engine.getState().remainingMs;
			expect(finalRemaining).toBeLessThanOrEqual(defaultConfig.workDurationMs - 10000);
			expect(finalRemaining).toBeGreaterThan(defaultConfig.workDurationMs - 12000);
		});

		it('completes a phase without needing an animation frame', () => {
			vi.useFakeTimers();
			const engine = new TimerEngine({
				workDurationMs: 1000,
				pauseDurationMs: 500,
				autoStartPause: true
			});

			engine.start();

			// No flushRaf call here on purpose.
			vi.advanceTimersByTime(1000);

			const state = engine.getState();
			expect(state.phase).toBe('pause');
			expect(state.status).toBe('running');
			expect(state.remainingMs).toBe(500);
		});

		it('does not complete while paused even if the original timeout window passes', () => {
			vi.useFakeTimers();
			const engine = new TimerEngine({
				workDurationMs: 1000,
				pauseDurationMs: 500,
				autoStartPause: true
			});

			engine.start();
			vi.advanceTimersByTime(400);
			flushRaf();

			engine.pause();
			const pausedState = engine.getState();

			vi.advanceTimersByTime(5000);

			expect(engine.getState()).toEqual(pausedState);
		});
	});

	describe('cleanup', () => {
		it('stops animation frame on destroy', () => {
			const engine = new TimerEngine(defaultConfig);
			engine.start();
			
			expect(rafCallbacks.size).toBeGreaterThan(0);
			
			engine.destroy();
			
			// Animation frame should be cancelled
			expect(rafCallbacks.size).toBe(0);
		});
	});
});
