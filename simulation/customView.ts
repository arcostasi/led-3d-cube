import { PATTERN_LABELS, PATTERN_NAMES } from '../constants';
import type { Led } from '../types';
import { AVR_PATTERN_NAMES, decodeNeoPixels, type PixelOrder } from './fastled';

const WOKWI_ORIGIN = 'https://wokwi.com';

function isLoopback(hostname: string) {
  return ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
}

function getSubscriptionOrigin() {
  if (!document.referrer) return WOKWI_ORIGIN;

  const parent = new URL(document.referrer);
  const localPreview = isLoopback(window.location.hostname) && isLoopback(parent.hostname) &&
    (parent.protocol === 'http:' || parent.protocol === 'https:');
  return localPreview || parent.origin === window.location.origin ? parent.origin : WOKWI_ORIGIN;
}

function readBytes(value: unknown) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (Array.isArray(value) && value.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)) {
    return Uint8Array.from(value);
  }
}

function readFrame(data: Record<string, unknown>, size: number, order: PixelOrder): Led[] | undefined {
  const ledCount = size ** 3;
  if (data.type === 'neopixel-buffer') {
    const bytes = readBytes(data.buffer);
    if (bytes?.length !== ledCount * 3) return;

    const pixels = Uint32Array.from({ length: ledCount }, (_, index) => {
      const start = index * 3;
      return (bytes[start + 1] << 16) | (bytes[start] << 8) | bytes[start + 2];
    });
    return decodeNeoPixels(pixels, size, order);
  }

  const neopixels = data.neopixels;
  const pixels = neopixels && typeof neopixels === 'object' && 'pixels' in neopixels
    ? neopixels.pixels
    : neopixels;

  if (!(pixels instanceof Uint32Array || Array.isArray(pixels)) || pixels.length !== ledCount) return;
  if (Array.isArray(pixels) && !pixels.every((pixel) => Number.isInteger(pixel))) return;

  return decodeNeoPixels(pixels, size, order);
}

export function listenToCustomView(onFrame: (leds: Led[]) => void, onPattern: (pattern: string) => void, size: number, order: PixelOrder) {
  const decoder = new TextDecoder();
  let serialBuffer = '';
  const embedded = window.parent !== window;
  const subscriptionOrigin = embedded ? getSubscriptionOrigin() : window.location.origin;
  let subscription: number | undefined;

  function handleMessage({ source, origin, data }: MessageEvent<unknown>) {
    if (source !== window.parent) return;
    // Electron's IPC bridge uses the Wokwi origin. A local browser host can use postMessage directly.
    if (origin !== WOKWI_ORIGIN && origin !== window.location.origin && origin !== subscriptionOrigin) return;
    if (!data || typeof data !== 'object') return;

    const message = data as Record<string, unknown>;
    const frame = readFrame(message, size, order);
    if (frame) {
      window.clearInterval(subscription);
      onFrame(frame);
    } else if (message.type === 'serial-data') {
      const bytes = readBytes(message.bytes);
      if (!bytes?.length) return;

      const lines = (serialBuffer + decoder.decode(bytes, { stream: true })).split('\n');
      serialBuffer = (lines.pop() ?? '').slice(-256);
      for (const line of lines) {
        const native = /^FastLED:(\d+)$/.exec(line.trim());
        const legacy = /Mudando para padrão: (\d+)/.exec(line);
        const pattern = native ? AVR_PATTERN_NAMES[Number(native[1])]
          : legacy && PATTERN_LABELS[PATTERN_NAMES[Number(legacy[1])]];
        if (pattern) onPattern(pattern);
      }
    }
  }

  window.addEventListener('message', handleMessage);
  if (embedded) {
    // Retry the subscription until the simulator is ready to send a frame.
    const subscribe = () => window.parent.postMessage({ app: 'wokwi', command: 'listen', version: 1 }, subscriptionOrigin);
    subscribe();
    subscription = window.setInterval(subscribe, 1000);
  }

  return () => {
    window.clearInterval(subscription);
    window.removeEventListener('message', handleMessage);
  };
}
