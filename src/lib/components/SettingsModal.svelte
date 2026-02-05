<script lang="ts">
	import { settings, type Settings } from '$lib/stores';
	import { t } from '$lib/i18n';
	import { onMount } from 'svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open, onclose }: Props = $props();

	let dialogElement: HTMLDialogElement | null = $state(null);
	let firstFocusableElement: HTMLElement | null = $state(null);
	let lastFocusableElement: HTMLElement | null = $state(null);

	// Local copies for form inputs
	let workMinutes = $state($settings.workMinutes);
	let pauseMinutes = $state($settings.pauseMinutes);
	let autoStartPause = $state($settings.autoStartPause);
	let workColor = $state($settings.colors.work);
	let pauseColor = $state($settings.colors.pause);

	// Validation states
	let workMinutesError = $state('');
	let pauseMinutesError = $state('');

	// Sync local state when settings change externally
	$effect(() => {
		workMinutes = $settings.workMinutes;
		pauseMinutes = $settings.pauseMinutes;
		autoStartPause = $settings.autoStartPause;
		workColor = $settings.colors.work;
		pauseColor = $settings.colors.pause;
	});

	// Handle dialog open/close
	$effect(() => {
		if (dialogElement) {
			if (open) {
				dialogElement.showModal();
			} else {
				dialogElement.close();
			}
		}
	});

	function validateMinutes(value: number): string {
		if (!Number.isFinite(value)) return 'Please enter a valid number';
		if (value < 1) return 'Minimum is 1 minute';
		if (value > 120) return 'Maximum is 120 minutes';
		return '';
	}

	function handleWorkMinutesChange(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value, 10);
		workMinutes = value;
		workMinutesError = validateMinutes(value);
		if (!workMinutesError) {
			settings.setWorkMinutes(value);
		}
	}

	function handlePauseMinutesChange(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value, 10);
		pauseMinutes = value;
		pauseMinutesError = validateMinutes(value);
		if (!pauseMinutesError) {
			settings.setPauseMinutes(value);
		}
	}

	function handleAutoStartChange(e: Event) {
		autoStartPause = (e.target as HTMLInputElement).checked;
		settings.setAutoStartPause(autoStartPause);
	}

	function handleWorkColorChange(e: Event) {
		workColor = (e.target as HTMLInputElement).value;
		settings.updateColor('work', workColor);
	}

	function handlePauseColorChange(e: Event) {
		pauseColor = (e.target as HTMLInputElement).value;
		settings.updateColor('pause', pauseColor);
	}

	function handleReset() {
		settings.reset();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onclose();
		}

		// Focus trap
		if (e.key === 'Tab' && firstFocusableElement && lastFocusableElement) {
			if (e.shiftKey) {
				if (document.activeElement === firstFocusableElement) {
					e.preventDefault();
					lastFocusableElement.focus();
				}
			} else {
				if (document.activeElement === lastFocusableElement) {
					e.preventDefault();
					firstFocusableElement.focus();
				}
			}
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === dialogElement) {
			onclose();
		}
	}

	function openFeedback() {
		window.open('https://github.com/julianyaman/pomodoro-timer/issues', '_blank', 'noopener');
	}

	onMount(() => {
		// Set up focus trap references
		if (dialogElement) {
			const focusable = dialogElement.querySelectorAll<HTMLElement>(
				'button, input, [tabindex]:not([tabindex="-1"])'
			);
			firstFocusableElement = focusable[0] || null;
			lastFocusableElement = focusable[focusable.length - 1] || null;
		}
	});
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialogElement}
	class="settings-modal"
	aria-labelledby="settings-title"
	aria-modal="true"
	onkeydown={handleKeydown}
	onclick={handleBackdropClick}
