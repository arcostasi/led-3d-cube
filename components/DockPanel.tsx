import type { ReactNode } from 'react';
import Icon from './Icon';

interface DockPanelProps {
  id: string;
  title: string;
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function DockPanel({ id, title, visible, onClose, children }: DockPanelProps) {
  return (
    <section id={id} className="dock-panel" hidden={!visible} aria-labelledby={`${id}-title`}
      onKeyDown={event => {
        if (event.key === 'Escape') onClose();
      }}>
      <div className="panel-heading">
        <h2 id={`${id}-title`}>{title}</h2>
        <button type="button" className="icon-button compact-icon" onClick={onClose}
          title={`Hide ${title}`} aria-label={`Hide ${title}`}>
          <Icon name="close" />
        </button>
      </div>
      {visible && <div className="panel-body">{children}</div>}
    </section>
  );
}
