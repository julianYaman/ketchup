<script lang="ts">
	import { t } from '$lib/i18n';

	interface Props {
		onclick: () => void;
	}

	let { onclick }: Props = $props();
</script>

<button
	type="button"
	class="skip-button"
	onclick={onclick}
	aria-label={t('buttonSkip')}
	title="{t('buttonSkip')}"
>
	<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
		<path d="M5 4l10 8-10 8V4z" />
		<rect x="17" y="4" width="2" height="16" rx="0.5" />
	</svg>
	<span class="button-text">{t('buttonSkip')}</span>
</button>

<style>
	.skip-button {
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

	.skip-button:hover {
		transform: scale(1.05);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
	}

	.skip-button:focus-visible {
		outline: 3px solid white;
		outline-offset: 3px;
	}

	.skip-button:active {
		transform: scale(0.98);
	}

	.skip-button svg {
		width: 24px;
		height: 24px;
	}

	.button-text {
		min-width: 60px;
	}

	@media (max-width: 400px) {
		.skip-button {
			min-width: 120px;
			padding: 0.625rem 1.25rem;
		}

		.button-text {
			display: none;
		}
	}
</style>
