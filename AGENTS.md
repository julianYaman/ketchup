# AGENTS.md

Ketchup is a client-only Pomodoro timer (product name; package is `pomodoro-timer`). Live site: [ketchuptimer.com](https://ketchuptimer.com). No login, no backend, no database server.

## Commands

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # vitest run
npm run test:watch
npm run check        # svelte-kit sync + svelte-check
npm run build        # adapter-node output in build/
```

Node 18+ locally; Docker image uses Node 22. After timer or settings changes, run `npm test` and `npm run check`.

## Layout

```
src/routes/+page.svelte     # App shell: timer, PiP, keyboard, modals
src/lib/timer/              # Domain: types, pure reducer, TimerEngine
src/lib/stores/             # settings (localStorage), todos (IndexedDB)
src/lib/pip/                # Canvas → video Picture-in-Picture
src/lib/components/         # Presentational Svelte UI
src/lib/i18n/strings.ts     # All user-facing copy
src/lib/fonts.ts            # Font ids and CSS stacks
static/                     # Favicon, og-image, bell.mp3
```

Import through barrel files (`$lib/timer`, `$lib/stores`, `$lib/components`, `$lib/pip`, `$lib/i18n`). Path alias `$lib` is SvelteKit’s default.

The app is a single page. `src/routes/+layout.ts` sets `ssr = false` and `prerender = true`. Browser APIs (`localStorage`, `IndexedDB`, `document.pictureInPictureEnabled`) are not available at module load on the server — guard them, and init stores in `onMount`.

## Domain language

Keep code terms even when UI copy differs.

| Term | Meaning |
|------|---------|
| **phase** | `work` or `pause`. UI label for `pause` is “Break”. |
| **status** | `idle` → `running` → `paused` / `finished`. |
| **pause** | Break phase, not the paused status. Status uses `paused`. |
| **autoStartPause** | After work finishes, auto-start the break. Work never auto-starts. |
| **remainingMs / totalMs** | Current phase duration. Display with `formatTime` (ceil to MM:SS). |

Durations are 1–120 minutes (`validateDurationMinutes`). Convert with `minutesToMs` / `msToMinutes`.

## Architecture

**Timer is two layers.** `timerReducer` is a pure function (easy to test). `TimerEngine` owns clocks, `requestAnimationFrame`, completion `setTimeout`, and visibility handling. Do not put timing side effects in the reducer. `TICK` is a no-op in the reducer on purpose — the engine updates `remainingMs` from timestamps.

**Timing must stay drift-resistant.** Remaining time is `totalMs - (elapsedBeforePause + (Date.now() - startTimestamp))`. Do not increment a counter on interval ticks. Recalculate on `visibilitychange` so background tabs stay accurate. Notify subscribers on second boundaries (or when remaining hits 0), not every frame.

Phase complete flow: `FINISH` → `getNextPhaseTransition` → `SWITCH_PHASE` → optional `START` if `autoStartPause` and the next phase is `pause`. Skip-break calls `switchToPhase('work')`.

**Settings** (`pomodoro.settings.v1` in localStorage): schema `version: 3`. `validateSettings` merges unknown/corrupt storage with defaults. Changing the shape means bumping `version` and extending that validator (including font aliases — `jetbrains-mono` maps to `bricolage-grotesque`). Call `settings.init()` on mount. Idle timers pick up duration changes via `TimerEngine.updateConfig`; a running timer keeps its current `totalMs`.

**Todos** live in IndexedDB (`pomodoro-todo` / store `todos`), not localStorage. At most one incomplete todo is pinned; pinning another unpins the rest. `pinnedTodo` is the derived store the page and PiP overlay read.

**Picture-in-Picture** streams a hidden canvas through a muted `<video>` (`captureStream`), then `requestPictureInPicture()`. Keep the video playing *before* the PiP request — Safari requires a playing video and a user gesture. Attribution for the canvas approach is in `src/lib/pip/pip.ts` and the README; keep it if you touch that file. PiP is optional; disable the control when `isPipSupported()` is false.

**Sounds:** `/bell.mp3` plays when status goes `running` → `finished`, if `enableSounds` is on. `play()` may reject before a user gesture — swallow that.

## UI conventions

Svelte 5 runes only: `$props()`, `$state()`, `$derived` / `$derived.by()`, `$effect()`. Do not add Svelte 4 `export let` or `$:` reactivity.

```svelte
interface Props {
	status: TimerStatus;
	onclick: () => void;
}

let { status, onclick }: Props = $props();
```

- Colocate `<style>` in the component. Global resets live in `+page.svelte`.
- Buttons need `type="button"`, `aria-label` (or equivalent), and `:focus-visible` styles.
- Use native `<dialog>` for Settings and Keyboard Shortcuts (`showModal` / `close`). Todo is a custom widget, not `<dialog>`.
- Keyboard: Space play/pause, `S` settings, `P` PiP, `T` todos, `Cmd/Ctrl+K` shortcuts, Escape closes. Ignore letter shortcuts when a modal is open or focus is in an input.
- New user-visible strings go in `src/lib/i18n/strings.ts` and are read with `t('key')`. Do not hardcode copy in components.
- Indentation is tabs (see existing files). TypeScript `strict` is on. No ESLint/Prettier config.

## Tests

Vitest + jsdom. Specs sit next to source: `src/lib/timer/engine.test.ts`, `state-machine.test.ts`. Tests are `include: ['src/**/*.{test,spec}.{js,ts}']`.

- Prefer testing the pure reducer and `TimerEngine` over mounting the whole page.
- Mock `requestAnimationFrame` / `cancelAnimationFrame`; use fake timers for completion. See `engine.test.ts` for the `flushRaf` helper.
- Cover invalid transitions (they must be no-ops) and duration clamping.

## Do not

- Add a backend, auth, or replace client persistence without a clear product reason.
- Use `setInterval` to drive remaining time.
- Rename `pause` → `break` in types/state to match UI copy.
- Load settings/todos at module scope (SSR/`ssr = false` still evaluates modules).
- Request PiP without a user gesture or before the canvas video is playing.
- Commit `.env`, `build/`, or `.svelte-kit/`.
- Change `adapter-node` or Docker `CMD ["node", "build"]` (port 3000) unless deployment is the task. CI on `main` builds and pushes the `ketchup` image.
