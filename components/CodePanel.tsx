import { useState, memo } from 'react';
import Icon from './Icon';

interface CodePanelProps {
  heading: string;
  source: string;
}

const CodePanel = memo(({ heading, source }: CodePanelProps) => {
  const [copyResult, setCopyResult] = useState<{ code: string; success: boolean }>();
  const code = source.trim();
  const currentCopyResult = copyResult?.code === code ? copyResult.success : undefined;
  const isCopied = currentCopyResult === true;
  const copyLabel = isCopied ? 'Code copied' : 'Copy code';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyResult({ code, success: true });
    } catch {
      setCopyResult({ code, success: false });
    }
  };

  return (
    <>
      <div className="code-heading">
        <span>{heading}</span>
        <button type="button" className="icon-button compact-icon" onClick={handleCopy}
          aria-label={copyLabel} title={copyLabel} data-active={isCopied}>
          <Icon name={isCopied ? 'check' : 'copy'} />
        </button>
      </div>
      <pre className="code-block" tabIndex={0} aria-label="FastLED source code"><code>{code}</code></pre>
      <p role="status" className="copy-feedback">
        {currentCopyResult === false && 'Select the code to copy it manually.'}
        {isCopied && <span className="sr-only">Code copied.</span>}
      </p>
    </>
  );
});

export default CodePanel;
