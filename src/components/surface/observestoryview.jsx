// KRYL-1171 — OBSERVE macro-insight overlay. NOT a replacement view — the 3D cones stay exactly
// as they are, including the existing relationship connector layer (conemap.jsx ConeScene).
// This attaches a narrative block above the cone scene (the macro finding, in plain language)
// and a "full read" panel below it that reflects whichever cone is actually selected/tapped —
// reusing the app's real selection state (app.jsx's `selection`), not a separate click system.
// No bars, no separate chart, no duplicate per-domain numbers — those already exist on the
// cones themselves.
//
// Reads the SAME live global signal pool Cone (conemap.jsx) already reads for its Formation
// Representation HUD -- getDomainPressure()/adaptDomainToFormation() -- not a separate data path.
import React, { useMemo, useState, useEffect } from 'react';
import { CANONICAL_DOMAINS } from '../../engine/ontology.js';
import { getDomainPressure } from '../../engine/domaingravity.js';
import { adaptDomainToFormation } from '../../formationlayer/formationadapter.js';
import { deriveRelationships, filterForSurface, RELATIONSHIP_STATE } from '../../formationlayer/formationrelationship.js';

const SERIF = "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif";
const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';

function label(domain) {
  return domain.charAt(0).toUpperCase() + domain.slice(1).toLowerCase();
}

// Same formula as conemap.jsx's Cone component -- reused exactly so this text's percentages
// never diverge from what the cones themselves show.
function velocityText(pressure) {
  const v = (pressure - 50) * 0.3;
  const sign = v > 0 ? '+' : '';
  return `${sign}${Math.round(v)}%`;
}

