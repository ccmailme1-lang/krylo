/**
 * correlationListener.js — WO-1033 ADVANTAGE Phase A
 * Correlation detection: category / origin / source agency match.
 * 1+ match = lit. No score threshold.
 */

export function getCorrelations(card, registry) {
    return registry.filter(r =>
        r.id !== card.id && (
            r.category === card.category ||
            r.origin   === card.origin   ||
            r.source   === card.source
        )
    );
}

export function isLit(card, registry) {
    return getCorrelations(card, registry).length > 0;
}

export function corrTypes(candidate, card) {
    const types = [];
    if (candidate.category === card.category) types.push('CATEGORY');
    if (candidate.origin   === card.origin)   types.push('ORIGIN');
    if (candidate.source   === card.source)   types.push('SOURCE');
    return types;
}
