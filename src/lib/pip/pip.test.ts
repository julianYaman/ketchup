import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	getPipSupport,
	isPipSupported,
	isPipActive,
	createPipRenderer,
	requestPip,
	togglePip,
	setupPipListeners,
	destroyPipRenderer,
	startPipAnimation,
	stopPipAnimation,
	type PipRenderer
} from './pip';

type WebkitVideo = HTMLVideoElement & {
	webkitSetPresentationMode?: (mode: string) => void;
	webkitSupportsPresentationMode?: (mode: string) => boolean;
	webkitPresentationMode?: string;
};

function mockCanvas() {
	const track = {
		requestFrame: vi.fn(),
		stop: vi.fn()
	};
	const stream = {
		getVideoTracks: () => [track],
		getTracks: () => [track]
	};
	const ctx = {
		fillRect: vi.fn(),
		fillText: vi.fn(),
		fillStyle: '',
		font: '',
		textAlign: 'center' as CanvasTextAlign,
		textBaseline: 'middle' as CanvasTextBaseline
	};
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
		ctx as unknown as CanvasRenderingContext2D
	);
	HTMLCanvasElement.prototype.captureStream = vi.fn(() => stream as unknown as MediaStream);
	return { track, stream, ctx };
}

describe('getPipSupport / isPipSupported', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		delete (HTMLVideoElement.prototype as WebkitVideo).webkitSetPresentationMode;
		delete (HTMLVideoElement.prototype as WebkitVideo).webkitSupportsPresentationMode;
	});

	it('is false when neither standard nor WebKit PiP exists', () => {
		Object.defineProperty(document, 'pictureInPictureEnabled', {
			configurable: true,
			value: false
		});
		expect(getPipSupport()).toEqual({ standard: false, webkit: false });
		expect(isPipSupported()).toBe(false);
	});

	it('detects the standard Picture-in-Picture API', () => {
		mockCanvas();
		Object.defineProperty(document, 'pictureInPictureEnabled', {
			configurable: true,
			value: true
		});
		HTMLVideoElement.prototype.requestPictureInPicture = vi.fn() as typeof HTMLVideoElement.prototype.requestPictureInPicture;

		expect(getPipSupport().standard).toBe(true);
		expect(isPipSupported()).toBe(true);
	});

	it('detects WebKit presentation mode used by Safari and iOS', () => {
		mockCanvas();
		Object.defineProperty(document, 'pictureInPictureEnabled', {
			configurable: true,
			value: false
		});
		(HTMLVideoElement.prototype as WebkitVideo).webkitSetPresentationMode = vi.fn();

		expect(getPipSupport()).toEqual({ standard: false, webkit: true });
		expect(isPipSupported()).toBe(true);
	});

	it('is false when canvas.captureStream is missing even if WebKit PiP exists', () => {
		const original = HTMLCanvasElement.prototype.captureStream;
		Object.defineProperty(HTMLCanvasElement.prototype, 'captureStream', {
			configurable: true,
			writable: true,
			value: undefined
		});
		(HTMLVideoElement.prototype as WebkitVideo).webkitSetPresentationMode = vi.fn();

		expect(isPipSupported()).toBe(false);

		Object.defineProperty(HTMLCanvasElement.prototype, 'captureStream', {
			configurable: true,
			writable: true,
			value: original
		});
	});
});

describe('createPipRenderer', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('paints the canvas, captures a stream, and attaches a hidden video', () => {
		const { stream, track } = mockCanvas();
		const renderer = createPipRenderer();

		expect(renderer).not.toBeNull();
		expect(renderer?.stream).toBe(stream);
		expect(track.requestFrame).toHaveBeenCalled();
		expect(renderer?.video.isConnected).toBe(true);
		expect(renderer?.video.muted).toBe(true);
		expect(renderer?.video.playsInline).toBe(true);
		expect(renderer?.video.getAttribute('webkit-playsinline')).toBe('');
		expect(renderer?.video.style.opacity).toBe('0.01');

		renderer?.video.remove();
	});
});

