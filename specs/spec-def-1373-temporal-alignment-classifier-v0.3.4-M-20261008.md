# DEF-1373 — Temporal Alignment & Classifier Reachability

Consolidated Specification · v0.3.4-M · Engineering Validation Candidate

Saved 2026-10-08 as received from the Founder (pasted). The inline math below arrived with duplicated rendering markup from the paste; the plain-text statements next to each formula are the intended content: T = 1 - min(1, sigma_t / kappa) with kappa = W / sqrt(12), W = 365 days; V' = min(1, sigma_c / 0.5); M = M_raw or M_raw / 100.

## 1. Purpose

Correct the mathematical and logical defects in the convergence classifier so its states are reachable, its temporal input reflects actual event dates, and invalid or insufficient inputs cannot be misrepresented as measured outcomes.

This specification consolidates the approved decisions from patches r1–r5. It defines the required behavior for engineering validation; it does not authorize implementation.

## 2. Defects being addressed

The original classifier had four core defects:

1. Temporal input was effectively constant. Callers supplied fixed T values rather than calculating temporal alignment from source event dates.
2. The turbulence threshold was unreachable. V was the population standard deviation of confidence values in [0,1], whose maximum is 0.5, while the original condition required V > 0.8.
3. Two inputs were redundant. D and A were both assigned the same magnitude in the existing callers.
4. Classification could misrepresent uncertainty. Missing or invalid inputs needed to be distinguished from valid measurements that produce a `MEDIUM` state.

## 3. Temporal alignment — T

### Definition

Use actual source event dates, not ingestion timestamps.

Let:

* W = 365 days — fixed temporal horizon.
* t_i — valid event dates, represented consistently as numeric timestamps.
* sigma_t — population standard deviation of the event dates, measured in days.
* kappa = W / sqrt(12) — temporal calibration constant.

Calculate:

T = 1 - min(1, sigma_t / kappa)

The result lies in [0,1]: higher values indicate tighter temporal clustering; lower values indicate greater temporal dispersion.

### Insufficient evidence

* Fewer than two valid event dates: set T = null.
* Record the reason as insufficient temporal evidence.
* Do not substitute a default T value.

### Mathematical reference tests

| Event dates, expressed relative to the horizon | Expected result |
| --- | --- |
| {0, W/2, W} | sigma_t = W / sqrt(6); T = 0 |
| {0, W/2, W/2} | sigma_t = W / sqrt(18); T ≈ 0.1835 |
| Any valid dates with sigma_t = 0 | T = 1 |
| Fewer than two valid dates | T = null |

These are mathematical reference tests. Final acceptance must also trace real query data through the production path.

Interpretation constraint: T measures the temporal clustering of event dates. It does not independently establish that events are causally related or that a formation is turbulent.

## 4. Confidence dispersion — V'

Let c_i be the valid domain-signal confidence values, each in [0,1], and let sigma_c be their population standard deviation.

Normalize the dispersion:

V' = min(1, sigma_c / 0.5)

Because the maximum population standard deviation of values in [0,1] is 0.5, the normalized value V' lies in [0,1].

Reference test:

- Confidence vector {0, 1}: sigma_c = 0.5, so V' = 1.

Insufficient or invalid confidence evidence must not be converted into an apparently measured score. Apply the input-validation rules in Section 7.

## 5. Magnitude — M

### Producer-declared scale

The deployment configuration must declare:

`config.magnitude_scale ∈ {"0-1", "0-100"}`

Use a fixed mapping:

* `"0-1"`: M = M_raw
* `"0-100"`: M = M_raw / 100
* Missing or unsupported configuration: raise `CONFIGURATION_ERROR` during startup.

Do not infer the scale from the observed dataset's minimum and maximum. Do not use dataset-relative min-max normalization.

A constant magnitude is valid if it is within the declared scale.

### Runtime validation

After conversion, if M is null, non-numeric, non-finite, or outside [0,1], mark it invalid and return `UNCERTAIN` from classification. Record the reason, such as `INVALID_MAGNITUDE`.

The magnitude producer and all classifier callers must be checked to verify that the declared scale matches actual emitted values.

## 6. Remove redundant magnitude inputs

D and A were identical in the existing callers. The classifier should use one effective magnitude input, M, rather than treating D and A as independent signals.

The implementation audit must confirm this across every relevant caller. Any caller with genuinely different semantics for D and A requires separate evidence and review; their equivalence must not be assumed beyond the documented current behavior.

## 7. Classifier thresholds and state logic

### Approved thresholds

| Parameter | Threshold |
| --- | --- |
| Temporal alignment, tau_T | 0.65 |
| Normalized confidence dispersion, tau_V | 0.80 |
| Magnitude, tau_M | 0.75 |

### Input validation

T, V', and M must each be:

* Present and non-null.
* Numeric and finite.
* Within [0,1], inclusive.

Any failed validation produces `UNCERTAIN`, with the reason logged separately. Invalid inputs must not fall through to `MEDIUM`.

### Classification

```
function is_valid(x):
    return x is not null
       and isfinite(x)
       and 0 <= x <= 1

function classify_state(T, Vp, M):
    if not is_valid(T)
       or not is_valid(Vp)
       or not is_valid(M):
        return UNCERTAIN

    if T >= 0.65 and Vp >= 0.80:
        if M >= 0.75:
            return TURBULENT
        return HIGH

    return MEDIUM
```

Threshold comparisons are inclusive. A valid input set that does not satisfy both the T and V' thresholds produces `MEDIUM`; missing or invalid evidence produces `UNCERTAIN`.

## 8. UI behavior

The existing UI convention maps `UNCERTAIN` to the `MEDIUM` ring color with a hatch overlay.

The overlay must preserve the distinction between:

* A measured `MEDIUM` classification.
* An `UNCERTAIN` classification caused by insufficient or invalid evidence.

Validation must confirm the actual rendered behavior on the MAP surface. A matching color alone is not sufficient evidence that the distinction is preserved.

## 9. Engineering validation gate

No implementation should be considered validated based solely on mathematical reference tests or synthetic data.

Required validation checklist (0 of 8):

1. Verify the producer-declared magnitude scale and fixed conversion for both supported configurations.
2. Verify startup rejection of missing or unsupported magnitude-scale configuration.
3. Test null, malformed, NaN, infinite, and out-of-range values for T, V', and M.
4. Test exact threshold boundaries and values immediately above and below each threshold.
5. Verify reachability and correct outcomes for TURBULENT, HIGH, MEDIUM, and UNCERTAIN.
6. Trace real source event dates through temporal calculation and classification.
7. Verify MAP ring color and hatch behavior for measured MEDIUM versus UNCERTAIN.
8. Audit all classifier callers for fixed T values, magnitude-scale consistency, and redundant D/A inputs.

## 10. Open item — R1

Robust estimation of temporal dispersion remains open.

Standard deviation is sensitive to outliers. Alternative robust estimators and any associated changes to thresholds require a separate architectural decision. R1 is outside this patch and must not be represented as resolved.

## 11. Version and disposition

* Specification version: `v0.3.4-M`
* Status: Mathematical specification approved for Engineering Validation.
* Implementation status: Not established by this specification.
* Production verification: Pending end-to-end validation.
* R1: Open, tracked separately.
* Authorization: This consolidation does not authorize implementation, deployment, or changes to unrelated architecture.

Acceptance criterion: DEF-1373 is validated only when the approved mathematical behavior, input handling, caller integration, and rendered MAP behavior have been verified—not merely when the code passes synthetic classifier tests.
