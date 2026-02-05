import { writable, derived, get } from 'svelte/store';
import type { TimerConfig } from '$lib/timer';
import { minutesToMs, validateDurationMinutes } from '$lib/timer';

const STORAGE_KEY = 'pomodoro.settings.v1';

/**
 * Settings schema with versioning for future migrations
 */
export interface Settings {
	version: 1;
	workMinutes: number;
	pauseMinutes: number;
	autoStartPause: boolean;
	colors: {
		work: string;
		pause: string;
		text: string;
	};
}

/**
 * Default settings
 */
export const defaultSettings: Settings = {
	version: 1,
	workMinutes: 25,
	pauseMinutes: 5,
	autoStartPause: true,
	colors: {
		work: '#E34234',
		pause: '#10b981',
		text: '#FFFFFF'
	}
};

/**
 * Validates a hex color string
 */
function isValidHexColor(color: string): boolean {
	return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Validates and merges settings with defaults
 */
function validateSettings(stored: unknown): Settings {
	if (!stored || typeof stored !== 'object') {
		return { ...defaultSettings };
	}

	const s = stored as Partial<Settings>;

	// Validate and clamp work minutes
	const workMinutes = typeof s.workMinutes === 'number'
		? validateDurationMinutes(s.workMinutes).clamped
		: defaultSettings.workMinutes;

	// Validate and clamp pause minutes
	const pauseMinutes = typeof s.pauseMinutes === 'number'
		? validateDurationMinutes(s.pauseMinutes).clamped
		: defaultSettings.pauseMinutes;

	// Validate colors
	const colors = s.colors && typeof s.colors === 'object'
		? {
			work: isValidHexColor(s.colors.work) ? s.colors.work : defaultSettings.colors.work,
			pause: isValidHexColor(s.colors.pause) ? s.colors.pause : defaultSettings.colors.pause,
			text: isValidHexColor(s.colors.text) ? s.colors.text : defaultSettings.colors.text
		}
		: { ...defaultSettings.colors };

	return {
		version: 1,
		workMinutes,
		pauseMinutes,
		autoStartPause: typeof s.autoStartPause === 'boolean' ? s.autoStartPause : defaultSettings.autoStartPause,
		colors
	};
}

/**
 * Load settings from localStorage
 */
function loadSettings(): Settings {
	if (typeof window === 'undefined') {
		return { ...defaultSettings };
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) {
			return { ...defaultSettings };
		}
		const parsed = JSON.parse(stored);
		return validateSettings(parsed);
	} catch {
		return { ...defaultSettings };
	}
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings: Settings): void {
	if (typeof window === 'undefined') return;

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch {
		// Silently fail if localStorage is unavailable
		console.warn('Failed to save settings to localStorage');
	}
}

/**
 * Create the settings store
 */
function createSettingsStore() {
	const { subscribe, set, update } = writable<Settings>(defaultSettings);

	return {
		subscribe,

		/**
		 * Initialize the store from localStorage (call on mount)
		 */
		init() {
			const loaded = loadSettings();
			set(loaded);
		},

		/**
		 * Update a single setting
		 */
		updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
			update(s => {
				const updated = { ...s, [key]: value };
				saveSettings(updated);
				return updated;
			});
		},

		/**
		 * Update color settings
		 */
		updateColor(colorKey: keyof Settings['colors'], value: string) {
			if (!isValidHexColor(value)) return;
			update(s => {
				const updated = {
					...s,
					colors: { ...s.colors, [colorKey]: value }
				};
				saveSettings(updated);
				return updated;
			});
		},

		/**
		 * Update work duration (validates and clamps)
		 */
		setWorkMinutes(minutes: number) {
			const { clamped } = validateDurationMinutes(minutes);
			update(s => {
				const updated = { ...s, workMinutes: clamped };
				saveSettings(updated);
				return updated;
			});
		},

		/**
		 * Update pause duration (validates and clamps)
		 */
		setPauseMinutes(minutes: number) {
			const { clamped } = validateDurationMinutes(minutes);
			update(s => {
				const updated = { ...s, pauseMinutes: clamped };
				saveSettings(updated);
				return updated;
			});
		},

		/**
		 * Toggle auto-start pause
		 */
		setAutoStartPause(value: boolean) {
			update(s => {
				const updated = { ...s, autoStartPause: value };
				saveSettings(updated);
				return updated;
			});
		},

		/**
		 * Reset to defaults
		 */
		reset() {
			const defaults = { ...defaultSettings };
			saveSettings(defaults);
			set(defaults);
		}
	};
}

export const settings = createSettingsStore();

/**
 * Derived store that converts settings to TimerConfig
 */
export const timerConfig = derived(settings, ($settings): TimerConfig => ({
	workDurationMs: minutesToMs($settings.workMinutes),
	pauseDurationMs: minutesToMs($settings.pauseMinutes),
	autoStartPause: $settings.autoStartPause
}));

/**
 * Get current settings value (for non-reactive contexts)
 */
export function getSettings(): Settings {
	return get(settings);
}
