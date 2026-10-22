import { NextRequest, NextResponse } from 'next/server';
import { extractVideoId } from '@/lib/utils/youtube';
import { fetchRawTranscript } from '@/lib/youtube/transcript';
import { stitchTranscriptSegments } from '@/lib/transcription/stitcher';
import { batchTranslateSubtitles } from '@/lib/translation/translator';
import { getCachedSubtitles, setCachedSubtitles, invalidateCache } from '@/lib/cache';
import { ProcessSubtitlesRequest, ProcessSubtitlesResponse } from '@/types/subtitles';

export async function POST(req: NextRequest) {
  try {
    const body: ProcessSubtitlesRequest = await req.json();
    const rawVideoId = body.videoId;
    const targetLanguage = (body.targetLanguage || 'vi').toLowerCase();
    const forceRefresh = Boolean(body.forceRefresh);

    const customGeminiKey = req.headers.get('x-gemini-api-key') || undefined;
    const customOpenAiKey = req.headers.get('x-openai-api-key') || undefined;

    if (!rawVideoId) {
      return NextResponse.json<ProcessSubtitlesResponse>(
        {
          success: false,
          error: 'Missing required field: videoId',
          errorCode: 'INVALID_URL',
        },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(rawVideoId);
    if (!videoId) {
      return NextResponse.json<ProcessSubtitlesResponse>(
        {
          success: false,
          error: 'Invalid YouTube URL or Video ID format.',
          errorCode: 'INVALID_URL',
        },
        { status: 400 }
      );
    }

    // Step 1: Check Cache (unless forceRefresh is true)
    if (!forceRefresh) {
      const cached = await getCachedSubtitles(videoId, targetLanguage);
      if (cached && cached.length > 0) {
        // Check if cache actually contains valid translation
        const isUntranslated =
          targetLanguage !== 'en' &&
          cached.length > 0 &&
          cached.slice(0, Math.min(5, cached.length)).every((s) => s.original === s.translated);

        if (!isUntranslated) {
          return NextResponse.json<ProcessSubtitlesResponse>({
            success: true,
            videoId,
            sourceLanguage: 'en',
            targetLanguage,
            isCached: true,
            totalSegments: cached.length,
            subtitles: cached,
          });
        }
      }
    } else {
      await invalidateCache(videoId, targetLanguage);
    }

    // Step 2: Extract raw transcript from YouTube
    let transcriptResult;
    try {
      transcriptResult = await fetchRawTranscript(videoId);
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      if (errorObj.code === 'NO_CAPTIONS') {
        return NextResponse.json<ProcessSubtitlesResponse>(
          {
            success: false,
            videoId,
            error: 'No subtitles or captions available on YouTube for this video.',
            errorCode: 'NO_CAPTIONS',
          },
          { status: 404 }
        );
      }
      if (errorObj.code === 'EMBED_DISABLED') {
        return NextResponse.json<ProcessSubtitlesResponse>(
          {
            success: false,
            videoId,
            error: 'Video is restricted or cannot be embedded (YouTube Error 101/150).',
            errorCode: 'EMBED_DISABLED',
          },
          { status: 403 }
        );
      }
      if (errorObj.code === 'RATE_LIMITED') {
        return NextResponse.json<ProcessSubtitlesResponse>(
          {
            success: false,
            videoId,
            error: 'YouTube request limit reached. Please wait a moment and try again.',
            errorCode: 'RATE_LIMITED',
          },
          { status: 429 }
        );
      }

      throw err;
    }

    const { items: rawItems, detectedLang = 'en' } = transcriptResult;

    // Step 3: Sentence Stitcher (Section 3.2 algorithm)
    const stitched = stitchTranscriptSegments(rawItems);

    if (stitched.length === 0) {
      return NextResponse.json<ProcessSubtitlesResponse>(
        {
          success: false,
          videoId,
          error: 'Subtitles contained no text segments.',
          errorCode: 'NO_CAPTIONS',
        },
        { status: 404 }
      );
    }

    // Step 4: Batch LLM Translation (Section 3.3)
    const translatedSubtitles = await batchTranslateSubtitles(
      stitched,
      detectedLang,
      targetLanguage,
      {
        customGeminiKey,
        customOpenAiKey,
      }
    );

    // Step 5: Save to Two-Tier Cache (Section 3.4)
    await setCachedSubtitles(videoId, targetLanguage, translatedSubtitles);

    // Step 6: Return standard response
    return NextResponse.json<ProcessSubtitlesResponse>({
      success: true,
      videoId,
      sourceLanguage: detectedLang,
      targetLanguage,
      isCached: false,
      totalSegments: translatedSubtitles.length,
      subtitles: translatedSubtitles,
    });
  } catch (error: unknown) {
    console.error('API Error in /api/v1/subtitles/process:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json<ProcessSubtitlesResponse>(
      {
        success: false,
        error: errorMessage,
        errorCode: 'FETCH_FAILED',
      },
      { status: 500 }
    );
  }
}
