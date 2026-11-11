import { CUBE_SIZE, PALETTE_NAMES, PATTERN_NAMES } from '../constants';
import { AVR_PATTERN_NAMES } from '../simulation/fastled';

const storageKey = 'led-cube:settings:v1';

// Migrate the IDs saved by older versions of the viewer.
const legacyPatterns: Record<string, string> = {
  'Filotaxia Esférica': 'spherical-phyllotaxis',
  'Ondas Concêntricas': 'concentric-waves',
  'Dupla Hélice Áurea': 'golden-double-helix',
  Chuva: 'rain',
  'Pulso Central': 'center-pulse',
  'Cubo Crescente': 'growing-cube',
  'Planos Empilhados': 'stacked-planes',
  'Árvore 3D': '3d-tree',
  'Plasma 3D': '3d-plasma',
  'Fogos de Artifício': 'fireworks',
  'Preenchimento de Eixo': 'axis-fill',
  'Caminho de Lissajous': 'lissajous-path',
};
const legacyPalettes: Record<string, string> = {
  'Arco-íris Dinâmico': 'dynamic-rainbow',
  Girassol: 'sunflower',
  Nautilus: 'nautilus',
  Aurora: 'aurora',
  'Crescimento Vegetal': 'plant-growth',
  Galáxia: 'galaxy',
  'Nautilus Dourado': 'golden-nautilus',
  'Girassol Psicodélico': 'psychedelic-sunflower',
  'Fractal Romanesco': 'romanesco-fractal',
  'Phi Digital': 'digital-phi',
};

export const panelIds = ['simulation', 'appearance', 'fastled', 'wokwi'] as const;
export type PanelId = typeof panelIds[number];

export const viewerRanges = {
  rotationSpeed: { min: 0, max: 10, step: 0.1 },
  brightness: { min: 0, max: 2, step: 0.05 },
  ledSize: { min: 0.4, max: 1.8, step: 0.1 },
  cubeSize: { min: 3, max: 10, step: 1 },
};

export interface ViewerSettings {
  theme: 'dark' | 'light';
  headerOpen: boolean | null;
  desktopPanels: PanelId[];
  compactPanel: PanelId | null;
  autoRotate: boolean;
  rotationSpeed: number;
  brightness: number;
  ledSize: number;
  cubeSize: number;
  showGrid: boolean;
  showWiring: boolean;
  localPattern: string;
  colorPalette: string;
  simulationSource: 'avr' | 'preview';
  avrPattern: number;
}

export type ChangeSetting = <Key extends keyof ViewerSettings>(key: Key, value: ViewerSettings[Key]) => void;

function isPanelId(value: unknown): value is PanelId {
  return panelIds.some(id => id === value);
}

function readRange(value: unknown, key: keyof typeof viewerRanges, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;

  const { min, max, step } = viewerRanges[key];
  const bounded = Math.min(max, Math.max(min, value));
  return Number((min + Math.round((bounded - min) / step) * step).toFixed(2));
}

function readChoice(value: unknown, options: string[], fallback: string, legacyIds: Record<string, string>) {
  if (typeof value !== 'string') return fallback;
  const id = Object.hasOwn(legacyIds, value) ? legacyIds[value] : value;
  return options.includes(id) ? id : fallback;
}

export function readViewerSettings(): ViewerSettings {
  const defaults: ViewerSettings = {
    theme: 'dark',
    headerOpen: null,
    desktopPanels: ['simulation'],
    compactPanel: null,
    autoRotate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    rotationSpeed: 1,
    brightness: 1,
    ledSize: 1,
    cubeSize: CUBE_SIZE,
    showGrid: true,
    showWiring: true,
    localPattern: PATTERN_NAMES[0],
    colorPalette: 'aurora',
    simulationSource: 'avr',
    avrPattern: 0,
  };

  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return defaults;

    const value = saved as Record<string, unknown>;
    return {
      theme: value.theme === 'light' ? 'light' : defaults.theme,
      headerOpen: typeof value.headerOpen === 'boolean' ? value.headerOpen : defaults.headerOpen,
      desktopPanels: Array.isArray(value.desktopPanels) ? [...new Set(value.desktopPanels.filter(isPanelId))] : defaults.desktopPanels,
      compactPanel: isPanelId(value.compactPanel) ? value.compactPanel : defaults.compactPanel,
      autoRotate: typeof value.autoRotate === 'boolean' ? value.autoRotate : defaults.autoRotate,
      rotationSpeed: readRange(value.rotationSpeed, 'rotationSpeed', defaults.rotationSpeed),
      brightness: readRange(value.brightness, 'brightness', defaults.brightness),
      ledSize: readRange(value.ledSize, 'ledSize', defaults.ledSize),
      cubeSize: readRange(value.cubeSize, 'cubeSize', defaults.cubeSize),
      showGrid: typeof value.showGrid === 'boolean' ? value.showGrid : defaults.showGrid,
      showWiring: typeof value.showWiring === 'boolean' ? value.showWiring : defaults.showWiring,
      localPattern: readChoice(value.localPattern, PATTERN_NAMES, defaults.localPattern, legacyPatterns),
      colorPalette: readChoice(value.colorPalette, PALETTE_NAMES, defaults.colorPalette, legacyPalettes),
      simulationSource: value.simulationSource === 'preview' ? 'preview' : 'avr',
      avrPattern: typeof value.avrPattern === 'number' && Number.isInteger(value.avrPattern) &&
        value.avrPattern >= 0 && value.avrPattern <= AVR_PATTERN_NAMES.length ? value.avrPattern : defaults.avrPattern,
    };
  } catch {
    return defaults;
  }
}

export function saveViewerSettings(settings: ViewerSettings) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  } catch {
    // Keep the viewer usable when the browser blocks storage.
  }
}
