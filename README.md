# 🎬 DualSub.ai — YouTube Dual-Subtitle Web Application

Ứng dụng web xem video YouTube hiển thị **phụ đề song ngữ thời gian thực (Real-time Bilingual Subtitles)**, tự động đồng bộ theo tiến trình phát của video và dịch thuật ngữ cảnh thông minh bằng mô hình AI (**Google Gemini 1.5 Flash** / **GPT-4o-mini**) kết hợp bộ dịch dự phòng tốc độ cao miễn phí.

Xây dựng tuân thủ đầy đủ tiêu chuẩn theo tài liệu kỹ thuật: [youtube_dual_subtitle_web_application_technical_specification.md](file:///d:/Youtube-Sub/docs/youtube_dual_subtitle_web_application_technical_specification.md).

---

## 🌟 Tổng quan & Nguyên lý Kiến trúc

### Nguyên lý cốt lõi: Zero Video Hosting Overhead
* **Video Playback & Băng thông**: Máy chủ ứng dụng tiêu thụ **0 MB băng thông video**. Toàn bộ luồng phát video truyền trực tiếp từ Edge CDN của Google tới trình duyệt người dùng qua **YouTube IFrame Player API**.
* **Trách nhiệm của Server**: Chỉ chịu trách nhiệm bóc tách transcript văn bản ($\sim 15 - 50\text{ KB}$), ghép câu tự nhiên, dịch theo khối ngữ cảnh và lưu cache 2 tầng.

```
[Trình duyệt Người dùng]
   │
   ├── (1) Nhập link YouTube / Chọn ngôn ngữ ──────────────────┐
   │                                                           │
   ├── (3) Phát video trực tiếp từ YouTube CDN (0 cost)        │
   │                                                           │
   ▼                                                           ▼
[YouTube IFrame Player]                                  [Backend API Route]
   │                                                           │
   │ (Vòng lặp sync 100ms lấy currentTime)                     ├── 1. Kiểm tra Cache (Memory / Persistent)
   │                                                           │      ├── HIT: Trả về JSON ngay lập tức
   │                                                           │      └── MISS: Tiếp tục quy trình
   │                                                           ▼
   │                                                     [Subtitle Scraper]
   │                                                     (Bóc tách phụ đề gốc, 0 tốn Quota)
   │                                                           │
   │                                                           ▼
   │                                                     [Sentence Stitcher]
   │                                                     (Ghép các câu ngắt vụn < 0.8s)
   │                                                           │
   │                                                           ▼
   │                                                     [Batch Translation Engine]
   │                                                     (Gemini 1.5 Flash / clients5 Batch)
   │                                                           │
   │                                                           ▼
   │                                                     [Ghi Cache 2 Tầng]
   │                                                           │
   └── (2) Nhận dữ liệu Dual-Subtitle JSON <───────────────────┘
```

---

## 🚀 Tính năng nổi bật

### 1. Bóc tách phụ đề không tốn Quota YouTube Data API (Mục 3.1)
- Trích xuất phụ đề tự động (auto-generated captions) và phụ đề thủ công mà không phụ thuộc vào giới hạn quota ngày của YouTube Data API v3.
- Xử lý mã lỗi nhúng **101 / 150** (video chặn nhúng): Hiển thị thẻ card hướng dẫn xem trực tiếp trên YouTube mà không làm đơ ứng dụng.

### 2. Thuật toán ghép câu thông minh - Sentence Stitcher (Mục 3.2)
Phụ đề tự động của YouTube thường bị ngắt đoạn vụn vặt theo khoảng lặng âm thanh (cứ 1.5 – 3 giây ngắt một lần), khiến câu dịch bị đứt đoạn vô nghĩa.
* **Cơ chế hợp nhất**:
  - Tự động ghép 2 phân đoạn liên tiếp nếu khoảng cách giữa chúng $(\text{next.start} - \text{current.end}) < 0.8\text{ giây}$ **VÀ** phân đoạn trước chưa kết thúc bằng dấu câu (`.`, `?`, `!`).
  - Tính toán lại mốc thời gian: $\text{start} = \text{start}_1$, $\text{end} = \text{end}_n$, $\text{duration} = \text{end} - \text{start}$.

### 3. Động cơ Dịch thuật Đa tầng - Dual-Engine Translation (Mục 3.3)
* **Chế độ Miễn phí Tự động (Out-of-the-box)**:
  - Sử dụng cơ chế gom nhóm Batch qua `clients5` của Google, dịch đồng thời hàng chục câu bằng 1 request duy nhất mà không bị lỗi giới hạn IP (HTTP 429).
  - Hoạt động ngay lập tức khi vừa mở web, **không cần đăng ký thẻ hay nạp tiền**.
* **Chế độ AI Ngữ cảnh (Khuyên dùng cho văn phong tự nhiên)**:
  - Hỗ trợ **Google Gemini 1.5 Flash** hoặc **OpenAI GPT-4o-mini**.
  - Người dùng có thể nhập API Key trực tiếp trên giao diện web (nút **"Cấu hình API"**) hoặc khai báo trong file `.env.local`.

### 4. Hệ thống Bộ nhớ đệm 2 tầng - Two-Tier Caching (Mục 3.4)
* **Tầng 1 (In-Memory)**: Lưu trên RAM với thời hạn TTL 14 ngày cho các video đang truy cập.
* **Tầng 2 (Persistent Storage)**: Lưu vĩnh viễn vào thư mục `.cache/subtitles/`. Bất kỳ người dùng nào mở lại video đã từng xử lý sẽ nhận kết quả tức thì với **chi phí API = 0**.
* **Cơ chế Self-healing**: Tự động phát hiện và bỏ qua bản cache lỗi (nếu trước đó bị lưu nhầm câu gốc chưa dịch) để dịch lại bản chuẩn.

### 5. Đồng bộ cực nhanh với Tìm kiếm nhị phân $O(\log N)$ (Mục 5.2)
* Vòng lặp 100ms kiểm tra `player.getCurrentTime()`.
* Thay vì duyệt tuyến tính `Array.find()` gây lag CPU ở các video dài hàng ngàn câu, thuật toán **Binary Search $O(\log N)$** tìm thấy dòng phụ đề đang phát trong thời gian thực cực kỳ nhẹ mượt.

### 6. Trải nghiệm người dùng thông minh (Smart UX - Mục 5.3)
* **Auto-Scroll thông minh**: Tự động cuộn căn giữa dòng phụ đề đang nói.
* **Phát hiện cử chỉ người dùng**: Khi người dùng lăn chuột hoặc vuốt màn hình để tự đọc, hệ thống tạm dừng tự cuộn 5 giây trước khi tự động khóa theo dõi lại.
* **Interactive Seeking**: Nhấp vào bất kỳ câu phụ đề nào trên danh sách để tua video đến đúng thời điểm đó (`player.seekTo`).
* **Tìm kiếm & Xuất file**: Tìm từ khóa trong phụ đề; hỗ trợ tải phụ đề song ngữ định dạng **.SRT**, **.TXT**, **.JSON**.
* **Tùy biến hiển thị**: Chuyển đổi giữa chế độ 2 cột song song (Side-by-side) và chế độ dòng nối tiếp (Stacked), tăng/giảm kích thước chữ ($A-$, $A$, $A+$).

---

## 📂 Cấu trúc mã nguồn (Project Architecture)

```
d:/Youtube-Sub/
├── docs/                                    # Tài liệu đặc tả kỹ thuật
│   └── youtube_dual_subtitle_web_application_technical_specification.md
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── subtitles/
│   │   │           └── process/
│   │   │               └── route.ts         # Endpoint xử lý phụ đề (Mục 4.1)
│   │   ├── globals.css                      # Giao diện Dark mode, thanh cuộn sleek scrollbar
│   │   ├── layout.tsx                       # Root layout & cấu hình font chữ Geist
│   │   └── page.tsx                         # Trang chính tương tác video & song ngữ
│   ├── components/
│   │   ├── subtitles/
│   │   │   ├── SubtitleList.tsx             # Danh sách phụ đề, auto-scroll, tìm kiếm, xuất file
│   │   │   └── SubtitleRow.tsx              # Từng hàng phụ đề song ngữ, nút thời gian & seek
│   │   ├── ui/
│   │   │   ├── Header.tsx                   # Thanh điều hướng & modal lưu Gemini API Key
│   │   │   ├── SearchForm.tsx               # Ô nhập link YouTube, chọn ngôn ngữ & video mẫu
│   │   │   └── StatusStepper.tsx            # Stepper trạng thái: Validating -> Extracting -> Translating
│   │   └── video/
│   │       └── YouTubePlayer.tsx            # Tích hợp YouTube IFrame API, vòng lặp 100ms & xử lý lỗi 101/150
│   ├── lib/
│   │   ├── cache/
│   │   │   └── index.ts                     # Cache 2 tầng (Memory TTL + File JSON)
│   │   ├── transcription/
│   │   │   └── stitcher.ts                  # Thuật toán ghép câu tự nhiên (Mục 3.2)
│   │   ├── translation/
│   │   │   └── translator.ts                # Dịch thuật hàng loạt (Gemini / OpenAI / clients5 Batch)
│   │   └── utils/
│   │       ├── search.ts                    # Binary Search O(log N) tìm active subtitle
│   │       └── youtube.ts                   # Trích xuất video ID từ đa dạng URL YouTube
│   └── types/
│       ├── subtitles.ts                     # Interface SubtitleSegment, Request, Response
│       └── youtube.d.ts                     # Định kiểu TypeScript cho YT.Player
├── .cache/                                  # Thư mục lưu cache phụ đề lâu dài (tự động tạo)
├── .env.example                             # File mẫu biến môi trường
├── .env.local                               # Cấu hình môi trường nội bộ
├── package.json
└── tsconfig.json
```

---

## 🔌 Đặc tả API (API Specification)

### Process Subtitle Endpoint
* **Method**: `POST`
* **URL**: `/api/v1/subtitles/process`
* **Headers**: `Content-Type: application/json`
* **Optional Headers**: `x-gemini-api-key: your_gemini_key` (nếu truyền key từ client)

#### Request Body:
```json
{
  "videoId": "dQw4w9WgXcQ",
  "targetLanguage": "vi",
  "forceRefresh": false
}
```

#### Response Body (`200 OK`):
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

#### Mã lỗi (Error Codes):
* `400 Bad Request`: `INVALID_URL` — Thiếu hoặc sai định dạng link/ID YouTube.
* `404 Not Found`: `NO_CAPTIONS` — Video không có phụ đề gốc.
* `403 Forbidden`: `EMBED_DISABLED` — Video bị chủ sở hữu chặn phát nhúng (Code 101/150).
* `429 Too Many Requests`: `RATE_LIMITED` — Giới hạn truy vấn từ nguồn cấp.
* `500 Internal Error`: `FETCH_FAILED` — Lỗi xử lý máy chủ.

---

## 🛠️ Hướng dẫn cài đặt & Chạy ứng dụng

### 1. Yêu cầu môi trường
* **Node.js**: Phiên bản 18.x trở lên (khuyên dùng Node 20+).
* **Trình quản lý gói**: `npm`, `pnpm` hoặc `yarn`.

### 2. Cài đặt các thư viện phụ thuộc
```bash
npm install
```

### 3. Cấu hình biến môi trường (Tùy chọn)
Tạo file `.env.local` từ file mẫu `.env.example`:
```env
# Google Gemini API (Khuyên dùng để dịch tự nhiên nhất, lấy miễn phí tại Google AI Studio)
GEMINI_API_KEY=AIzaSy...

# Hoặc OpenAI API Key
OPENAI_API_KEY=sk-...
```
> **Mẹo**: Bạn cũng có thể mở trực tiếp trang web, nhấp vào nút **"Cấu hình API"** ở góc phải trên cùng để lưu Gemini API Key ngay trên trình duyệt mà không cần sửa file code.

### 4. Khởi chạy Server phát triển (Development)
```bash
npm run dev
```
Truy cập trình duyệt tại địa chỉ: **[http://localhost:3000](http://localhost:3000)**

### 5. Kiểm tra đóng gói (Production Build)
```bash
npm run build
npm run start
```

---

## 🌐 Các ngôn ngữ hỗ trợ dịch
Hệ thống hỗ trợ dịch từ ngôn ngữ gốc của video sang nhiều ngôn ngữ đích:
* 🇻🇳 **Tiếng Việt (`vi`)** *(Mặc định)*
* 🇬🇧 **English (`en`)**
* 🇯🇵 **日本語 (`ja`)**
* 🇰🇷 **한국어 (`ko`)**
* 🇨🇳 **中文 (`zh`)**
* 🇪🇸 **Español (`es`)**
* 🇫🇷 **Français (`fr`)**
* 🇩🇪 **Deutsch (`de`)**
* 🇷🇺 **Русский (`ru`)**
