import { useState, useId } from 'react';
import type { coordinateString } from '../types';
import { normalizeCoordinateInput } from '../helper';
import './CoordinateInput.css';

interface CoordinateInputProps {
  value: coordinateString | null;
  onCommit: (value: coordinateString | null) => void;
  placeholder?: string;
}

/**
 * Text field for a landing site coordinate. Accepts loose input ("12n 45e") and
 * commits the canonical form on Enter or blur. Remount it (via `key`) to reset
 * the draft when the selected coordinate changes elsewhere.
 */
function CoordinateInput({ value, onCommit, placeholder = 'e.g. 12N45E' }: CoordinateInputProps) {
  const [draft, setDraft] = useState<string>(value ?? '');
  const [invalid, setInvalid] = useState(false);
  const hintId = useId();

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      setInvalid(false);
      if (value !== null) onCommit(null);
      return;
    }
    const normalized = normalizeCoordinateInput(trimmed);
    if (!normalized) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setDraft(normalized);
    if (normalized !== value) onCommit(normalized);
  };

  return (
    <span className="CoordinateInput">
      <input
        type="text"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        aria-label="Coordinate"
        aria-invalid={invalid}
        aria-describedby={invalid ? hintId : undefined}
        placeholder={placeholder}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setInvalid(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(value ?? '');
            setInvalid(false);
          }
        }}
        onBlur={commit}
        className="coordinate-input"
      />
      {invalid && (
        <span id={hintId} className="coordinate-hint" role="alert">
          Use 0–70 N/S and 0–180 E/W, e.g. 12N45E
        </span>
      )}
    </span>
  );
}

export default CoordinateInput;
