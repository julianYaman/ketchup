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
	isVideoPlaying: boolean;
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
	video.autoplay = true;

	// Set up the stream from canvas to video
	const stream = canvas.captureStream(30); // 30fps
	video.srcObject = stream;

	return {
		canvas,
		video,
		ctx,
		animationFrameId: null,
		isActive: false,
		isVideoPlaying: false
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
	ctx.font = 'bold 100px system-ui, -apple-system, sans-serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(timeText, canvas.width / 2, canvas.height / 2);
}

/**
 * Start the PiP animation loop and begin video playback
 * Video must be playing before PiP can be requested (especially for Safari)
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

	// Start video playback immediately so it's ready for PiP
	// This is done outside of user gesture, but play() on muted video is allowed
	if (!renderer.isVideoPlaying) {
		renderer.video.play()
			.then(() => {
				renderer.isVideoPlaying = true;
			})
			.catch((err) => {
				// Autoplay might be blocked, we'll try again on user gesture
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
}

/**
 * Ensure video is playing (call this before requestPip if needed)
 */
async function ensureVideoPlaying(renderer: PipRenderer): Promise<boolean> {
	if (renderer.isVideoPlaying && !renderer.video.paused) {
		return true;
	}

	try {
		await renderer.video.play();
		renderer.isVideoPlaying = true;
		return true;
	} catch (error) {
		console.warn('Failed to play video:', error);
		return false;
	}
}

/**
 * Request Picture-in-Picture mode
 * Safari requires the PiP request to happen synchronously from a user gesture,
 * so we ensure video is already playing before this is called.
 */
export async function requestPip(renderer: PipRenderer): Promise<boolean> {
	if (!isPipSupported()) return false;

	try {
		// If video isn't playing yet, try to start it
		// Note: On Safari this might fail if not from user gesture
		if (!renderer.isVideoPlaying || renderer.video.paused) {
			const canPlay = await ensureVideoPlaying(renderer);
			if (!canPlay) {
				return false;
			}
		}

		// Request PiP - this should now work since video is already playing
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
