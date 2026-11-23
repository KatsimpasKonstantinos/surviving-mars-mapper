import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
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
const LONG_PRESS_MS = 450;
/** Elements that do something on their own when clicked or tapped */
export const INTERACTIVE = 'a, button, input, select, textarea, [role="button"]';

/**
 * Tooltip for mouse, keyboard and touch. Rendered into <body> with fixed positioning,
 * so cards, the grid and overflow: hidden containers never clip it. Prefers the space
 * above the target, flips below when needed and stays inside the viewport.
 *
 * Touch: a long press opens it (and swallows the click that follows, so buttons are
 * not triggered); a short tap toggles it on targets that do nothing else when tapped.
 * Tapping elsewhere or scrolling closes it.
 */
export default function Tooltip({ content, children }: TooltipProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const pressTimer = useRef<number | undefined>(undefined);
  const longPressed = useRef(false);

  // The wrapper uses display: contents (no box of its own), so work with the target itself.
  const target = () => anchorRef.current?.firstElementChild ?? null;

  // Measure after render and place the tooltip before the browser paints it.
  useLayoutEffect(() => {
    const tip = tipRef.current;
    const el = anchorRef.current?.firstElementChild;
    if (!open || !tip || !el) return;

    const a = el.getBoundingClientRect();
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

  // While open: a tap elsewhere or any scrolling closes it.
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event.type === 'pointerdown' && anchorRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', close, true);
    window.addEventListener('scroll', close, { capture: true, passive: true });
    return () => {
      document.removeEventListener('pointerdown', close, true);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(pressTimer.current), []);

  return (
    <span
      ref={anchorRef}
      className="tooltip-anchor"
      onPointerEnter={(e) => e.pointerType !== 'touch' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType !== 'touch' && setOpen(false)}
      onPointerDown={(e) => {
        if (e.pointerType !== 'touch') return;
        longPressed.current = false;
        clearTimeout(pressTimer.current);
        pressTimer.current = window.setTimeout(() => {
          pressTimer.current = undefined;
          longPressed.current = true;
          setOpen(true);
        }, LONG_PRESS_MS);
      }}
      onPointerUp={(e) => {
        if (e.pointerType !== 'touch' || pressTimer.current === undefined) return;
        // Short tap
        clearTimeout(pressTimer.current);
        pressTimer.current = undefined;
        if (!target()?.matches(INTERACTIVE)) setOpen((o) => !o);
      }}
      onPointerCancel={() => clearTimeout(pressTimer.current)}
      onClickCapture={(e) => {
        if (!longPressed.current) return;
        longPressed.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
      // No "save image" / text selection menu on long press
      onContextMenu={(e) => longPressed.current && e.preventDefault()}
      onFocus={(e) => e.target.matches(':focus-visible') && setOpen(true)}
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
