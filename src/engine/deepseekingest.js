// WO-1032 Stage 1 — DeepSeek signal ingestion + pattern recognition
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com'
});

const SYSTEM_PROMPT = `You are Stage 1 of a three-stage Signal Intelligence pipeline for KRYLO. Your job is signal ingestion and pattern recognition only. You do not forecast. You do not write narratives. You extract and structure.

Analyze the signal data provided and return a structured signal packet. Be precise. Be analytical. No filler language.

Return exactly this JSON structure:
{
  "rate_of_change": "accelerating | decelerating | stable",
  "deviation_score": 0.0,
  "baseline_comparison": "above | below | at baseline",
  "anomaly_flags": [],
  "velocity_24h": 0,
  "velocity_trend": "rising | falling | flat",
  "source_concentration": "concentrated | distributed",
  "signal_age_hours": 0,
  "signal_category": "",
  "subject_label": "",
  "pattern_summary": ""
}

FIELD DEFINITIONS:
- rate_of_change: is the signal gaining or losing momentum right now?
- deviation_score: how far from normal? 0.0 = perfectly normal, 1.0 = extreme outlier
- baseline_comparison: relative to the 72-hour rolling average
- anomaly_flags: list any unusual patterns (e.g. "sudden spike at hour 14")
- velocity_24h: total mention/signal count in the last 24 hours
- velocity_trend: rising or falling vs the prior 24h window?
- source_concentration: signals from many sources or clustering in one place?
- signal_age_hours: how old is the originating event?
- signal_category: topic category (e.g. "Monetary Policy", "Healthcare", "Geo-Political")
- subject_label: 2-4 word label for what is moving (e.g. "Federal Reserve Rate Hold")
- pattern_summary: one plain sentence describing the overall pattern

RULES:
- Return only the JSON object. No explanation before or after.
- Do not forecast. Do not recommend. Do not editorialize.
- If a field cannot be determined, use null.`;

export async function ingestSignal(signalData) {
  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: typeof signalData === 'string' ? signalData : JSON.stringify(signalData)
      }
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content);
}
