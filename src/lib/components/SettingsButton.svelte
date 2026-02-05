<script lang="ts">
	import { t } from '$lib/i18n';

	interface Props {
		onclick: () => void;
	}

	let { onclick }: Props = $props();
</script>

<button
	type="button"
	class="settings-button"
	onclick={onclick}
	aria-label={t('ariaSettingsOpen')}
	title="{t('buttonSettings')} (S)"
>
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
		<circle cx="12" cy="12" r="3" />
		<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
	</svg>
</button>

<style>
	.settings-button {
		position: fixed;
		top: 1rem;
		right: 1rem;
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

	.settings-button:hover {
		opacity: 1;
		background: rgba(255, 255, 255, 0.1);
	}

	.settings-button:focus-visible {
		opacity: 1;
		outline: 3px solid white;
		outline-offset: 2px;
	}

	.settings-button svg {
		width: 24px;
		height: 24px;
	}
</style>
