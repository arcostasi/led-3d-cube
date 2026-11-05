import type { ReactNode } from 'react';

const paths = {
  cube: <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm-8 4.5 8 4.5 8-4.5M12 12v9" />,
  top: <><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M3 9.5h18M6.5 6.8h.01m3.2 0h.01" /></>,
  simulation: <><rect x="6" y="6" width="12" height="12" rx="2.5" /><path d="M9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3" /><rect x="9.5" y="9.5" width="5" height="5" rx="1" /></>,
  sliders: <><path d="M4 6h5m4 0h7M4 12h10m4 0h2M4 18h3m4 0h9" /><circle cx="11" cy="6" r="2" /><circle cx="16" cy="12" r="2" /><circle cx="9" cy="18" r="2" /></>,
  code: <path d="m8 7.5-4.5 4.5L8 16.5m8-9 4.5 4.5-4.5 4.5M14 5.5l-4 13" />,
  link: <path d="M9.8 14.2a3.7 3.7 0 0 0 5.2 0l4-4a3.7 3.7 0 1 0-5.2-5.2l-2 2m.4 9.9-2 2a3.7 3.7 0 1 1-5.2-5.2l4-4a3.7 3.7 0 0 1 5.2 0" />,
  play: <path d="M7.2 5.8a1.15 1.15 0 0 1 1.75-1l10 6.2a1.17 1.17 0 0 1 0 2l-10 6.2a1.15 1.15 0 0 1-1.75-1Z" fill="currentColor" stroke="none" />,
  pause: <g fill="currentColor" stroke="none"><rect x="6.5" y="5" width="4" height="14" rx="1.1" /><rect x="13.5" y="5" width="4" height="14" rx="1.1" /></g>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  orbit: <><circle cx="12" cy="12" r="2.7" /><path d="M20 8.5a8.8 8.8 0 0 0-15.2-2L3 8.5m0-4v4h4m-3 7a8.8 8.8 0 0 0 15.2 2l1.8-2m0 4v-4h-4" /></>,
  hand: <path d="M8 13V6a1.5 1.5 0 0 1 3 0v4-5.5a1.5 1.5 0 0 1 3 0V10 6a1.5 1.5 0 0 1 3 0v5-2a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-.5a6.6 6.6 0 0 1-5.4-2.8l-3.4-4.7a1.8 1.8 0 0 1 2.6-2.4l1.7 1.6" />,
  fullscreen: <path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5" />,
  exitFullscreen: <path d="M4 9h5V4m11 5h-5V4M4 15h5v5m11-5h-5v5" />,
  zoomOut: <><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 4 4M8 10.5h5" /></>,
  zoomIn: <><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 4 4M8 10.5h5m-2.5-2.5v5" /></>,
  reset: <path d="M3 12a9 9 0 1 1 2.6 6.4M3 6v6h6" />,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
  upload: <><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l4 4v4m-4-8v4h4m-4 14v-7m-3.5 3.5 3.5-3.5 3.5 3.5" /></>,
  download: <path d="M12 4v12m-5-5 5 5 5-5M4 17v3h16v-3" />,
  check: <path d="m5 12 4 4L19 6" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5" /></>,
  moon: <path d="M20.8 14.2A8.8 8.8 0 0 1 9.8 3.2 8.9 8.9 0 1 0 20.8 14.2Z" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;

export default function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}
