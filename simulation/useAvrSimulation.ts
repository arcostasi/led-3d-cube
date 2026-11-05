import { useEffect, useRef } from 'react';
import type { AvrCommand, AvrEvent } from './fastled.worker';

export interface LoadedFirmware {
  name: string;
  hex: string;
}

interface Options {
  enabled: boolean;
  running: boolean;
  size: number;
  pattern: number;
  firmware: LoadedFirmware | null;
  onEvent: (event: AvrEvent) => void;
}

export function useAvrSimulation({ enabled, running, size, pattern, firmware, onEvent }: Options) {
  const workerRef = useRef<Worker | null>(null);
  const lastPattern = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const worker = new Worker(new URL('./fastled.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    lastPattern.current = 0;
    worker.onmessage = ({ data }: MessageEvent<AvrEvent>) => onEvent(data);
    worker.onerror = () => onEvent({ type: 'error', message: 'Could not run the AVR8js emulator.' });
    worker.postMessage({
      type: 'load', size,
      firmware: firmware ?? { url: new URL('firmware/led_cube.hex', document.baseURI).href },
    } satisfies AvrCommand);

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [enabled, size, firmware, onEvent]);

  useEffect(() => {
    workerRef.current?.postMessage({ type: 'run', active: running } satisfies AvrCommand);
  }, [enabled, size, firmware, running, onEvent]);

  useEffect(() => {
    const worker = workerRef.current;
    if (worker && !firmware && pattern !== lastPattern.current) {
      worker.postMessage({ type: 'pattern', index: pattern } satisfies AvrCommand);
      lastPattern.current = pattern;
    }
  }, [enabled, size, firmware, pattern, onEvent]);
}
