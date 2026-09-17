# SPEC — Deploy Streamline

Status: DRAFT for Founder review. No ticket yet. No code beyond the recording-exclude already
applied to `deploy.sh` this session.

---

## PROBLEM

`./deploy.sh` ships **1.7 GB** to prod on every deploy. Measured breakdown of `dist/`:

| Contents | Size | Served to a user? |
|---|---|---|
| App code — JS + CSS + fonts | **3.7 MB** | Yes — this is the product |
| Screen recordings + screenshots (`public/assets/Screen Recording *.mov`, 90 files) | **1.3 GB** | No — never referenced anywhere |
| Other media (`.mp4` / `.mov` / `.mp3`) | ~0.1 GB | 1 file referenced (`Elephant_Animation_Scale_Correction_5.mp4`), rest not |
| Images (`.png` / `.jpg` / `.svg`) | **250 MB** | ~6 referenced (`cities/*_matte`, `hero_face.png`, `paper-stack.png`), rest not |

**~99.8% of the deploy payload is files no user ever loads.** Root causes:

1. QA screen recordings are saved into `public/assets/` (gitignored, so invisible to `git status`).
   `vite build` copies all of `public/` into `dist/`; `deploy.sh` rsyncs all of `dist/`.
2. `deploy.sh` rsync has no `--partial` — a dropped or killed transfer restarts from zero.
3. `--delete-before` deletes on the destination *before* transferring — a mid-transfer failure can
   leave prod with old files gone and new files not yet up.
4. No guardrail on `dist/` size, so this regresses silently every time a recording is added.

Observed impact this session: first deploy of the day = ~35 min wall time (cold 1.5 GB rsync);
two transfers had to be killed and fully restarted.

`vite build` itself is ~12 s and is **not** the bottleneck — the rsync payload is.

---

## TARGET

- End-to-end deploy wall time (`./deploy.sh` start → `✓ done`) cut **≥ 50%**. With payload going
  from 1.7 GB to < 30 MB, the realistic cut is **> 95%** on a warm deploy and far more on a cold one.
- **Diffs only** (Founder directive, standing): a deploy transfers only files that actually
  changed since the last deploy — never a full re-push. rsync already does delta-transfer by
  default; what breaks it today is (a) killed transfers leaving partial files that get re-sent
  whole because there is no `--partial`, and (b) 1.65 GB of dead weight it must still stat/walk
  every run. Phase 1 + Phase 3 make diffs-only actually hold.
- A killed/dropped deploy resumes instead of restarting.
- `dist/` size cannot silently regress past a ceiling.

---

## SOLUTION (phased, smallest first)

### Phase 1 — Get non-served files out of `public/` (the 99% win)
- Create `~/krylo-media-archive/` (outside the repo). Move every `public/assets/Screen Recording *`
  and `Screenshot *` into it. The recordings are preserved, just not in the build path.
- Move unreferenced media/images out too. Keep only what a grep of `src/` + `public/*.html` proves
  is referenced (currently: `assets/cities/{LA,SF,miami}_matte.jpg`, `philly_matte.png`,
  `assets/Elephant_Animation_Scale_Correction_5.mp4`, `assets/hero_face.png`,
  `assets/paper-stack.png` — the reference list is regenerated as part of this phase, not assumed).
- Result: `dist/` ≈ 3.7 MB code + < 25 MB referenced media.

### Phase 2 — Make recordings physically unable to re-bloat the build
- New home for QA recordings is `~/krylo-media-archive/` or a repo-root `recordings/` dir that is
  **not** under `public/`. Document it in `CLAUDE.md`.
- `predeploy` (or `prebuild`) check: fail the deploy if `du -sm dist` exceeds a ceiling
  (proposed 100 MB) or if any `dist/**/Screen Recording *` exists. Cheap, ~0 s, catches regressions.

### Phase 3 — rsync robustness
- Add `--partial` (resume interrupted transfers) and `--info=progress2` (real progress line).
- Switch `--delete-before` → `--delete-after` (prod stays fully populated until the new set is
  confirmed transferred).
- Keep the `--exclude 'Screen Recording *' / 'Screenshot *'` already added this session as a
  belt-and-suspenders guard even after Phase 1.

### Phase 4 — (optional) separate the code deploy from the media deploy
- `deploy.sh` fast path rsyncs only code + html + fonts (< 5 MB, seconds).
- Referenced large media rsync'd in a separate step that is checksum-gated (`rsync -c`) so it only
  moves bytes when a media file actually changed — which is almost never.
- Only worth doing if Phase 1–3 don't get the deploy under ~30 s.

### Phase 5 — (optional, marginal) build compile
- `vite build` is already ~12 s with a warm `node_modules/.vite` (35 MB cache present).
- `vendor-three` (1 MB) is already its own chunk. `index-*.js` is 1.96 MB (603 KB gzip) — a
  manual-chunks pass could split it, but this affects browser load time, not deploy time. Low
  priority; note only.

---

## COMPONENTS TOUCHED

- `deploy.sh` — rsync flags, size guard (Phases 2–4).
- `public/assets/` — contents pruned (Phase 1). No code change.
- `package.json` — `predeploy`/`prebuild` size check script (Phase 2).
- `CLAUDE.md` — where QA recordings live (Phase 2).
- New: `scripts/check-dist-size.mjs` (Phase 2).
- No application source files. No behavior change to the product.

---

## VALIDATION

1. `du -sh dist` after Phase 1 ≤ 30 MB.
2. `./deploy.sh` wall time measured before (baseline, this session ≈ 35 min cold / unknown warm)
   and after. Warm deploy target < 60 s.
3. Prod site loads; the ~7 referenced media assets return 200 (scripted check against the health
   host, no secrets touched).
4. Kill a deploy mid-rsync, re-run — confirm it resumes (`--partial`) rather than restarting.
5. Add a dummy 200 MB file to `public/assets/`, run deploy — confirm the size guard blocks it.

---

## ROLLBACK

- Phase 1: move files back from `~/krylo-media-archive/` into `public/assets/`.
- Phases 2–4: `git checkout deploy.sh package.json CLAUDE.md`; delete `scripts/check-dist-size.mjs`.
- No prod state is destroyed — `--delete-after` and the dry-run review gate both remain.

---

## GUIDELINES / GUARDRAILS PRESERVED

- Screen recordings and any non-served media never go in `public/`.
- A new media asset ships only if a grep proves it is referenced; otherwise it does not enter `dist/`.
- `rsync --delete` / `--delete-excluded` against prod still runs `--dry-run` first with the delete
  list reviewed (CLAUDE.md §19a) — unchanged.
- Production deploy still requires explicit per-turn authorization (CLAUDE.md §19a) — unchanged.
