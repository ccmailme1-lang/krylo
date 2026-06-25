# WO-1875 — Canonical AMBIGUOUS State

**Status:** SPEC  
**Filed:** 2026-06-25  
**Depends on:** DEF-1864 (Intent Lock Gate — ambiguous escalation fix)

---

## 1. Single Responsibility

Elevate AMBIGUOUS from a fallback/error condition to a first-class canonical state with its own response surface. When no domain can be determined, the system holds, presents the plausible domains, and waits for the user to direct it.

---

## 2. Boundary Declaration

**IN scope:**
- Queries with no domain keyword match (bare nouns: "stereo", "house", "party")
- Proper nouns with no inherent domain (company names: "Google", "Nike", "Apple")
- Queries that match 2+ domains at equal weight (soft multi-domain collision)

**OUT of scope:**
- Queries that already have a clear domain match — those route normally, no change
- DEF-1864 arithmetic/boundary fixes — those are a separate patch
- UI redesign of existing synthesis surfaces

---

## 3. Zero Drift

This WO does NOT:
- Change any existing domain routing logic
- Add new domains
- Modify the synthesis output for routed queries
- Touch the convergence classifier

---

## 4. Strategic Leverage Statement

"We don't predict. We detect." — and when we can't detect, we say so and ask. Fabricating a domain from a bare noun is the same failure mode as fabricating a synthesis from ambient HP. The honest response IS the product. AMBIGUOUS with options is more useful than a wrong answer delivered with confidence.

---

## 5. Output Gravity

Single dominant output: an **options payload** attached to the AMBIGUOUS state.

```js
{
  state: 'AMBIGUOUS',
  resolutionEligible: false,
  query: 'stereo',
  options: [
    { domain: 'AUTO',    label: 'Car audio / vehicle upgrade' },
    { domain: 'MEDIA',   label: 'Content production / audio equipment' },
    { domain: 'CAPITAL', label: 'Purchase decision / asset' },
  ]
}
```

User selects one option. That selection locks the domain and re-fires synthesis with `domain` injected. No re-typing required.

---

## 6. Formula / Contract

**Detection order:**
1. Run `resolvePrimary(q)` as normal
2. If result is a domain → route normally (no change)
3. If result is AMBIGUOUS → check `PROPER_NOUN_EXCLUSIONS` match
   - If proper noun match → build options from `ENTITY_DOMAIN_MAP` (new constant)
   - If no proper noun → score all domains via `DOMAIN_SCORE_PATTERNS`, return top 2–3 with score > 0
   - If all scores = 0 → return generic clarification options
4. Attach `options[]` array to AMBIGUOUS payload
5. Downstream consumers check `resolutionEligible: false` → render options UI, suppress synthesis

**ENTITY_DOMAIN_MAP** (new constant in querysynthesis.js):
- Maps known proper nouns to their plausible domains
- Example: `google → [TECHNOLOGY, CAPITAL, MEDIA, CAREER]`
- Extensible — new entries added without touching routing logic

**Re-fire contract:**
- User selects domain → caller injects `{ domain }` into query context → `resolvePrimary()` bypasses detection, returns selected domain directly

---

## 7. File Map

| File | Change |
|------|--------|
| `src/engine/querysynthesis.js` | Add `ENTITY_DOMAIN_MAP` constant; extend `resolvePrimary()` to build `options[]` on AMBIGUOUS; add re-fire bypass via injected domain |
| `src/components/[target packet or search surface]` | Render options UI when `state === 'AMBIGUOUS' && options.length > 0`; selection re-fires synthesis |

**TBD:** Which component renders the options UI — must be confirmed before build.

---

## 8. Bottle Test

1. **Reduces ambiguity?** YES — turns a silent failure into a directed question
2. **Single dominant output?** YES — options payload on AMBIGUOUS
3. **All boundaries defined?** YES — in/out scope explicit
4. **No undefined dependencies?** PARTIAL — UI mount point TBD (blocks build)
5. **Does not increase expressive flexibility in core?** YES — no new domains, no new synthesis paths

**BLOCKED** on: UI mount point confirmation.

---

## 9. Definition of Done

- `"stereo"` → AMBIGUOUS + 3 options rendered, no synthesis
- `"Google"` → AMBIGUOUS + 4 options (TECHNOLOGY / CAPITAL / MEDIA / CAREER) rendered
- `"car"` → routes to AUTO as before (no regression)
- `"buy a house in Miami"` → routes to REAL_ESTATE as before (no regression)
- User selects option → synthesis fires for that domain
- `resolutionEligible: false` propagates — export brief withholds until domain is selected
