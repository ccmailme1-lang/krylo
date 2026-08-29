// domainsubstratetabs.jsx — WO-5A: the Target Packet 01 ANALYSIS spine.
//
// Six per-domain tabs. Each tab is π_d — the `I_d` primitive rendered as a scroll
// of its fields (integration-contract D1). The panels ARE the `I_d` fields; no
// second analytical vocabulary (Q8 — Lens Primitive Reuse).
//
// WO-5A scope: structure + field-scoped SIGNAL only. Everything else renders the
// LOCKED / AUTHORED `I_d` content (domain-level, honest) or classified absence.
// Subject binding — A(d, Subject) — is WO-5B; nothing here is subject-specific.

import React, { useState } from 'react';
import { domainIntelligence, relationshipsFor } from '../../engine/domainintelligence.js';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';
const BLUE = '#007FFF';
const LBL  = '#5d6462';
const DIM  = 'rgba(255,255,255,0.32)';
const BRT  = 'rgba(255,255,255,0.78)';
const RULE = '#191d1e';
const ABSENCE = 'rgba(255,255,255,0.28)';

const TABS = ['CAPITAL', 'OWNERSHIP', 'TECHNOLOGY', 'KNOWLEDGE', 'LABOR', 'MEDIA'];

function Panel({ ordinal, title, children }) {
  return (
    <div style={{ borderTop: `1px solid ${RULE}`, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontFamily: MONO, fontSize: 8, color: LBL, letterSpacing: '0.05em' }}>{ordinal}</span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: LBL, letterSpacing: '0.28em' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Absent({ reason }) {
  return (
    <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.1em', color: ABSENCE, lineHeight: 1.6 }}>
      {reason}
    </span>
  );
}

function ItemList({ items, color = BRT }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
      {items.map((it, i) => (
        <span key={i} style={{ fontFamily: MONO, fontSize: 9.5, color, letterSpacing: '0.04em', lineHeight: 1.7 }}>
          {it}{i < items.length - 1 ? ' ·' : ''}
        </span>
      ))}
    </div>
  );
}

function DomainScroll({ domain, pressure }) {
  const di = domainIntelligence(domain);
  if (!di) return <Absent reason={`No I_d primitive for ${domain}.`} />;

  const rels = relationshipsFor(domain);
  const hasSignal = pressure && pressure.signalCount > 0;
  const sourceTag = (di.axisSource || '').replace('specs/SPEC-observable-substrate-revelation-contract.md', 'SPEC II');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: BRT, letterSpacing: '0.04em', lineHeight: 1.5 }}>{di.axis}</span>
        <span style={{ fontFamily: MONO, fontSize: 8, color: LBL, letterSpacing: '0.1em' }}>{sourceTag}</span>
      </div>

      <Panel ordinal="01" title="OBSERVES">
        <ItemList items={di.observes.items} />
        <span style={{ fontFamily: MONO, fontSize: 8, color: LBL, letterSpacing: '0.1em' }}>{di.observes.maturity} · observation classes (not subject findings)</span>
      </Panel>

      <Panel ordinal="02" title="SIGNAL">
        {hasSignal ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: MONO, fontSize: 20, color: pressure.polarity === 'fracture' ? BLUE : LIME, fontVariantNumeric: 'tabular-nums' }}>
              {Number(pressure.magnitude).toFixed(0)}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: pressure.polarity === 'fracture' ? BLUE : LIME, letterSpacing: '0.16em' }}>
              {pressure.polarity === 'fracture' ? 'FRACTURE' : 'CONSTRUCTIVE'}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.1em' }}>
              {pressure.signalCount} signal{pressure.signalCount === 1 ? '' : 's'} · FIELD SCOPE
            </span>
          </div>
        ) : (
          <Absent reason="No live signal in the current window. FIELD SCOPE — not scoped to a subject (WO-5B)." />
        )}
        <span style={{ fontFamily: MONO, fontSize: 8, color: LBL, letterSpacing: '0.1em' }}>
          per-`I_d` signal definitions: UNAUTHORED (WO-1 Class E — measures pending Founder authorship)
        </span>
      </Panel>

      <Panel ordinal="03" title="RELATIONSHIP">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {rels.map((r, i) => (
            <span key={i} style={{ fontFamily: MONO, fontSize: 9.5, color: BRT, letterSpacing: '0.03em', lineHeight: 1.6 }}>
              {domain} ↔ {r.other} — {r.type}
            </span>
          ))}
        </div>
        <span style={{ fontFamily: MONO, fontSize: 8, color: LBL, letterSpacing: '0.1em' }}>
          admission types (ratified, closed set) · synthesis is deferred to Formation
        </span>
      </Panel>

      <Panel ordinal="04" title="RELEVANCE">
        <ItemList items={di.relevance.items} color={DIM} />
        <span style={{ fontFamily: MONO, fontSize: 8, color: LBL, letterSpacing: '0.1em' }}>{di.relevance.maturity}</span>
      </Panel>

      <Panel ordinal="05" title="UNRESOLVED">
        <ItemList items={di.unresolved.items} color={DIM} />
        {di.dimensions.unauthored?.length > 0 && (
          <span style={{ fontFamily: MONO, fontSize: 9, color: ABSENCE, letterSpacing: '0.04em' }}>
            dimensions held UNAUTHORED: {di.dimensions.unauthored.join(', ')}
          </span>
        )}
      </Panel>

      <Panel ordinal="06" title="SHARPEN">
        <Absent reason="Sharpening inputs pending authorship (WO-1 Class E). Once authored, this names the subject-specific input that would tighten the read — it never tells the guest what to decide." />
      </Panel>
    </div>
  );
}

export default function DomainSubstrateTabs({ domainPressures = {} }) {
  const [active, setActive] = useState('CAPITAL');
  const pressure = domainPressures[active] ?? null;

  return (
    <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ fontFamily: MONO, fontSize: 9, color: DIM, letterSpacing: '0.06em', lineHeight: 1.6, maxWidth: 620 }}>
        The subject viewed through each domain. Panels are the domain primitive's own fields —
        no separate analysis engine. SIGNAL is <b style={{ color: BRT }}>field scope</b> today;
        subject binding is WO-5B.
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {TABS.map(t => {
          const on = t === active;
          const p  = domainPressures[t];
          const dot = p && p.signalCount > 0;
          return (
            <button
              key={t}
              onClick={() => setActive(t)}
              style={{
                fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', padding: '5px 12px',
                borderRadius: 999, cursor: 'pointer',
                background: on ? 'rgba(102,255,0,0.06)' : 'transparent',
                border: `1px solid ${on ? LIME : 'rgba(255,255,255,0.12)'}`,
                color: on ? LIME : 'rgba(255,255,255,0.4)', transition: 'all 120ms',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {dot && <span style={{ width: 4, height: 4, borderRadius: '50%', background: p.polarity === 'fracture' ? BLUE : LIME }} />}
              {t}
            </button>
          );
        })}
      </div>

      <DomainScroll domain={active} pressure={pressure} />
    </div>
  );
}
