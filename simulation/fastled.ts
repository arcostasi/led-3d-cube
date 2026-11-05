import type { Led } from '../types';
import { xyzToIndex } from '../utils/helpers';
import diagram from '../firmware/led_cube/diagram.json';
import libraries from '../firmware/led_cube/libraries.txt?raw';

export const FASTLED_VERSION = libraries.trim().split('@')[1];
export const AVR_PATTERN_NAMES = ['Sinelon', 'Rainbow With Glitter', 'Confetti', 'Juggle', 'Beat', 'Rainbow'] as const;
export const WOKWI_PROJECT = 'https://wokwi.com/projects/288247972165059084';
export const WOKWI_REFERENCE_VIEW = diagram.customView;
export type PixelOrder = 'linear' | 'serpentine';

export function makeWokwiDiagram(customView: string, ledCount: number) {
  return JSON.stringify({
    ...diagram,
    customView,
    parts: diagram.parts.map(part => part.id === 'neopixels' ? { ...part, attrs: { pixels: String(ledCount) } } : part),
  }, null, 2);
}

/** Wokwi lays out X/Y/Z, then tilts the entire cube by -90° around X. */
export function decodeNeoPixels(pixels: ArrayLike<number>, size: number, order: PixelOrder): Led[] {
  const leds: Led[] = new Array(pixels.length);
  const slice = size * size;
  for (let index = 0; index < pixels.length; ++index) {
    const pixel = pixels[index];
    const dest = order === 'linear'
      ? xyzToIndex(index % size, Math.floor(index / slice), size - 1 - Math.floor(index / size) % size, size)
      : index;
    leds[dest] = { r: (pixel >>> 8) & 0xff, g: (pixel >>> 16) & 0xff, b: pixel & 0xff };
  }
  return leds;
}
