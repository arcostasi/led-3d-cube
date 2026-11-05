#include <FastLED.h>

#if FASTLED_VERSION != 3010010
#error "Use FastLED 3.10.10 to rebuild the bundled firmware."
#endif

#ifndef CUBE_SIZE
#define CUBE_SIZE 8
#endif

constexpr uint8_t dataPin = 3;
constexpr uint16_t maxPixels = 10 * 10 * 10;
constexpr uint32_t transitionMs = 20000;
static_assert(CUBE_SIZE >= 3 && CUBE_SIZE <= 10, "Use 3 to 10 LEDs per edge.");

CRGB leds[maxPixels];
uint16_t pixelCount = CUBE_SIZE * CUBE_SIZE * CUBE_SIZE;
CLEDController* strip;
uint8_t hue = 0;
uint8_t pattern = 0;
uint16_t previousSinelonPosition = 0;
bool automatic = true;
uint32_t changedAt = 0;

void rainbow() {
  fill_rainbow(leds, pixelCount, hue, 7);
}

void rainbowWithGlitter() {
  rainbow();
  if (random8() < 80) {
    leds[random16(pixelCount)] += CRGB::White;
  }
}

void confetti() {
  fadeToBlackBy(leds, pixelCount, 10);
  leds[random16(pixelCount)] += CHSV(hue + random8(64), 200, 255);
}

void sinelon() {
  fadeToBlackBy(leds, pixelCount, 20);
  const uint16_t position = beatsin16(30, 0, pixelCount - 1);
  const uint16_t first = min(previousSinelonPosition, position);
  const uint16_t last = max(previousSinelonPosition, position);
  const CRGB color = ColorFromPalette(RainbowColors_p, hue, 255);
  fill_solid(leds + first, last - first + 1, color);
  previousSinelonPosition = position;
}

void juggle() {
  fadeToBlackBy(leds, pixelCount, 20);
  for (uint8_t dot = 0; dot < 8; ++dot) {
    leds[beatsin16(dot + 7, 0, pixelCount - 1)] |= CHSV(dot * 32, 200, 255);
  }
}

void bpm() {
  const CRGBPalette16 palette(PartyColors_p);
  const uint8_t beat = beatsin8(62, 64, 255);
  for (uint16_t i = 0; i < pixelCount; ++i) {
    leds[i] = ColorFromPalette(palette, hue + i * 2, beat - hue + i * 10);
  }
}

// DemoReel100 effects by Mark Kriegsman (FastLED, MIT).
void (*const effects[])() = {sinelon, rainbowWithGlitter, confetti, juggle, bpm, rainbow};
constexpr uint8_t effectCount = sizeof(effects) / sizeof(effects[0]);

void setPattern(uint8_t next) {
  pattern = next;
  previousSinelonPosition = 0;
  changedAt = millis();
  fill_solid(leds, pixelCount, CRGB::Black);
  Serial.print(F("FastLED:"));
  Serial.println(pattern);
}

void setup() {
  Serial.begin(115200);
  strip = &FastLED.addLeds<WS2812B, dataPin, GRB>(leds, pixelCount);
  FastLED.setBrightness(160);
  setPattern(0);
}

void loop() {
  while (Serial.available()) {
    const int command = Serial.read();
    if (command >= '0' && command <= '0' + effectCount) {
      automatic = command == '0';
      setPattern(automatic ? 0 : command - '1');
    } else if (command >= 0x83 && command <= 0x8a) {
      const uint8_t size = command - 0x80;
      pixelCount = size * size * size;
      previousSinelonPosition = 0;
      strip->setLeds(leds, pixelCount);
      fill_solid(leds, maxPixels, CRGB::Black);
    }
  }

  effects[pattern]();
  FastLED.show();
  FastLED.delay(1000 / 120);

  EVERY_N_MILLISECONDS(20) { ++hue; }
  if (automatic && millis() - changedAt >= transitionMs) {
    setPattern((pattern + 1) % effectCount);
  }
}
