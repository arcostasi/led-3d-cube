import { memo } from 'react';
import { PATTERN_LABELS, PALETTE_LABELS } from '../constants';
import { getColorFromPalette } from '../simulation/fibonacci';
import { AVR_PATTERN_NAMES, FASTLED_VERSION } from '../simulation/fastled';
import type { ChangeSetting, ViewerSettings } from '../utils/viewerSettings';
import Icon from './Icon';

interface SimulationPanelProps {
  settings: Pick<ViewerSettings, 'localPattern' | 'colorPalette' | 'simulationSource' | 'avrPattern'>;
  onChange: ChangeSetting;
  firmwareName?: string;
  connected: boolean;
  onRestoreFirmware: () => void;
}

const SimulationPanel = memo(({
  settings: { localPattern, colorPalette, simulationSource, avrPattern }, onChange,
  firmwareName, connected, onRestoreFirmware,
}: SimulationPanelProps) => (
    <div className="control-section">
      <label className="field-label" htmlFor="simulation-source">Simulation mode</label>
      <div className="select-field">
        <select id="simulation-source" value={simulationSource} disabled={connected}
          onChange={event => onChange('simulationSource', event.target.value === 'avr' ? 'avr' : 'preview')}>
          <option value="avr">Arduino Mega · AVR8js</option>
          <option value="preview">3D Animations</option>
        </select>
      </div>

      {simulationSource === 'avr' ? <>
        <label className="field-label" htmlFor="avr-pattern">FastLED pattern</label>
        <div className="select-field">
          <select id="avr-pattern" value={avrPattern} disabled={connected || Boolean(firmwareName)}
            onChange={event => onChange('avrPattern', Number(event.target.value))}>
            <option value={0}>Automatic cycle</option>
            {AVR_PATTERN_NAMES.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
          </select>
        </div>
        <div className="firmware-row">
          <span title={firmwareName}>{firmwareName ?? `FastLED ${FASTLED_VERSION}`}</span>
          {firmwareName && <button type="button" className="icon-button compact-icon" disabled={connected}
            aria-label="Restore default firmware" title="Restore default firmware"
            onClick={onRestoreFirmware}><Icon name="close" /></button>}
        </div>
      </> : <>
        <label className="field-label" htmlFor="pattern-select">Pattern</label>
        <div className="select-field">
          <select id="pattern-select" value={localPattern} disabled={connected} onChange={event => onChange('localPattern', event.target.value)}>
            {Object.entries(PATTERN_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>

        <label className="field-label" htmlFor="palette-select">Color palette</label>
        <div className="select-field">
          <select id="palette-select" value={colorPalette} disabled={connected} onChange={event => onChange('colorPalette', event.target.value)}>
            {Object.entries(PALETTE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>
        <div className="palette-strip" aria-hidden="true">
          {[0, 0.24, 0.48, 0.72, 0.96].map(position => {
            const { r, g, b } = getColorFromPalette(colorPalette, position);
            return <span key={position} style={{ background: `rgb(${r} ${g} ${b})` }} />;
          })}
        </div>
      </>}
    </div>
));

export default SimulationPanel;