describe('requestPip / togglePip', () => {
	let renderer: PipRenderer;

	beforeEach(() => {
		mockCanvas();
		const created = createPipRenderer();
		if (!created) throw new Error('expected renderer');
		renderer = created;
		renderer.video.play = vi.fn().mockResolvedValue(undefined);
	});

	afterEach(() => {
		renderer?.video.remove();
		vi.restoreAllMocks();
		delete (HTMLVideoElement.prototype as WebkitVideo).webkitSetPresentationMode;
		delete (HTMLVideoElement.prototype as WebkitVideo).webkitSupportsPresentationMode;
	});

	it('calls webkitSetPresentationMode synchronously without awaiting play', async () => {
		Object.defineProperty(document, 'pictureInPictureEnabled', {
			configurable: true,
			value: false
		});
		const webkitSet = vi.fn(function (this: WebkitVideo, mode: string) {
			this.webkitPresentationMode = mode;
		});
		(HTMLVideoElement.prototype as WebkitVideo).webkitSetPresentationMode = webkitSet;
		(HTMLVideoElement.prototype as WebkitVideo).webkitSupportsPresentationMode = () => true;

		// If requestPip awaited play(), this promise would hang the test.
		renderer.video.play = vi.fn().mockReturnValue(new Promise(() => {}));
		Object.defineProperty(renderer.video, 'paused', { configurable: true, value: true });

		const result = await requestPip(renderer);

		expect(renderer.video.play).toHaveBeenCalled();
		expect(webkitSet).toHaveBeenCalledWith('picture-in-picture');
		expect(result).toBe(true);
		expect(renderer.isActive).toBe(true);
	});

	it('uses requestPictureInPicture when only the standard API exists', async () => {
		Object.defineProperty(document, 'pictureInPictureEnabled', {
			configurable: true,
			value: true
		});
		const request = vi.fn().mockResolvedValue(undefined);
		renderer.video.requestPictureInPicture = request;

		const result = await requestPip(renderer);

		expect(request).toHaveBeenCalled();
		expect(result).toBe(true);
		expect(renderer.isActive).toBe(true);
	});

	it('exits WebKit PiP on toggle when already active', async () => {
		const webkitSet = vi.fn(function (this: WebkitVideo, mode: string) {
			this.webkitPresentationMode = mode;
		});
		(HTMLVideoElement.prototype as WebkitVideo).webkitSetPresentationMode = webkitSet;
		asWebkit(renderer.video).webkitPresentationMode = 'picture-in-picture';
		renderer.isActive = true;

		const result = await togglePip(renderer);

		expect(webkitSet).toHaveBeenCalledWith('inline');
		expect(result).toBe(false);
		expect(renderer.isActive).toBe(false);
	});
});

describe('setupPipListeners', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('tracks WebKit presentation mode changes', () => {
		mockCanvas();
		const renderer = createPipRenderer();
		if (!renderer) throw new Error('expected renderer');

		const onEnter = vi.fn();
		const onLeave = vi.fn();
		const cleanup = setupPipListeners(renderer, onEnter, onLeave);

		asWebkit(renderer.video).webkitPresentationMode = 'picture-in-picture';
		renderer.video.dispatchEvent(new Event('webkitpresentationmodechanged'));
		expect(onEnter).toHaveBeenCalledTimes(1);
		expect(renderer.isActive).toBe(true);

		asWebkit(renderer.video).webkitPresentationMode = 'inline';
		renderer.video.dispatchEvent(new Event('webkitpresentationmodechanged'));
		expect(onLeave).toHaveBeenCalledTimes(1);
		expect(renderer.isActive).toBe(false);

		cleanup();
		renderer.video.remove();
	});
});

describe('startPipAnimation', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
			return setTimeout(() => cb(performance.now()), 16) as unknown as number;
		});
		vi.stubGlobal('cancelAnimationFrame', (id: number) => {
			clearTimeout(id);
		});
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('keeps painting on an interval so backgrounded PiP still ticks', () => {
		mockCanvas();
		const renderer = createPipRenderer();
		if (!renderer) throw new Error('expected renderer');
		renderer.video.play = vi.fn().mockResolvedValue(undefined);

		const getState = vi.fn(() => ({
			timeText: '25:00',
			backgroundColor: '#000',
			textColor: '#fff',
			fontFamily: 'sans-serif'
		}));

		startPipAnimation(renderer, getState);
		expect(renderer.paintIntervalId).not.toBeNull();

		getState.mockClear();
		vi.advanceTimersByTime(250);
		expect(getState).toHaveBeenCalled();

		stopPipAnimation(renderer);
		destroyPipRenderer(renderer);
	});
});

describe('isPipActive', () => {
	it('is true when webkitPresentationMode is picture-in-picture', () => {
		mockCanvas();
		const renderer = createPipRenderer();
		if (!renderer) throw new Error('expected renderer');
		asWebkit(renderer.video).webkitPresentationMode = 'picture-in-picture';
		expect(isPipActive(renderer)).toBe(true);
		renderer.video.remove();
		vi.restoreAllMocks();
	});
});

function asWebkit(video: HTMLVideoElement): WebkitVideo {
	return video as WebkitVideo;
}
