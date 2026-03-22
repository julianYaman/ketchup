<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { TimerEngine, formatTime, type TimerState, type TimerConfig } from '$lib/timer';
	import { settings, timerConfig, todoStore, pinnedTodo as pinnedTodoStore, getSettings, type Todo } from '$lib/stores';
	import { getFontStack } from '$lib/fonts';
	import { 
		isPipSupported, 
		createPipRenderer, 
		startPipAnimation, 
		stopPipAnimation, 
		togglePip, 
		setupPipListeners,
		destroyPipRenderer,
		type PipRenderer,
		type PipRenderState 
	} from '$lib/pip';
	import { t } from '$lib/i18n';
	import {
		TimerDisplay,
		PlayPauseButton,
		PipButton,
		SettingsButton,
		SettingsModal,
		KeyboardShortcutsButton,
		KeyboardShortcutsModal,
		SkipButton,
		TodoButton,
		TodoModal,
		PinnedTask
	} from '$lib/components';

	let timerEngine: TimerEngine | null = $state(null);
	let timerState: TimerState | null = $state(null);
	let currentConfig: TimerConfig | null = $state(null);
	let bellAudio: HTMLAudioElement | null = $state(null);

	let pipRenderer: PipRenderer | null = $state(null);
	let pipSupported = $state(false);
	let pipActive = $state(false);

	let settingsOpen = $state(false);
	let shortcutsOpen = $state(false);
	let todoOpen = $state(false);
	let mounted = $state(false);

	let currentPinnedTodo = $derived($pinnedTodoStore);

	const backgroundColor = $derived.by(() => {
		if (!timerState) return $settings.colors.work;
		return timerState.phase === 'work' ? $settings.colors.work : $settings.colors.pause;
	});
	const textColor = $derived($settings.colors.text);

	const pageTitle = $derived.by(() => {
		if (!timerState) return t('appTitle');
		if (timerState.status === 'running' || timerState.status === 'paused') {
			const time = formatTime(timerState.remainingMs);
			const phase = timerState.phase === 'work' ? t('phaseWork') : t('phasePause');
			return `${time} - ${phase}`;
		}
		return t('appTitle');
	});

	onMount(() => {
		settings.init();
		todoStore.init();
		bellAudio = new Audio('/bell.mp3');
		bellAudio.preload = 'auto';

		const config = $timerConfig;
		currentConfig = config;
		timerEngine = new TimerEngine(config);
		let previousState: TimerState | null = null;
		
		const unsubscribe = timerEngine.subscribe((state) => {
			if (shouldPlayPhaseBell(previousState, state)) {
				playBell();
			}

			timerState = state;
			previousState = state;
		});

		pipSupported = isPipSupported();
		if (pipSupported) {
			pipRenderer = createPipRenderer();
			if (pipRenderer) {
				const cleanupListeners = setupPipListeners(
					pipRenderer,
					() => { pipActive = true; },
					() => { pipActive = false; }
				);

				startPipAnimation(pipRenderer, getPipRenderState);

				(pipRenderer as any)._cleanupListeners = cleanupListeners;
			}
		}

		mounted = true;

		return () => {
			unsubscribe();
		};
	});

	$effect(() => {
		if (timerEngine && mounted) {
			const newConfig = $timerConfig;
			if (JSON.stringify(newConfig) !== JSON.stringify(currentConfig)) {
				currentConfig = newConfig;
				timerEngine.updateConfig(newConfig);
			}
		}
	});

	onDestroy(() => {
		if (timerEngine) {
			timerEngine.destroy();
		}
		if (pipRenderer) {
			if ((pipRenderer as any)._cleanupListeners) {
				(pipRenderer as any)._cleanupListeners();
			}
			stopPipAnimation(pipRenderer);
			destroyPipRenderer(pipRenderer);
		}
	});

	function getPipRenderState(): PipRenderState {
		return {
			timeText: timerState ? formatTime(timerState.remainingMs) : '25:00',
			backgroundColor: backgroundColor,
			textColor: textColor,
			fontFamily: getFontStack($settings.font),
			pinnedTaskText: currentPinnedTodo?.text
		};
	}

	function shouldPlayPhaseBell(previousState: TimerState | null, nextState: TimerState): boolean {
		return previousState?.status === 'running' && nextState.status === 'finished';
	}

	function playBell() {
		if (!getSettings().enableSounds || !bellAudio) return;

		bellAudio.currentTime = 0;
		bellAudio.play().catch(() => {
			// Ignore blocked playback; the next user gesture will usually unlock audio.
		});
	}

	function handlePlayPause() {
		timerEngine?.toggle();
	}

	function handlePipToggle() {
		if (pipRenderer) {
			togglePip(pipRenderer);
		}
	}

	function handleSettingsOpen() {
		settingsOpen = true;
	}

	function handleSettingsClose() {
		settingsOpen = false;
	}

	function handleShortcutsOpen() {
		shortcutsOpen = true;
	}

	function handleShortcutsClose() {
		shortcutsOpen = false;
	}

	function handleTodoOpen() {
		todoOpen = true;
	}

	function handleTodoClose() {
		todoOpen = false;
	}

	function handleSkipBreak() {
		if (timerEngine && timerState?.phase === 'pause') {
			timerEngine.switchToPhase('work');
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			if (shortcutsOpen) {
				handleShortcutsClose();
			} else {
				handleShortcutsOpen();
			}
			return;
		}

		if ((settingsOpen || shortcutsOpen || todoOpen) && e.key !== 'Escape') return;
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

		switch (e.key) {
			case ' ':
				e.preventDefault();
				handlePlayPause();
				break;
			case 's':
			case 'S':
				e.preventDefault();
				if (settingsOpen) {
					handleSettingsClose();
				} else {
					handleSettingsOpen();
				}
				break;
			case 'p':
			case 'P':
				e.preventDefault();
				if (pipSupported) {
					handlePipToggle();
				}
				break;
			case 't':
			case 'T':
				e.preventDefault();
				if (todoOpen) {
					handleTodoClose();
				} else {
					handleTodoOpen();
				}
				break;
			case 'Escape':
				if (settingsOpen) {
					e.preventDefault();
					handleSettingsClose();
				} else if (shortcutsOpen) {
					e.preventDefault();
					handleShortcutsClose();
				} else if (todoOpen) {
					e.preventDefault();
					handleTodoClose();
				}
				break;
		}
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content="A simple Pomodoro timer. Pop out the timer into a Picture-in-Picture window to have your timer always visible while you work." />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />

	<script defer src="https://cloud.umami.is/script.js" data-website-id="6e2a3b0d-6caa-4ed6-acc2-2075d903214c"></script>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<main 
	class="app" 
	style="background-color: {backgroundColor}"
>
	{#if timerState}
		<div class="timer-container">
			<TimerDisplay state={timerState} {textColor} />
			{#if currentPinnedTodo}
				<PinnedTask todo={currentPinnedTodo} {textColor} />
			{/if}

			<div class="controls">
				<PlayPauseButton status={timerState.status} onclick={handlePlayPause} />
				{#if timerState.phase === 'pause'}
					<SkipButton onclick={handleSkipBreak} />
				{/if}
				<PipButton 
					supported={pipSupported} 
					active={pipActive} 
					onclick={handlePipToggle} 
				/>
			</div>
		</div>
	{:else}
		<div class="loading">Loading...</div>
	{/if}

	<div class="top-buttons">
		<KeyboardShortcutsButton onclick={handleShortcutsOpen} />
		<SettingsButton onclick={handleSettingsOpen} />
	</div>

	<div class="bottom-right-button">
		<TodoButton onclick={handleTodoOpen} />
	</div>

	<SettingsModal open={settingsOpen} onclose={handleSettingsClose} />
	<KeyboardShortcutsModal open={shortcutsOpen} onclose={handleShortcutsClose} />
	<TodoModal open={todoOpen} onclose={handleTodoClose} />
</main>

<style>
	:global(*) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(:root) {
		--font-primary: 'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	}

	:global(html, body) {
		height: 100%;
		font-family: var(--font-primary);
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	:global(button, input, textarea, select) {
		font: inherit;
	}

	.app {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		min-height: 100dvh;
		padding: 1rem;
		transition: background-color 0.5s ease;
	}

	.timer-container {
		display: grid;
		justify-items: center;
		width: min(100%, 90rem);
		margin: 0 auto;
		gap: 2rem;
	}

	.controls {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		gap: 1rem;
	}

	.top-buttons {
		position: fixed;
		top: 1rem;
		right: 1rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.bottom-right-button {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
	}

	.loading {
		color: white;
		font-size: 1.5rem;
	}
</style>
