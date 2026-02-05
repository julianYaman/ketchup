/**
 * Picture-in-Picture module using canvas-to-video approach.
 * 
 * Attribution: PiP canvas approach inspired by Kaiido's StackOverflow answer
 * https://stackoverflow.com/a/61301293
 * Retrieved 2026-02-05, License: CC BY-SA 4.0
 */

export interface PipRenderer {
	canvas: HTMLCanvasElement;
	video: HTMLVideoElement;
	ctx: CanvasRenderingContext2D;
	animationFrameId: number | null;
	isActive: boolean;
}

export interface PipRenderState {
	timeText: string;
	backgroundColor: string;
	textColor: string;
}

/**
 * Check if Picture-in-Picture is supported
 */
export function isPipSupported(): boolean {
	if (typeof document === 'undefined') return false;
	return 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled;
}

/**
 * Create the PiP renderer with canvas and video elements
 */
export function createPipRenderer(): PipRenderer | null {
	if (typeof document === 'undefined') return null;

	const canvas = document.createElement('canvas');
	canvas.width = 400;
	canvas.height = 200;

	const ctx = canvas.getContext('2d');
	if (!ctx) return null;

	const video = document.createElement('video');
	video.muted = true;
	video.playsInline = true;

	// Set up the stream from canvas to video
	const stream = canvas.captureStream(30); // 30fps
	video.srcObject = stream;

	return {
		canvas,
		video,
		ctx,
		animationFrameId: null,
		isActive: false
	};
}

/**
 * Render the timer display to the canvas
 */
export function renderToCanvas(renderer: PipRenderer, state: PipRenderState): void {
	const { ctx, canvas } = renderer;
	const { timeText, backgroundColor, textColor } = state;

	// Clear and fill background
	ctx.fillStyle = backgroundColor;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Draw time text
	ctx.fillStyle = textColor;
	ctx.font = 'bold 80px system-ui, -apple-system, sans-serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(timeText, canvas.width / 2, canvas.height / 2);
}

/**
 * Start the PiP animation loop
 */
export function startPipAnimation(
	renderer: PipRenderer,
	getState: () => PipRenderState
): void {
	if (renderer.animationFrameId !== null) return;

	const animate = () => {
		renderToCanvas(renderer, getState());
		renderer.animationFrameId = requestAnimationFrame(animate);
	};

	renderer.animationFrameId = requestAnimationFrame(animate);
}

/**
 * Stop the PiP animation loop
 */
export function stopPipAnimation(renderer: PipRenderer): void {
	if (renderer.animationFrameId !== null) {
		cancelAnimationFrame(renderer.animationFrameId);
		renderer.animationFrameId = null;
	}
}

/**
 * Request Picture-in-Picture mode
 */
export async function requestPip(renderer: PipRenderer): Promise<boolean> {
	if (!isPipSupported()) return false;

	try {
		// Need to play the video first
		await renderer.video.play();
		await renderer.video.requestPictureInPicture();
		renderer.isActive = true;
		return true;
	} catch (error) {
		console.warn('Failed to enter Picture-in-Picture:', error);
		return false;
	}
}

/**
 * Exit Picture-in-Picture mode
 */
export async function exitPip(): Promise<void> {
	if (document.pictureInPictureElement) {
		try {
			await document.exitPictureInPicture();
		} catch (error) {
			console.warn('Failed to exit Picture-in-Picture:', error);
		}
	}
}

/**
 * Toggle Picture-in-Picture mode
 */
export async function togglePip(renderer: PipRenderer): Promise<boolean> {
	if (document.pictureInPictureElement) {
		await exitPip();
		renderer.isActive = false;
		return false;
	} else {
		return await requestPip(renderer);
	}
}

/**
 * Set up PiP event listeners
 */
export function setupPipListeners(
	renderer: PipRenderer,
	onEnter?: () => void,
	onLeave?: () => void
): () => void {
	const handleEnter = () => {
		renderer.isActive = true;
		onEnter?.();
	};

	const handleLeave = () => {
		renderer.isActive = false;
		onLeave?.();
	};

	renderer.video.addEventListener('enterpictureinpicture', handleEnter);
	renderer.video.addEventListener('leavepictureinpicture', handleLeave);

	// Return cleanup function
	return () => {
		renderer.video.removeEventListener('enterpictureinpicture', handleEnter);
		renderer.video.removeEventListener('leavepictureinpicture', handleLeave);
	};
}

/**
 * Clean up PiP resources
 */
export function destroyPipRenderer(renderer: PipRenderer): void {
	stopPipAnimation(renderer);
	if (renderer.isActive) {
		exitPip();
	}
	renderer.video.srcObject = null;
}
