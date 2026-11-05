import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sketch = fileURLToPath(new URL('../firmware/led_cube', import.meta.url));
const destination = fileURLToPath(new URL('../public/firmware', import.meta.url));
const temp = realpathSync(tmpdir());
const build = realpathSync(mkdtempSync(join(temp, 'led-cube-firmware-')));

try {
  execFileSync('arduino-cli', [
    'compile', '--fqbn', 'arduino:avr:mega:cpu=atmega2560',
    '--output-dir', build, sketch,
  ], { stdio: 'inherit' });
  mkdirSync(destination, { recursive: true });
  copyFileSync(join(build, 'led_cube.ino.hex'), join(destination, 'led_cube.hex'));
} finally {
  if (dirname(build) === temp) rmSync(build, { recursive: true, force: true });
}
