/**
 * Picture-in-Picture module using canvas-to-video approach.
 *
 * Attribution: PiP canvas approach inspired by Kaiido's StackOverflow answer
 * https://stackoverflow.com/a/61301293
 * Retrieved 2026-02-05, License: CC BY-SA 4.0
 *
 * Safari / iOS notes:
 * - iOS does not enable the standard PiP API (`document.pictureInPictureEnabled`).
 *   Use WebKit's `webkitSetPresentationMode('picture-in-picture')` instead.
 * - Do not `await` before the PiP request — Safari drops the user gesture.
 * - Keep the video in the viewport (tiny + nearly transparent). Off-screen or
 *   `display: none` videos may not decode, so Safari shows a black PiP window.
 * - Draw at least one canvas frame before `captureStream()`, then `requestFrame()`
 *   and paint again so WebKit emits the first captured frame.
 */

export interface PipRenderer {
	canvas: HTMLCanvasElement;
	video: HTMLVideoElement;
	ctx: CanvasRenderingContext2D;
	stream: MediaStream;
	animationFrameId: number | null;
	paintIntervalId: ReturnType<typeof setInterval> | null;
	isActive: boolean;
	isVideoPlaying: boolean;
}

export interface PipRenderState {
	timeText: string;
	backgroundColor: string;
	textColor: string;
	fontFamily: string;
	pinnedTaskText?: string;
}

export interface PipSupport {
	standard: boolean;
	webkit: boolean;
}

type WebkitPresentationMode = 'inline' | 'picture-in-picture' | 'fullscreen';

interface WebkitHTMLVideoElement extends HTMLVideoElement {
	webkitSupportsPresentationMode?: (mode: WebkitPresentationMode) => boolean;
	webkitSetPresentationMode?: (mode: WebkitPresentationMode) => void;
	webkitPresentationMode?: WebkitPresentationMode;
}

interface CanvasCaptureTrack extends MediaStreamTrack {
	requestFrame?: () => void;
}

const PIP_VIDEO_STYLE = [
	'position:fixed',
	'top:0',
	'left:0',
	'width:16px',
	'height:9px',
	'opacity:0.01',
	'pointer-events:none',
	'border:0'
].join(';');

function asWebkitVideo(video: HTMLVideoElement): WebkitHTMLVideoElement {
	return video as WebkitHTMLVideoElement;
}

function canCaptureCanvasStream(): boolean {
	return (
		typeof HTMLCanvasElement !== 'undefined' &&
		typeof HTMLCanvasElement.prototype.captureStream === 'function'
	);
}

/**
 * Which Picture-in-Picture APIs this browser exposes.
 * Safari/iOS typically have WebKit presentation mode but not the standard API.
 */
export function getPipSupport(): PipSupport {
	if (typeof document === 'undefined' || typeof HTMLVideoElement === 'undefined') {
		return { standard: false, webkit: false };
	}

	if (!canCaptureCanvasStream()) {
		return { standard: false, webkit: false };
	}

	const proto = HTMLVideoElement.prototype as WebkitHTMLVideoElement;
	const standard =
		'pictureInPictureEnabled' in document &&
		document.pictureInPictureEnabled === true &&
		typeof proto.requestPictureInPicture === 'function';
	const webkit = typeof proto.webkitSetPresentationMode === 'function';

	return { standard, webkit };
}

/**
 * Check if Picture-in-Picture is supported
 */
export function isPipSupported(): boolean {
	const { standard, webkit } = getPipSupport();
	return standard || webkit;
}

export function isPipActive(renderer: PipRenderer): boolean {
	if (typeof document !== 'undefined' && document.pictureInPictureElement === renderer.video) {
		return true;
	}

	return asWebkitVideo(renderer.video).webkitPresentationMode === 'picture-in-picture';
}

function attachHiddenVideo(video: HTMLVideoElement): void {
	video.muted = true;
	video.defaultMuted = true;
	video.playsInline = true;
	video.autoplay = true;
	video.controls = false;
	video.disablePictureInPicture = false;
	video.setAttribute('playsinline', '');
	video.setAttribute('webkit-playsinline', '');
	video.setAttribute('aria-hidden', 'true');
	video.setAttribute('style', PIP_VIDEO_STYLE);

	if (document.body && !video.isConnected) {
		document.body.appendChild(video);
	}
}

