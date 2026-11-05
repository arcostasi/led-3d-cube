export const CUBE_SIZE = 8;

// Keep existing IDs so saved settings and sketch lookups continue to work.
export const PATTERN_LABELS: Record<string, string> = {
    "Filotaxia Esférica": "Spherical Phyllotaxis",
    "Ondas Concêntricas": "Concentric Waves",
    "Dupla Hélice Áurea": "Golden Double Helix",
    "Chuva": "Rain",
    "Pulso Central": "Center Pulse",
    "Cubo Crescente": "Growing Cube",
    "Planos Empilhados": "Stacked Planes",
    "Árvore 3D": "3D Tree",
    "Plasma 3D": "3D Plasma",
    "Fogos de Artifício": "Fireworks",
    "Preenchimento de Eixo": "Axis Fill",
    "Caminho de Lissajous": "Lissajous Path",
};
export const PATTERN_NAMES = Object.keys(PATTERN_LABELS);

export const PALETTE_LABELS: Record<string, string> = {
    "Arco-íris Dinâmico": "Dynamic Rainbow",
    "Girassol": "Sunflower",
    "Nautilus": "Nautilus",
    "Aurora": "Aurora",
    "Crescimento Vegetal": "Plant Growth",
    "Galáxia": "Galaxy",
    "Nautilus Dourado": "Golden Nautilus",
    "Girassol Psicodélico": "Psychedelic Sunflower",
    "Fractal Romanesco": "Romanesco Fractal",
    "Phi Digital": "Digital Phi",
};
export const PALETTE_NAMES = Object.keys(PALETTE_LABELS);
