import {
  Box3, Color, CylinderGeometry, DynamicDrawUsage, Group, InstancedBufferAttribute, InstancedMesh, Matrix4,
  MeshStandardMaterial, Quaternion, Sphere, SphereGeometry, Vector3,
} from 'three';
import { indexToXyz, xyzToIndex } from './helpers';
import { EMITTER_HEIGHT } from './ledOptics';

type Point = [x: number, y: number, z: number];
type Segment = { start: Point; end: Point; radius: number; tone: number };

const pinOffsets = [-0.56, -0.185, 0.185, 0.56]; // DIN, GND, VDD, DOUT
const supplyRails = [
  { x: -0.135, z: -0.45, drop: 0.31, tone: 0x748591 }, // GND
  { x: 0.135, z: -0.29, drop: 0.20, tone: 0x899397 }, // VDD
];
const signalTone = 0x78818a;
const pinTone = 0x9ba6ad;

// How far LED light reaches along the wires, in world units.
const lightReach = 1.6;
const lightFalloff = 0.3;

export function ledFacesLeft(row: number) {
  return row % 2 !== 0;
}

function getWireLayout(size: number, spacing: number, lensScale: number) {
  const offset = (size - 1) * spacing / 2;
  const segments: Segment[] = [];
  const joints: Point[] = [];
  const positions = Array.from({ length: size ** 3 }, (_, index) => indexToXyz(index, size));
  const dataEnds: { input: Point; output: Point }[] = [];
  const dataDrop = 0.85 * lensScale + 0.14;

  const route = (points: Point[], radius: number, tone: number) => {
    for (let index = 1; index < points.length; index++) {
      segments.push({ start: points[index - 1], end: points[index], radius, tone });
    }
  };

  for (const position of positions) {
    const x = position.x * spacing - offset;
    const y = position.y * spacing - offset;
    const z = position.z * spacing - offset;
    const direction = ledFacesLeft(position.y) ? -1 : 1;
    const pinX = (pin: number) => x + pinOffsets[pin] * lensScale * direction;
    const flange = y - lensScale * 0.82;
    const pin = (start: Point, end: Point) => route([start, end], 0.014, pinTone);

    const input: Point = [pinX(0), y - dataDrop, z];
    const output: Point = [pinX(3), y - dataDrop, z];
    pin([input[0], flange, z], input);
    pin([output[0], flange, z], output);
    dataEnds.push({ input, output });

    supplyRails.forEach((rail, channel) => {
      const startX = pinX(channel + 1);
      const jointY = y - dataDrop - rail.drop;
      const solder: Point = [x + rail.x, jointY, z + rail.z];
      pin([startX, flange, z], [startX, jointY, z]);
      // The bend changes lanes before it reaches the power column.
      route([[startX, jointY, z], [startX, jointY, z - 0.14], [solder[0], jointY, z - 0.14], solder], 0.016, rail.tone);
      joints.push(solder);
    });
  }

  // Two separate buses beneath the cube supply every column.
  supplyRails.forEach((rail, channel) => {
    const floor = -offset - dataDrop - 0.56 - channel * 0.15;
    const feedX = -offset - 0.56 - channel * 0.16;
    for (let zIndex = 0; zIndex < size; zIndex++) {
      const z = zIndex * spacing - offset + rail.z;
      for (let xIndex = 0; xIndex < size; xIndex++) {
        const x = xIndex * spacing - offset + rail.x;
        // Each wire segment runs between solder joints and picks up light from its own layer.
        const solders = Array.from({ length: size }, (_, yIndex): Point =>
          [x, yIndex * spacing - offset - dataDrop - rail.drop, z]);
        route([[x, floor, z], ...solders], 0.025, rail.tone);
      }
      route([[feedX, floor, z], [offset + rail.x, floor, z]], 0.028, rail.tone);
    }
    route([[feedX, floor - 0.24, -offset + rail.z], [feedX, floor, -offset + rail.z],
      [feedX, floor, offset + rail.z]], 0.03, rail.tone);
  });

  // The data chain follows the strip address order.
  for (let index = 1; index < positions.length; index++) {
    const previous = positions[index - 1];
    const current = positions[index];
    const start = dataEnds[index - 1].output;
    const end = dataEnds[index].input;
    if (previous.z !== current.z) {
      const bridge = (start[2] + end[2]) / 2;
      const startSide = Math.sign(start[0]) * (offset + 0.72);
      const endSide = Math.sign(end[0]) * (offset + 0.72);
      // The bridge enters and exits at the side to avoid crossing the power columns.
      route([start, [startSide, start[1], start[2]], [startSide, start[1], bridge],
        [endSide, end[1], bridge], [endSide, end[1], end[2]], end], 0.019, signalTone);
    } else if (previous.y !== current.y) {
      const outside = (ledFacesLeft(previous.y) ? -1 : 1) * (offset + 0.48);
      route([start, [outside, start[1], start[2]], [outside, end[1], end[2]], end], 0.019, signalTone);
    } else {
      route([start, end], 0.019, signalTone);
    }
    joints.push(start, end);
  }

  const first = dataEnds[0].input;
  route([first, [first[0] - 0.25, first[1], first[2]], [first[0] - 0.25, -offset - dataDrop - 0.95, first[2]]], 0.019, signalTone);
  joints.push(first);

  return { segments, joints };
}

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const amount = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
  return amount * amount * (3 - 2 * amount);
};

