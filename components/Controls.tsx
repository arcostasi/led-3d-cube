import { memo, type CSSProperties } from 'react';
import { viewerRanges, type ChangeSetting, type ViewerSettings } from '../utils/viewerSettings';

interface RangeFieldProps {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const RangeField = ({ id, label, value, formattedValue, min, max, step, onChange, disabled }: RangeFieldProps) => (
  <div className="range-field">
    <div className="range-label">
      <label htmlFor={id}>{label}</label>
      <span aria-hidden="true">{formattedValue}</span>
    </div>
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      value={value}
      aria-valuetext={formattedValue}
      style={{ '--range-progress': `${(value - min) / (max - min) * 100}%` } as CSSProperties}
      onChange={event => onChange(event.target.valueAsNumber)}
    />
  </div>
);

interface ControlsProps {
  settings: Pick<ViewerSettings, 'autoRotate' | 'rotationSpeed' | 'brightness' | 'ledSize' | 'cubeSize' | 'showGrid' | 'showWiring'>;
  onChange: ChangeSetting;
  connected: boolean;
}

const Controls = memo(({
  settings: { autoRotate, rotationSpeed, brightness, ledSize, cubeSize, showGrid, showWiring },
  onChange, connected,
}: ControlsProps) => (
  <div className="control-section view-settings">
    <RangeField id="cubeSize" label="LEDs per edge" value={cubeSize} disabled={connected}
      formattedValue={`${cubeSize} × ${cubeSize} × ${cubeSize}`}
      {...viewerRanges.cubeSize} onChange={value => onChange('cubeSize', value)} />
    <label className="switch-row">
      Auto-rotate
      <input className="switch" type="checkbox" role="switch" checked={autoRotate}
        onChange={event => onChange('autoRotate', event.target.checked)} />
    </label>

    <RangeField id="rotationSpeed" label="Rotation speed" value={rotationSpeed} disabled={!autoRotate}
      formattedValue={`${rotationSpeed.toFixed(1)}×`}
      {...viewerRanges.rotationSpeed} onChange={value => onChange('rotationSpeed', value)} />
    <RangeField id="brightness" label="Brightness" value={brightness}
      formattedValue={`${Math.round(brightness * 100)}%`}
      {...viewerRanges.brightness} onChange={value => onChange('brightness', value)} />
    <RangeField id="ledSize" label="LED size" value={ledSize}
      formattedValue={`${ledSize.toFixed(1)}×`}
      {...viewerRanges.ledSize} onChange={value => onChange('ledSize', value)} />

    <label className="switch-row structure-switch">
      Show frame
      <input className="switch" type="checkbox" role="switch" checked={showGrid}
        onChange={event => onChange('showGrid', event.target.checked)} />
    </label>
    <label className="switch-row">
      Show wiring
      <input className="switch" type="checkbox" role="switch" checked={showWiring}
        onChange={event => onChange('showWiring', event.target.checked)} />
    </label>
  </div>
));

export default Controls;
