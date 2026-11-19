import { useState } from 'react';
import './Clipboard.css';

interface ClipboardProps {
  /** Text to copy, or a function that produces it at click time. */
  copy: string | null | (() => string | null);
  label?: string;
  icon?: 'copy' | 'link';
}

const COPY_PATH =
  'M9 3H15M9 3C8.45 3 8 3.45 8 4V5H16V4C16 3.45 15.55 3 15 3M9 3H15M7 5H17C18.1 5 19 5.9 19 7V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V7C5 5.9 5.9 5 7 5Z';
const LINK_PATH =
  'M10 14a4.5 4.5 0 0 0 6.36 0l3.18-3.18a4.5 4.5 0 0 0-6.36-6.36L11.6 6.04M14 10a4.5 4.5 0 0 0-6.36 0l-3.18 3.18a4.5 4.5 0 0 0 6.36 6.36l1.58-1.58';

function Clipboard({ copy, label = 'Copy to clipboard', icon = 'copy' }: ClipboardProps) {
  const [isCopied, setIsCopied] = useState(false);
  const size = 22;
  const text = typeof copy === 'function' ? null : copy;
  const disabled = typeof copy !== 'function' && !text;

  const handleCopy = async () => {
    const value = typeof copy === 'function' ? copy() : copy;
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      type="button"
      className={`Clipboard-btn ${isCopied ? 'copied' : ''}`}
      onClick={handleCopy}
      aria-label={label}
      title={isCopied ? 'Copied!' : label}
      disabled={disabled}
    >
      {isCopied && (
        <div className="glitter-container" aria-hidden="true">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <span key={n} className={`particle particle-${n}`}></span>
          ))}
        </div>
      )}

      <div className="icon-container" style={{ width: size, height: size }} aria-hidden="true">
        <svg className="icon-copy" width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path
            d={icon === 'link' ? LINK_PATH : COPY_PATH}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <svg className="icon-check" width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path
            d="M20 6L9 17L4 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className="visually-hidden" aria-live="polite">
        {isCopied ? 'Copied' : ''}
      </span>
    </button>
  );
}

export default Clipboard;
