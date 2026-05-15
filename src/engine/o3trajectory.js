// WO-1032 Stage 2 — o3 trajectory mathematics
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `You are Stage 2 of a three-stage Signal Intelligence pipeline. You receive a structured signal packet from Stage 1 and perform trajectory mathematics. You do not write narratives. You do not make recommendations. You calculate.

Using the Stage 1 signal packet provided, calculate the forward trajectory of this signal over the next 72 hours. Show your reasoning step by step, then return the JSON.

Return exactly this JSON structure as your final block:
{
  "trajectory": [
    { "t": "+6h",  "score": 0, "upper": 0, "lower": 0 },
    { "t": "+12h", "score": 0, "upper": 0, "lower": 0 },
    { "t": "+24h", "score": 0, "upper": 0, "lower": 0 },
    { "t": "+48h", "score": 0, "upper": 0, "lower": 0 },
    { "t": "+72h", "score": 0, "upper": 0, "lower": 0 }
  ],
  "time_to_threshold": {
    "threshold_score": 90,
    "estimate_hours": null,
    "confidence": 0.0
  },
  "confidence_pct": 0,
  "inflection_detected": false,
  "inflection_detail": null,
  "signal_category": "",
  "subject_label": ""
}

RULES:
- Show mathematical reasoning before the JSON
- Account for all anomaly flags in the signal packet
- Confidence bands must widen over time — uncertainty increases the further out you project
- Cap ALL confidence band values: if upper > 100 set to 100, if lower < 0 set to 0
- Pass signal_category and subject_label through from Stage 1 unchanged
- Return the JSON as the final block`;

export async function calculateTrajectory(signalPacket, currentScore, scoreHistory) {
  const userMessage = `Stage 1 Signal Packet:
${JSON.stringify(signalPacket, null, 2)}

Current Signal Score: ${currentScore}
Score 72h ago: ${scoreHistory.score_72h}
Score 24h ago: ${scoreHistory.score_24h}`;

  const response = await client.chat.completions.create({
    model: 'o3',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage }
    ]
  });

  const content = response.choices[0].message.content;

  // o3 returns reasoning then JSON — extract the final JSON block
  const jsonMatch = content.match(/\{[\s\S]*\}(?=[^{}]*$)/);
  if (!jsonMatch) throw new Error('o3 Stage 2: no valid JSON in response');

  return JSON.parse(jsonMatch[0]);
}
