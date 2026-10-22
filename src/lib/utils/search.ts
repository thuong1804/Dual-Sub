import { SubtitleSegment } from '@/types/subtitles';

/**
 * Section 5.2: Active Subtitle Lookup (O(log N) Binary Search)
 * Polling intervals running at 100ms calling linear find() cause CPU strain.
 * This binary search maintains optimal performance even for 2,000+ line transcripts.
 */
export function findActiveSubtitleIndex(
  subtitles: SubtitleSegment[],
  currentTime: number
): number {
  if (!subtitles || subtitles.length === 0) return -1;

  let low = 0;
  let high = subtitles.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const sub = subtitles[mid];

    if (currentTime >= sub.start && currentTime <= sub.end) {
      return mid;
    } else if (currentTime < sub.start) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  // Grace fallback: if in a minor gap between segments (e.g. 0.2s pause),
  // return the closest preceding segment if it ended very recently (< 0.5s ago)
  if (high >= 0 && high < subtitles.length) {
    const lastSub = subtitles[high];
    if (currentTime >= lastSub.end && currentTime - lastSub.end < 0.5) {
      return high;
    }
  }

  return -1;
}
