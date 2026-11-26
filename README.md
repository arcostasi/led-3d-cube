# 3D LED Cube

An interactive RGB LED cube, an Arduino Mega simulator, and a Custom View for Wokwi and AVR8js Electron Playground. The viewer supports cubes from 3 to 10 LEDs per edge.

**[Try the 8 × 8 × 8 demo on GitHub Pages](https://arcostasi.github.io/led-3d-cube/?size=8)**

Select **Start simulation** to run the bundled FastLED firmware. Choose **3D Animations** in **Local Simulation** to explore geometric effects and color palettes.

## Run locally

Use Node.js 20.19+ on the 20.x line or Node.js 22.12+ and a browser with WebGL 2.

```sh
npm ci
npm run dev
```

Open the viewer at [localhost:3000](http://localhost:3000/). Use **Load firmware** to run an Arduino Mega 2560 `.hex` file. The emulator reads WS2812B/GRB data on pin D3.

## Use as a Custom View

Set the `customView` field in your project's `diagram.json` to the hosted viewer.

```json
{
  "customView": "https://arcostasi.github.io/led-3d-cube/?size=8"
}
```

For this example, use a 512-pixel strip with the ID `neopixels` and connect Arduino pin D3 to DIN. Keep the sketch and strip pixel counts equal to `size³`. Add `&order=serpentine` if the sketch addresses the LEDs in serpentine order.

- **Wokwi.** Add the Arduino example files to a project and start the simulation. [Sketch](firmware/led_cube/led_cube.ino) · [Libraries](firmware/led_cube/libraries.txt) · [Diagram](firmware/led_cube/diagram.json)
- **AVR8js Electron Playground.** Open the `led-3d-cube-custom-view` example, set its `customView` URL, select **Custom View**, and run the project. Use `http://localhost:3000/?size=8` for local testing. [AVR8js Electron Playground](https://github.com/arcostasi/avr8js-electron-playground)

## Build

Run `npm run build` to check types and build the static site into `dist/`. GitHub Actions deploys updates from `main` to GitHub Pages.

To rebuild the bundled firmware, install Arduino CLI, the `arduino:avr@1.8.8` core, and `FastLED@3.10.10`, then run `npm run build:firmware`.

## Credits and license

The example diagram is based on Uri Shaked's original Wokwi LED 3D Cube. [Original Wokwi project](https://wokwi.com/projects/278306947843752461) · [Original viewer source](https://github.com/wokwi/led-3d-cube) · [FastLED effects example on Wokwi](https://wokwi.com/projects/288247972165059084)

The bundled firmware adapts FastLED's DemoReel100. [DemoReel100](https://github.com/FastLED/FastLED/blob/3.10.10/examples/DemoReel100/DemoReel100.ino) · [FastLED license](public/firmware/FASTLED-LICENSE.txt) · [Third-party notices](public/licenses/)

Copyright (C) 2026 Anderson Costa. Released under the [MIT license](LICENSE).
