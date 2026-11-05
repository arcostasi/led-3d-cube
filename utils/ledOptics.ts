import { LatheGeometry, Vector2 } from 'three';

/** Height of the die inside the capsule, in lens units. */
export const EMITTER_HEIGHT = -0.19;

// Radial LED lens with a flange, cylindrical body, and hemispherical dome.
export function createLedLensGeometry() {
  const radius = 0.80;
  const domeBase = 0.13;
  const profile = [
    new Vector2(0, -0.85),
    new Vector2(0.88, -0.85),
    new Vector2(0.95, -0.79),
    new Vector2(0.95, -0.69),
    new Vector2(radius, -0.63),
  ];

  for (let step = 0; step <= 8; step++) {
    const angle = (step / 8) * Math.PI / 2;
    profile.push(new Vector2(step === 8 ? 0 : radius * Math.cos(angle), domeBase + radius * Math.sin(angle)));
  }

  return new LatheGeometry(profile, 18);
}

const emitterCenter = `vec3(0.0, ${EMITTER_HEIGHT.toFixed(2)}, 0.0)`;

const peakChannel = `
  float peakChannel(vec3 color) {
    return max(color.r, max(color.g, color.b));
  }
`;

// Vertex stage: the light an LED sends toward the camera.
const ledEmissionShader = `
  ${peakChannel}
  uniform float exposure;

  // A clear 5 mm dome focuses the die along its axis, so the LED is brightest seen from above.
  float ledDirectivity(vec3 axis, vec3 toEye) {
    return mix(0.45, 1.0, smoothstep(-0.3, 1.0, dot(axis, toEye)));
  }
`;

// Fragment stage: how that light reaches the display.
const displayLightShader = `
  ${peakChannel}

  // Dim FastLED levels stay nearly linear, the peak rolls off on a shoulder, and the excess
  // washes the weaker channels toward white, the way a bright die saturates a camera or the eye.
  vec3 displayLight(vec3 light) {
    float peak = peakChannel(light);
    if (peak <= 0.0) return vec3(0.0);

    float level = 1.0 - exp(-peak);
    float washout = 1.0 - exp(-0.22 * max(peak - 1.0, 0.0));
    return linearToOutputTexel(vec4(mix(light / peak, vec3(1.0), washout) * level, 1.0)).rgb;
  }
`;

