// KRYL-1171 — OBSERVE macro-insight overlay. NOT a replacement view — the 3D cones stay exactly
// as they are, including the existing relationship connector layer (conemap.jsx ConeScene).
// This attaches a narrative block above the cone scene (the macro finding, in plain language)
// and a "full read" panel below it that reflects whichever cone is actually selected/tapped —
// reusing the app's real selection state (app.jsx's `selection`), not a separate click system.
// No bars, no separate chart, no duplicate per-domain numbers — those already exist on the
// cones themselves.
//
// coneState comes in as a prop — the SAME live array app.jsx builds as `leaderboardState` and
// hands to ConeMap (app.jsx:1024-1034, aggregateSignals() over liveSignals/replayedSignals).
// An earlier version of this file called getDomainPressure()/adaptDomainToFormation()
// (domaingravity.js / formationlayer/formationadapter.js) instead — a real but SEPARATE pool,
// fed only by the external-API connector fleet (FRED/EDGAR/GDELT/etc. via dispatchBatch), which
// stays empty without live network access. That made the banner's narrative permanently stuck
// on "awaiting enough signal" even while the cones visibly showed real signal. Fixed by reading
// the same live pool the cones read, and classifying it with the exact same formula conemap.jsx
// uses for its own per-cone convergence color (coneConvergenceVector + classifyConvergenceState,
// mirrored below since those helpers aren't exported from conemap.jsx).
import React, { useMemo } from 'react';
import { classifyConvergenceState } from '../../engine/convergenceclassifier.js';
import { deriveRelationships, filterForSurface, RELATIONSHIP_STATE } from '../../formationlayer/formationrelationship.js';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';

// Mirrors conemap.jsx's coneConvergenceVector/CONE_VECTOR_T/CONE_TELEMETRY_CONFIDENCE exactly —
// same live pressure/volatility in, same classifier state out, so this text never disagrees
// with what color a cone is actually rendering.
const CONE_VECTOR_T = 0.7;
const CONE_TELEMETRY_CONFIDENCE = 0.8;
function coneConvergenceVector(pressure, volatility) {
  const leverageN = (pressure ?? 0) / 100;
  return { D: leverageN, V: volatility ?? 0.5, A: leverageN, T: CONE_VECTOR_T };
}

function domainLabel(domain) {
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

// coneState: [{ domain, pressure, volatility }] — see file header. domain strings are already
// uppercase CANONICAL_DOMAINS values (app.jsx's CANONICAL_FEEDERS = CANONICAL_DOMAINS).
export default function ObserveStoryBanner({ activeDomain = null, coneState = [] }) {
  const domains = useMemo(() => {
    return coneState.map(({ domain, pressure, volatility }) => {
      const { stateId, label: stateLabel } = classifyConvergenceState(
        coneConvergenceVector(pressure, volatility), CONE_TELEMETRY_CONFIDENCE
      );
      // BUILDING/HIGH CONVERGENCE (lime/purple, §6) = confirmed pattern. TURBULENT = real
      // signal, not yet coherent. INSUFFICIENT/LOW = no formation. Same semantics the cones'
      // own fill color already encodes — this just narrates it.
      const formationState = stateId === 2 || stateId === 4 ? 'STABLE'
        : stateId === 3 ? 'EMERGING'
        : null;
      return {
        domain,
        formationId: domain,
        label: domainLabel(domain),
        magnitude: pressure ?? 0,
        volatility: volatility ?? 0,
        formationState,
        stateLabel,
        cohesion: stateId / 4,
      };
    });
  }, [coneState]);

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
        position: 'absolute', top: 60, left: 346, right: 40, zIndex: 15,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        textAlign: 'left', pointerEvents: 'none',
      }}>
        <div style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 9 }}>
          What changed
        </div>
        <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 28, lineHeight: 1.15, fontWeight: 400, color: '#edefe8', maxWidth: 265, margin: '0 0 10px', textWrap: 'balance' }}>
          {headlinePre} <span style={{ color: LIME }}>{emphasis}</span>{headlinePost}
        </p>
        <p style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.5)', maxWidth: 480, margin: 0 }}>
          {paragraph}
        </p>
      </div>

      <div style={{
        position: 'absolute', bottom: 56, left: 0, right: 0, zIndex: 15,
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
          <div style={{ display: 'flex', gap: 28, justifyContent: 'center', fontFamily: MONO, fontSize: 11.5, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.02em' }}>
            <span><b style={{ color: activeInfo.formationState === 'STABLE' ? LIME : activeInfo.formationState === 'EMERGING' ? '#007FFF' : 'rgba(255,255,255,0.5)' }}>{activeInfo.label}</b></span>
            <span>{activeInfo.formationState === 'STABLE' ? 'Confirmed pattern' : activeInfo.formationState === 'EMERGING' ? 'Still forming' : 'No pattern yet'}</span>
            <span>P{Math.round(activeInfo.magnitude)}</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>{activeInfo.stateLabel}</span>
          </div>
        )}
      </div>
    </>
  );
}
