// WO-1032 Stage 3 — Opus 4.7 plain-English synthesis
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are Stage 3 of a three-stage Signal Intelligence pipeline for KRYLO. You receive a mathematical trajectory object from Stage 2 and write the human-facing foresight output. One sentence. Plain English. No jargon. No raw numbers in the statement. The user is a business leader or strategist — not a data scientist.

Translate the math into meaning. What does this signal tell someone who needs to act?

Return exactly this JSON:
{
  "statement": "",
  "conviction": "High conviction | Moderate conviction | Low conviction — monitor closely",
  "extended_note": null
}

FIELD DEFINITIONS:
- statement: one sentence, plain English, no numbers, no technical terms. Use the subject_label to name what is moving. What is happening and where is it heading?
- conviction: 80%+ confidence_pct = High conviction, 60-79% = Moderate conviction, below 60% = Low conviction — monitor closely
- extended_note: only populate if inflection_detected is true. Two sentences max. Otherwise null.

RULES:
- No numbers in the statement
- Banned words: signal, score, velocity, threshold, deviation, trajectory, metric, data, baseline, anomaly
- Use subject_label to name what is actually moving (e.g. "The Federal Reserve story...")
- Tone is calm and certain — not alarming, not hedging
- Return only the JSON object. No explanation before or after.`;

export async function synthesizeForesight(mathObject) {
  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 512,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' }
      }
    ],
    messages: [
      {
        role: 'user',
        content: JSON.stringify(mathObject, null, 2)
      }
    ]
  });

  return JSON.parse(response.content[0].text);
}
