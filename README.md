# 3D LED Cube

[![Live demo](https://img.shields.io/badge/demo-GitHub%20Pages-5ee7ff)](https://arcostasi.github.io/led-3d-cube/?size=8)
[![Deploy](https://github.com/arcostasi/led-3d-cube/actions/workflows/pages.yml/badge.svg)](https://github.com/arcostasi/led-3d-cube/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

An open-source teaching project to learn FastLED and prototype an RGB LED cube in the browser, before you buy any parts. It runs real Arduino Mega firmware, shows every LED and wire in 3D, and works as a Custom View for Wokwi and AVR8js Electron Playground.

<div align="center">
  <video src="https://github.com/user-attachments/assets/f58de8fb-1426-43b5-a892-cf140c80b7ed" width="720" />
</div>

<p align="center"><strong><a href="https://arcostasi.github.io/led-3d-cube/?size=8">▶ Try the 8 × 8 × 8 demo</a></strong></p>

## Features

- **Real firmware.** AVR8js emulates an Arduino Mega 2560 running the bundled FastLED sketch, or any `.hex` file you load.
- **Effects to study.** Six FastLED DemoReel100 effects on the emulated Arduino, plus 15 3D animations with 10 color palettes.
- **Code you can reuse.** The **FastLED Code** panel shows the sketch for the current effect, sized for the current cube.
- **Any size.** Cubes from 3 × 3 × 3 to 10 × 10 × 10 (27 to 1,000 LEDs).
- **Realistic rendering.** Each LED emits light the way FastLED drives a WS2812B, and the model includes the leads, supply columns, and data chain.
- **Custom View.** Embed the viewer in Wokwi or AVR8js Electron Playground to display your own simulation.

## Quick start

1. Open the [live demo](https://arcostasi.github.io/led-3d-cube/?size=8).
2. Select **Start simulation** to run the bundled FastLED firmware.
3. In **Local Simulation**, pick a FastLED pattern, or switch to **3D Animations** to explore effects and palettes.
4. Open **FastLED Code** to copy the sketch. **Rainbow Layers**, **Snake Trail**, and **Twinkle** include a complete Arduino sketch.
5. Use **Load firmware** to run your own Arduino Mega 2560 `.hex` file. The emulator reads WS2812B/GRB data on pin D3.

Drag to orbit the cube, and use **View Settings** to change the cube size, brightness, LED size, and wiring.

### URL parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `size` | `3`–`10` | LEDs per edge. The default is `8` when embedded. |
| `order` | `linear` (default), `serpentine` | How an external sketch addresses the strip. |

Example: `https://arcostasi.github.io/led-3d-cube/?size=8&order=serpentine`

## Use as a Custom View

Set the `customView` field in your project's `diagram.json` to the hosted viewer:

```json
{
  "customView": "https://arcostasi.github.io/led-3d-cube/?size=8"
}
```

Then wire the project to match:

- Use a NeoPixel strip with the ID `neopixels` and `size³` pixels (512 for `size=8`).
- Connect Arduino pin D3 to DIN.
- Keep the pixel count in your sketch equal to `size³`.

Embedded viewers hide the cube summary by default. Select **Show cube summary** to see the dimensions, active LEDs, and FPS.

| Platform | How to start |
|----------|--------------|
| **Wokwi** | Add the [sketch](firmware/led_cube/led_cube.ino), [libraries](firmware/led_cube/libraries.txt), and [diagram](firmware/led_cube/diagram.json) to a project and start the simulation. |
| **[AVR8js Electron Playground](https://github.com/arcostasi/avr8js-electron-playground)** | Open the `led-3d-cube-custom-view` example, set its `customView` URL, select **Custom View**, and run the project. Use `http://localhost:3000/?size=8` for local testing. |

## Run locally

You need Node.js 20.19+ (20.x line) or 22.12+, and a browser with WebGL 2.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000/).

| Command | Description |
|---------|-------------|
| `npm run dev` | Starts the development server on port 3000. |
| `npm run typecheck` | Checks the TypeScript types. |
| `npm run build` | Checks types and builds the static site into `dist/`. |
| `npm run preview` | Serves the build locally. |
| `npm run build:firmware` | Rebuilds the bundled Arduino Mega firmware. |

Every push to `main` deploys the site to GitHub Pages.

### Rebuild the firmware

Install [Arduino CLI](https://arduino.github.io/arduino-cli/), then run:

```sh
arduino-cli core install arduino:avr@1.8.8
arduino-cli lib install FastLED@3.10.10
npm run build:firmware
```

The command compiles [`led_cube.ino`](firmware/led_cube/led_cube.ino) and updates [`public/firmware/led_cube.hex`](public/firmware/led_cube.hex).

## Project structure

| Path | Contents |
|------|----------|
| [`components/`](components/) | Interface and Three.js rendering. |
| [`simulation/`](simulation/) | AVR8js worker, WS2812B decoder, Custom View bridge, and 3D animations. |
| [`utils/`](utils/) | LED optics, wiring model, FastLED light output, and coordinate helpers. |
| [`firmware/led_cube/`](firmware/led_cube/) | Arduino sketch, Wokwi diagram, and library version. |
| [`public/`](public/) | Prebuilt firmware and third-party licenses. |

## Contributing

Issues and pull requests are welcome. If this project helps you learn FastLED or plan your own cube, consider giving it a ⭐.

## Credits and license

- The example diagram is based on Uri Shaked's original Wokwi LED 3D Cube. [Original Wokwi project](https://wokwi.com/projects/278306947843752461) · [Original viewer source](https://github.com/wokwi/led-3d-cube) · [FastLED effects example on Wokwi](https://wokwi.com/projects/288247972165059084)
- The bundled firmware adapts FastLED's DemoReel100. [DemoReel100](https://github.com/FastLED/FastLED/blob/3.10.10/examples/DemoReel100/DemoReel100.ino) · [FastLED license](public/firmware/FASTLED-LICENSE.txt) · [Third-party notices](public/licenses/)

Copyright (C) 2026 Anderson Costa. Released under the [MIT license](LICENSE).
