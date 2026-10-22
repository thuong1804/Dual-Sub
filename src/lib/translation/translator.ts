import { SubtitleSegment } from '@/types/subtitles';

interface TranslationItem {
  id: number;
  translated: string;
}

export interface TranslationOptions {
  customGeminiKey?: string;
  customOpenAiKey?: string;
}

/**
 * Section 3.3: Batch LLM Translation
 * Groups 20 to 30 stitched sentences into a single payload and enforces strict JSON schemas.
 */
export async function batchTranslateSubtitles(
  segments: SubtitleSegment[],
  sourceLang = 'en',
  targetLang = 'vi',
  options?: TranslationOptions
): Promise<SubtitleSegment[]> {
  if (!segments || segments.length === 0) return [];
  if (sourceLang.toLowerCase() === targetLang.toLowerCase()) {
    return segments.map((s) => ({ ...s, translated: s.original }));
  }

  const geminiKey = options?.customGeminiKey || process.env.GEMINI_API_KEY;
  const openAiKey = options?.customOpenAiKey || process.env.OPENAI_API_KEY;

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

      // 1. Try Gemini if API key is provided
      if (geminiKey) {
        batchResults = await translateWithGemini(inputBatch, sourceLang, targetLang, geminiKey);
      } else if (openAiKey) {
        batchResults = await translateWithOpenAI(inputBatch, sourceLang, targetLang, openAiKey);
      }

      // 2. If no API key or LLM failed, use reliable batch translator
      if (!batchResults || batchResults.length === 0) {
        batchResults = await translateWithClients5Batch(inputBatch, targetLang);
      }

      for (const item of batchResults) {
        translatedSegmentsMap.set(item.id, item.translated);
      }
    } catch (batchErr) {
      console.warn('Batch translation warning, attempting resilient fallback:', batchErr);
      const fallbackResults = await translateWithClients5Batch(inputBatch, targetLang);
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
  targetLang: string,
  apiKey: string
): Promise<TranslationItem[]> {
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
  targetLang: string,
  apiKey: string
): Promise<TranslationItem[]> {
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
 * Ultra-fast batch translation via clients5 Google service
 * Handles joined newlines without triggering 429 rate limit
 */
async function translateWithClients5Batch(
  items: { id: number; original: string }[],
  targetLang: string
): Promise<TranslationItem[]> {
  const texts = items.map((i) => i.original.replace(/\n+/g, ' '));
  const joinedText = texts.join('\n');

  try {
    const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${targetLang}&q=${encodeURIComponent(joinedText)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (res.ok) {
      const data = await res.json();
      let translatedText = '';
      if (Array.isArray(data)) {
        if (Array.isArray(data[0])) {
          translatedText = data[0][0] || '';
        } else if (typeof data[0] === 'string') {
          translatedText = data[0];
        }
      }

      const translatedLines = translatedText.split('\n');

      if (translatedLines.length === items.length) {
        return items.map((item, idx) => ({
          id: item.id,
          translated: translatedLines[idx]?.trim() || item.original,
        }));
      }
    }
  } catch (err) {
    console.warn('Batch clients5 error, falling back to line-by-line:', err);
  }

  // Fallback: translate line by line if split counts diverged
  return Promise.all(
    items.map(async (item) => {
      try {
        const lineUrl = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${targetLang}&q=${encodeURIComponent(item.original)}`;
        const lineRes = await fetch(lineUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        if (lineRes.ok) {
          const lineData = await lineRes.json();
          let lineTrans = '';
          if (Array.isArray(lineData)) {
            lineTrans = Array.isArray(lineData[0]) ? lineData[0][0] : lineData[0];
          }
          if (lineTrans) {
            return { id: item.id, translated: lineTrans };
          }
        }

        // Secondary fallback to MyMemory API
        const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(item.original)}&langpair=en|${targetLang}`;
        const mmRes = await fetch(mmUrl);
        if (mmRes.ok) {
          const mmData = await mmRes.json();
          const mmTrans = mmData.responseData?.translatedText;
          if (mmTrans) {
            return { id: item.id, translated: mmTrans };
          }
        }
      } catch {
        // Ignore
      }
      return { id: item.id, translated: item.original };
    })
  );
}

function parseJsonArray<T>(text: string): T[] {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
  }
  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed) ? parsed : [];
}
