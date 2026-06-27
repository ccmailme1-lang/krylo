## DEF-2011 — Analysis Layer Entry Flash (white/blank frame on touch)

**Reported:** 2026-06-27
**Severity:** Visual / UX — reproducible on mobile touch
**Status:** OPEN

---

### Symptom

White or blank frame briefly visible in the analysis layer when:
- Touching an interactive element inside the analysis panel
- On mobile: keyboard appearing (viewport resize) after initial panel mount

Described as "something trying to load but can't."

---

### Root cause (confirmed by code inspection)

`analysisidlefield.jsx` lines 1235–1242: the wrapper divs for TargetPacket and IntelligenceBrief use `results-enter` animation (`opacity: 0 → 1`, 500ms) with NO background on the wrapper div itself.

```js
// line 1235 — no background on wrapper
<div style={{ position: 'absolute', ..., animation: 'results-enter 500ms ease forwards' }}>
  <TargetPacket />  // has background: '#000' inside
</div>

// line 1238 — 120ms delay + fill-mode 'both' = holds opacity:0 for 120ms
<div style={{ ..., animation: 'results-enter 500ms ease 120ms both' }}>
  <IntelligenceBrief />  // has background inside
</div>
```

`results-enter` keyframe: `from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); }`

The wrapper div is transparent while `opacity < 1`. Whatever is behind (background behind `AnalysisIdleField`) shows through. On mobile, keyboard appearance triggers viewport resize → potential React re-render → `hasSession` re-evaluates → animation can re-fire on remount.

---

### Files to fix

| File | Change |
|------|--------|
| `src/components/analysis/analysisidlefield.jsx` | Add `background: '#000'` to both wrapper divs (lines 1235, 1238) so the background is opaque during the fade-in — inner components' backgrounds are irrelevant during `opacity < 1` |

---

### Fix (one line each)

Line 1235:
```js
<div style={{ position: 'absolute', top: 0, left: 0, right: '38%', bottom: 0, zIndex: 10, background: '#000', animation: 'results-enter 500ms ease forwards' }}>
```

Line 1238:
```js
<div style={{ position: 'absolute', top: 0, left: '62%', right: 0, bottom: 0, zIndex: 10, background: '#000', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', animation: 'results-enter 500ms ease 120ms both' }}>
```

---

### Definition of done

No white/blank frame visible on touch in analysis layer on mobile. `background: '#000'` confirmed on both wrapper divs via grep.
