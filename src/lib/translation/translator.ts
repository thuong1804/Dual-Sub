import { SubtitleSegment } from '@/types/subtitles';

interface TranslationItem {
  id: number;
  translated: string;
}

/**
 * Section 3.3: Batch LLM Translation
 * Groups 20 to 30 stitched sentences into a single payload and enforces strict JSON schemas.
 */
export async function batchTranslateSubtitles(
  segments: SubtitleSegment[],
  sourceLang = 'en',
  targetLang = 'vi'
): Promise<SubtitleSegment[]> {
  if (!segments || segments.length === 0) return [];
  if (sourceLang.toLowerCase() === targetLang.toLowerCase()) {
    // If source and target are same, no translation needed
    return segments.map((s) => ({ ...s, translated: s.original }));
  }

  const BATCH_SIZE = 25;
  const batches: SubtitleSegment[][] = [];

  for (let i = 0; i < segments.length; i += BATCH_SIZE) {
    batches.push(segments.slice(i, i + BATCH_SIZE));
  }

  const translatedSegmentsMap = new Map<number, string>();

  // Process batches
  for (const batch of batches) {
    const inputBatch = batch.map((b) => ({ id: b.id, original: b.original }));

    try {
      let batchResults: TranslationItem[] | null = null;

      // Check for Gemini API Key
      if (process.env.GEMINI_API_KEY) {
        batchResults = await translateWithGemini(inputBatch, sourceLang, targetLang);
      } else if (process.env.OPENAI_API_KEY) {
        batchResults = await translateWithOpenAI(inputBatch, sourceLang, targetLang);
      }

      // If no LLM keys or LLM failed, use fast fallback
      if (!batchResults || batchResults.length === 0) {
        batchResults = await translateWithFallback(inputBatch, targetLang);
      }

      for (const item of batchResults) {
        translatedSegmentsMap.set(item.id, item.translated);
      }
    } catch (batchErr) {
      console.warn('Batch translation warning, falling back to line translator:', batchErr);
      const fallbackResults = await translateWithFallback(inputBatch, targetLang);
      for (const item of fallbackResults) {
        translatedSegmentsMap.set(item.id, item.translated);
      }
    }
  }

  // Merge translations back into segments
  return segments.map((seg) => ({
    ...seg,
    translated: translatedSegmentsMap.get(seg.id) || seg.original,
  }));
}

/**
 * Translate using Gemini API (Gemini 1.5 Flash)
 */
async function translateWithGemini(
  items: { id: number; original: string }[],
  sourceLang: string,
  targetLang: string
): Promise<TranslationItem[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

  const systemInstruction = `You are an accurate, contextual subtitle translator.
Translate the following array of spoken phrases from ${sourceLang} into ${targetLang}.
Maintain conversational tone and idiomatic nuances suited for video subtitles.
Strictly output a valid JSON array preserving the original indices without markdown backticks:
[
  { "id": 1, "translated": "..." }
]`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemInstruction },
            { text: JSON.stringify(items) },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) throw new Error('Empty response from Gemini');

  return parseJsonArray<TranslationItem>(textContent);
}

/**
 * Translate using OpenAI API (gpt-4o-mini)
 */
async function translateWithOpenAI(
  items: { id: number; original: string }[],
  sourceLang: string,
  targetLang: string
): Promise<TranslationItem[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an accurate, contextual subtitle translator.
Translate the following array of spoken phrases from ${sourceLang} into ${targetLang}.
Maintain conversational tone and idiomatic nuances suited for video subtitles.
Strictly output JSON in format: { "items": [ { "id": 1, "translated": "..." } ] }`,
        },
        {
          role: 'user',
          content: JSON.stringify({ items }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');

  const parsed = JSON.parse(content);
  return Array.isArray(parsed) ? parsed : parsed.items || [];
}

/**
 * High-reliability fallback translation when no LLM API key is configured
 * Uses Google Translate gtx service endpoint in parallel batches
 */
async function translateWithFallback(
  items: { id: number; original: string }[],
  targetLang: string
): Promise<TranslationItem[]> {
  const results = await Promise.all(
    items.map(async (item) => {
      try {
        const encoded = encodeURIComponent(item.original);
        const res = await fetch(
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encoded}`,
          { headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        if (!res.ok) throw new Error(`GTX status: ${res.status}`);
        const data = await res.json();
        // data[0] is array of [[translatedChunk, originalChunk], ...]
        const translated = data?.[0]?.map((c: [string]) => c[0]).join('') || item.original;
        return { id: item.id, translated };
      } catch {
        return { id: item.id, translated: item.original };
      }
    })
  );
  return results;
}

function parseJsonArray<T>(text: string): T[] {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
  }
  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed) ? parsed : [];
}
