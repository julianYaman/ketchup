<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { TimerEngine, formatTime, type TimerState, type TimerConfig } from '$lib/timer';
	import { settings, timerConfig } from '$lib/stores';
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
		KeyboardShortcutsModal
	} from '$lib/components';

	// Timer state
	let timerEngine: TimerEngine | null = $state(null);
	let timerState: TimerState | null = $state(null);
	let currentConfig: TimerConfig | null = $state(null);

	// PiP state
	let pipRenderer: PipRenderer | null = $state(null);
	let pipSupported = $state(false);
	let pipActive = $state(false);

	// UI state
	let settingsOpen = $state(false);
	let shortcutsOpen = $state(false);
	let mounted = $state(false);

	// Derived values
	const backgroundColor = $derived.by(() => {
		if (!timerState) return $settings.colors.work;
		return timerState.phase === 'work' ? $settings.colors.work : $settings.colors.pause;
	});
	const textColor = $derived($settings.colors.text);

	// Initialize on mount
	onMount(() => {
		// Initialize settings from localStorage
		settings.init();

		// Create timer engine with current config
		const config = $timerConfig;
		currentConfig = config;
		timerEngine = new TimerEngine(config);
		
		// Subscribe to timer state changes
		const unsubscribe = timerEngine.subscribe((state) => {
			timerState = state;
		});

		// Set up PiP
		pipSupported = isPipSupported();
		if (pipSupported) {
			pipRenderer = createPipRenderer();
			if (pipRenderer) {
				const cleanupListeners = setupPipListeners(
					pipRenderer,
					() => { pipActive = true; },
					() => { pipActive = false; }
				);

				// Start PiP animation loop
				startPipAnimation(pipRenderer, getPipRenderState);

				// Store cleanup for later
				(pipRenderer as any)._cleanupListeners = cleanupListeners;
			}
		}

		mounted = true;

		return () => {
			unsubscribe();
		};
	});

	// Update timer config when settings change
	$effect(() => {
		if (timerEngine && mounted) {
			const newConfig = $timerConfig;
			if (JSON.stringify(newConfig) !== JSON.stringify(currentConfig)) {
				currentConfig = newConfig;
				timerEngine.updateConfig(newConfig);
			}
		}
	});

	// Cleanup on destroy
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

	// Get current state for PiP rendering
	function getPipRenderState(): PipRenderState {
		return {
			timeText: timerState ? formatTime(timerState.remainingMs) : '25:00',
			backgroundColor: backgroundColor,
			textColor: textColor
		};
	}

	// Event handlers
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

	// Keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		// Handle Cmd/Ctrl+K for keyboard shortcuts modal
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			if (shortcutsOpen) {
				handleShortcutsClose();
			} else {
				handleShortcutsOpen();
			}
			return;
		}

		// Don't handle other shortcuts if a modal is open or if in an input
		if ((settingsOpen || shortcutsOpen) && e.key !== 'Escape') return;
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
			case 'Escape':
				if (settingsOpen) {
					e.preventDefault();
					handleSettingsClose();
				} else if (shortcutsOpen) {
					e.preventDefault();
					handleShortcutsClose();
				}
				break;
		}
	}
</script>

<svelte:head>
	<title>{t('appTitle')}</title>
	<meta name="description" content="A simple, playful Pomodoro timer with Picture-in-Picture support. Have your timer always visible while you work." />
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

			<div class="controls">
				<PlayPauseButton status={timerState.status} onclick={handlePlayPause} />
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

	<SettingsButton onclick={handleSettingsOpen} />
	<SettingsModal open={settingsOpen} onclose={handleSettingsClose} />
	<KeyboardShortcutsModal open={shortcutsOpen} onclose={handleShortcutsClose} />
</main>

<style>
	:global(*) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(html, body) {
		height: 100%;
		font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
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
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.loading {
		color: white;
		font-size: 1.5rem;
	}
</style>
