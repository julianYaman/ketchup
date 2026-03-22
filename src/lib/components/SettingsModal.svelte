<script lang="ts">
	import { settings } from '$lib/stores';
	import { fontOptions, type AppFont } from '$lib/fonts';
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
	let enableSounds = $state($settings.enableSounds);
	let font = $state($settings.font);
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
		enableSounds = $settings.enableSounds;
		font = $settings.font;
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

	function handleEnableSoundsChange(e: Event) {
		enableSounds = (e.target as HTMLInputElement).checked;
		settings.setEnableSounds(enableSounds);
	}

	function handleFontChange(nextFont: AppFont) {
		font = nextFont;
		settings.setFont(nextFont);
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
		window.open('https://github.com/julianyaman/ketchup/issues', '_blank', 'noopener');
	}

	function openGitHub() {
		window.open('https://github.com/julianyaman/ketchup', '_blank', 'noopener');
	}

	function openBuyMeACoffee() {
		window.open('https://buymeacoffee.com/julianyaman', '_blank', 'noopener');
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
	onclose={onclose}
>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal-content" onclick={(e) => e.stopPropagation()} role="document">
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

			<div class="form-group checkbox-group">
				<label class="checkbox-label">
					<input
						type="checkbox"
						checked={enableSounds}
						onchange={handleEnableSoundsChange}
					/>
					<span>{t('settingsEnableSounds')}</span>
				</label>
			</div>

			<div class="form-group">
				<span class="group-label">{t('settingsFontStyle')}</span>
				<div class="font-options" role="radiogroup" aria-label={t('settingsFontStyle')}>
					{#each fontOptions as option}
						<label class="font-option">
							<input
								class="font-radio"
								type="radio"
								name="font-style"
								value={option.id}
								checked={font === option.id}
								onchange={() => handleFontChange(option.id)}
							/>
							<span class="font-option-card" style="font-family: {option.stack}">
								<span class="font-option-label-row">
									<span class="font-option-label">{option.label}</span>
									<span class="font-option-family">{option.family}</span>
								</span>
								<span class="font-option-preview">25:00</span>
							</span>
						</label>
					{/each}
				</div>
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

			<a href="https://github.com/julianyaman/ketchup" target="_blank" rel="noopener" class="github-link" onclick={openGitHub}>
				<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
				</svg>
				<span>{t('buttonViewOnGithub')}</span>
			</a>

			<a href="https://buymeacoffee.com/julianyaman" target="_blank" rel="noopener" class="coffee-link" onclick={openBuyMeACoffee}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M18 8h1a4 4 0 0 1 0 8h-1" />
					<path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
					<line x1="6" y1="1" x2="6" y2="4" />
					<line x1="10" y1="1" x2="10" y2="4" />
					<line x1="14" y1="1" x2="14" y2="4" />
				</svg>
				<span>{t('buttonBuyMeACoffee')}</span>
			</a>
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

	.group-label {
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

	.font-options {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		grid-auto-rows: 1fr;
		gap: 0.75rem;
	}

	.font-option {
		position: relative;
		display: block;
		cursor: pointer;
	}

	.font-radio {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}

	.font-option-card {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.9rem 1rem;
		min-height: 7.75rem;
		height: 100%;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 12px;
		transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
	}

	.font-option:hover .font-option-card {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.24);
		transform: translateY(-1px);
	}

	.font-radio:checked + .font-option-card {
		background: rgba(96, 165, 250, 0.14);
		border-color: rgba(96, 165, 250, 0.7);
		box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.25);
	}

	.font-radio:focus-visible + .font-option-card {
		outline: 2px solid #60a5fa;
		outline-offset: 2px;
	}

	.font-option-label-row {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.font-option-label {
		font-size: 0.95rem;
		font-weight: 600;
		color: #f9fafb;
	}

	.font-option-family {
		font-size: 0.75rem;
		color: #9ca3af;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.font-option-preview {
		font-size: 1.6rem;
		font-weight: 700;
		line-height: 1;
		color: #f9fafb;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.02em;
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

	.github-link {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #9ca3af;
		text-decoration: none;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.github-link:hover {
		color: white;
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.github-link:focus-visible {
		outline: 2px solid #60a5fa;
		outline-offset: 2px;
	}

	.github-link svg {
		width: 18px;
		height: 18px;
	}

	.coffee-link {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #fbbf24;
		text-decoration: none;
		background: rgba(251, 191, 36, 0.1);
		border: 1px solid rgba(251, 191, 36, 0.3);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.coffee-link:hover {
		color: #f59e0b;
		background: rgba(251, 191, 36, 0.2);
		border-color: rgba(251, 191, 36, 0.5);
	}

	.coffee-link:focus-visible {
		outline: 2px solid #fbbf24;
		outline-offset: 2px;
	}

	.coffee-link svg {
		width: 18px;
		height: 18px;
	}

	@media (max-width: 480px) {
		.font-options {
			grid-template-columns: 1fr;
		}
	}
</style>
