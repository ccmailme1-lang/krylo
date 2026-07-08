// Platform-wide Help Layer — shared "?" affordance.
// One consistent implementation reused across every screen, instead of each
// component defining its own copy (metricstrip.jsx originally did this
// inline; this is the canonical version other components should import).
//
// v2 (2026-07-06) — Context Card system. Extends the original simple-text
// popover with a richer, structured card (Title/Summary/Inputs/Output/
// Learn More), per Founder-approved design spec. Backward compatible: all
// 23 existing call sites pass only `text` (+ optional `color`) and continue
// to render exactly as before, pixel-for-pixel — the richer Context Card
// layout only activates when `title` (or another structured prop) is passed.
// Accent color is lime (#66FF00), matching the existing locked signal-lime
// used everywhere else in this codebase — NOT the gold/amber shown in the
// original mockup (Founder decision 2026-07-06: keep lime for consistency).
//
// Custom click-to-toggle popover, NOT the native `title` attribute — native
// tooltips proved unreliable in practice (didn't appear on click, and
// hover-dwell timing is inconsistent across browsers/screens). Click is also
// the more natural first interaction users reach for, so this responds to
// click primarily; hover still highlights the mark itself for a visual cue.
//
// Portal positioning (v2 fix, 2026-07-06): real production bug — the old
// `position: absolute` popover was nested inside its trigger's parent, so it
// got clipped whenever an ancestor had overflow/its own stacking context
// (confirmed via screenshot: card ran off a panel's edge). Fixed by rendering
// via a React Portal straight to document.body with `position: fixed` —
// detached from any parent's overflow/clipping, but still positionally
// LINKED to the trigger: coordinates are computed from the trigger's actual
// getBoundingClientRect() on open, and recomputed on scroll/resize so it
// tracks the trigger rather than floating free. Flips up/left automatically
// if there isn't room below/right.
//
// Accessibility (v2): trigger is a real <button> (keyboard-focusable,
// Enter/Space activates natively). Card gets role="dialog" + aria-label.
// Escape closes. Focus moves into the card on open and is trapped between
// its close button and "Learn More" link (if present) until closed.
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';

// Context Card v2 palette — matches the approved spec, lime substituted for
// the original mockup's gold accent per Founder decision.
const CARD_BG        = '#0F1114';
const TEXT_PRIMARY   = '#ECECEC';
const TEXT_SECONDARY = '#A3A3A3';
const CARD_WIDTH     = 260;
const LEGACY_WIDTH   = 260; // maxWidth of the legacy popover, used for boundary math
const VIEWPORT_MARGIN = 8;

// Lightweight **bold** parsing for card body text — same lime-highlight-on-
// key-terms convention already used on the Hero page headline (plain text,
// specific words emphasized). Mechanical split on `**...**`, not full
// Markdown — no other syntax supported. Returns an array of strings/spans,
// safe to drop directly into JSX children.
function renderEmphasis(text) {
  if (!text) return text;
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: LIME, fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

let injected = false;

function ensureStyleInjected() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const style = document.createElement('style');
  style.textContent = `
    .krylo-help-mark { transition: none; }
    .krylo-help-mark:hover { border-color: ${LIME} !important; color: ${LIME} !important; }
    .krylo-help-mark[data-disabled="true"] { cursor: default; opacity: 0.35; }
  `;
  document.head.appendChild(style);
}

// Trigger sizes per spec — legacy call sites (no explicit size) keep the
// original 10px footprint so none of the 23 existing usages visually change.
const SIZE_PX = { 16: 16, 20: 20, 24: 24 };

// Computes a fixed-position { top, left } for a panel of panelWidth/panelHeight
// anchored below-and-left-aligned to triggerRect, flipping to stay on-screen.
function computeFixedPosition(triggerRect, panelWidth, panelHeight) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = triggerRect.left;
  if (left + panelWidth + VIEWPORT_MARGIN > vw) {
    left = triggerRect.right - panelWidth; // anchor to trigger's right edge instead
  }
  left = Math.max(VIEWPORT_MARGIN, left);

  let top = triggerRect.bottom + 4;
  const fitsBelow = top + panelHeight + VIEWPORT_MARGIN <= vh;
  if (!fitsBelow) {
    top = triggerRect.top - panelHeight - 4; // flip above the trigger
  }
  top = Math.max(VIEWPORT_MARGIN, top);

  return { top, left };
}

