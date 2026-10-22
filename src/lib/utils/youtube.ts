/**
 * Extracts YouTube 11-character video ID from varied URL formats or direct IDs
 */
export function extractVideoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // If already 11 alphanumeric + _ - characters
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    // Check standard URL patterns
    const url = new URL(trimmed);

    // youtu.be/<id>
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0];
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }

    // youtube.com/watch?v=<id>
    if (url.searchParams.has('v')) {
      const id = url.searchParams.get('v');
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }

    // youtube.com/embed/<id> or youtube.com/shorts/<id> or youtube.com/v/<id>
    const pathParts = url.pathname.split('/').filter(Boolean);
    const prefixIdx = pathParts.findIndex((part) =>
      ['embed', 'shorts', 'v', 'live'].includes(part.toLowerCase())
    );
    if (prefixIdx !== -1 && pathParts[prefixIdx + 1]) {
      const id = pathParts[prefixIdx + 1];
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }
  } catch {
    // If not a standard URL, fallback regex search for 11-char pattern
    const match = trimmed.match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/|\/v\/|^)([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Formats time in seconds to mm:ss or hh:mm:ss format
 */
export function formatTimestamp(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');

  if (hrs > 0) {
    const hh = String(hrs).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  return `${mm}:${ss}`;
}
