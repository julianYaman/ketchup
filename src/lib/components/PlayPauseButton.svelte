<script lang="ts">
	import type { TimerStatus } from '$lib/timer';
	import { t } from '$lib/i18n';

	interface Props {
		status: TimerStatus;
		onclick: () => void;
	}

	let { status, onclick }: Props = $props();

	const isPlaying = $derived(status === 'running');
	const buttonLabel = $derived(isPlaying ? t('buttonPause') : t('buttonPlay'));
</script>

<button
	type="button"
	class="play-pause-button"
	class:playing={isPlaying}
	onclick={onclick}
	aria-pressed={isPlaying}
	aria-label={t('ariaPlayPauseToggle')}
	title="{buttonLabel} (Space)"
>
	{#if isPlaying}
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<rect x="6" y="4" width="4" height="16" rx="1" />
			<rect x="14" y="4" width="4" height="16" rx="1" />
		</svg>
	{:else}
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path d="M8 5v14l11-7z" />
		</svg>
	{/if}
	<span class="button-text">{buttonLabel}</span>
</button>

<style>
	.play-pause-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		min-width: 140px;
		min-height: 56px;
		padding: 0.75rem 1.5rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
		background: rgba(255, 255, 255, 0.95);
		border: none;
		border-radius: 9999px;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
	}

	.play-pause-button:hover {
		transform: scale(1.05);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
	}

	.play-pause-button:focus-visible {
		outline: 3px solid white;
		outline-offset: 3px;
	}

	.play-pause-button:active {
		transform: scale(0.98);
	}

	.play-pause-button svg {
		width: 24px;
		height: 24px;
	}

	.button-text {
		min-width: 60px;
	}

	@media (max-width: 400px) {
		.play-pause-button {
			min-width: 120px;
			padding: 0.625rem 1.25rem;
		}

		.button-text {
			display: none;
		}
	}
</style>
