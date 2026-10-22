import { SubtitleSegment } from '@/types/subtitles';
import fs from 'fs/promises';
import path from 'path';

interface CacheEntry {
  subtitles: SubtitleSegment[];
  expiresAt: number;
  createdAt: number;
}

// Tier 1: In-Memory Cache with 14-day TTL
const memoryCache = new Map<string, CacheEntry>();
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

// Tier 2: Persistent File-System Cache storage folder
const PERSISTENT_CACHE_DIR = path.join(process.cwd(), '.cache', 'subtitles');

async function ensureCacheDirExists() {
  try {
    await fs.mkdir(PERSISTENT_CACHE_DIR, { recursive: true });
  } catch {
    // Ignore if directory already exists
  }
}

function getCacheKey(videoId: string, targetLang: string): string {
  return `sub:${videoId}:${targetLang.toLowerCase()}`;
}

function getPersistentFilePath(videoId: string, targetLang: string): string {
  const safeId = videoId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeLang = targetLang.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  return path.join(PERSISTENT_CACHE_DIR, `${safeId}_${safeLang}.json`);
}

/**
 * Retrieves dual-subtitle payload from Tier 1 (Memory) or Tier 2 (Persistent).
 */
export async function getCachedSubtitles(
  videoId: string,
  targetLang: string
): Promise<SubtitleSegment[] | null> {
  const key = getCacheKey(videoId, targetLang);
  const now = Date.now();

  // 1. Check Tier 1: In-Memory
  const memEntry = memoryCache.get(key);
  if (memEntry) {
    if (memEntry.expiresAt > now) {
      return memEntry.subtitles;
    } else {
      memoryCache.delete(key);
    }
  }

  // 2. Check Tier 2: Persistent Cache (File System / DB)
  try {
    const filePath = getPersistentFilePath(videoId, targetLang);
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data);

    if (Array.isArray(parsed.subtitles) && parsed.subtitles.length > 0) {
      // Re-populate Tier 1 memory cache
      memoryCache.set(key, {
        subtitles: parsed.subtitles,
        expiresAt: now + FOURTEEN_DAYS_MS,
        createdAt: parsed.createdAt || now,
      });
      return parsed.subtitles;
    }
  } catch {
    // Cache miss on Tier 2
  }

  return null;
}

/**
 * Stores subtitles in both Tier 1 and Tier 2 caches.
 */
export async function setCachedSubtitles(
  videoId: string,
  targetLang: string,
  subtitles: SubtitleSegment[]
): Promise<void> {
  const key = getCacheKey(videoId, targetLang);
  const now = Date.now();

  // 1. Write to Tier 1: In-Memory (14-day TTL)
  memoryCache.set(key, {
    subtitles,
    expiresAt: now + FOURTEEN_DAYS_MS,
    createdAt: now,
  });

  // 2. Write to Tier 2: Persistent File Storage
  try {
    await ensureCacheDirExists();
    const filePath = getPersistentFilePath(videoId, targetLang);
    const payload = {
      videoId,
      targetLanguage: targetLang,
      createdAt: now,
      subtitles,
    };
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write to persistent cache:', err);
  }
}

/**
 * Removes entry from cache (for forceRefresh=true)
 */
export async function invalidateCache(videoId: string, targetLang: string): Promise<void> {
  const key = getCacheKey(videoId, targetLang);
  memoryCache.delete(key);

  try {
    const filePath = getPersistentFilePath(videoId, targetLang);
    await fs.unlink(filePath);
  } catch {
    // Ignore error if file doesn't exist
  }
}