/** Lists, for both ends of every segment, the LEDs close enough to light it and how strongly. */
function getLightTaps(segments: Segment[], size: number, spacing: number, lensScale: number) {
  const offset = (size - 1) * spacing / 2;
  const emitterY = EMITTER_HEIGHT * lensScale;
  const offsets = new Uint32Array(segments.length * 2 + 1);
  const leds: number[] = [];
  const weights: number[] = [];
  const cells = (value: number) => {
    const low = Math.min(Math.max(Math.floor(value), 0), size - 1);
    return low < size - 1 && value > low ? [low, low + 1] : [low];
  };

  segments.forEach(({ start, end }, index) => {
    [start, end].forEach(([x, y, z], side) => {
      for (const cellX of cells((x + offset) / spacing)) {
        for (const cellY of cells((y + offset - emitterY) / spacing)) {
          for (const cellZ of cells((z + offset) / spacing)) {
            const distance = Math.hypot(
              x - (cellX * spacing - offset), y - (cellY * spacing - offset + emitterY), z - (cellZ * spacing - offset));
            if (distance >= lightReach) continue;

            leds.push(xyzToIndex(cellX, cellY, cellZ, size));
            weights.push(lightFalloff ** 2 / (lightFalloff ** 2 + distance ** 2) *
              (1 - smoothstep(0.5 * lightReach, lightReach, distance)));
          }
        }
      }
      offsets[index * 2 + side + 1] = leds.length;
    });
  });

  return { offsets, leds: Uint32Array.from(leds), weights: Float32Array.from(weights) };
}

