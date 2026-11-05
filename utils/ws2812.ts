import type { Led } from '../types';

/**
 * FastLED's TypicalLEDStrip correction (0xFFB0F0). A sketch applies it to make a WS2812B strip look
 * neutral, so the strip's own output per channel is its inverse: green is the strongest die, red the weakest.
 */
const TYPICAL_LED_STRIP = [0xff, 0xb0, 0xf0] as const;

/** Light from each fully driven die, relative to green. None of the bundled sketches call setCorrection(). */
export const UNCORRECTED_OUTPUT = TYPICAL_LED_STRIP.map(value => Math.min(...TYPICAL_LED_STRIP) / value);

/**
 * Writes the light each WS2812B emits, in linear RGB, into `target` (three floats per LED).
 *
 * FastLED sends every channel as an 8-bit PWM duty cycle that already includes FastLED.setBrightness(),
 * so the emitted light is linear in the byte: 128 gives half the light of 255, which looks far brighter than half.
 */
export function writeLedLight(leds: readonly Led[], target: Float32Array) {
  const [red, green, blue] = UNCORRECTED_OUTPUT;
  const duty = (value: number) => Math.min(Math.max(value, 0), 255) / 255;
  leds.forEach(({ r, g, b }, index) => {
    target[index * 3] = duty(r) * red;
    target[index * 3 + 1] = duty(g) * green;
    target[index * 3 + 2] = duty(b) * blue;
  });
}
