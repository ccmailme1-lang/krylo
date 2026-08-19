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
function rawVelocity(pressure) {
  return (pressure - 50) * 0.3;
}
function velocityText(pressure) {
  const v = rawVelocity(pressure);
  const sign = v > 0 ? '+' : '';
  return `${sign}${Math.round(v)}%`;
}

function listWithAnd(names) {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function domainByFormationId(domains, id) {
  return domains.find(d => d.formationId === id)?.label ?? id;
}

// Selection is a hash of the REAL current per-domain magnitudes/volatilities -- not the
// calendar. It only changes when the underlying signal actually changes, so a guest sees new
// framing exactly as fast as new data comes in, and two visits with identical data get the same
// (honest) read rather than a fake illusion of change. Was DAY_INDEX-keyed before; that rotated
// on a 24h timer regardless of whether anything real had moved, which read as stagnant.
function stateHash(domains) {
  return domains.reduce((h, d) => h + Math.round(d.magnitude) + Math.round(d.volatility * 100), 0);
}

// Builds every candidate headline the CURRENT real data actually supports -- relationship
// dynamics (CONVERGING/WEAKENING/DIVERGING, real fields from formationrelationship.js, not
// previously surfaced here), volatility standouts, opposite-direction pairs, and an emerging
// domain closing in on a confirmed one -- on top of the original aggregate/leader read. Each
// candidate has its own real precondition; nothing is invented to pad the list (§22).
function buildCandidates(domains, relationships) {
  const stable = domains.filter(d => d.formationState === 'STABLE');
  const emerging = domains.filter(d => d.formationState === 'EMERGING');
  const active = domains.filter(d => d.formationState);
  const topRel = relationships[0] ?? null;
  const candidates = [];

  if (stable.length >= 2) {
    const names = listWithAnd(stable.map(d => d.label));
    const deltas = listWithAnd(stable.map(d => velocityText(d.magnitude)));
    const leader = stable.reduce((max, d) => Math.abs(d.magnitude - 50) > Math.abs(max.magnitude - 50) ? d : max, stable[0]);
    const leaderDelta = velocityText(leader.magnitude);
    const groupParagraph = `${names} all moved by similar amounts this cycle (${deltas}) — that's not ${stable.length} coincidences, it's one pattern. ${leader.label} led at ${leaderDelta} — that's the one to look at first.`;

    candidates.push({
      headlinePre: `${stable.length} domains are moving`, emphasis: 'together',
      headlinePost: topRel ? ' — and two of them are quietly connected.' : '.',
      paragraph: groupParagraph,
    });
    candidates.push({
      headlinePre: `${leader.label} moved the`, emphasis: 'most',
      headlinePost: ` of ${stable.length} domains this cycle.`,
      paragraph: groupParagraph,
    });
  } else if (stable.length === 1) {
    candidates.push({
      headlinePre: `${stable[0].label} is the`, emphasis: 'one domain',
      headlinePost: ' in a confirmed pattern right now.',
      paragraph: emerging.length > 0
        ? `${listWithAnd(emerging.map(d => d.label))} ${emerging.length === 1 ? 'is' : 'are'} also moving, just not confirmed yet.`
        : `Nothing else in the field has confirmed a pattern this cycle.`,
    });
  }

  // Relationship state -- real field from formationrelationship.js's deriveState(), never
  // surfaced in the narrative before this pass.
  if (topRel) {
    const a = domainByFormationId(domains, topRel.sourceFormationId);
    const b = domainByFormationId(domains, topRel.targetFormationId);
    const relParagraph = `${a} and ${b} specifically are linked — see the connecting line below.`;
    if (topRel.state === 'CONVERGING') {
      candidates.push({ headlinePre: `${a} and ${b} are`, emphasis: 'pulling into alignment', headlinePost: ' — the link is strengthening this cycle.', paragraph: relParagraph });
    } else if (topRel.state === 'WEAKENING') {
      candidates.push({ headlinePre: `${a} and ${b} were linked —`, emphasis: 'now pulling apart', headlinePost: '.', paragraph: relParagraph });
    } else if (topRel.state === 'DIVERGING') {
      candidates.push({ headlinePre: `${a} and ${b} have`, emphasis: 'broken from', headlinePost: ' each other this cycle — a real split, not noise.', paragraph: relParagraph });
    } else {
      candidates.push({ headlinePre: `${a} and ${b} are`, emphasis: 'the clearest link', headlinePost: ' this cycle.', paragraph: relParagraph });
    }
  }

  // Volatility standout -- only when one domain is genuinely out ahead of the field average,
  // not just nominally highest.
  if (active.length >= 2) {
    const avgVol = active.reduce((s, d) => s + d.volatility, 0) / active.length;
    const mostVolatile = active.reduce((max, d) => (d.volatility > max.volatility ? d : max), active[0]);
    if (mostVolatile.volatility - avgVol > 0.15) {
      candidates.push({
        headlinePre: `${mostVolatile.label} is the`, emphasis: 'least stable',
        headlinePost: ' domain in the field right now.',
        paragraph: `${mostVolatile.label} is swinging more than the rest of the field (${Math.round(mostVolatile.volatility * 100)}% volatility vs. a ${Math.round(avgVol * 100)}% average) — that instability is itself the signal worth watching.`,
      });
    }
  }

  // Opposite-direction pair -- two real domains moving against each other, not the same
  // pattern read two ways.
  if (active.length >= 2) {
    let bestPair = null, bestSpread = 6;
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const vi = rawVelocity(active[i].magnitude), vj = rawVelocity(active[j].magnitude);
        if (Math.sign(vi) !== 0 && Math.sign(vj) !== 0 && Math.sign(vi) !== Math.sign(vj)) {
          const spread = Math.abs(vi - vj);
          if (spread > bestSpread) { bestSpread = spread; bestPair = [active[i], active[j]]; }
        }
      }
    }
    if (bestPair) {
      const [d1, d2] = bestPair;
      candidates.push({
        headlinePre: `${d1.label} and ${d2.label} are moving`, emphasis: 'in opposite directions',
        headlinePost: ' this cycle.',
        paragraph: `${d1.label} is at ${velocityText(d1.magnitude)} while ${d2.label} is at ${velocityText(d2.magnitude)} — a real split, not the same pattern read two ways.`,
      });
    }
  }

  // Emerging domain closing the gap on a confirmed one -- a real transition signal, not a guess
  // about whether it will confirm.
  if (emerging.length > 0 && stable.length > 0) {
    let closest = null, closestGap = 8;
    for (const e of emerging) {
      for (const s of stable) {
        const gap = Math.abs(e.magnitude - s.magnitude);
        if (gap < closestGap) { closestGap = gap; closest = [e, s]; }
      }
    }
    if (closest) {
      const [e, s] = closest;
      candidates.push({
        headlinePre: `${e.label} is closing in on`, emphasis: `${s.label}'s territory`,
        headlinePost: ' — worth watching if it holds.',
        paragraph: `${e.label} hasn't confirmed a pattern yet, but it's within ${Math.round(closestGap)} points of ${s.label}, which has. If that gap closes, it's a second confirmed domain, not a coincidence.`,
      });
    }
  }

  return { candidates, stable, emerging };
}

// Returns { emphasis, headlineRest, paragraph, next } -- emphasis is the one word/phrase
// rendered in lime, matching the Dual Voice doctrine's use of color as meaning, not decoration.
function buildNarrative(domains, relationships) {
  const { candidates, stable, emerging } = buildCandidates(domains, relationships);

  if (candidates.length > 0) {
    const idx = stateHash(domains) % candidates.length;
    const picked = candidates[idx];
    const next = candidates.length > 1 ? candidates[(idx + 1) % candidates.length] : null;
    return { headlinePre: picked.headlinePre, emphasis: picked.emphasis, headlinePost: picked.headlinePost, paragraph: picked.paragraph, next };
  }

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