export function createCubeWiring(size: number, spacing: number, lensScale: number) {
  const initialLayout = getWireLayout(size, spacing, lensScale);
  const segmentCount = initialLayout.segments.length;
  let taps = getLightTaps(initialLayout.segments, size, spacing, lensScale);
  const rod = new CylinderGeometry(1, 1, 1, 6);
  const bead = new SphereGeometry(1, 6, 4);
  // Tinned wire uses a light metal finish with diffuse reflections.
  const material = new MeshStandardMaterial({ color: 0xffffff, metalness: 0.85, roughness: 0.4 });
  const solderMaterial = material.clone();
  solderMaterial.roughness = 0.3;
  const lightStart = new InstancedBufferAttribute(new Float32Array(segmentCount * 3), 3).setUsage(DynamicDrawUsage);
  const lightEnd = new InstancedBufferAttribute(new Float32Array(segmentCount * 3), 3).setUsage(DynamicDrawUsage);
  rod.setAttribute('lightStart', lightStart);
  rod.setAttribute('lightEnd', lightEnd);
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = `attribute vec3 lightStart;
attribute vec3 lightEnd;
varying vec3 vLightStart;
varying vec3 vLightEnd;
varying vec2 vWireSpan;
${shader.vertexShader}`.replace('#include <begin_vertex>', `#include <begin_vertex>
vLightStart = lightStart;
vLightEnd = lightEnd;
vWireSpan = vec2(position.y + 0.5, length(instanceMatrix[1].xyz));`);
    shader.fragmentShader = `varying vec3 vLightStart;
varying vec3 vLightEnd;
varying vec2 vWireSpan;
${shader.fragmentShader}`.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
// LED light picked up near each end of the wire fades along its length.
vec2 wireDistance = vec2(vWireSpan.x, 1.0 - vWireSpan.x) * vWireSpan.y / ${lightFalloff.toFixed(2)};
totalEmissiveRadiance += vLightStart / (1.0 + wireDistance.x * wireDistance.x)
  + vLightEnd / (1.0 + wireDistance.y * wireDistance.y);`);
  };
  const conductors = new InstancedMesh(rod, material, segmentCount);
  const solder = new InstancedMesh(bead, solderMaterial, initialLayout.joints.length);
  const bounds = new Box3();
  const conductorBounds = conductors.boundingBox = new Box3();
  const solderBounds = solder.boundingBox = new Box3();
  const conductorSphere = conductors.boundingSphere = new Sphere();
  const solderSphere = solder.boundingSphere = new Sphere();
  const group = new Group();
  group.name = 'LED matrix wiring';
  group.add(conductors, solder);

  const matrix = new Matrix4();
  const rotation = new Quaternion();
  const vertical = new Vector3(0, 1, 0);
  const startPoint = new Vector3();
  const endPoint = new Vector3();
  const direction = new Vector3();
  const center = new Vector3();
  const scale = new Vector3();
  const tone = new Color();
  let lastLight: Float32Array | null = null;
  let lastExposure = 1;

  initialLayout.segments.forEach(({ tone: color }, index) => conductors.setColorAt(index, tone.setHex(color)));
  tone.setHex(0x81919d);
  for (let index = 0; index < initialLayout.joints.length; index++) solder.setColorAt(index, tone);

  const place = ({ segments, joints }: ReturnType<typeof getWireLayout>) => {
    segments.forEach(({ start, end, radius }, index) => {
      startPoint.fromArray(start);
      endPoint.fromArray(end);
      direction.subVectors(endPoint, startPoint);
      const length = direction.length();
      rotation.setFromUnitVectors(vertical, direction.normalize());
      center.addVectors(startPoint, endPoint).multiplyScalar(0.5);
      scale.set(radius, Math.max(length, 0.0001), radius);
      conductors.setMatrixAt(index, matrix.compose(center, rotation, scale));
    });

    rotation.identity();
    scale.set(0.033, 0.037, 0.033);
    joints.forEach((joint, index) => {
      center.fromArray(joint);
      solder.setMatrixAt(index, matrix.compose(center, rotation, scale));
    });

    conductors.instanceMatrix.needsUpdate = true;
    solder.instanceMatrix.needsUpdate = true;
    conductors.computeBoundingBox();
    solder.computeBoundingBox();
    conductorBounds.getBoundingSphere(conductorSphere);
    solderBounds.getBoundingSphere(solderSphere);
    bounds.copy(conductorBounds).union(solderBounds);
  };

  const updateLight = (light: Float32Array, exposure: number) => {
    lastLight = light;
    lastExposure = exposure;
    // Approximate reflections on wires without a light source for each LED.
    const gain = 0.1 * exposure;
    const targets = [lightStart.array as Float32Array, lightEnd.array as Float32Array];
    for (let end = 0; end < segmentCount * 2; end++) {
      let red = 0;
      let green = 0;
      let blue = 0;
      for (let tap = taps.offsets[end]; tap < taps.offsets[end + 1]; tap++) {
        const weight = taps.weights[tap] * gain;
        const led = taps.leds[tap] * 3;
        red += light[led] * weight;
        green += light[led + 1] * weight;
        blue += light[led + 2] * weight;
      }
      const target = targets[end % 2];
      const index = (end >> 1) * 3;
      target[index] = red;
      target[index + 1] = green;
      target[index + 2] = blue;
    }
    lightStart.needsUpdate = true;
    lightEnd.needsUpdate = true;
  };

  place(initialLayout);

  return {
    group,
    bounds,
    /** Lights the wires from the linear light of each LED (see writeLedLight). */
    updateLight,
    resize(nextScale: number) {
      if (Math.abs(nextScale - lensScale) < 0.0001) return;
      lensScale = nextScale;
      const layout = getWireLayout(size, spacing, lensScale);
      place(layout);
      taps = getLightTaps(layout.segments, size, spacing, lensScale);
      if (lastLight) updateLight(lastLight, lastExposure);
    },
    dispose() {
      group.removeFromParent();
      conductors.dispose();
      solder.dispose();
      rod.dispose();
      bead.dispose();
      material.dispose();
      solderMaterial.dispose();
    },
  };
}
