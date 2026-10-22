# TECHNICAL SPECIFICATION: YOUTUBE DUAL-SUBTITLE WEB APPLICATION

## 1. SYSTEM OVERVIEW

The YouTube Dual-Subtitle Web Application is a lightweight, responsive platform designed for language learners and content consumers. Users input any public YouTube URL or Video ID to watch the video while viewing synchronized, bilingual subtitles (original audio transcript paired side-by-side with translated text in real time).

### Key Architectural Principle: Zero Video Hosting Overhead
* **Video Playback & Bandwidth**: Zero storage and video bandwidth consumption on application servers. Video streams directly from Google/YouTube edge CDN to the client's browser via the official **YouTube IFrame Player API**.
* **Server Responsibilities**: Confined exclusively to subtitle extraction, sentence aggregation, AI-powered contextual translation, and text-level caching (a typical transcript payload is only $\sim 15\text{ KB} - 50\text{ KB}$).

---

## 2. HIGH-LEVEL ARCHITECTURE & DATA FLOW

### 2.1. End-to-End System Pipeline

```
[User Browser]
   │
   ├── (1) Inputs YouTube URL ─────────────────────────────────┐
   │                                                           │
   ├── (3) Plays Video directly via YouTube Edge CDN (0 cost)  │
   │                                                           │
   ▼                                                           ▼
[YouTube IFrame Player]                                  [Backend API Gateway]
   │                                                           │
   │ (Tracks currentTime via 100ms sync loop)                  ├── Check Cache (Redis / DB)
   │                                                           │   ├── HIT: Return cached JSON
   │                                                           │   └── MISS: Proceed to Pipeline
   │                                                           ▼
   │                                                     [Subtitle Scraper]
   │                                                           │
   │                                                           ▼
   │                                                     [Sentence Stitcher]
   │                                                     (Merges broken phrase fragments)
   │                                                           │
   │                                                           ▼
   │                                                     [Batch Translation Engine]
   │                                                     (Gemini 1.5 Flash / GPT-4o-mini)
   │                                                           │
   │                                                           ▼
   │                                                     [Write to Persistent Cache]
   │                                                           │
   └── (2) Receives Dual-Sub JSON <────────────────────────────┘
```

### 2.2. User Journey
1. **Input**: User pastes a YouTube URL and selects target language (e.g., English $\rightarrow$ Vietnamese).
2. **Processing & Feedback**: Immediate UI transition displaying loading steps: `Validating Video` $\rightarrow$ `Extracting Captions` $\rightarrow$ `Translating Sentences`.
3. **Playback & Interaction**:
   * Video panel on the left (IFrame).
   * Dual-subtitle container on the right (Original & Translated side-by-side).
   * Auto-scrolls and highlights active subtitle line based on current playback timestamp.
   * Interactive seeking: Clicking any subtitle segment invokes `player.seekTo(timestamp, true)`.

---

## 3. CORE TECHNICAL COMPONENTS & OPTIMIZATIONS

### 3.1. Subtitle Extraction & Fallback Strategies
* **Standard Case (Auto-generated or Manual Captions Available)**:
  * Extract raw transcript without consuming YouTube Data API quota using headless caption scrapers (`youtube-transcript-api` in Python or `youtube-transcript` in Node.js).
* **Edge Case (No Captions on Video)**:
  * *Option A (Cost-saver / Default)*: Return clear UI message: `"No captions provided by YouTube for this video."`
  * *Option B (Advanced Fallback)*: Download lightweight audio stream (Opus/M4A @ 64 kbps) via `yt-dlp` and pass it to **OpenAI Whisper Large v3 Turbo** API with word-level timestamps.

### 3.2. Sentence Merging Algorithm (Crucial for Translation Quality)
YouTube auto-generated captions break text by acoustic pauses (every 1.5 – 3 seconds), producing fragmented, incomplete clauses that degrade LLM translation quality.

* **Heuristics for Concatenation**:
  * Concatenate consecutive text fragments if gap $(\text{next.start} - \text{current.end}) < 0.8\text{ seconds}$ AND current text does not terminate with punctuation (`.`, `?`, `!`).
  * Recalculate segment bounds:
    $$\text{merged.start} = \text{fragment}_1.\text{start}$$
    $$\text{merged.end} = \text{fragment}_n.\text{end}$$
    $$\text{merged.duration} = \text{merged.end} - \text{merged.start}$$

