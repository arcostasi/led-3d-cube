import { useState, useEffect, useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import LedCube from './components/LedCube';
import Controls from './components/Controls';
import InfoPanel from './components/InfoPanel';
import SimulationPanel from './components/SimulationPanel';
import ViewControls from './components/ViewControls';
import CodePanel from './components/CodePanel';
import DockPanel from './components/DockPanel';
import Icon, { type IconName } from './components/Icon';
import { CUBE_SIZE, PATTERN_LABELS } from './constants';
import type { Led } from './types';
import { createSimulation } from './simulation/fibonacci';
import { FASTLED_CODE } from './simulation/fastled_code';
import { AVR_PATTERN_NAMES, FASTLED_VERSION, decodeNeoPixels, type PixelOrder } from './simulation/fastled';
import sketch from './firmware/led_cube/led_cube.ino?raw';
import type { AvrEvent } from './simulation/fastled.worker';
import { readMegaFirmware } from './simulation/intelHex';
import { useAvrSimulation, type LoadedFirmware } from './simulation/useAvrSimulation';
import { listenToCustomView } from './simulation/customView';
import { indexToXyz } from './utils/helpers';
import { readViewerSettings, saveViewerSettings, viewerRanges, type ChangeSetting, type PanelId } from './utils/viewerSettings';

interface DisplayedFrame {
  leds: Led[];
  pattern?: string;
}

const panelDefinitions = [
  { id: 'simulation', title: 'Local Simulation', icon: 'simulation', side: 'left' },
  { id: 'appearance', title: 'View Settings', icon: 'sliders', side: 'left' },
  { id: 'fastled', title: 'FastLED Code', icon: 'code', side: 'right' },
  { id: 'wokwi', title: 'Custom View Integration', icon: 'link', side: 'right' },
] satisfies { id: PanelId; title: string; icon: IconName; side: 'left' | 'right' }[];
const leftPanels = panelDefinitions.filter(({ side }) => side === 'left');
const rightPanels = panelDefinitions.filter(({ side }) => side === 'right');

const wideLayoutQuery = '(min-width: 980px)';
const getWideLayout = () => window.matchMedia(wideLayoutQuery).matches;
const subscribeToLayout = (onChange: () => void) => {
  const query = window.matchMedia(wideLayoutQuery);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

// The resting glow uses the bundled sketch's FastLED.setBrightness(160).
const previewBrightness = 160 / 256;

function createPreview(cubeSize: number) {
  return Array.from({ length: cubeSize ** 3 }, (_, index) => {
    const { x, y, z } = indexToXyz(index, cubeSize);
    const depth = (x + y + z) / (3 * (cubeSize - 1));
    const shimmer = ((x * 13 + y * 5 + z * 7) % 9) / 8;
    // Green is the strongest WS2812B die, so it gets less duty to keep the resting glow blue.
    return {
      r: (45 + depth * 47 + shimmer * 12) * previewBrightness,
      g: (66 + depth * 46 + shimmer * 8) * previewBrightness,
      b: (172 + depth * 42 + shimmer * 14) * previewBrightness,
    };
  });
}

const query = new URLSearchParams(window.location.search);
const querySize = Number(query.get('size'));
const initialSize = Number.isInteger(querySize) && querySize >= viewerRanges.cubeSize.min &&
  querySize <= viewerRanges.cubeSize.max ? querySize : window.parent !== window ? CUBE_SIZE : null;
const externalPixelOrder: PixelOrder = query.get('order') === 'serpentine' ? 'serpentine' : 'linear';

const App = () => {
  const wideLayout = useSyncExternalStore(subscribeToLayout, getWideLayout);
  const [settings, setSettings] = useState(readViewerSettings);
  const headerOpen = settings.headerOpen ?? true;
  const [frame, setFrame] = useState<DisplayedFrame | null>(null);
  const [urlSize, setUrlSize] = useState(initialSize);
  const { localPattern, colorPalette, desktopPanels, compactPanel, simulationSource, avrPattern } = settings;
  const cubeSize = urlSize ?? settings.cubeSize;
  const controlSettings = useMemo(() => ({ ...settings, cubeSize }), [settings, cubeSize]);
  const ledCount = cubeSize ** 3;
  const previewLeds = useMemo(() => createPreview(cubeSize), [cubeSize]);
  const blankLeds = useMemo(() => Array.from({ length: ledCount }, () => ({ r: 0, g: 0, b: 0 })), [ledCount]);
  const updateSimulation = useMemo(() => createSimulation(cubeSize), [cubeSize]);
  const currentFrame = frame?.leds.length === ledCount ? frame : null;
  const [fps, setFps] = useState(0);
  const [externalPattern, setExternalPattern] = useState('NeoPixels');
  const [connected, setConnected] = useState(false);
  const [nativePattern, setNativePattern] = useState<string>();
  const [firmware, setFirmware] = useState<LoadedFirmware | null>(null);
  const [firmwareError, setFirmwareError] = useState('');
  const [started, setStarted] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [pan, setPan] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');
  const shellRef = useRef<HTMLDivElement>(null);
  const firmwareInput = useRef<HTMLInputElement>(null);
  const simulationFrameRef = useRef(0);
  const externalConnected = useRef(false);
  const importRequest = useRef(0);
  const leds = currentFrame?.leds ?? (started ? blankLeds : previewLeds);

  useEffect(() => saveViewerSettings(settings), [settings]);

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  const toggleFullscreen = async () => {
    const shell = shellRef.current;
    if (!shell) return;
    setFullscreenError('');
    try {
      if (document.fullscreenElement === shell) await document.exitFullscreen();
      else await shell.requestFullscreen();
    } catch {
      setFullscreenError('The browser could not switch fullscreen mode.');
    }
  };

  const changeSetting: ChangeSetting = useCallback((key, value) => {
    if (key === 'cubeSize') {
      setFrame(null);
      setNativePattern(undefined);
      if (initialSize !== null && typeof value === 'number') {
        setUrlSize(value);
        return;
      }
    } else if (key === 'simulationSource') {
      setFrame(null);
      setNativePattern(undefined);
      setFirmwareError('');
    }
    setSettings(current => ({ ...current, [key]: value }));
  }, []);

  useEffect(() => {
    return listenToCustomView((incomingLeds) => {
      if (!externalConnected.current) {
        externalConnected.current = true;
        cancelAnimationFrame(simulationFrameRef.current);
        setConnected(true);
        setIsSimulating(false);
      }
      setFrame({ leds: incomingLeds });
    }, setExternalPattern, cubeSize, externalPixelOrder);
  }, [cubeSize]);

  useEffect(() => {
    if (!isSimulating || connected || simulationSource !== 'preview') return;

    const animate = (time: number) => {
      setFrame({ leds: updateSimulation(localPattern, time, colorPalette), pattern: localPattern });
      simulationFrameRef.current = requestAnimationFrame(animate);
    };
    simulationFrameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(simulationFrameRef.current);
  }, [isSimulating, connected, simulationSource, localPattern, colorPalette, updateSimulation]);

  const handleAvrEvent = useCallback((event: AvrEvent) => {
    if (externalConnected.current) return;
    if (event.type === 'frame') {
      setFrame({ leds: decodeNeoPixels(event.pixels, cubeSize, firmware ? externalPixelOrder : 'linear') });
    } else if (event.type === 'pattern') {
      setNativePattern(AVR_PATTERN_NAMES[event.index]);
    } else {
      setFirmwareError(event.message);
      setIsSimulating(false);
      setStarted(false);
    }
  }, [cubeSize, firmware]);

  useAvrSimulation({
    enabled: started && !connected && simulationSource === 'avr',
    running: isSimulating, size: cubeSize, pattern: avrPattern, firmware, onEvent: handleAvrEvent,
  });

  const handleFirmware = useCallback(async (file: File | null) => {
    const request = ++importRequest.current;
    setFirmwareError('');
    try {
      if (file && file.size > 1_600_000) throw new Error('The HEX file is too large for an Arduino Mega.');
      const hex = file ? await file.text() : '';
      if (request !== importRequest.current || externalConnected.current) return;
      if (file) readMegaFirmware(hex);

      setFirmware(file ? { name: file.name, hex } : null);
      setNativePattern(undefined);
      setFrame(null);
      if (file) {
        setSettings(current => ({ ...current, simulationSource: 'avr' }));
        setStarted(true);
        setIsSimulating(true);
      }
    } catch (error) {
      if (request === importRequest.current) {
        setFirmwareError(error instanceof Error ? error.message : 'Could not read the HEX file.');
      }
    }
  }, []);

  const restoreFirmware = useCallback(() => { void handleFirmware(null); }, [handleFirmware]);

  const activeLeds = useMemo(() => settings.brightness === 0 ? 0
    : leds.reduce((count, { r, g, b }) => count + Number(r > 0 || g > 0 || b > 0), 0), [leds, settings.brightness]);

  const startSimulation = () => {
    setStarted(true);
    setFirmwareError('');
    setIsSimulating(true);
  };
  const previewPattern = currentFrame?.pattern ?? localPattern;
  const currentPattern = connected ? externalPattern : simulationSource === 'preview' ? PATTERN_LABELS[previewPattern]
    : firmware?.name ?? nativePattern ?? (avrPattern ? AVR_PATTERN_NAMES[avrPattern - 1] : 'Automatic cycle');
  const mode = connected ? 'Custom View' : isSimulating
    ? simulationSource === 'preview' ? '3D Animations' : currentFrame ? 'AVR8js' : 'AVR8js · waiting for signal'
    : started ? 'Paused' : 'Preview';
  const playLabel = started ? 'Resume simulation' : 'Start simulation';
  const summaryLabel = headerOpen ? 'Hide cube summary' : 'Show cube summary';
  const themeLabel = settings.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  const fullscreenLabel = fullscreen ? 'Exit fullscreen' : 'Fullscreen';

  const panelIsOpen = (id: PanelId) => wideLayout ? desktopPanels.includes(id) : compactPanel === id;
  const changePanel = (id: PanelId) => {
    setSettings(current => {
      if (!wideLayout) return { ...current, compactPanel: current.compactPanel === id ? null : id };

      const open = current.desktopPanels;
      const next = open.includes(id) ? open.filter(panel => panel !== id) : [...open, id];
      return { ...current, desktopPanels: next };
    });
  };
  const closePanel = (id: PanelId) => {
    changePanel(id);
    document.getElementById(`tool-${id}`)?.focus();
  };

  const leftOpen = leftPanels.some(({ id }) => panelIsOpen(id));
  const rightOpen = rightPanels.some(({ id }) => panelIsOpen(id));
  const code = useMemo(() => {
    if (connected) return '// Open the sketch in the host simulator.';
    if (simulationSource === 'avr' && firmware) return firmware.hex;
    const source = simulationSource === 'preview' ? FASTLED_CODE[localPattern] : sketch;
    return source.replace(/^#define CUBE_SIZE \d+/m, `#define CUBE_SIZE ${cubeSize}`);
  }, [connected, simulationSource, firmware, localPattern, cubeSize]);
  const codeHeading = connected || simulationSource === 'preview' ? currentPattern
    : firmware?.name ?? `Arduino Mega · FastLED ${FASTLED_VERSION}`;
  const panelContent = {
    simulation: <SimulationPanel settings={settings} onChange={changeSetting} firmwareName={firmware?.name}
      connected={connected} onRestoreFirmware={restoreFirmware} />,
    appearance: <Controls settings={controlSettings} onChange={changeSetting} connected={connected} />,
    fastled: <CodePanel heading={codeHeading} source={code} />,
    wokwi: <InfoPanel size={cubeSize} connected={connected} />,
  };

  const renderPanel = ({ id, title }: typeof panelDefinitions[number]) => (
    <DockPanel key={id} id={`panel-${id}`} title={title} visible={panelIsOpen(id)} onClose={() => closePanel(id)}>
      {panelContent[id]}
    </DockPanel>
  );

  return (
    <div ref={shellRef} className="app-shell" data-theme={settings.theme}>
      <header className="topbar">
        <div id="header-brand" className="app-brand" hidden={!headerOpen}>
          <span className="brand-mark" aria-hidden="true"><Icon name="cube" /></span>
          <h1>LED Cube</h1>
        </div>
        <div className="transport" role="group" aria-label="Simulation controls">
          <button type="button" className="icon-button playback-control play-control" aria-label={playLabel} data-tooltip={playLabel}
            disabled={connected || isSimulating} onClick={startSimulation}><Icon name="play" /></button>
          <button type="button" className="icon-button playback-control pause-control" aria-label="Pause simulation" data-tooltip="Pause simulation"
            disabled={connected || !isSimulating} onClick={() => setIsSimulating(false)}><Icon name="pause" /></button>
          <button type="button" className="icon-button firmware-control" disabled={connected}
            aria-label="Load firmware" data-tooltip="Load firmware (.hex)"
            onClick={() => firmwareInput.current?.click()}><Icon name="upload" /></button>
          <input ref={firmwareInput} type="file" hidden accept=".hex" disabled={connected}
            onChange={event => {
              const file = event.currentTarget.files?.[0];
              if (file) void handleFirmware(file);
              event.currentTarget.value = '';
            }} />
        </div>
        <div className="header-status">
          <dl id="header-readouts" className="matrix-readouts" hidden={!headerOpen}>
            <div><dt>RGB</dt><dd>{cubeSize} × {cubeSize} × {cubeSize}</dd></div>
            <div><dt>Active LEDs</dt><dd>{activeLeds}/{ledCount}</dd></div>
            <div className="fps-readout"><dt>FPS</dt><dd>{fps || '—'}</dd></div>
          </dl>
          <button type="button" className="icon-button fullscreen-control" disabled={!document.fullscreenEnabled}
            aria-label={fullscreenLabel} data-tooltip={fullscreenLabel}
            title={document.fullscreenEnabled ? undefined : 'Fullscreen is unavailable here'}
            onClick={toggleFullscreen}><Icon name={fullscreen ? 'exitFullscreen' : 'fullscreen'} /></button>
        </div>
      </header>
      {(firmwareError || fullscreenError) && <p className="toolbar-feedback" role="alert">{firmwareError || fullscreenError}</p>}

      <main className="workspace" aria-label="LED cube viewer">
        <div className="commandbar" role="group" aria-label="Viewer tools">
          <div className="panel-tools" role="group" aria-label="Toggle panels">
            <button type="button" className="icon-button" aria-controls="header-brand header-readouts" aria-expanded={headerOpen}
              aria-label={summaryLabel} data-tooltip={summaryLabel}
              onClick={() => changeSetting('headerOpen', !headerOpen)}>
              <Icon name="top" />
            </button>
            {panelDefinitions.map(({ id, title, icon }) => {
              const expanded = panelIsOpen(id);
              const label = `${expanded ? 'Hide' : 'Show'} ${title}`;
              return (
                <button key={id} id={`tool-${id}`} type="button" className="icon-button" aria-controls={`panel-${id}`}
                  aria-expanded={expanded} aria-label={label}
                  data-tooltip={label} onClick={() => changePanel(id)}>
                  <Icon name={icon} />
                </button>
              );
            })}
          </div>
          <button type="button" className="icon-button theme-control" aria-label={themeLabel} data-tooltip={themeLabel}
            onClick={() => changeSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')}>
            <Icon name={settings.theme === 'dark' ? 'sun' : 'moon'} />
          </button>
        </div>

        <div className="viewport-layout">
          <aside className="panel-rail rail-left" aria-label="Settings panels" hidden={!leftOpen}>
            {leftPanels.map(renderPanel)}
          </aside>

          <section className="scene-stage" aria-labelledby="scene-title">
            <div className="scene-titlebar">
              <h2 id="scene-title"><Icon name="cube" /> 3D View</h2>
              {(started || connected) && <p className="scene-pattern" title={currentPattern}>{currentPattern}</p>}
              <p className="mode-indicator" role="status"
                data-state={connected ? 'connected' : isSimulating ? 'playing' : started ? 'paused' : 'idle'}>{mode}</p>
            </div>
            <div className="scene-viewport">
              <LedCube
                cubeSize={cubeSize}
                leds={leds}
                autoRotate={settings.autoRotate}
                rotationSpeed={settings.rotationSpeed}
                brightness={settings.brightness}
                ledSize={settings.ledSize}
                showGrid={settings.showGrid}
                showWiring={settings.showWiring}
                pan={pan}
                onFpsUpdate={setFps}
              />
              <ViewControls pan={pan} onPanChange={setPan} />
            </div>
          </section>

          <aside className="panel-rail rail-right" aria-label="Reference panels" hidden={!rightOpen}
            data-code={panelIsOpen('fastled')}>
            {rightPanels.map(renderPanel)}
          </aside>
        </div>
      </main>
    </div>
  );
};

export default App;
