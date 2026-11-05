import Icon, { type IconName } from './Icon';

const cameraControls: { event: string; label: string; icon: IconName; separator?: boolean }[] = [
  { event: 'view-control-zoom-out', label: 'Zoom out', icon: 'zoomOut', separator: true },
  { event: 'view-control-zoom-in', label: 'Zoom in', icon: 'zoomIn' },
  { event: 'reset-camera', label: 'Reset camera', icon: 'reset', separator: true },
];

const ViewControls = ({ pan, onPanChange }: { pan: boolean; onPanChange: (enabled: boolean) => void }) => (
  <div className="camera-toolbar" role="group" aria-label="Camera controls">
    <button type="button" className="icon-button" aria-label="Orbit camera" data-tooltip="Drag to orbit the cube"
      aria-pressed={!pan} onClick={() => onPanChange(false)}><Icon name="orbit" /></button>
    <button type="button" className="icon-button" aria-label="Pan camera" data-tooltip="Drag to move the view"
      aria-pressed={pan} onClick={() => onPanChange(true)}><Icon name="hand" /></button>
    {cameraControls.map(({ event, label, icon, separator }) => (
      <button key={event} type="button" className={separator ? 'icon-button camera-divider' : 'icon-button'}
        aria-label={label} data-tooltip={label} onClick={() => window.dispatchEvent(new CustomEvent(event))}>
        <Icon name={icon} />
      </button>
    ))}
  </div>
);

export default ViewControls;
