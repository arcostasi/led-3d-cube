export const CUBE_SIZE = 8;

export const PATTERN_LABELS: Record<string, string> = {
    "spherical-phyllotaxis": "Spherical Phyllotaxis",
    "concentric-waves": "Concentric Waves",
    "golden-double-helix": "Golden Double Helix",
    "rain": "Rain",
    "center-pulse": "Center Pulse",
    "growing-cube": "Growing Cube",
    "stacked-planes": "Stacked Planes",
    "3d-tree": "3D Tree",
    "3d-plasma": "3D Plasma",
    "fireworks": "Fireworks",
    "axis-fill": "Axis Fill",
    "lissajous-path": "Lissajous Path",
};
export const PATTERN_NAMES = Object.keys(PATTERN_LABELS);

export const PALETTE_LABELS: Record<string, string> = {
    "dynamic-rainbow": "Dynamic Rainbow",
    "sunflower": "Sunflower",
    "nautilus": "Nautilus",
    "aurora": "Aurora",
    "plant-growth": "Plant Growth",
    "galaxy": "Galaxy",
    "golden-nautilus": "Golden Nautilus",
    "psychedelic-sunflower": "Psychedelic Sunflower",
    "romanesco-fractal": "Romanesco Fractal",
    "digital-phi": "Digital Phi",
};
export const PALETTE_NAMES = Object.keys(PALETTE_LABELS);