function primeCanvas(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
	ctx.fillStyle = '#000000';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function requestCanvasFrame(renderer: PipRenderer): void {
	const [track] = renderer.stream.getVideoTracks();
	(track as CanvasCaptureTrack | undefined)?.requestFrame?.();
}

function setCanvasFont(
	ctx: CanvasRenderingContext2D,
	fontWeight: number,
	fontSize: number,
	fontFamily: string
): void {
	ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
}

function drawTimerText(
	ctx: CanvasRenderingContext2D,
	timeText: string,
	centerX: number,
	centerY: number,
	fontSize: number,
	fontFamily: string
): void {
	setCanvasFont(ctx, 700, fontSize, fontFamily);
	ctx.fillText(timeText, centerX, centerY);
}

/**
 * Create the PiP renderer with canvas and video elements
 */
export function createPipRenderer(): PipRenderer | null {
	if (typeof document === 'undefined' || !canCaptureCanvasStream()) return null;

	const canvas = document.createElement('canvas');
	canvas.width = 400;
	canvas.height = 200;

	const ctx = canvas.getContext('2d');
	if (!ctx) return null;

	// Safari drops the stream unless the canvas has been painted before capture.
	primeCanvas(ctx, canvas);

	let stream: MediaStream;
	try {
		stream = canvas.captureStream(30);
	} catch {
		return null;
	}

	const video = document.createElement('video');
	attachHiddenVideo(video);
	video.srcObject = stream;

	const renderer: PipRenderer = {
		canvas,
		video,
		ctx,
		stream,
		animationFrameId: null,
		paintIntervalId: null,
		isActive: false,
		isVideoPlaying: false
	};

	// WebKit emits a captured frame only after requestFrame() + another paint.
	requestCanvasFrame(renderer);
	primeCanvas(ctx, canvas);

	return renderer;
}

/**
 * Render the timer display to the canvas
 */
export function renderToCanvas(renderer: PipRenderer, state: PipRenderState): void {
	const { ctx, canvas } = renderer;
	const { timeText, backgroundColor, textColor, fontFamily, pinnedTaskText } = state;

	ctx.fillStyle = backgroundColor;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.fillStyle = textColor;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	if (pinnedTaskText) {
		const timerY = canvas.height / 2 - 25;
		drawTimerText(ctx, timeText, canvas.width / 2, timerY, 80, fontFamily);

		const taskY = canvas.height / 2 + 40;
		setCanvasFont(ctx, 500, 24, fontFamily);
		const checkmark = '✓';
		const taskText = `${checkmark} Task: ${pinnedTaskText}`;
		ctx.fillText(taskText, canvas.width / 2, taskY);
	} else {
		drawTimerText(ctx, timeText, canvas.width / 2, canvas.height / 2, 100, fontFamily);
	}
}

function paint(renderer: PipRenderer, getState: () => PipRenderState): void {
	requestCanvasFrame(renderer);
	renderToCanvas(renderer, getState());
}

/**
 * Start the PiP animation loop and begin video playback
 * Video must be playing before PiP can be requested (especially for Safari)
 */
export function startPipAnimation(
	renderer: PipRenderer,
	getState: () => PipRenderState
): void {
	if (renderer.animationFrameId === null) {
		const animate = () => {
			paint(renderer, getState);
			renderer.animationFrameId = requestAnimationFrame(animate);
		};

		renderer.animationFrameId = requestAnimationFrame(animate);
	}

	// rAF pauses in background tabs; this interval keeps MM:SS updating in PiP.
	// It does not drive remainingMs — TimerEngine still uses timestamps.
	if (renderer.paintIntervalId === null) {
		renderer.paintIntervalId = setInterval(() => {
			paint(renderer, getState);
		}, 250);
	}

	// Start video playback immediately so it's ready for PiP.
	// Muted autoplay is allowed; if it is blocked we retry from the click handler.
	if (!renderer.isVideoPlaying) {
		renderer.video
			.play()
			.then(() => {
				renderer.isVideoPlaying = true;
			})
			.catch((err) => {
				console.warn('Video autoplay blocked, will retry on user interaction:', err);
			});
	}
}

/**
 * Stop the PiP animation loop
 */
export function stopPipAnimation(renderer: PipRenderer): void {
	if (renderer.animationFrameId !== null) {
		cancelAnimationFrame(renderer.animationFrameId);
		renderer.animationFrameId = null;
	}
	if (renderer.paintIntervalId !== null) {
		clearInterval(renderer.paintIntervalId);
		renderer.paintIntervalId = null;
	}
}

function canEnterWebkitPip(video: WebkitHTMLVideoElement): boolean {
	if (typeof video.webkitSetPresentationMode !== 'function') return false;
	if (typeof video.webkitSupportsPresentationMode === 'function') {
		return video.webkitSupportsPresentationMode('picture-in-picture');
	}
	return true;
}

function enterWebkitPip(renderer: PipRenderer): boolean {
	const video = asWebkitVideo(renderer.video);
	if (!canEnterWebkitPip(video) || !video.webkitSetPresentationMode) {
		return false;
	}

	video.webkitSetPresentationMode('picture-in-picture');
	if (video.webkitPresentationMode === 'picture-in-picture') {
		renderer.isActive = true;
	}
	return true;
}

/**
 * Request Picture-in-Picture mode.
 * Safari requires the PiP request to happen synchronously from a user gesture,
 * so this must not `await` before calling the platform PiP API.
 */
export async function requestPip(renderer: PipRenderer): Promise<boolean> {
	const { standard, webkit } = getPipSupport();
	if (!standard && !webkit) return false;

	attachHiddenVideo(renderer.video);

	// Kick off play without awaiting — an await here drops Safari's user gesture.
	if (renderer.video.paused) {
		void renderer.video
			.play()
			.then(() => {
				renderer.isVideoPlaying = true;
			})
			.catch((error) => {
				console.warn('Failed to play video:', error);
			});
	}

	if (webkit) {
		try {
			if (enterWebkitPip(renderer)) {
				return true;
			}
		} catch (error) {
			console.warn('Failed to enter Picture-in-Picture (WebKit):', error);
		}
	}

	if (standard && typeof renderer.video.requestPictureInPicture === 'function') {
		try {
			await renderer.video.requestPictureInPicture();
			renderer.isActive = true;
			return true;
		} catch (error) {
			console.warn('Failed to enter Picture-in-Picture:', error);
			return false;
		}
	}

	return false;
}

/**
 * Exit Picture-in-Picture mode
 */
export async function exitPip(renderer?: PipRenderer): Promise<void> {
	if (typeof document !== 'undefined' && document.pictureInPictureElement) {
		try {
			await document.exitPictureInPicture();
		} catch (error) {
			console.warn('Failed to exit Picture-in-Picture:', error);
		}
		return;
	}

	if (!renderer) return;

	const video = asWebkitVideo(renderer.video);
	if (
		video.webkitPresentationMode === 'picture-in-picture' &&
		typeof video.webkitSetPresentationMode === 'function'
	) {
		try {
			video.webkitSetPresentationMode('inline');
		} catch (error) {
			console.warn('Failed to exit Picture-in-Picture (WebKit):', error);
		}
	}
}

/**
 * Toggle Picture-in-Picture mode
 */
export async function togglePip(renderer: PipRenderer): Promise<boolean> {
	if (isPipActive(renderer) || renderer.isActive) {
		await exitPip(renderer);
		renderer.isActive = false;
		return false;
	}

	return requestPip(renderer);
}

/**
 * Set up PiP event listeners
 */
export function setupPipListeners(
	renderer: PipRenderer,
	onEnter?: () => void,
	onLeave?: () => void
): () => void {
	const video = asWebkitVideo(renderer.video);

	const handleEnter = () => {
		renderer.isActive = true;
		onEnter?.();
	};

	const handleLeave = () => {
		renderer.isActive = false;
		onLeave?.();
	};

	const handleWebkitPresentation = () => {
		if (video.webkitPresentationMode === 'picture-in-picture') {
			handleEnter();
		} else {
			handleLeave();
		}
	};

	const handlePause = () => {
		if (renderer.isActive && renderer.video.paused) {
			void renderer.video.play().catch(() => {
				// Ignore; iOS may reject play() outside a gesture.
			});
		}
	};

	renderer.video.addEventListener('enterpictureinpicture', handleEnter);
	renderer.video.addEventListener('leavepictureinpicture', handleLeave);
	renderer.video.addEventListener('webkitpresentationmodechanged', handleWebkitPresentation);
	renderer.video.addEventListener('pause', handlePause);

	return () => {
		renderer.video.removeEventListener('enterpictureinpicture', handleEnter);
		renderer.video.removeEventListener('leavepictureinpicture', handleLeave);
		renderer.video.removeEventListener('webkitpresentationmodechanged', handleWebkitPresentation);
		renderer.video.removeEventListener('pause', handlePause);
	};
}

/**
 * Clean up PiP resources
 */
export function destroyPipRenderer(renderer: PipRenderer): void {
	stopPipAnimation(renderer);
	if (renderer.isActive) {
		void exitPip(renderer);
	}
	renderer.stream.getTracks().forEach((track) => track.stop());
	renderer.video.srcObject = null;
	renderer.video.remove();
}