function listWithAnd(names) {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

// Returns { emphasis, headlineRest, paragraph } -- emphasis is the one word/phrase rendered in
// lime, matching the Dual Voice doctrine's use of color as meaning, not decoration.
function buildNarrative(domains, relationships) {
  const stable = domains.filter(d => d.formationState === 'STABLE');
  const emerging = domains.filter(d => d.formationState === 'EMERGING');
  const topRel = relationships[0] ?? null;

  let headlinePre, emphasis, headlinePost;
  if (stable.length >= 2) {
    headlinePre = `${stable.length} domains are moving`;
    emphasis = 'together';
    headlinePost = topRel ? ' — and two of them are quietly connected.' : '.';
  } else if (stable.length === 1) {
    headlinePre = `${stable[0].label} is the`;
    emphasis = 'one domain';
    headlinePost = ' in a confirmed pattern right now.';
  } else if (emerging.length > 0) {
    headlinePre = 'No domain has a';
    emphasis = 'confirmed pattern';
    headlinePost = ' yet — the field is still forming.';
  } else {
    headlinePre = 'Awaiting';
    emphasis = 'enough signal';
    headlinePost = ' to establish any pattern.';
  }

  const paragraphParts = [];
  if (stable.length >= 2) {
    const names = listWithAnd(stable.map(d => d.label));
    const deltas = listWithAnd(stable.map(d => velocityText(d.magnitude)));
    paragraphParts.push(`${names} all moved by ${stable.length === 1 ? 'the same' : 'similar'} amounts this cycle (${deltas}) — that's not ${stable.length} coincidences, it's one pattern.`);
  }
  if (emerging.length > 0) {
    const names = listWithAnd(emerging.map(d => d.label));
    paragraphParts.push(`${names} ${emerging.length === 1 ? 'is' : 'are'} also moving together, just at a smaller scale — not yet confirmed.`);
  }
  if (topRel) {
    const a = domains.find(d => d.formationId === topRel.sourceFormationId)?.label ?? topRel.sourceFormationId;
    const b = domains.find(d => d.formationId === topRel.targetFormationId)?.label ?? topRel.targetFormationId;
    paragraphParts.push(`${a} and ${b} specifically are linked — see the connecting line below.`);
  }
  paragraphParts.push('Tap any cone for the full read.');

  return { headlinePre, emphasis, headlinePost, paragraph: paragraphParts.join(' ') };
}

export default function ObserveStoryBanner({ activeDomain = null }) {
  // Formation state has real hysteresis (applyTransitionPolicy) that settles over successive
  // reads, same mechanism Cone's own formation HUD uses. Re-poll on an interval so this reflects
  // the same live state the cones themselves show, not a one-time stale snapshot from mount.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  const domains = useMemo(() => {
    return CANONICAL_DOMAINS.map(domain => {
      const pressure = getDomainPressure(domain);
      const formation = adaptDomainToFormation(domain, 0.5);
      return {
        domain,
        formationId: formation?.domain ?? domain,
        label: label(domain),
        magnitude: pressure.magnitude,
        signalCount: pressure.signalCount,
        formationState: formation?.state ?? null,
        cohesion: formation?.cohesion ?? null,
        velocityReason: formation?.velocityReason ?? null,
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });
  }, [tick]);

  const relationships = useMemo(() => {
    const formations = domains
      .filter(d => d.formationState)
      .map(d => ({ formation_id: d.formationId, cohesion: d.cohesion }));
    return filterForSurface(deriveRelationships(formations)).filter(r => r.state !== RELATIONSHIP_STATE.UNKNOWN);
  }, [domains]);

  const { headlinePre, emphasis, headlinePost, paragraph } = useMemo(
    () => buildNarrative(domains, relationships), [domains, relationships]
  );

  const activeInfo = activeDomain ? domains.find(d => d.domain === activeDomain?.toUpperCase?.() || d.domain === activeDomain) : null;

  return (
    <>
      <div style={{
        position: 'absolute', top: 24, left: 40, right: 40, zIndex: 15,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        textAlign: 'left', pointerEvents: 'none',
      }}>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>
          What changed
        </div>
        <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 28, lineHeight: 1.15, fontWeight: 400, color: '#edefe8', maxWidth: 640, margin: '0 0 16px', textWrap: 'balance' }}>
          {headlinePre} <span style={{ color: LIME }}>{emphasis}</span>{headlinePost}
        </p>
        <p style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.5)', maxWidth: 760, margin: 0 }}>
          {paragraph}
        </p>
      </div>

      <div style={{
        position: 'absolute', bottom: 12, left: 0, right: 0, zIndex: 15,
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        pointerEvents: 'none', padding: '0 40px',
      }}>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
          Full read — tap a domain above
        </div>
        {!activeInfo && (
          <div style={{ fontFamily: MONO, fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>
            No domain selected yet. Tap any cone to see its confidence level and evidence depth.
          </div>
        )}
        {activeInfo && (
          <div style={{
            display: 'flex', gap: 28, fontFamily: MONO, fontSize: 11.5,
            color: 'rgba(255,255,255,0.85)', letterSpacing: '0.02em',
          }}>
            <span><b style={{ color: activeInfo.formationState === 'STABLE' ? LIME : '#007FFF' }}>{activeInfo.label}</b></span>
            <span>{activeInfo.formationState === 'STABLE' ? 'Confirmed pattern' : activeInfo.formationState === 'EMERGING' ? 'Still forming' : 'No pattern yet'}</span>
            <span>{activeInfo.signalCount} signal{activeInfo.signalCount === 1 ? '' : 's'}</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>{activeInfo.velocityReason ?? 'Direction not yet available'}</span>
          </div>
        )}
      </div>

      <div style={{
        position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 15,
        maxWidth: 640, padding: '14px 18px', background: 'rgba(12,15,12,0.85)', border: '1px solid #22271f',
        borderRadius: 2, fontFamily: MONO, fontSize: 10.5, lineHeight: 1.55, color: 'rgba(255,255,255,0.45)',
        display: 'flex', gap: 10, pointerEvents: 'none',
      }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', marginTop: 5, flexShrink: 0 }} />
        <div>
          <b style={{ color: 'rgba(255,255,255,0.8)' }}>Why no trend arrows.</b> Every domain shows current strength, not direction —
          that's withheld on purpose until there's enough history to say it honestly.
        </div>
      </div>
    </>
  );
}
