export interface SubtitleSegment {
  id: number;
  start: number;       // in seconds
  end: number;         // in seconds
  duration: number;    // in seconds
  original: string;
  translated: string;
}

export interface RawTranscriptItem {
  text: string;
  offset: number;     // in milliseconds or seconds depending on source
  duration: number;   // in milliseconds or seconds
}

export interface ProcessSubtitlesRequest {
  videoId: string;
  targetLanguage?: string;
  forceRefresh?: boolean;
}

export interface ProcessSubtitlesResponse {
  success: boolean;
  videoId?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  isCached?: boolean;
  totalSegments?: number;
  subtitles?: SubtitleSegment[];
  error?: string;
  errorCode?: 'NO_CAPTIONS' | 'EMBED_DISABLED' | 'RATE_LIMITED' | 'FETCH_FAILED' | 'INVALID_URL';
}

export type ProcessingStep = 'idle' | 'validating' | 'extracting' | 'translating' | 'ready' | 'error';

export interface SupportedLanguage {
  code: string;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'vi', name: 'Tiếng Việt (Vietnamese)', flag: '🇻🇳' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ja', name: '日本語 (Japanese)', flag: '🇯🇵' },
  { code: 'ko', name: '한국어 (Korean)', flag: '🇰🇷' },
  { code: 'zh', name: '中文 (Chinese)', flag: '🇨🇳' },
  { code: 'es', name: 'Español (Spanish)', flag: '🇪🇸' },
  { code: 'fr', name: 'Français (French)', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch (German)', flag: '🇩🇪' },
  { code: 'ru', name: 'Русский (Russian)', flag: '🇷🇺' },
];