export const lensVertexShader = `
  ${ledEmissionShader}
  attribute vec3 ledLight;
  uniform float lensRadius;
  uniform float ledSize;
  varying vec3 vLight;
  varying vec3 vLensPoint;
  varying vec3 vLensNormal;
  varying vec3 vEye;
  varying float vOrientation;

  void main() {
    float size = lensRadius * ledSize;
    vec4 viewPosition = modelViewMatrix * instanceMatrix * vec4(position * size, 1.0);
    vEye = transpose(mat3(instanceMatrix)) * (cameraPosition - instanceMatrix[3].xyz) / size;
    vOrientation = instanceMatrix[0].x;
    vLensPoint = position;
    vLensNormal = normal;
    vLight = ledLight * exposure * ledDirectivity(vec3(0.0, 1.0, 0.0), normalize(vEye));
    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const lensFragmentShader = `
  ${displayLightShader}
  varying vec3 vLight;
  varying vec3 vLensPoint;
  varying vec3 vLensNormal;
  varying vec3 vEye;
  varying float vOrientation;

  float rayDistance(vec3 offset, vec3 direction) {
    return length(offset + direction * max(0.0, -dot(offset, direction)));
  }

  float boxCoverage(vec3 origin, vec3 inverseRay, vec3 center, vec3 halfSize) {
    vec3 a = (center - halfSize - origin) * inverseRay;
    vec3 b = (center + halfSize - origin) * inverseRay;
    vec3 entry = min(a, b);
    vec3 exit = max(a, b);
    float entryTime = max(0.0, max(entry.x, max(entry.y, entry.z)));
    float exitTime = min(exit.x, min(exit.y, exit.z));
    float thickness = exitTime - entryTime;
    float feather = clamp(fwidth(thickness), 0.055, 0.18);
    return smoothstep(-0.25 * feather, feather, thickness);
  }

  void main() {
    const float ior = 1.49;
    const float reflectance = (1.0 - ior) / (1.0 + ior);
    const float f0 = reflectance * reflectance;
    vec3 normal = normalize(vLensNormal);
    vec3 incident = normalize(vLensPoint - vEye);
    vec3 ray = refract(incident, normal, 1.0 / ior);
    float facing = clamp(dot(-incident, normal), 0.0, 1.0);
    float fresnel = f0 + (1.0 - f0) * pow(1.0 - facing, 5.0);

    // The reflection is neutral. The color comes from the die seen through the lens.
    vec3 reflected = reflect(incident, normal);
    reflected.xz *= vOrientation;
    float key = pow(max(dot(reflected, normalize(vec3(-0.61, 0.43, 0.67))), 0.0), 24.0);
    float fill = pow(max(dot(reflected, normalize(vec3(0.77, -0.14, 0.62))), 0.0), 12.0);
    float surfaceAlpha = clamp(0.008 + fresnel * 0.25 + key * 0.22 + fill * 0.08, 0.0, 0.50);
    vec3 surface = vec3(0.69, 0.75, 0.82) * surfaceAlpha;

    vec3 inverseRay = mix(vec3(-1.0), vec3(1.0), step(vec3(0.0), ray)) / max(abs(ray), vec3(0.0001));
    vec3 lead = vec3(0.045, 0.19, 0.055);
    float contacts = max(
      max(boxCoverage(vLensPoint, inverseRay, vec3(-0.56, -0.64, 0.0), lead),
          boxCoverage(vLensPoint, inverseRay, vec3(0.56, -0.64, 0.0), lead)),
      max(boxCoverage(vLensPoint, inverseRay, vec3(-0.185, -0.64, 0.0), lead),
          boxCoverage(vLensPoint, inverseRay, vec3(0.185, -0.64, 0.0), lead))
    );

    // Trace the die mount and the rounded reflector below it through the lens.
    float die = boxCoverage(vLensPoint, inverseRay, ${emitterCenter}, vec3(0.24, 0.075, 0.20));
    vec3 cupScale = vec3(1.0, 2.45, 1.0);
    float cupDistance = rayDistance((vLensPoint - vec3(0.0, -0.42, 0.0)) * cupScale, normalize(ray * cupScale));
    float cupEdge = clamp(fwidth(cupDistance), 0.045, 0.18);
    float cup = 1.0 - smoothstep(0.34 - 0.4 * cupEdge, 0.34 + cupEdge, cupDistance);
    float cupFacing = 0.55 + 0.45 * max(-ray.y, 0.0);
    vec3 reflector = vec3(0.21, 0.24, 0.27) * (0.84 + 0.16 * cupFacing);
    vec3 packageColor = vec3(0.045, 0.038, 0.031);
    vec3 contactsColor = vec3(0.24, 0.29, 0.32) * (0.72 * contacts);
    vec3 interior = mix(mix(contactsColor, reflector, cup), packageColor, die);
    float insideAlpha = mix(mix(0.72 * contacts, 1.0, cup), 1.0, die);

    // Light seen through this point, relative to the die at full duty. The die itself is far
    // brighter than the display, so a fully driven LED shows a washed-out core.
    vec3 emitterScale = vec3(1.0, 1.24, 1.0);
    float distance = rayDistance((vLensPoint - ${emitterCenter}) * emitterScale, normalize(ray * emitterScale));
    float source = exp2(-10.5 * distance * distance) * (1.0 - smoothstep(0.36, 0.61, distance));
    float spill = exp2(-5.8 * distance * distance);
    // The epoxy scatters part of the light, so the dome tip and the flange ring glow too.
    float tip = smoothstep(0.25, 0.93, vLensPoint.y);
    float flange = smoothstep(-0.88, -0.8, vLensPoint.y) * (1.0 - smoothstep(-0.72, -0.6, vLensPoint.y))
      * smoothstep(0.7, 0.92, length(vLensPoint.xz));
    float scatter = 0.05 + 0.2 * tip + 0.32 * flange;
    vec3 emitted = displayLight(vLight * (4.0 * source + 0.25 * spill + 0.4 * cup * cupFacing + scatter));

    vec3 color = surface + (interior * (1.0 - peakChannel(emitted)) + emitted) * (1.0 - surfaceAlpha);
    color /= max(1.0, peakChannel(color));
    float coverage = surfaceAlpha + (1.0 - surfaceAlpha) * insideAlpha;
    gl_FragColor = vec4(color, max(coverage, peakChannel(color)));
  }
`;

export const haloVertexShader = `
  ${ledEmissionShader}
  attribute vec3 ledLight;
  uniform float lensRadius;
  uniform float ledSize;
  varying vec3 vLight;
  varying vec2 vHaloPosition;
  varying float vExtent;

  void main() {
    float size = lensRadius * ledSize;
    mat4 ledMatrix = modelMatrix * instanceMatrix;
    vec4 worldChip = ledMatrix * vec4(${emitterCenter} * size, 1.0);
    vec3 axis = normalize(mat3(ledMatrix) * vec3(0.0, 1.0, 0.0));
    vLight = ledLight * exposure * ledDirectivity(axis, normalize(cameraPosition - worldChip.xyz));

    // Glare from a brighter LED stays visible further out. A dark LED collapses its quad.
    float peak = peakChannel(vLight);
    vExtent = peak > 0.0 ? 2.0 + 2.4 * sqrt(peak) : 0.0;
    vHaloPosition = position.xy * vExtent;
    vec4 chip = viewMatrix * worldChip;
    chip.xy += vHaloPosition * size;
    gl_Position = projectionMatrix * chip;
  }
`;

export const haloFragmentShader = `
  ${displayLightShader}
  varying vec3 vLight;
  varying vec2 vHaloPosition;
  varying float vExtent;

  void main() {
    float radius = length(vHaloPosition);
    if (radius >= vExtent) discard;

    // Point spread of a bright source, in LED radii: bloom around the die and a long, faint tail.
    float radiusSquared = radius * radius;
    float spread = 0.2 * exp2(-radiusSquared / 0.3) + 0.08 * exp2(-radiusSquared / 2.4) + 0.025 / (1.0 + radiusSquared);
    spread *= 1.0 - smoothstep(0.55 * vExtent, vExtent, radius);
    vec3 glow = displayLight(vLight * spread);
    gl_FragColor = vec4(glow, peakChannel(glow));
  }
`;
