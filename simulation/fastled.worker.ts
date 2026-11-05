/// <reference lib="webworker" />

import { readMegaFirmware } from './intelHex';
import { clockHz, createMega } from './mega';
import { CUBE_SIZE } from '../constants';

export type AvrCommand =
  | { type: 'load'; firmware: { url: string } | { hex: string }; size: number }
  | { type: 'run'; active: boolean }
  | { type: 'pattern'; index: number };

export type AvrEvent =
  | { type: 'frame'; pixels: Uint32Array<ArrayBuffer> }
  | { type: 'pattern'; index: number }
  | { type: 'error'; message: string };

const worker = self as unknown as DedicatedWorkerGlobalScope;
const send = (event: AvrEvent, transfer: Transferable[] = []) => worker.postMessage(event, transfer);
let mega: ReturnType<typeof createMega> | undefined;
let running = false;
let timeout: number | undefined;
let previousTime = 0;
let pendingSize: number | undefined;
let pendingPattern: number | undefined;

function step() {
  timeout = undefined;
  if (!running || !mega) return;

  if (mega.serial.rxEnable && !mega.serial.rxBusy) {
    if (pendingSize !== undefined) {
      mega.serial.writeByte(0x80 + pendingSize);
      pendingSize = undefined;
    } else if (pendingPattern !== undefined) {
      mega.serial.writeByte(0x30 + pendingPattern);
      pendingPattern = undefined;
    }
  }

  const time = performance.now();
  // Bound catch-up after tab suspension and give UI commands time to run.
  const elapsed = Math.min(time - previousTime, 20);
  previousTime = time;
  mega.runUntil(mega.cycles + clockHz * elapsed / 1000);
  timeout = self.setTimeout(step, 4);
}

function updateRunning() {
  if (!running) {
    self.clearTimeout(timeout);
    timeout = undefined;
  } else if (mega && timeout === undefined) {
    previousTime = performance.now();
    step();
  }
}

worker.onmessage = async ({ data }: MessageEvent<AvrCommand>) => {
  if (data.type === 'run') {
    running = data.active;
    updateRunning();
  } else if (data.type === 'pattern') {
    pendingPattern = data.index;
  } else if (data.type === 'load') {
    try {
      const { firmware, size } = data;
      let hex: string;
      if ('url' in firmware) {
        const response = await fetch(firmware.url);
        if (!response.ok) throw new Error('Could not load the FastLED firmware.');
        hex = await response.text();
        if (size !== CUBE_SIZE) pendingSize = size;
      } else {
        hex = firmware.hex;
      }

      mega = createMega(readMegaFirmware(hex), size ** 3, (pixels) => {
        send({ type: 'frame', pixels }, [pixels.buffer]);
      });
      if ('url' in firmware) {
        mega.serial.onLineTransmit = (line) => {
          const match = /^FastLED:(\d+)$/.exec(line.trim());
          if (match) send({ type: 'pattern', index: Number(match[1]) });
        };
      }
      updateRunning();
    } catch (error) {
      send({ type: 'error', message: error instanceof Error ? error.message : 'Could not start the Arduino Mega.' });
    }
  }
};
