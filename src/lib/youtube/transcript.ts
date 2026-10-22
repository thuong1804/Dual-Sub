import { YoutubeTranscript } from 'youtube-transcript';
import { RawTranscriptItem } from '@/types/subtitles';

export interface FetchTranscriptResult {
  items: RawTranscriptItem[];
  detectedLang?: string;
}

/**
 * Extracts raw transcript for a given YouTube Video ID
 * Supports auto-generated and manual subtitles without YouTube Data API quota.
 */
export async function fetchRawTranscript(videoId: string): Promise<FetchTranscriptResult> {
  try {
    const rawItems = await YoutubeTranscript.fetchTranscript(videoId);

    if (!rawItems || rawItems.length === 0) {
      throw new Error('NO_CAPTIONS');
    }

    const detectedLang = (rawItems[0] as { lang?: string })?.lang || 'en';

    // youtube-transcript returns offset & duration in milliseconds
    // Normalize to seconds
    const items: RawTranscriptItem[] = rawItems.map((item) => {
      const rawOffset = Number(item.offset) || 0;
      const rawDuration = Number(item.duration) || 0;

      return {
        text: item.text || '',
        // If > 100, it's almost certainly milliseconds (since first word usually appears within seconds)
        offset: rawOffset > 100 ? rawOffset / 1000 : rawOffset,
        duration: rawDuration > 100 ? rawDuration / 1000 : rawDuration,
      };
    });

    return {
      items,
      detectedLang,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    // If captions disabled or not available
    if (
      errorMsg.includes('Could not find transcript') ||
      errorMsg.includes('Transcript is disabled') ||
      errorMsg.includes('NO_CAPTIONS')
    ) {
      const error = new Error('No subtitles or captions available for this video.');
      (error as { code?: string }).code = 'NO_CAPTIONS';
      throw error;
    }

    if (errorMsg.includes('Video unavailable') || errorMsg.includes('150') || errorMsg.includes('101')) {
      const error = new Error('Video cannot be accessed or embedded.');
      (error as { code?: string }).code = 'EMBED_DISABLED';
      throw error;
    }

    if (errorMsg.includes('429') || errorMsg.includes('Too Many Requests')) {
      const error = new Error('YouTube request limit reached. Please retry in a few moments.');
      (error as { code?: string }).code = 'RATE_LIMITED';
      throw error;
    }

    throw new Error(`Failed to extract subtitles: ${errorMsg}`);
  }
}
