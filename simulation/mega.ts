import {
  AVRIOPort, AVRTimer, AVRUSART, CPU, avrInstruction, portBConfig, portDConfig, portEConfig, portGConfig,
  timer0Config, usart0Config,
} from 'avr8js';

export const clockHz = 16_000_000;
const neoPixelPin = 1 << 5; // Mega D3 = PE5
const latchCycles = clockHz * 50 / 1_000_000;
const bitsPerPixel = 24;

export function createMega(program: Uint16Array, ledCount: number, onFrame: (pixels: Uint32Array<ArrayBuffer>) => void) {
  // AVR8js reserves 0x100 bytes for I/O. The Mega SRAM starts at 0x200.
  const cpu = new CPU(program, 0x2100);
  new AVRIOPort(cpu, portBConfig);
  new AVRIOPort(cpu, portDConfig);
  const portE = new AVRIOPort(cpu, portEConfig);
  new AVRIOPort(cpu, portGConfig);
  new AVRTimer(cpu, {
    ...timer0Config,
    compAInterrupt: 21 * 2,
    compBInterrupt: 22 * 2,
    ovfInterrupt: 23 * 2,
    compPortA: portBConfig.PORT,
    compPinA: 7,
    compPortB: portGConfig.PORT,
    compPinB: 5,
    externalClockPin: 7,
  });
  const serial = new AVRUSART(cpu, {
    ...usart0Config,
    rxCompleteInterrupt: 25 * 2,
    dataRegisterEmptyInterrupt: 26 * 2,
    txCompleteInterrupt: 27 * 2,
  }, clockHz);

  let pixels = new Uint32Array(ledCount);
  const frameBits = ledCount * bitsPerPixel;
  let bits = 0;
  let pixel = 0;
  let highAt = 0;
  let lowAt = 0;
  let high = false;

  function latch() {
    if (bits === frameBits) {
      onFrame(pixels);
      pixels = new Uint32Array(ledCount);
    }
    bits = 0;
    pixel = 0;
  }

  portE.addListener((value, previous) => {
    if (!((value ^ previous) & neoPixelPin)) return;
    high = Boolean(value & neoPixelPin);
    if (high) {
      if (cpu.cycles - lowAt >= latchCycles) latch();
      highAt = cpu.cycles;
      return;
    }

    lowAt = cpu.cycles;
    const pulse = lowAt - highAt;
    if (pulse < 2 || pulse > 18 || bits >= frameBits) {
      bits = frameBits + 1;
      return;
    }
    // The high pulse width distinguishes WS2812B zero and one bits.
    pixel = (pixel << 1) | Number(pulse >= 9);
    ++bits;
    if (bits % bitsPerPixel === 0) {
      pixels[bits / bitsPerPixel - 1] = pixel;
      pixel = 0;
    }
  });

  return {
    serial,
    get cycles() { return cpu.cycles; },
    runUntil(target: number) {
      while (cpu.cycles < target) {
        avrInstruction(cpu);
        cpu.tick();
      }
      if (!high && bits && cpu.cycles - lowAt >= latchCycles) latch();
    },
  };
}
