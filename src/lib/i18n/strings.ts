/**
 * Centralized UI strings for internationalization readiness.
 * All user-facing text should be defined here.
 */
export const strings = {
	// App
	appTitle: 'Ketchup - Pomodoro Focus Timer',

	// Phases
	phaseWork: 'Work',
	phasePause: 'Break',

	// Timer status
	statusIdle: 'Ready',
	statusRunning: 'Running',
	statusPaused: 'Paused',
	statusFinished: 'Finished',

	// Buttons
	buttonPlay: 'Start',
	buttonPause: 'Pause',
	buttonReset: 'Reset',
	buttonSettings: 'Settings',
	buttonPip: 'Picture-in-Picture',
	buttonPipDisabled: 'Picture-in-Picture not supported in this browser',
	buttonClose: 'Close',
	buttonSave: 'Save',
	buttonFeedback: 'Give Feedback',

	// Settings
	settingsTitle: 'Settings',
	settingsWorkDuration: 'Work Duration (minutes)',
	settingsPauseDuration: 'Break Duration (minutes)',
	settingsAutoStartPause: 'Auto-start break after work',
	settingsWorkColor: 'Work Background Color',
	settingsPauseColor: 'Break Background Color',
	settingsReset: 'Reset to Defaults',
	settingsDurationHint: 'Must be between 1 and 120 minutes',

	// Accessibility
	ariaTimerDisplay: 'Timer display',
	ariaTimerRemaining: 'Time remaining',
	ariaPlayPauseToggle: 'Toggle play/pause',
	ariaSettingsOpen: 'Open settings',
	ariaSettingsClose: 'Close settings',
	ariaColorPicker: 'Choose color',

	// Keyboard shortcuts
	keyboardShortcuts: 'Keyboard Shortcuts',
	keySpace: 'Space',
	keySpaceDesc: 'Start/Pause',
	keyS: 'S',
	keySDesc: 'Open Settings',
	keyP: 'P',
	keyPDesc: 'Toggle PiP',
	keyEscape: 'Escape',
	keyEscapeDesc: 'Close modal',

	// Messages
	pipNotSupported: 'Picture-in-Picture is not supported in your browser.',
	pipActive: 'Picture-in-Picture active',
} as const;

export type StringKey = keyof typeof strings;

/**
 * Get a localized string by key
 */
export function t(key: StringKey): string {
	return strings[key];
}
