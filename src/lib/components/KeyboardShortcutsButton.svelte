<script lang="ts">
	import { t } from '$lib/i18n';

	interface Props {
		onclick: () => void;
	}

	let { onclick }: Props = $props();
</script>

<button
	type="button"
	class="shortcuts-button"
	onclick={onclick}
	aria-label={t('keyboardShortcuts')}
	title="{t('keyboardShortcuts')} (Cmd/Ctrl+K)"
>
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
		<rect x="2" y="4" width="20" height="16" rx="2" />
		<path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M18 12h.01M8 16h8" />
	</svg>
</button>

<style>
	.shortcuts-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		padding: 0;
		color: white;
		background: transparent;
		border: none;
		border-radius: 12px;
		cursor: pointer;
		opacity: 0.5;
		transition: all 0.2s ease;
	}

	.shortcuts-button:hover {
		opacity: 1;
		background: rgba(255, 255, 255, 0.1);
	}

	.shortcuts-button:focus-visible {
		opacity: 1;
		outline: 3px solid white;
		outline-offset: 2px;
	}

	.shortcuts-button svg {
		width: 24px;
		height: 24px;
	}
</style>
