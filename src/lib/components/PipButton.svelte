<script lang="ts">
	import { t } from '$lib/i18n';

	interface Props {
		supported: boolean;
		active: boolean;
		onclick: () => void;
	}

	let { supported, active, onclick }: Props = $props();

	const buttonTitle = $derived(
		supported 
			? `${t('buttonPip')} (P)` 
			: t('buttonPipDisabled')
	);
</script>

<button
	type="button"
	class="pip-button"
	class:active
	onclick={onclick}
	disabled={!supported}
	aria-pressed={active}
	aria-label={t('buttonPip')}
	title={buttonTitle}
>
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
		<rect x="2" y="3" width="20" height="14" rx="2" />
		<rect x="11" y="9" width="9" height="6" rx="1" fill="currentColor" />
	</svg>
</button>

<style>
	.pip-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		padding: 0;
		color: white;
		background: rgba(255, 255, 255, 0.2);
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.pip-button:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.3);
		border-color: rgba(255, 255, 255, 0.5);
	}

	.pip-button:focus-visible {
		outline: 3px solid white;
		outline-offset: 2px;
	}

	.pip-button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.pip-button.active {
		background: rgba(255, 255, 255, 0.4);
		border-color: white;
	}

	.pip-button svg {
		width: 24px;
		height: 24px;
	}
</style>
