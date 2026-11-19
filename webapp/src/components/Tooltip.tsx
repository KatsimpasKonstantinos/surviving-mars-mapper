import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Tooltip.css';

interface TooltipProps {
  /** Tooltip body. Nothing is shown when it is empty. */
  content: ReactNode;
  /** The target. Its first element is what the tooltip is positioned against. */
  children: ReactNode;
}

const GAP = 8;
const EDGE = 8;

/**
 * Hover / focus tooltip. Rendered into <body> with fixed positioning, so cards,
 * the grid and overflow: hidden containers never clip it. Prefers the space
 * above the target, flips below when needed and stays inside the viewport.
 */
export default function Tooltip({ content, children }: TooltipProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  // Measure after render and place the tooltip before the browser paints it.
  useLayoutEffect(() => {
    const tip = tipRef.current;
    // The wrapper uses display: contents (no box of its own), so measure the target itself.
    const target = anchorRef.current?.firstElementChild;
    if (!open || !tip || !target) return;

    const a = target.getBoundingClientRect();
    const t = tip.getBoundingClientRect();
    const below = a.top - t.height - GAP < EDGE;
    const top = below ? a.bottom + GAP : a.top - t.height - GAP;
    const left = Math.min(
      Math.max(a.left + a.width / 2 - t.width / 2, EDGE),
      window.innerWidth - t.width - EDGE,
    );
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    tip.style.visibility = 'visible';
  }, [open]);

  return (
    <span
      ref={anchorRef}
      className="tooltip-anchor"
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? tooltipId : undefined}
    >
      {children}
      {open &&
        content &&
        createPortal(
          <div ref={tipRef} id={tooltipId} role="tooltip" className="tooltip">
            {content}
          </div>,
          document.body,
        )}
    </span>
  );
}
