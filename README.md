# 🎬 DualSub.ai — YouTube Dual-Subtitle Web Application

[![Next.js](https://img.shields.io/badge/Next.js-15+-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**DualSub.ai** is a modern, high-performance web application designed for language learners and video consumers. It enables users to watch any public YouTube video with synchronized, bilingual subtitles (original spoken transcript alongside contextual translations in real time).

Built in strict compliance with the project's technical specification: [youtube_dual_subtitle_web_application_technical_specification.md](file:///d:/Youtube-Sub/docs/youtube_dual_subtitle_web_application_technical_specification.md).

---

## 🌟 Architecture & Core Principles

### Core Architectural Principle: Zero Video Hosting Overhead
* **Video Playback & Bandwidth**: **0 MB server bandwidth consumed**. Video streams directly from Google/YouTube edge CDN to the client's browser via the official **YouTube IFrame Player API**.
* **Server Responsibilities**: Confined exclusively to subtitle extraction, sentence aggregation, AI-powered contextual translation, and two-tier text caching (payload size is only $\sim 15 - 50\text{ KB}$).

### High-Level System Pipeline

```
[User Browser]
   │
   ├── (1) Inputs YouTube URL / Selects Target Language ───────┐
   │                                                           │
   ├── (3) Plays Video directly via YouTube Edge CDN (0 cost)  │
   │                                                           │
   ▼                                                           ▼
[YouTube IFrame Player]                                  [Backend API Route]
   │                                                           │
   │ (Tracks currentTime via 100ms sync loop)                  ├── 1. Check Cache (Memory / Persistent)
   │                                                           │      ├── HIT: Return cached JSON immediately
   │                                                           │      └── MISS: Proceed to Pipeline
   │                                                           ▼
   │                                                     [Subtitle Scraper]
   │                                                     (Extracts raw captions, 0 API Quota)
   │                                                           │
   │                                                           ▼
   │                                                     [Sentence Stitcher]
   │                                                     (Merges fragmented speech pauses < 0.8s)
   │                                                           │
   │                                                           ▼
   │                                                     [Batch Translation Engine]
   │                                                     (Gemini 1.5 Flash / Batch Fallback)
   │                                                           │
   │                                                           ▼
   │                                                     [Write to Two-Tier Cache]
   │                                                           │
   └── (2) Receives Dual-Subtitle JSON Payload <───────────────┘
```

---

## 🚀 Key Technical Features

### 1. Quota-Free Headless Subtitle Extraction (Section 3.1)
- Extracts raw auto-generated and manual transcripts without consuming YouTube Data API v3 daily quotas.
- Gracefully handles restricted video playback: catches YouTube Player Error Code **101 / 150** (embedding disabled by owner) and renders an intuitive fallback card prompting the user to open the video in a new tab.

### 2. Heuristic Sentence Merging Algorithm (Section 3.2)
YouTube auto-generated captions break text according to acoustic pauses (every 1.5 – 3 seconds), producing fragmented phrases that degrade translation quality.
* **Concatenation Heuristics**:
  - Merges consecutive fragments if gap $(\text{next.start} - \text{current.end}) < 0.8\text{ seconds}$ **AND** the current fragment does not end with sentence-terminating punctuation (`.`, `?`, `!`).
  - Automatically recalculates segment bounds:
    $$\text{merged.start} = \text{fragment}_1.\text{start}$$
    $$\text{merged.end} = \text{fragment}_n.\text{end}$$
    $$\text{merged.duration} = \text{merged.end} - \text{merged.start}$$

### 3. Dual-Engine Contextual Translation (Section 3.3)
* **Out-of-the-Box Free Batch Engine**:
  - Employs a high-throughput newline-batched translation pipeline via Google service (`clients5`).
  - Translates 25–50 sentences per HTTP request, completely avoiding rate limits (HTTP 429) without requiring an API key or credit card.
* **LLM Contextual Translation (Recommended for Production)**:
  - Groups 20 to 30 stitched sentences into a single payload with strict JSON schemas.
  - Powered by **Google Gemini 1.5 Flash** or **OpenAI GPT-4o-mini**.
  - Users can configure their API key directly within the web UI (stored securely in browser `localStorage`) or via `.env.local`.

### 4. Two-Tier Caching System (Section 3.4)
* **Tier 1 (In-Memory)**: Stored in memory with a 14-day TTL for active sessions and trending videos.
* **Tier 2 (Persistent Storage)**: Saved to `.cache/subtitles/` permanently. Repeated views of any video incur **0 translation cost** and respond in $<10\text{ms}$.
* **Self-Healing Verification**: Automatically detects and invalidates incomplete or untranslated caches, guaranteeing fresh translations.

### 5. High-Performance Subtitle Sync: $O(\log N)$ Binary Search (Section 5.2)
* Subtitle tracking runs on a 100ms interval polling `player.getCurrentTime()`.
* Replaces naive $O(N)$ linear `Array.find()` scans with a binary search algorithm, ensuring zero frame drops even on transcripts with 3,000+ lines.

### 6. Smart Auto-Scroll & Interactive UX (Section 5.3)
* **Intelligent Auto-Scroll**: Keeps the active subtitle segment centered smoothly during playback.
* **User Interruption Detection**: Detects mouse wheel or touch gestures within the subtitle list and temporarily pauses auto-scroll for 5 seconds to permit free reading before re-engaging lock tracking.
* **Interactive Seeking**: Clicking any subtitle badge seeks the YouTube video directly to that exact timestamp (`player.seekTo`).
* **Multi-Format Export**: One-click download of bilingual transcripts as **.SRT**, **.TXT**, or **.JSON**.
* **Display Customization**: Toggle between dual-column side-by-side mode and stacked layout, with customizable font size ($A-$, $A$, $A+$).

---

## 📂 Project Architecture & File Tree

```
d:/Youtube-Sub/
├── docs/                                    # Technical specification documents
│   └── youtube_dual_subtitle_web_application_technical_specification.md
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── subtitles/
│   │   │           └── process/
│   │   │               └── route.ts         # POST /api/v1/subtitles/process (Section 4.1)
│   │   ├── globals.css                      # Tailwind styles & custom dark scrollbar
│   │   ├── layout.tsx                       # Root layout & Geist typography configuration
│   │   └── page.tsx                         # Main bilingual video & subtitle workspace
│   ├── components/
│   │   ├── subtitles/
│   │   │   ├── SubtitleList.tsx             # Subtitle container, auto-scroll, search, export
│   │   │   └── SubtitleRow.tsx              # Bilingual row item, seek trigger, copy action
│   │   ├── ui/
│   │   │   ├── Header.tsx                   # Navbar with branding & Gemini API configuration modal
│   │   │   ├── SearchForm.tsx               # YouTube URL input, language selector, demo pills
│   │   │   └── StatusStepper.tsx            # Progress feedback: Validating -> Extracting -> Translating
│   │   └── video/
│   │       └── YouTubePlayer.tsx            # YouTube IFrame API integration, 100ms sync & Code 101/150 fallback
│   ├── lib/
│   │   ├── cache/
│   │   │   └── index.ts                     # Two-tier cache manager (Memory TTL + File JSON)
│   │   ├── transcription/
│   │   │   └── stitcher.ts                  # Sentence stitching algorithm (Section 3.2)
│   │   ├── translation/
│   │   │   └── translator.ts                # Batch translation engine (Gemini / OpenAI / clients5 Batch)
│   │   └── utils/
│   │       ├── search.ts                    # O(log N) Binary search for active subtitle segment
│   │       └── youtube.ts                   # Video ID parser (watch, youtu.be, shorts, embed) & timestamp formatter
│   └── types/
│       ├── subtitles.ts                     # TypeScript interfaces for segments, requests, and responses
│       └── youtube.d.ts                     # Type declarations for YT.Player instance and events
├── .cache/                                  # Local disk cache for subtitles (git-ignored)
├── .env.example                             # Environment variable template
├── .env.local                               # Local environment configuration
├── package.json
└── tsconfig.json
```

---

## 🔌 API Specification

### Subtitle Processing Endpoint
* **Endpoint**: `POST /api/v1/subtitles/process`
* **Content-Type**: `application/json`
* **Optional Headers**: `x-gemini-api-key: your_gemini_key`

#### Request Payload:
```json
{
  "videoId": "dQw4w9WgXcQ",
  "targetLanguage": "vi",
  "forceRefresh": false
}
```

#### Response Payload (`200 OK`):
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

#### Error Handling Codes:
| HTTP Status | Error Code | Description |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_URL` | Missing or malformed YouTube URL/Video ID |
| `404 Not Found` | `NO_CAPTIONS` | Video does not have subtitles/closed captions |
| `403 Forbidden` | `EMBED_DISABLED` | Creator has restricted video embedding (Code 101/150) |
| `429 Too Many Requests` | `RATE_LIMITED` | YouTube IP rate limit exceeded |
| `500 Server Error` | `FETCH_FAILED` | Internal server or extraction exception |

---

## 🛠️ Getting Started & Installation

### Prerequisites
* **Node.js**: Version 18.x or later (Node 20+ recommended).
* **Package Manager**: `npm`, `pnpm`, or `yarn`.

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables (Optional)
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Add your preferred AI translation credentials:
```env
# Optional: Google Gemini API (Get a free key at Google AI Studio)
GEMINI_API_KEY=AIzaSy...

# Optional: OpenAI API
OPENAI_API_KEY=sk-...
```
> **Tip**: You can also enter and save your Gemini API Key directly inside the app by clicking the **"Cấu hình API" / "Configure API"** button in the header.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 🌐 Supported Translation Target Languages

The application supports translations into multiple target languages:
* 🇻🇳 **Vietnamese (`vi`)** *(Default)*
* 🇬🇧 **English (`en`)**
* 🇯🇵 **Japanese (`ja`)**
* 🇰🇷 **Korean (`ko`)**
* 🇨🇳 **Chinese (`zh`)**
* 🇪🇸 **Spanish (`es`)**
* 🇫🇷 **French (`fr`)**
* 🇩🇪 **German (`de`)**
* 🇷🇺 **Russian (`ru`)**

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
