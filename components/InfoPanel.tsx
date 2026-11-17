import { memo, useState } from 'react';
import { makeWokwiDiagram, WOKWI_PROJECT, WOKWI_REFERENCE_VIEW } from '../simulation/fastled';
import Icon from './Icon';

const InfoPanel = memo(({ size, connected }: { size: number; connected: boolean }) => {
  const [copied, setCopied] = useState<string>();
  const view = new URL(window.location.href);
  const serpentine = view.searchParams.get('order') === 'serpentine';
  view.hash = '';
  view.search = '';
  view.searchParams.set('size', String(size));
  if (serpentine) view.searchParams.set('order', 'serpentine');
  const diagram = makeWokwiDiagram(view.href, size ** 3);
  const isCopied = copied === view.href;

  async function copyView() {
    try {
      await navigator.clipboard.writeText(view.href);
      setCopied(view.href);
    } catch {
      setCopied('');
    }
  }

  return (
    <div className="integration-copy">
      <p>{connected ? 'Receiving NeoPixel frames from the host simulator.' : `Arduino Mega · D3 → DIN · ${size ** 3} NeoPixels`}</p>
      <div className="integration-links">
        <a href={WOKWI_PROJECT} target="_blank" rel="noreferrer">Wokwi project</a>
        <a href={WOKWI_REFERENCE_VIEW} target="_blank" rel="noreferrer">Original viewer</a>
      </div>
      <div className="code-heading">
        <span>customView</span>
        <div className="integration-actions">
          <button type="button" className="icon-button compact-icon" data-active={isCopied}
            aria-label={isCopied ? 'URL copied' : 'Copy viewer URL'} title="Copy viewer URL"
            onClick={copyView}><Icon name={isCopied ? 'check' : 'copy'} /></button>
          <a className="icon-button compact-icon" download="diagram.json"
            href={`data:application/json;charset=utf-8,${encodeURIComponent(diagram)}`}
            aria-label="Download diagram.json" title="Download diagram.json"><Icon name="download" /></a>
        </div>
      </div>
      <pre className="code-block" tabIndex={0} aria-label="customView URL"><code>{view.href}</code></pre>
      {view.protocol !== 'https:' && <p>Use a public HTTPS URL for Wokwi. The Electron playground accepts local HTTP URLs.</p>}
      {copied === '' && <p role="status">Select the URL to copy it manually.</p>}
    </div>
  );
});

export default InfoPanel;
