<script lang="ts">
	import { t } from '$lib/i18n';

	interface Props {
		onclick: () => void;
	}

	let { onclick }: Props = $props();

	function handleClick(e: MouseEvent) {
		e.stopPropagation();
		onclick();
	}
</script>

<button
	type="button"
	class="todo-button"
	onclick={handleClick}
	aria-label={t('buttonTodo')}
	title="{t('buttonTodo')} (T)"
>
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
		<circle cx="12" cy="12" r="10" />
		<path d="M8 12l2.5 2.5L16 9" />
	</svg>
</button>

<style>
	.todo-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 72px;
		height: 72px;
		padding: 0;
		color: white;
		background: transparent;
		border: none;
		border-radius: 18px;
		cursor: pointer;
		opacity: 0.5;
		transition: all 0.2s ease;
	}

	.todo-button:hover {
		opacity: 1;
		background: rgba(255, 255, 255, 0.1);
	}

	.todo-button:focus-visible {
		opacity: 1;
		outline: 3px solid white;
		outline-offset: 2px;
	}

	.todo-button svg {
		width: 36px;
		height: 36px;
	}
</style>