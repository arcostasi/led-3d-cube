import { memo, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CUBE_SIZE } from '../constants';
import { createCubeWiring, ledFacesLeft } from '../utils/cubeWiring';
import { indexToXyz } from '../utils/helpers';
import { createLedLensGeometry, haloFragmentShader, haloVertexShader, lensFragmentShader, lensVertexShader } from '../utils/ledOptics';
import { writeLedLight } from '../utils/ws2812';
import type { Led } from '../types';

interface LedCubeProps {
  cubeSize: number;
  leds: Led[];
  autoRotate: boolean;
  rotationSpeed: number;
  brightness: number;
  ledSize: number;
  showGrid: boolean;
  showWiring: boolean;
  pan: boolean;
  onFpsUpdate: (fps: number) => void;
}

function createCubeModel(cubeSize: number) {
  const spacing = 2;
  const offset = (cubeSize - 1) * spacing / 2;
  const group = new THREE.Group();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const edges = new THREE.EdgesGeometry(box);
  box.dispose();
  const edgePositions = edges.getAttribute('position');
  const edgeDistances = new THREE.BufferAttribute(new Float32Array(edgePositions.count), 1)
    .setUsage(THREE.DynamicDrawUsage);
  edges.setAttribute('lineDistance', edgeDistances);
  const edgeMaterial = new THREE.LineDashedMaterial({
    color: 0x73777e, transparent: true, opacity: 0.27, depthWrite: false, dashSize: 0.27, gapSize: 0.19,
  });
  const wireframe = new THREE.LineSegments(edges, edgeMaterial);

  const grid = new THREE.GridHelper(cubeSize * 4, cubeSize * 2, 0x4b4c50, 0x303036);
  grid.material.transparent = true;
  grid.material.opacity = 0.24;
  grid.material.depthWrite = false;

  const ledCount = cubeSize ** 3;
  const lensGeometry = createLedLensGeometry();
  const capsuleBounds = lensGeometry.boundingBox = new THREE.Box3();
  lensGeometry.computeBoundingBox();
  const haloGeometry = new THREE.PlaneGeometry(2, 2);
  // Linear light for each WS2812B, as sent by FastLED (see writeLedLight).
  const light = new THREE.InstancedBufferAttribute(new Float32Array(ledCount * 3), 3).setUsage(THREE.DynamicDrawUsage);
  lensGeometry.setAttribute('ledLight', light);
  haloGeometry.setAttribute('ledLight', light);
  const uniforms = {
    lensRadius: { value: 0.24 },
    ledSize: { value: 1 },
    exposure: { value: 1 },
  };
  const lensMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: lensVertexShader,
    fragmentShader: lensFragmentShader,
    premultipliedAlpha: true,
    transparent: true,
    depthWrite: false,
  });
  const haloMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: haloVertexShader,
    fragmentShader: haloFragmentShader,
    blending: THREE.AdditiveBlending,
    premultipliedAlpha: true,
    transparent: true,
    // Glare appears over wires and lenses, as it would in an eye or a camera.
    depthTest: false,
    depthWrite: false,
  });
  const lenses = new THREE.InstancedMesh(lensGeometry, lensMaterial, ledCount);
  const halos = new THREE.InstancedMesh(haloGeometry, haloMaterial, ledCount);
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < ledCount; index++) {
    const { x, y, z } = indexToXyz(index, cubeSize);
    matrix.makeRotationY(ledFacesLeft(y) ? Math.PI : 0);
    matrix.setPosition(x * spacing - offset, y * spacing - offset, z * spacing - offset);
    lenses.setMatrixAt(index, matrix);
    halos.setMatrixAt(index, matrix);
  }
  lenses.instanceMatrix.needsUpdate = true;
  halos.instanceMatrix.needsUpdate = true;
  lenses.computeBoundingSphere();
  halos.frustumCulled = false;
  lenses.renderOrder = 1;
  halos.renderOrder = 2;

  const wiring = createCubeWiring(cubeSize, spacing, uniforms.lensRadius.value);
  group.add(grid, wireframe, lenses, halos, wiring.group);
  const assemblyBounds = new THREE.Box3();
  let previousScale = 0;

  const resize = (lensRadius: number, ledSize: number) => {
    uniforms.lensRadius.value = lensRadius;
    uniforms.ledSize.value = ledSize;
    const scale = lensRadius * ledSize;
    if (Math.abs(scale - previousScale) < 0.0001) return;
    previousScale = scale;
    wiring.resize(scale);

    // The outline encloses the lenses, bends, and lower leads.
    assemblyBounds.min.copy(capsuleBounds.min).multiplyScalar(scale).addScalar(-offset);
    assemblyBounds.max.copy(capsuleBounds.max).multiplyScalar(scale).addScalar(offset);
    assemblyBounds.union(wiring.bounds).expandByScalar(spacing * 0.14);
    assemblyBounds.getCenter(wireframe.position);
    const dimensions = assemblyBounds.getSize(wireframe.scale);
    grid.position.y = assemblyBounds.min.y - 0.12;

    for (let index = 0; index < edgePositions.count; index += 2) {
      const deltaX = (edgePositions.getX(index + 1) - edgePositions.getX(index)) * dimensions.x;
      const deltaY = (edgePositions.getY(index + 1) - edgePositions.getY(index)) * dimensions.y;
      const deltaZ = (edgePositions.getZ(index + 1) - edgePositions.getZ(index)) * dimensions.z;
      edgeDistances.setX(index + 1, Math.hypot(deltaX, deltaY, deltaZ));
    }
    edgeDistances.needsUpdate = true;
  };
  resize(uniforms.lensRadius.value, uniforms.ledSize.value);

  return {
    group, wireframe, grid, light, uniforms, wiring, resize,
    dispose() {
      group.removeFromParent();
      wiring.dispose();
      lenses.dispose();
      halos.dispose();
      lensGeometry.dispose();
      haloGeometry.dispose();
      lensMaterial.dispose();
      haloMaterial.dispose();
      edges.dispose();
      edgeMaterial.dispose();
      grid.dispose();
    },
  };
}