>
	<div class="modal-content" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="document">
		<header class="modal-header">
			<h2 id="settings-title">{t('settingsTitle')}</h2>
			<button
				type="button"
				class="close-button"
				onclick={onclose}
				aria-label={t('ariaSettingsClose')}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<path d="M18 6L6 18M6 6l12 12" />
				</svg>
			</button>
		</header>

		<form class="settings-form" onsubmit={(e) => e.preventDefault()}>
			<div class="form-group">
				<label for="work-minutes">{t('settingsWorkDuration')}</label>
				<input
					id="work-minutes"
					type="number"
					min="1"
					max="120"
					value={workMinutes}
					oninput={handleWorkMinutesChange}
					aria-describedby="work-minutes-error work-minutes-hint"
					aria-invalid={!!workMinutesError}
				/>
				<span id="work-minutes-hint" class="hint">{t('settingsDurationHint')}</span>
				{#if workMinutesError}
					<span id="work-minutes-error" class="error" role="alert">{workMinutesError}</span>
				{/if}
			</div>

			<div class="form-group">
				<label for="pause-minutes">{t('settingsPauseDuration')}</label>
				<input
					id="pause-minutes"
					type="number"
					min="1"
					max="120"
					value={pauseMinutes}
					oninput={handlePauseMinutesChange}
					aria-describedby="pause-minutes-error pause-minutes-hint"
					aria-invalid={!!pauseMinutesError}
				/>
				<span id="pause-minutes-hint" class="hint">{t('settingsDurationHint')}</span>
				{#if pauseMinutesError}
					<span id="pause-minutes-error" class="error" role="alert">{pauseMinutesError}</span>
				{/if}
			</div>

			<div class="form-group checkbox-group">
				<label class="checkbox-label">
					<input
						type="checkbox"
						checked={autoStartPause}
						onchange={handleAutoStartChange}
					/>
					<span>{t('settingsAutoStartPause')}</span>
				</label>
			</div>

			<div class="form-group color-group">
				<label for="work-color">{t('settingsWorkColor')}</label>
				<div class="color-input-wrapper">
					<input
						id="work-color"
						type="color"
						value={workColor}
						oninput={handleWorkColorChange}
						aria-label={t('ariaColorPicker')}
					/>
					<span class="color-value">{workColor}</span>
				</div>
			</div>

			<div class="form-group color-group">
				<label for="pause-color">{t('settingsPauseColor')}</label>
				<div class="color-input-wrapper">
					<input
						id="pause-color"
						type="color"
						value={pauseColor}
						oninput={handlePauseColorChange}
						aria-label={t('ariaColorPicker')}
					/>
					<span class="color-value">{pauseColor}</span>
				</div>
			</div>

			<div class="form-actions">
				<button type="button" class="reset-button" onclick={handleReset}>
					{t('settingsReset')}
				</button>
				<button type="button" class="feedback-button" onclick={openFeedback}>
					{t('buttonFeedback')}
				</button>
			</div>
		</form>
	</div>
</dialog>

<style>
	.settings-modal {
		position: fixed;
		inset: 0;
		width: min(90vw, 420px);
		max-height: 90vh;
		margin: auto;
		padding: 0;
		background: #1f2937;
		color: #f9fafb;
		border: none;
		border-radius: 16px;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
		overflow: hidden;
	}

	.settings-modal::backdrop {
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
	}

	.modal-content {
		display: flex;
		flex-direction: column;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		padding: 0;
		color: #9ca3af;
		background: transparent;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.close-button:hover {
		color: white;
		background: rgba(255, 255, 255, 0.1);
	}

	.close-button:focus-visible {
		outline: 2px solid #60a5fa;
		outline-offset: 2px;
	}

	.close-button svg {
		width: 20px;
		height: 20px;
	}

	.settings-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding: 1.5rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #d1d5db;
	}

	.form-group input[type="number"] {
		width: 100%;
		padding: 0.75rem;
		font-size: 1rem;
		color: white;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		transition: all 0.2s;
	}

	.form-group input[type="number"]:focus {
		outline: none;
		border-color: #60a5fa;
		box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.3);
	}

	.form-group input[type="number"][aria-invalid="true"] {
		border-color: #ef4444;
	}

	.hint {
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.error {
		font-size: 0.75rem;
		color: #ef4444;
	}

	.checkbox-group {
		flex-direction: row;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
	}

	.checkbox-label input[type="checkbox"] {
		width: 20px;
		height: 20px;
		accent-color: #10b981;
		cursor: pointer;
	}

	.checkbox-label span {
		font-size: 0.875rem;
		color: #d1d5db;
	}

	.color-group .color-input-wrapper {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.color-group input[type="color"] {
		width: 48px;
		height: 48px;
		padding: 0;
		border: 2px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		cursor: pointer;
		background: transparent;
	}

	.color-group input[type="color"]::-webkit-color-swatch-wrapper {
		padding: 4px;
	}

	.color-group input[type="color"]::-webkit-color-swatch {
		border: none;
		border-radius: 4px;
	}

	.color-group input[type="color"]:focus {
		outline: none;
		border-color: #60a5fa;
	}

	.color-value {
		font-family: monospace;
		font-size: 0.875rem;
		color: #9ca3af;
		text-transform: uppercase;
	}

	.form-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 0.5rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.reset-button,
	.feedback-button {
		flex: 1;
		min-width: 140px;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.reset-button {
		color: #f87171;
		background: rgba(248, 113, 113, 0.1);
	}

	.reset-button:hover {
		background: rgba(248, 113, 113, 0.2);
	}

	.feedback-button {
		color: #60a5fa;
		background: rgba(96, 165, 250, 0.1);
	}

	.feedback-button:hover {
		background: rgba(96, 165, 250, 0.2);
	}

	.reset-button:focus-visible,
	.feedback-button:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 2px;
	}
</style>
