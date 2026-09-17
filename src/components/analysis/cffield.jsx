// src/components/analysis/cffield.jsx — the distinct, labelled Cognitive Fabric read slot (WS5).
//
// Renders the CF FormationCandidate produced by the parallel async CF producer.
// Constraints:
//   - reads ONLY the pre-computed getCFFormation() value — no analytical work on
//     render (CF-004-INV-006 c).
//   - a DISTINCT, labelled section — never overwrites or styles-as the
//     synchronous 02 FORMATION result in targetpacket.jsx.
//   - not wired into any parent yet; this is a WS5 deliverable for the WS6 gate.
//
// Design: hairline divider, no fill (feedback_no_fill_cards / split-layout). No
// colour outside the locked palette (§6). Report-surface text follows §7 (3 sizes).

import React from 'react';
import { getCFFormation } from '../../engine/cf/read.js';   // the only CF module a render path imports

const SERIF = 'Georgia, "Times New Roman", serif';
const MONO  = '"IBM Plex Mono", monospace';

export default function CFField({ formation = getCFFormation() }) {
  return (
    <section style={{ borderTop: '1px solid rgba(255,255,255,0.10)', padding: '14px 0' }}>
      <div style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.04em',
                    color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
        COGNITIVE FABRIC READ
      </div>

      {!formation && (
        <div style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.6)' }}>
          NO CF FORMATION — no reference-connected structure currently supported.
        </div>
      )}

      {formation && (
        <>
          <div style={{ fontFamily: SERIF, fontSize: 28, lineHeight: 1.15, color: '#F5F5F7' }}>
            {formation.participatingDomains.join(' · ')}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: '0.04em',
                        color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>
            {formation.participatingDomains.length}-domain candidate
            {' · '}{formation.reconstructable ? 'PROVENANCE RECONSTRUCTABLE' : 'PROVENANCE INCOMPLETE'}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.6,
                        color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
            Parallel read from {formation.pathways} persistent pathways. Not a decision.
            The synchronous field read is unchanged and authoritative for 02 FORMATION.
          </div>
        </>
      )}
    </section>
  );
}
