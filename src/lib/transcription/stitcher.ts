import { RawTranscriptItem, SubtitleSegment } from '@/types/subtitles';

/**
 * Decodes basic HTML entities commonly found in YouTube transcripts
 */
function cleanTranscriptText(text: string): string {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a text fragment ends with sentence-terminating punctuation.
 */
function hasSentenceTerminal(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  // Match standard sentence terminals, including ellipses, quotes after terminal
  return /[.!?]["'”’]?$/.test(trimmed);
}

/**
 * Section 3.2: Sentence Merging Algorithm
 * YouTube auto-generated captions break text by acoustic pauses (every 1.5 - 3 seconds).
 *
 * Rules:
 * 1. Concatenate consecutive text fragments if gap (next.start - current.end) < 0.8s
 *    AND current text does not terminate with punctuation ('.', '?', '!').
 * 2. Recalculate segment bounds:
 *    merged.start = fragment1.start
 *    merged.end = fragmentN.end
 *    merged.duration = merged.end - merged.start
 * 3. Enforce maximum stitched duration (e.g. 12 seconds or 250 chars) to prevent runaway sentences
 *    if YouTube captions omit punctuation completely.
 */
export function stitchTranscriptSegments(rawItems: RawTranscriptItem[]): SubtitleSegment[] {
  if (!rawItems || rawItems.length === 0) return [];

  const normalizedItems = rawItems
    .map((item) => {
      // In youtube-transcript, offset and duration might be in seconds or ms.
      // Usually offset is seconds (float) or milliseconds.
      // If offset > 10000 on early items, it's milliseconds; but youtube-transcript standard is seconds (float).
      const text = cleanTranscriptText(item.text);
      let start = Number(item.offset) || 0;
      let duration = Number(item.duration) || 0;

      // Safety check: if values are huge (in ms), convert to seconds
      if (start > 100000 && item.offset > 1000) {
        start = start / 1000;
        duration = duration / 1000;
      }

      return {
        text,
        start: Math.max(0, start),
        end: Math.max(0, start + duration),
        duration: Math.max(0.1, duration),
      };
    })
    .filter((item) => item.text.length > 0);

  if (normalizedItems.length === 0) return [];

  const stitched: SubtitleSegment[] = [];
  let currentGroup = {
    start: normalizedItems[0].start,
    end: normalizedItems[0].end,
    texts: [normalizedItems[0].text],
  };

  const MAX_GAP = 0.8; // 0.8 seconds max gap
  const MAX_STITCH_DURATION = 10.0; // 10s ceiling for continuous speech without punctuation
  const MAX_STITCH_LENGTH = 200; // character ceiling

  for (let i = 1; i < normalizedItems.length; i++) {
    const nextItem = normalizedItems[i];
    const currentEnd = currentGroup.end;
    const gap = nextItem.start - currentEnd;
    const combinedLength = currentGroup.texts.join(' ').length + nextItem.text.length;
    const groupDuration = nextItem.end - currentGroup.start;

    const lastText = currentGroup.texts[currentGroup.texts.length - 1];
    const isPunctuationTerminated = hasSentenceTerminal(lastText);

    const shouldMerge =
      gap >= -0.2 && // Allow slight overlapping captions
      gap < MAX_GAP &&
      !isPunctuationTerminated &&
      groupDuration <= MAX_STITCH_DURATION &&
      combinedLength <= MAX_STITCH_LENGTH;

    if (shouldMerge) {
      currentGroup.end = Math.max(currentGroup.end, nextItem.end);
      currentGroup.texts.push(nextItem.text);
    } else {
      // Finalize current group
      const original = currentGroup.texts.join(' ').trim();
      if (original) {
        stitched.push({
          id: stitched.length + 1,
          start: Number(currentGroup.start.toFixed(2)),
          end: Number(currentGroup.end.toFixed(2)),
          duration: Number((currentGroup.end - currentGroup.start).toFixed(2)),
          original,
          translated: '', // will be populated by Translation Engine
        });
      }

      // Start new group
      currentGroup = {
        start: nextItem.start,
        end: nextItem.end,
        texts: [nextItem.text],
      };
    }
  }

  // Push final group
  const finalOriginal = currentGroup.texts.join(' ').trim();
  if (finalOriginal) {
    stitched.push({
      id: stitched.length + 1,
      start: Number(currentGroup.start.toFixed(2)),
      end: Number(currentGroup.end.toFixed(2)),
      duration: Number((currentGroup.end - currentGroup.start).toFixed(2)),
      original: finalOriginal,
      translated: '',
    });
  }

  return stitched;
}
