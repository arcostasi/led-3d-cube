import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
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
  const hex = readFileSync(join(build, 'led_cube.ino.hex'), 'utf8');
  writeFileSync(join(destination, 'led_cube.hex'), hex.replaceAll('\r\n', '\n'));
} finally {
  if (dirname(build) === temp) rmSync(build, { recursive: true, force: true });
}