interface SceneState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  resize: () => void;
  restingDistance: number;
  cube: ReturnType<typeof createCubeModel> | null;
}

const LedCube = memo(({
  cubeSize, leds, autoRotate, rotationSpeed, brightness, ledSize, showGrid, showWiring, pan, onFpsUpdate,
}: LedCubeProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneState | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!context) {
      setWebglUnavailable(true);
      return;
    }
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', '3D RGB LED matrix');
    canvas.tabIndex = 0;

    const scene = new THREE.Scene();
    const keyLight = new THREE.DirectionalLight(0xe6e7eb, 0.82);
    keyLight.position.set(-8, 16, 10);
    const rimLight = new THREE.DirectionalLight(0xaeb8c7, 0.42);
    rimLight.position.set(10, 6, -11);
    scene.add(new THREE.HemisphereLight(0xc6cad0, 0x292a2e, 0.48), keyLight, rimLight);
    const camera = new THREE.PerspectiveCamera(41, 1, 0.1, 150);
    const renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    // A neutral studio gives the tinned wires metallic reflections.
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(room, 0.04);
    room.dispose();
    pmrem.dispose();
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.35;
    mount.appendChild(canvas);

    const controls = new OrbitControls(camera, canvas);
    controls.cursorStyle = 'grab';
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.listenToKeyEvents(canvas);

    const resize = () => {
      const { clientWidth, clientHeight } = mount;
      if (!clientWidth || !clientHeight) return;

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.zoom = Math.min(1, camera.aspect * 1.04);
      camera.updateProjectionMatrix();
      const current = sceneRef.current;
      if (current?.cube) {
        const focalLength = camera.projectionMatrix.elements[5] * clientHeight / 2;
        const lensRadius = THREE.MathUtils.clamp(2.4 * current.restingDistance / focalLength, 0.24, 0.42);
        current.cube.resize(lensRadius, current.cube.uniforms.ledSize.value);
      }
    };
    sceneRef.current = { scene, camera, controls, resize, restingDistance: 0, cube: null };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    let lastFrame = performance.now();
    let lastSample = lastFrame;
    let frameCount = 0;
    renderer.setAnimationLoop((time) => {
      const elapsed = time - lastSample;
      if (elapsed >= 1000) {
        onFpsUpdate(Math.round(frameCount * 1000 / elapsed));
        frameCount = 0;
        lastSample = time;
      }
      frameCount++;
      controls.update(Math.min((time - lastFrame) / 1000, 0.1));
      lastFrame = time;
      renderer.render(scene, camera);
    });

    const zoom = (factor: number) => {
      const offset = new THREE.Vector3().subVectors(camera.position, controls.target).divideScalar(factor);
      camera.position.copy(controls.target).add(offset);
      controls.update();
    };

    const cameraActions = {
      'reset-camera': () => {
        const responsiveZoom = camera.zoom;
        controls.reset();
        camera.zoom = responsiveZoom;
        camera.updateProjectionMatrix();
      },
      'view-control-zoom-in': () => zoom(1.2),
      'view-control-zoom-out': () => zoom(0.8),
    };
    for (const [event, handler] of Object.entries(cameraActions)) {
      window.addEventListener(event, handler);
    }

    return () => {
      for (const [event, handler] of Object.entries(cameraActions)) {
        window.removeEventListener(event, handler);
      }
      observer.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      sceneRef.current = null;
    };
  }, [onFpsUpdate]);

  useEffect(() => {
    const current = sceneRef.current;
    if (!current) return;

    const model = createCubeModel(cubeSize);
    current.cube = model;
    current.scene.add(model.group);

    // Keep the apparent cube size when the LED count changes.
    const scale = (cubeSize - 1) / (CUBE_SIZE - 1);
    const { camera, controls } = current;
    controls.minDistance = 18 * scale;
    controls.maxDistance = 70 * scale;
    controls.target.set(0, -1.45 * scale, 0);
    // View the Wokwi-oriented layers from the positive Z side.
    camera.position.set(0, 4.36 * scale, 36 * scale);
    const rotating = controls.autoRotate;
    controls.autoRotate = false;
    controls.update();
    controls.saveState();
    controls.autoRotate = rotating;
    current.restingDistance = controls.getDistance();
    current.resize();

    return () => {
      model.dispose();
      current.cube = null;
    };
  }, [cubeSize]);

  useEffect(() => {
    const cube = sceneRef.current?.cube;
    if (!cube || cube.light.count !== leds.length) return;

    const light = cube.light.array as Float32Array;
    writeLedLight(leds, light);
    cube.light.needsUpdate = true;
    cube.wiring.updateLight(light, brightness);
  }, [leds, brightness, cubeSize]);

  useEffect(() => {
    const current = sceneRef.current;
    const cube = current?.cube;
    if (!current || !cube) return;

    const { uniforms, wiring } = cube;
    cube.resize(uniforms.lensRadius.value, ledSize);
    uniforms.exposure.value = brightness;
    wiring.group.visible = showWiring;
    current.controls.mouseButtons.LEFT = pan ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    current.controls.touches.ONE = pan ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    current.controls.autoRotate = autoRotate && !pan;
    current.controls.autoRotateSpeed = rotationSpeed;
    cube.wireframe.visible = showGrid;
    cube.grid.visible = showGrid;
  }, [cubeSize, ledSize, brightness, autoRotate, rotationSpeed, showGrid, showWiring, pan]);

  return (
    <div ref={mountRef} className="cube-canvas">
      {webglUnavailable && (
        <p role="status" className="render-unavailable">
          WebGL 2 is unavailable. Enable hardware acceleration to view the cube.
        </p>
      )}
    </div>
  );
});

export default LedCube;
