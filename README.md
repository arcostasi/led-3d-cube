# 3D LED Cube

An interactive RGB LED cube viewer, an Arduino Mega simulator, and a Custom View for Wokwi and AVR8js Electron Playground. The cube defaults to 8 × 8 × 8 (512 LEDs) and supports 3 to 10 LEDs per edge.

[Open the hosted 8 × 8 × 8 viewer](https://arcostasi.github.io/led-3d-cube/?size=8)

## Run locally

Use Node.js 20.19+ on the 20.x line or Node.js 22.12+ and a modern browser with WebGL 2.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000/) and select **Start simulation**. In **Local Simulation**, choose **Arduino Mega · AVR8js** to run the bundled FastLED firmware or **3D Animations** to explore geometric effects and palettes.

In **View Settings**, adjust the cube size, brightness, rotation, and wiring visibility. Drag to orbit the cube or select **Pan camera** to move the view. Zoom with the mouse wheel, pinch gesture, or zoom buttons. **Reset camera** restores the starting view.

## Use as a Custom View

Match the sketch's pixel count, the diagram's NeoPixel strip count, and the viewer's cube size. For an 8 × 8 × 8 cube, use 512 pixels and set `size=8`. The default pixel order matches the original Wokwi cube. Append `&order=serpentine` for sketches that address the cube's serpentine wiring.

| Setting | Bundled sketch |
| --- | --- |
| Board | Arduino Mega 2560 |
| NeoPixel strip ID | `neopixels` |
| Signal | WS2812B, GRB, Arduino pin D3 to strip DIN |
| Power | 5V to VDD and GND to VSS |

### Wokwi

1. Use the [example sketch](firmware/led_cube/led_cube.ino), [library list](firmware/led_cube/libraries.txt), and [diagram](firmware/led_cube/diagram.json) to create a Wokwi project. The example diagram uses the hosted 8 × 8 × 8 viewer.
2. To use another cube size or an existing project, open **Custom View Integration** in the hosted viewer. Copy its URL into the `customView` field in `diagram.json`, or download a diagram with the URL and pixel count already filled in.
3. Start the Wokwi simulation. The viewer switches to **Custom View** when it receives a frame with the matching pixel count.

[Wokwi diagram format](https://docs.wokwi.com/diagram-format) · [Wokwi Custom View example](https://github.com/wokwi/led-recorder#usage)

### AVR8js Electron Playground

1. In a build of the playground that supports Custom View, open its `led-3d-cube-custom-view` example or another project with a matching NeoPixel strip.
2. Set the project's `customView` field in `diagram.json` to the hosted URL. For local development, run `npm run dev` and use `http://localhost:3000/?size=8`.
3. Switch to **Custom View** in the simulator toolbar and run the project. The Electron bridge forwards live NeoPixel frames and serial output to the viewer.

The playground runs the simulation with AVR8js and uses Wokwi Elements for its circuit UI. [AVR8js Electron Playground](https://github.com/arcostasi/avr8js-electron-playground)

## Arduino firmware

The bundled sketch offers six FastLED effects. Send `0` over serial to cycle through them or `1`–`6` to select an effect. In the viewer, **FastLED Code** shows the sketch with `CUBE_SIZE` set to the current cube size.

To import a sketch compiled for Arduino Mega 2560, set the viewer's cube size to match the firmware and use **Load firmware** to open its Intel HEX file. The emulator reads WS2812B/GRB output from pin D3. The URL's `order` option also applies to imported HEX files.

To rebuild the bundled firmware, install Arduino CLI and run the following commands.

```sh
arduino-cli core install arduino:avr@1.8.8
arduino-cli lib install FastLED@3.10.10
npm run build:firmware
```

This regenerates [`public/firmware/led_cube.hex`](public/firmware/led_cube.hex). The firmware is included in the repository, so the browser build needs only Node.js.

## Development

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | Check TypeScript types. |
| `npm run build` | Type-check and build the static site into `dist/`. |
| `npm run preview` | Serve the production build locally. |

GitHub Actions publishes updates to GitHub Pages from `main`. To host the viewer elsewhere, deploy the output of `npm run build` on an HTTPS server that allows Wokwi to embed it.

- [`components/`](components/) contains the React interface and Three.js scene.
- [`simulation/`](simulation/) contains the AVR8js worker, Intel HEX loader, animation generators, and Custom View receiver.
- [`firmware/led_cube/`](firmware/led_cube/) contains the Arduino sketch, library list, and example diagram.

The example diagram is based on Uri Shaked's Wokwi LED 3D Cube. The bundled firmware adapts FastLED's DemoReel100. [Original Wokwi viewer](https://github.com/wokwi/led-3d-cube) · [DemoReel100](https://github.com/FastLED/FastLED/blob/3.10.10/examples/DemoReel100/DemoReel100.ino) · [Third-party notices](public/licenses/) · [FastLED license](public/firmware/FASTLED-LICENSE.txt)