export default function HelpMark({
  text,                 // legacy: plain summary string — still fully supported
  title,                // NEW — presence of this triggers the full Context Card layout
  summary,              // NEW — alias for text when using the structured API
  rationale,            // NEW — optional longer explanation, shown below summary
  inputs,               // NEW — optional string[]
  output,               // NEW — optional string[] or string
  related,              // NEW — optional { label, href, onClick } for the footer link
  color = 'rgba(255,255,255,0.35)',
  size,                 // NEW — 16 | 20 | 24. Omit to keep legacy 10px footprint.
  disabled = false,     // NEW — Disabled state per spec: greyed, non-interactive
  style,
}) {
  ensureStyleInjected();
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState(null); // null until measured — nothing renders until we know where
  const wrapRef  = useRef(null);
  const cardRef  = useRef(null);
  const closeRef = useRef(null);

  const isCard = !!(title || rationale || inputs || output || related);
  const body   = summary ?? text;
  const panelWidth = isCard ? CARD_WIDTH : LEGACY_WIDTH;

  // Recompute position: on open, and on scroll/resize while open, so the
  // panel stays LINKED to the trigger even though it's portaled out of the
  // normal DOM flow (detached from clipping, not from the trigger itself).
  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }

    function measure() {
      if (!wrapRef.current) return;
      const triggerRect = wrapRef.current.getBoundingClientRect();
      const panelHeight = cardRef.current?.offsetHeight ?? 40;
      setPos(computeFixedPosition(triggerRect, panelWidth, panelHeight));
    }

    measure();
    // second pass after the panel has actually rendered content, so height is accurate
    const raf = requestAnimationFrame(measure);
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open, panelWidth]);

  useEffect(() => {
    if (!open) return;
    const onOutside = e => {
      const inTrigger = wrapRef.current && wrapRef.current.contains(e.target);
      const inPanel   = cardRef.current && cardRef.current.contains(e.target);
      if (!inTrigger && !inPanel) setOpen(false);
    };
    document.addEventListener('pointerdown', onOutside);
    return () => document.removeEventListener('pointerdown', onOutside);
  }, [open]);

  // Esc-to-dismiss + focus trap (card only — legacy simple popover keeps its
  // original behavior untouched, no keyboard trap was ever expected there).
  useEffect(() => {
    if (!open || !isCard) return;
    closeRef.current?.focus();

    function onKeyDown(e) {
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key !== 'Tab') return;
      const focusables = cardRef.current?.querySelectorAll('button, a[href]');
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last  = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, isCard]);

  if (!body && !isCard) return null;

  const triggerSize = size ? SIZE_PX[size] ?? 16 : 10;
  const triggerFont = size ? Math.round(triggerSize * 0.5) : 7;

  const panel = open && (
    isCard ? (
      <div
        ref={cardRef}
        role="dialog"
        aria-label={title || 'Context card'}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', zIndex: 9999,
          top: pos ? pos.top : -9999, left: pos ? pos.left : -9999,
          visibility: pos ? 'visible' : 'hidden', // measure off-screen first frame, avoid flash-of-wrong-position
          width: CARD_WIDTH,
          background: 'rgba(0, 127, 255, 0.28)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          fontFamily: MONO, color: TEXT_PRIMARY,
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: TEXT_PRIMARY }}>
            {title}
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', color: TEXT_SECONDARY, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0, fontFamily: MONO }}
          >×</button>
        </div>

        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
          {body && (
            <div style={{ fontSize: 11, lineHeight: 1.5, color: TEXT_PRIMARY }}>{renderEmphasis(body)}</div>
          )}
          {rationale && (
            <div style={{ fontSize: 11, lineHeight: 1.5, color: TEXT_SECONDARY }}>{renderEmphasis(rationale)}</div>
          )}
          {inputs && inputs.length > 0 && (
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: TEXT_SECONDARY, marginBottom: 4 }}>Inputs</div>
              <ul style={{ margin: 0, paddingLeft: 14, fontSize: 11, lineHeight: 1.6, color: TEXT_PRIMARY }}>
                {inputs.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          )}
          {output && (
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: TEXT_SECONDARY, marginBottom: 4 }}>Output</div>
              {Array.isArray(output) ? (
                <ul style={{ margin: 0, paddingLeft: 14, fontSize: 11, lineHeight: 1.6, color: TEXT_PRIMARY }}>
                  {output.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              ) : (
                <div style={{ fontSize: 11, lineHeight: 1.5, color: TEXT_PRIMARY }}>{output}</div>
              )}
            </div>
          )}
        </div>

        {related && (
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <a
              href={related.href || '#'}
              onClick={e => { if (!related.href) e.preventDefault(); related.onClick?.(e); }}
              style={{ fontSize: 11, color: LIME, textDecoration: 'none', letterSpacing: '0.04em' }}
            >{related.label || 'Learn More'} →</a>
          </div>
        )}
      </div>
    ) : (
      // Legacy simple popover — same visual treatment as v1, just portaled +
      // fixed-positioned now instead of absolute-nested, so it can't clip.
      <div
        ref={cardRef}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', zIndex: 9999,
          top: pos ? pos.top : -9999, left: pos ? pos.left : -9999,
          visibility: pos ? 'visible' : 'hidden',
          minWidth: 180, maxWidth: LEGACY_WIDTH,
          background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.85)',
          fontFamily: MONO, fontSize: 10, lineHeight: 1.5,
          letterSpacing: 'normal', textTransform: 'none', fontWeight: 400,
          padding: '8px 10px', whiteSpace: 'normal',
          boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
        }}
      >{renderEmphasis(body)}</div>
    )
  );

  return (
    <span ref={wrapRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        className="krylo-help-mark"
        data-disabled={disabled}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={title ? `Help: ${title}` : 'Help'}
        onClick={e => { e.stopPropagation(); if (!disabled) setOpen(o => !o); }}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: triggerSize, height: triggerSize, borderRadius: '50%',
          border: `1px solid ${color}`, color, background: 'transparent',
          fontFamily: MONO, fontSize: triggerFont, lineHeight: 1, padding: 0,
          cursor: disabled ? 'default' : 'help', flexShrink: 0, marginLeft: 3, userSelect: 'none',
          ...style,
        }}
      >?</button>

      {panel && typeof document !== 'undefined' && createPortal(panel, document.body)}
    </span>
  );
}
