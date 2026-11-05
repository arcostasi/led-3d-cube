const flashBytes = 256 * 1024;

/** Read ATmega2560 Intel HEX firmware, including addresses above 64 KiB. */
export function readMegaFirmware(hex: string): Uint16Array {
  const bytes = new Uint8Array(flashBytes).fill(0xff);
  let base = 0;
  let ended = false;
  let wroteResetVector = false;

  for (const line of hex.trim().split(/\r?\n/)) {
    if (!line.trim()) continue;
    const record = line.trim();
    if (ended || !/^:(?:[a-f\d]{2}){5,}$/i.test(record)) throw new Error('Invalid Intel HEX record.');

    const fields = Uint8Array.from(record.slice(1).match(/../g)!, field => parseInt(field, 16));
    const [count, high, low, type] = fields;
    if (fields.length !== count + 5 || fields.reduce((sum, byte) => sum + byte, 0) % 256) {
      throw new Error('The HEX file contains an incomplete or corrupt record.');
    }

    const offset = (high << 8) | low;
    if (type === 0) {
      const address = base + offset;
      if (address + count > bytes.length) throw new Error('The firmware exceeds the Arduino Mega flash memory.');
      bytes.set(fields.subarray(4, 4 + count), address);
      wroteResetVector ||= address === 0 && count >= 2;
    } else if (type === 1 && count === 0 && offset === 0) {
      ended = true;
    } else if ((type === 2 || type === 4) && count === 2 && offset === 0) {
      base = ((fields[4] << 8) | fields[5]) * (type === 2 ? 16 : 65536);
    } else if (!((type === 3 || type === 5) && count === 4 && offset === 0)) {
      throw new Error('Invalid Intel HEX record type.');
    }
  }

  if (!ended || !wroteResetVector) throw new Error('The HEX file does not contain a complete firmware image.');

  const flash = new DataView(bytes.buffer);
  return Uint16Array.from({ length: flashBytes / 2 }, (_, i) => flash.getUint16(i * 2, true));
}
