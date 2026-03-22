<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Todo } from '$lib/stores';

	interface Props {
		todo: Todo;
		textColor: string;
	}

	let { todo, textColor }: Props = $props();
</script>

<div class="pinned-task" style="color: {textColor}">
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
		<circle cx="12" cy="12" r="10" />
		<path d="M8 12l2.5 2.5L16 9" />
	</svg>
	<span class="task-label">{t('todoPinnedTask')}:</span>
	<span class="task-text">{todo.text}</span>
</div>

<style>
	.pinned-task {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		gap: 0.5rem;
		font-size: clamp(1rem, 4vw, 1.5rem);
		font-weight: 500;
		padding: 0.5rem;
		flex-wrap: wrap;
		text-align: center;
	}

	.pinned-task svg {
		width: 1.5em;
		height: 1.5em;
		flex-shrink: 0;
	}

	.task-label {
		opacity: 0.8;
	}

	.task-text {
		font-weight: 600;
	}
</style>
