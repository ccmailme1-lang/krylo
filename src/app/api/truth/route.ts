// WO-501 — ETR Schema Extension: definition + comments added to prompt
import { NextRequest, NextResponse } from 'next/server';
import { FALLBACK_DATA } from '@/lib/truthTypes';

const TRUTH_PROMPT = (query: string) =>
  `Analyze the following query and respond with strict JSON matching the TruthData schema.

Query: "${query}"

Required fields:
- signal_score: integer 0-100
- truth_statement: 1 sentence summary of the signal
- truth_supporting: 1-2 sentence elaboration
- definition: plain-language definition of what this signal means in context (1-2 sentences)
- comments: array of 2-4 evidence items, each with { id: string, text: string, source: string, timestamp: ISO 8601 string }
- signals: []
- patterns: []
- tags: string[]
- ground: {}

Respond with valid JSON only. No markdown. No explanation.`;

export async function POST(req: NextRequest) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s Hard Timeout

  try {
    const { query } = await req.json();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        temperature: 0.0,
        messages: [{ role: 'user', content: TRUTH_PROMPT(query) }]
      })
    });

    clearTimeout(timeoutId);
    // ... Parsing logic with fallback as defined in stabilized spec
    return NextResponse.json(await response.json());
  } catch (err) {
    return NextResponse.json(FALLBACK_DATA, { status: 200 }); // Resilience Gate
  }
}