### 3.3. Batch LLM Translation
* Translating lines individually creates high network overhead and loses conversational context.
* **Batch Strategy**: Group 20 to 30 stitched sentences into a single payload and enforce strict JSON schemas.

**Recommended System Prompt:**
```
You are an accurate, contextual subtitle translator.
Translate the following array of spoken phrases from English into Vietnamese.
Maintain conversational tone and idiomatic nuances suited for video subtitles.
Strictly output a valid JSON array preserving the original indices:
[
  { "id": 1, "translated": "..." },
  { "id": 2, "translated": "..." }
]
```

### 3.4. Two-Tier Caching System
* **Tier 1 (In-Memory / Redis)**: Key: `sub:{videoId}:{targetLang}` with a 14-day TTL for trending/recent videos.
* **Tier 2 (Relational / PostgreSQL / Supabase)**: Permanent storage for completed translations. Ensures any recurring video view incurs **0 LLM API cost**.

---

## 4. API SPECIFICATION

### 4.1. Process Subtitle
* **Endpoint**: `POST /api/v1/subtitles/process`
* **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "videoId": "dQw4w9WgXcQ",
  "targetLanguage": "vi",
  "forceRefresh": false
}
```

#### Response Body (`200 OK`)
```json
{
  "success": true,
  "videoId": "dQw4w9WgXcQ",
  "sourceLanguage": "en",
  "targetLanguage": "vi",
  "isCached": true,
  "totalSegments": 2,
  "subtitles": [
    {
      "id": 1,
      "start": 0.52,
      "end": 3.40,
      "duration": 2.88,
      "original": "Never gonna give you up",
      "translated": "Không bao giờ từ bỏ bạn"
    },
    {
      "id": 2,
      "start": 3.45,
      "end": 6.80,
      "duration": 3.35,
      "original": "Never gonna let you down",
      "translated": "Không bao giờ làm bạn thất vọng"
    }
  ]
}
```

#### Error Handling (`4xx / 5xx`)
* `404 Not Found`: Video has no available subtitles or captions are disabled.
* `403 Forbidden`: Video restricted from third-party embedding (YouTube Error Code 101/150).

---

## 5. FRONTEND SYNCHRONIZATION SPECIFICATION

### 5.1. Tech Stack
* **Framework**: Next.js (App Router) / React + TypeScript
* **Styling**: Tailwind CSS
* **Video Integration**: YouTube IFrame Player API (`react-youtube`)
* **State Management**: Zustand / React Context

### 5.2. Active Subtitle Lookup ($O(\log N)$ Binary Search)
Polling intervals running at 100ms calling linear `Array.prototype.find()` on 2,000+ line transcripts cause unnecessary CPU strain. A binary search maintains optimal performance:

```typescript
interface SubtitleSegment {
  id: number;
  start: number;
  end: number;
  duration: number;
  original: string;
  translated: string;
}

export function findActiveSubtitleIndex(
  subtitles: SubtitleSegment[], 
  currentTime: number
): number {
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
  return -1;
}
```

### 5.3. Smart Auto-Scroll Behavior
* Trigger auto-scroll on active index updates:
  ```typescript
  const element = document.getElementById(`sub-segment-${activeIndex}`);
  if (element && isAutoScrollActive) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  ```
* **User Interruption Handling**: Detect mouse wheel or touch gestures within the subtitle container. If detected, pause auto-scroll for 5 seconds to allow free browsing before re-engaging lock-on tracking.

---

## 6. EDGE CASES & MITIGATION

| Issue | Cause | Mitigation |
| :--- | :--- | :--- |
| **Embedding Disabled (Code 101 / 150)** | Video creator prohibited off-platform embeds. | Catch `onError` code in YouTube Player API; render a fallback card prompting the user to open the video in a popup/tab. |
| **YouTube Scraper IP Blocking (HTTP 429)** | Cloud provider IP (AWS/Vercel/Hetzner) detected as automated traffic. | Route scraper requests through residential rotating proxies or load valid YouTube session cookies. |
| **Out-of-Sync Audio/Video** | Variable frame rate or latency spikes. | Bind time tracking to `player.getCurrentTime()` events rather than client system clocks. |