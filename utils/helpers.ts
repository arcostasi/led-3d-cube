import { CUBE_SIZE } from '../constants';

/** Serpentine mapping shared by the cube, the simulator, and the Arduino sketch. */
export function xyzToIndex(x: number, y: number, z: number, size = CUBE_SIZE): number {
  if (x < 0 || x >= size || y < 0 || y >= size || z < 0 || z >= size) return 0;

  const row = z % 2 === 0 ? y : size - 1 - y;
  const column = y % 2 === 0 ? x : size - 1 - x;
  return (z * size + row) * size + column;
}

export function indexToXyz(index: number, size = CUBE_SIZE): { x: number; y: number; z: number } {
  if (index < 0 || index >= size ** 3) return { x: 0, y: 0, z: 0 };

  const z = Math.floor(index / (size * size));
  const row = Math.floor(index / size) % size;
  const column = index % size;
  const y = z % 2 === 0 ? row : size - 1 - row;
  const x = y % 2 === 0 ? column : size - 1 - column;
  return { x, y, z };
}
