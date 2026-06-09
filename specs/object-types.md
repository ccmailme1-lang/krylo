# KRYLO — Cross-System Object Types (LOCKED 2026-05-22)

All objects flow across Surface, Analysis, Feeds, Artifacts, History.
No component invents its own shape. These are canonical.

---

## TargetEntity
What the user is investigating.
```ts
{
  id:       string
  label:    string          // display name
  type:     'person' | 'company' | 'event' | 'sector' | 'signal'
  tags:     string[]
  created:  number          // epoch ms
}
```

## Signal
A single data point surfaced by the Truth Engine.
```ts
{
  id:          string
  text:        string       // the claim or observation
  source:      string       // origin domain
  source_type: 'news' | 'hn' | 'truth' | 'replay' | 'inference'
  fs:          number       // fidelity score 0–1
  ts:          number       // epoch ms
  origin:      string       // US state or city if geographic
  zone:        'local' | 'regional' | 'national'
  pillar:      'financial' | 'operating' | 'time' | 'personal'
  said:        boolean      // true = public/acknowledged, false = inferred/unsaid
  convergenceState?: string
  confidence?:  number
}
```

## Artifact
Corroborating evidence anchoring an Oracle claim.
```ts
{
  id:       string
  type:     'article' | 'interview' | 'video' | 'filing' | 'post'
  url:      string
  title:    string
  source:   string
  ts:       number
  signalIds: string[]       // signals this artifact corroborates
  excerpt:  string          // relevant pull quote or summary
}
```

## Narrative
The synthesized read produced by Oracle — said vs. unsaid delta.
```ts
{
  id:              string
  sessionId:       string
  claim:           string   // what was said / acknowledged
  telemetry:       string   // what the signals show
  dissonance:      number   // 0–1: gap between claim and signal reality
  convergenceState: string
  pillars:         Record<'financial'|'operating'|'time'|'personal', number>
  ts:              number
}
```

## Inference
A projected leverage position derived from signals.
```ts
{
  id:          string
  sessionId:   string
  lens:        string       // e.g. 'retirement', 'investor'
  pillars:     Record<string, number>  // weight 0–1 per pillar
  confidence:  number
  horizon:     'short' | 'medium' | 'long'
  ts:          number
}
```

## Action
A recommended move from the Action Plan.
```ts
{
  id:          string
  sessionId:   string
  label:       string
  description: string
  pillar:      string
  urgency:     'now' | 'soon' | 'later'
  type:        'protect' | 'expand' | 'reposition' | 'monitor'
}
```

## Session
A complete analysis run — owns all objects produced during it.
```ts
{
  id:        string
  label:     string         // user-visible name or auto-generated
  lens:      string
  targets:   TargetEntity[]
  signals:   Signal[]
  artifacts: Artifact[]
  narratives: Narrative[]
  inferences: Inference[]
  actions:   Action[]
  query:     string         // original search payload
  created:   number
  updated:   number
}
```

---

## Store Ownership
| Object     | Owner store    |
|------------|---------------|
| Session    | analysisStore |
| Signal     | analysisStore + feedStore (live) |
| Narrative  | analysisStore |
| Inference  | analysisStore |
| Action     | analysisStore |
| Artifact   | analysisStore |
| TargetEntity | analysisStore |
| Camera     | renderStore   |
| SwipeIndex | uiStore       |
| HoverCtx   | uiStore       |
