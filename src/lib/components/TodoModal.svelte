<script lang="ts">
	import { t } from '$lib/i18n';
	import { todoStore, type Todo } from '$lib/stores';
	import { settings } from '$lib/stores';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open, onclose }: Props = $props();

	let newTodoText = $state('');
	let inputElement: HTMLInputElement | null = $state(null);
	let widgetElement: HTMLDivElement | null = $state(null);
	let closing = $state(false);

	const accentColor = $derived($settings.colors.work);

	$effect(() => {
		if (open) {
			closing = false;
			setTimeout(() => inputElement?.focus(), 50);
		} else {
			newTodoText = '';
		}
	});

	function handleAddTodo(e: Event) {
		e.preventDefault();
		if (newTodoText.trim()) {
			todoStore.addTodo(newTodoText);
			newTodoText = '';
		}
	}

	function closeWidget() {
		closing = true;
		setTimeout(() => {
			onclose();
		}, 200);
	}

	function handleClickOutside(e: MouseEvent) {
		if (!open || !widgetElement || closing) return;
		const target = e.target as HTMLElement;
		if (!widgetElement.contains(target)) {
			e.stopPropagation();
			closeWidget();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open && !closing) {
			e.preventDefault();
			closeWidget();
		}
	}
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

{#if open}
	<div class="todo-widget" class:closing bind:this={widgetElement} role="dialog" aria-modal="true" aria-labelledby="todo-title">
		<header class="widget-header">
			<h2 id="todo-title">{t('todoTitle')}</h2>
			<button
				type="button"
				class="close-button"
				onclick={closeWidget}
				aria-label={t('buttonClose')}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<path d="M18 6L6 18M6 6l12 12" />
				</svg>
			</button>
		</header>

		<form class="add-todo-form" onsubmit={handleAddTodo}>
			<input
				bind:this={inputElement}
				bind:value={newTodoText}
				type="text"
				placeholder={t('todoAddPlaceholder')}
				class="todo-input"
				aria-label={t('todoPlaceholder')}
			/>
			<button type="submit" class="add-button" disabled={!newTodoText.trim()} aria-label={t('buttonAddTodo')} style="background-color: {accentColor}">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<path d="M12 5v14M5 12h14" />
				</svg>
			</button>
		</form>

		<div class="todos-list">
			{#if $todoStore.length === 0}
				<p class="empty-message">{t('todoEmpty')}</p>
			{:else}
				{#each $todoStore as todo (todo.id)}
					<div class="todo-item" class:completed={todo.completed} class:pinned={todo.pinned}>
						<button
							type="button"
							class="check-button"
							class:checked={todo.completed}
							onclick={(e) => { e.stopPropagation(); todoStore.toggleComplete(todo.id); }}
							aria-label={todo.completed ? t('buttonMarkIncomplete') : t('buttonMarkComplete')}
						>
							{#if todo.completed}
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
									<circle cx="12" cy="12" r="10" style="stroke: {accentColor}" />
									<path d="M8 12l2.5 2.5L16 9" style="stroke: {accentColor}" />
								</svg>
							{:else}
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
									<circle cx="12" cy="12" r="10" style="stroke: {accentColor}" />
								</svg>
							{/if}
						</button>

						<span class="todo-text">{todo.text}</span>

						<div class="todo-actions">
							{#if !todo.completed}
								<button
									type="button"
									class="action-button pin-button"
									class:active={todo.pinned}
									onclick={(e) => { e.stopPropagation(); todoStore.togglePin(todo.id); }}
									aria-label={todo.pinned ? t('buttonUnpin') : t('buttonPin')}
									title={todo.pinned ? t('buttonUnpin') : t('buttonPin')}
								>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
										<path d="M12 17v5M9 10.5V3h6v7.5l3 4.5H6l3-4.5z" style="stroke: {todo.pinned ? accentColor : 'currentColor'}" />
									</svg>
								</button>
							{/if}
							<button
								type="button"
								class="action-button delete-button"
								onclick={(e) => { e.stopPropagation(); todoStore.deleteTodo(todo.id); }}
								aria-label={t('buttonDelete')}
								title={t('buttonDelete')}
							>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
									<path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
								</svg>
							</button>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
{/if}

<style>
	.todo-widget {
		position: fixed;
		bottom: 6rem;
		right: 1rem;
		width: min(90vw, 360px);
		max-height: 70vh;
		background: white;
		color: #1f2937;
		border-radius: 16px;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		animation: slideUp 0.2s ease-out forwards;
		z-index: 100;
	}

	.todo-widget.closing {
		animation: slideDown 0.2s ease-out forwards;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes slideDown {
		from {
			opacity: 1;
			transform: translateY(0);
		}
		to {
			opacity: 0;
			transform: translateY(10px);
		}
	}

	.widget-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid #e5e7eb;
		flex-shrink: 0;
	}

	.widget-header h2 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		color: #6b7280;
		background: transparent;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.close-button:hover {
		color: #1f2937;
		background: #f3f4f6;
	}

	.close-button:focus-visible {
		outline: 2px solid #60a5fa;
		outline-offset: 2px;
	}

	.close-button svg {
		width: 20px;
		height: 20px;
	}

	.add-todo-form {
		display: flex;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #e5e7eb;
		flex-shrink: 0;
	}

	.todo-input {
		flex: 1;
		padding: 0.625rem 0.875rem;
		font-size: 0.9375rem;
		color: #1f2937;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		transition: all 0.2s;
	}

	.todo-input::placeholder {
		color: #9ca3af;
	}

	.todo-input:focus {
		outline: none;
		border-color: #60a5fa;
		box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2);
	}

	.add-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		padding: 0;
		color: white;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.add-button:hover:not(:disabled) {
		filter: brightness(0.9);
	}

	.add-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.add-button:focus-visible {
		outline: 2px solid #60a5fa;
		outline-offset: 2px;
	}

	.add-button svg {
		width: 22px;
		height: 22px;
	}

	.todos-list {
		flex: 1;
		overflow-y: auto;
		min-height: 200px;
		max-height: calc(70vh - 130px);
	}

	.empty-message {
		padding: 2rem 1.25rem;
		text-align: center;
		color: #9ca3af;
		font-style: italic;
	}

	.todo-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 1rem;
		border-bottom: 1px solid #f3f4f6;
		transition: background 0.2s;
	}

	.todo-item:last-child {
		border-bottom: none;
	}

	.todo-item:hover {
		background: #f9fafb;
	}

	.todo-item.completed .todo-text {
		text-decoration: line-through;
		color: #9ca3af;
	}

	.todo-item.pinned {
		background: #fef3c7;
	}

	.check-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		color: #9ca3af;
		background: transparent;
		border: none;
		cursor: pointer;
		flex-shrink: 0;
		transition: all 0.2s;
	}

	.check-button:hover {
		color: #1f2937;
	}

	.check-button.checked {
		color: #10b981;
	}

	.check-button:focus-visible {
		outline: 2px solid #60a5fa;
		outline-offset: 2px;
	}

	.check-button svg {
		width: 24px;
		height: 24px;
	}

	.todo-text {
		flex: 1;
		font-size: 0.875rem;
		color: #374151;
		word-break: break-word;
	}

	.todo-actions {
		display: flex;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.action-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		color: #9ca3af;
		background: transparent;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.action-button:hover {
		color: #374151;
		background: #f3f4f6;
	}

	.action-button:focus-visible {
		outline: 2px solid #60a5fa;
		outline-offset: 2px;
	}

	.action-button svg {
		width: 18px;
		height: 18px;
	}

	.pin-button.active {
		color: #f59e0b;
	}

	.pin-button.active:hover {
		color: #d97706;
	}

	.delete-button:hover {
		color: #ef4444;
		background: #fef2f2;
	}
</style>