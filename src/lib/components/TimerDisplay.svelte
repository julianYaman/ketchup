<script lang="ts">
	import { formatTime, type TimerState } from '$lib/timer';
	import { t } from '$lib/i18n';

	interface Props {
		state: TimerState;
		textColor: string;
	}

	let { state, textColor }: Props = $props();

	const displayTime = $derived(formatTime(state.remainingMs));
	const phaseLabel = $derived(state.phase === 'work' ? t('phaseWork') : t('phasePause'));
</script>

<div class="timer-display" role="status" aria-live="polite" aria-label={t('ariaTimerDisplay')}>
	<span class="phase-label" style="color: {textColor}">{phaseLabel}</span>
	<time 
		class="timer-text" 
		style="color: {textColor}"
		aria-label="{t('ariaTimerRemaining')}: {displayTime}"
	>
		{displayTime}
	</time>
</div>

<style>
	.timer-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 10px;
	}

	.phase-label {
		font-size: clamp(1rem, 4vw, 2rem);
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		opacity: 0.9;
	}

	.timer-text {
		font-size: clamp(4rem, 25vw, 250px);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		line-height: 1;
		letter-spacing: -0.02em;
	}
</style>
