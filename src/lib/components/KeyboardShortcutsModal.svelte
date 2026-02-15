<script lang="ts">
	import { t } from '$lib/i18n';
	import { onMount } from 'svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open, onclose }: Props = $props();

	let dialogElement: HTMLDialogElement | null = $state(null);

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

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onclose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === dialogElement) {
			onclose();
		}
	}

	const shortcuts = [
		{ key: t('keySpace'), description: t('keySpaceDesc') },
		{ key: t('keyS'), description: t('keySDesc') },
		{ key: t('keyP'), description: t('keyPDesc') },
		{ key: t('keyT'), description: t('keyTDesc') },
		{ key: 'Cmd/Ctrl + K', description: 'Show Keyboard Shortcuts' },
		{ key: t('keyEscape'), description: t('keyEscapeDesc') }
	];
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialogElement}
	class="shortcuts-modal"
	aria-labelledby="shortcuts-title"
	aria-modal="true"
	onkeydown={handleKeydown}
	onclick={handleBackdropClick}
	onclose={onclose}
>
	<div class="modal-content" onclick={(e) => e.stopPropagation()} role="document">
		<header class="modal-header">
			<h2 id="shortcuts-title">{t('keyboardShortcuts')}</h2>
			<button
				type="button"
				class="close-button"
				onclick={onclose}
				aria-label={t('buttonClose')}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<path d="M18 6L6 18M6 6l12 12" />
				</svg>
			</button>
		</header>

		<div class="shortcuts-list">
			{#each shortcuts as shortcut}
				<div class="shortcut-row">
					<kbd class="shortcut-key">{shortcut.key}</kbd>
					<span class="shortcut-desc">{shortcut.description}</span>
				</div>
			{/each}
		</div>
	</div>
</dialog>

<style>
	.shortcuts-modal {
		position: fixed;
		inset: 0;
		width: min(90vw, 380px);
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

	.shortcuts-modal::backdrop {
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

	.shortcuts-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.5rem;
	}

	.shortcut-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.shortcut-key {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2.5rem;
		padding: 0.375rem 0.75rem;
		font-family: system-ui, -apple-system, sans-serif;
		font-size: 0.875rem;
		font-weight: 500;
		color: #e5e7eb;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		white-space: nowrap;
	}

	.shortcut-desc {
		font-size: 0.875rem;
		color: #9ca3af;
		text-align: right;
	}
</style>
