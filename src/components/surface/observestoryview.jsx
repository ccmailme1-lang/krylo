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
import React, { useMemo, useState, useEffect } from 'react';
import { classifyConvergenceState } from '../../engine/convergenceclassifier.js';
import { deriveRelationships, filterForSurface, RELATIONSHIP_STATE } from '../../formationlayer/formationrelationship.js';
// KRYL-1202 final Bottle Test remediation (2026-08-26) — buildCandidates/adjudicate/etc. moved to
// a plain module so KRYL-1202's Observation Affordance Engine can import real adjudication output
// directly (this .jsx file's React import made it unimportable outside a bundler). Logic itself is
// unchanged — see resolveadjudication.js header.
import { buildCandidates, adjudicate, getLastAdjudication, setLastAdjudication } from '../../formationlayer/resolveadjudication.js';

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

// buildCandidates/classifyPair/adjudicate/OPPOSITION_TABLE/getLastAdjudication (KRYL-1207) moved
// to ../../formationlayer/resolveadjudication.js (2026-08-26, KRYL-1202 final Bottle Test
// remediation) — logic unchanged, see that file's header and imports above. Re-exported here so
// this file's existing public surface (getLastAdjudication) is unchanged.
export { getLastAdjudication };

// Returns { emphasis, headlineRest, paragraph, next } -- emphasis is the one word/phrase
// rendered in lime, matching the Dual Voice doctrine's use of color as meaning, not decoration.
function buildNarrative(domains, relationships) {
  const { candidates, stable, emerging } = buildCandidates(domains, relationships);

  if (candidates.length > 0) {
    const result = adjudicate(candidates);
    setLastAdjudication(result);

    if (result.outcome === 'SINGLE') {
      const picked = result.selected;
      return { headlinePre: picked.headlinePre, emphasis: picked.emphasis, headlinePost: picked.headlinePost, paragraph: picked.paragraph, next: null };
    }
    if (result.outcome === 'CONFLICT') {
      const { a, b } = result.conflict;
      return {
        headlinePre: 'The signal is', emphasis: 'conflicting',
        headlinePost: ' this cycle — two real readings don\'t agree.',
        paragraph: `One read says "${a.headlinePre} ${a.emphasis}${a.headlinePost}" — another says "${b.headlinePre} ${b.emphasis}${b.headlinePost}" Both are grounded in real data; they don't reconcile, so nothing is picked over the other.`,
        next: null,
      };
    }
    // UNRESOLVED_NO_RANKING
    return {
      headlinePre: 'Multiple real readings are', emphasis: 'available',
      headlinePost: ' this cycle — none outranks the others.',
      paragraph: `${candidates.length} distinct, non-conflicting signals are active right now. There's no grounded way to say one matters more than another yet, so none is shown as the lead.`,
      next: null,
    };
  }
  setLastAdjudication({ outcome: 'NONE', selected: null, conflict: null, pairwise: [], candidateTaps: [], basis: 'no eligible candidates', topologyPrimitives: 'NOT PRODUCED BY THIS PATH' });

  // No candidate's precondition held -- genuinely low/no signal. Say so plainly (§22
  // absence-is-signal) rather than forcing a variant that isn't real yet.
  const headlinePre = emerging.length > 0 ? 'No domain has a' : 'Awaiting';
  const emphasis = emerging.length > 0 ? 'confirmed pattern' : 'enough signal';
  const headlinePost = emerging.length > 0 ? ' yet — the field is still forming.' : ' to establish any pattern.';
  const paragraph = emerging.length > 0
    ? `${listWithAnd(emerging.map(d => d.label))} ${emerging.length === 1 ? 'is' : 'are'} moving together, just at a smaller scale — not yet confirmed.`
    : '';
  return { headlinePre, emphasis, headlinePost, paragraph, next: null };
}

// KRYL-1174 Symptom 2 — this component mounts as soon as surfaceExpanded flips true and reads
// coneState (raw signals) immediately, so the narrative used to claim "N domains are moving
// together" while conemap.jsx's cones were still mid-flight through their own suppression-scale
// reveal. This component has no access to that per-cone scale state (coneState here is the raw
// leaderboardState array, not conemap.jsx's internal coneState with .suppressed) — plumbing that
// through would mean new props across conemap.jsx -> app.jsx -> here. Cheaper and just as
// correct: hold the narrative until conemap.jsx's own reveal animation has had time to finish.
// Duration must stay matched to SUPPRESSION_TRANSITION_DURATION in conemap.jsx.
const SUPPRESSION_TRANSITION_DURATION_MS = 500;

// coneState: [{ domain, pressure, volatility }] — see file header. domain strings are already
// uppercase CANONICAL_DOMAINS values (app.jsx's CANONICAL_FEEDERS = CANONICAL_DOMAINS).
export default function ObserveStoryBanner({ activeDomain = null, coneState = [] }) {
  const [revealReady, setRevealReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setRevealReady(true), SUPPRESSION_TRANSITION_DURATION_MS);
    return () => clearTimeout(t);
  }, []);

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

  const { headlinePre, emphasis, headlinePost, paragraph, next } = useMemo(
    () => buildNarrative(domains, relationships), [domains, relationships]
  );

  const activeInfo = activeDomain ? domains.find(d => d.domain === activeDomain?.toUpperCase?.() || d.domain === activeDomain) : null;

  // KRYL-1174 Symptom 2 — don't render the narrative until conemap.jsx's own suppression
  // reveal has had time to settle (see SUPPRESSION_TRANSITION_DURATION_MS above).
  if (!revealReady) return null;

  return (
    <>
      <div style={{
        position: 'absolute', top: 78, left: '1%', width: 401, zIndex: 15,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        textAlign: 'left', pointerEvents: 'none',
      }}>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', color: LIME, marginBottom: 9 }}>
          <span style={{ position: 'relative', display: 'inline-block' }}>
            Quick read
            <span style={{ position: 'absolute', left: 0, right: 0, bottom: -6, height: 1, background: LIME }} />
          </span>
        </div>
        <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 26, lineHeight: 1.15, fontWeight: 400, color: '#edefe8', maxWidth: 401, margin: '0 0 10px', textWrap: 'balance' }}>
          {headlinePre} <span style={{ color: LIME }}>{emphasis}</span>{headlinePost}
        </p>
        <p style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.5)', maxWidth: 284, margin: 0 }}>
          {paragraph}
        </p>

        {next && (
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
              Next update
            </div>
            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 16, lineHeight: 1.2, fontWeight: 400, color: 'rgba(237,239,232,0.6)', maxWidth: 284, margin: 0 }}>
              {next.headlinePre} <span style={{ color: 'rgba(102,255,0,0.6)' }}>{next.emphasis}</span>{next.headlinePost}
            </p>
          </div>
        )}
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
           
          </div>
        )}
      </div>
    </>
  );
}
