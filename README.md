# DualSub.ai — YouTube Dual-Subtitle Web Application

Ứng dụng web xem video YouTube hỗ trợ hiển thị **phụ đề song ngữ thời gian thực (bilingual subtitles)**, tự động đồng bộ theo tiến trình phát của video và dịch thuật ngữ cảnh thông minh bằng mô hình AI (Gemini 1.5 Flash / GPT-4o-mini).

Được xây dựng chính xác dựa theo tài liệu đặc tả kỹ thuật: [youtube_dual_subtitle_web_application_technical_specification.md](file:///d:/Youtube-Sub/docs/youtube_dual_subtitle_web_application_technical_specification.md).

---

## 🚀 Tính năng chính

1. **Zero Video Hosting Overhead**:
   - Video được stream trực tiếp từ Edge CDN của Google thông qua **YouTube IFrame Player API** (không tốn dung lượng máy chủ).
2. **Bóc tách phụ đề không tốn Quota YouTube Data API**:
   - Sử dụng headless caption scraper lấy dữ liệu transcript phụ đề tự động hoặc phụ đề thủ công.
3. **Thuật toán ghép câu thông minh (Sentence Stitching - Mục 3.2)**:
   - Khắc phục tình trạng câu ngắt vụn của YouTube bằng cách gộp các câu rời rạc (khoảng cách `< 0.8s` và chưa kết thúc bằng dấu chấm câu).
4. **Dịch thuật hàng loạt theo ngữ cảnh (Batch Translation Engine - Mục 3.3)**:
   - Gom 20–30 câu vào một payload duy nhất để giữ trọn vẹn ngữ cảnh hội thoại.
   - Hỗ trợ mô hình **Gemini 1.5 Flash**, **GPT-4o-mini**, đồng thời tích hợp bộ dịch dự phòng tự động hoạt động ngay cả khi chưa cấu hình API key.
5. **Hệ thống bộ nhớ đệm 2 tầng (Two-Tier Cache - Mục 3.4)**:
   - **Tầng 1 (In-Memory)**: Lưu tạm với TTL 14 ngày cho các video đang truy cập.
   - **Tầng 2 (Persistent Storage)**: Lưu trữ lâu dài để các lượt xem lại có chi phí dịch thuật = 0.
6. **Đồng bộ phụ đề thời gian thực cực nhanh**:
   - Polling loop 100ms lấy mốc thời gian `player.getCurrentTime()`.
   - Tìm kiếm nhị phân **$O(\log N)$ Binary Search** thay vì `Array.find()` tuyến tính, tối ưu CPU cho transcript hàng nghìn dòng.
7. **Trải nghiệm người dùng thông minh (Smart Auto-Scroll & Interactive Seek)**:
   - Tự động cuộn căn giữa dòng phụ đề đang phát.
   - Nhận diện thao tác cuộn chuột/chạm của người dùng để tạm dừng tự động cuộn 5 giây cho phép duyệt tự do trước khi tái khóa.
   - Nhấp vào bất kỳ đoạn phụ đề nào để tua video ngay tới giây đó (`player.seekTo`).
   - Xuất phụ đề đa định dạng: **.SRT**, **.TXT**, **.JSON**.
   - Hỗ trợ xử lý lỗi quyền phát nhúng (YouTube Error Code 101/150).

---

## 📂 Khung cấu trúc dự án (Architecture & File Tree)

```
d:/Youtube-Sub/
├── docs/                                    # Tài liệu đặc tả kỹ thuật dự án
│   └── youtube_dual_subtitle_web_application_technical_specification.md
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── subtitles/
│   │   │           └── process/
│   │   │               └── route.ts         # POST /api/v1/subtitles/process (Mục 4.1)
│   │   ├── globals.css                      # Giao diện Dark theme, custom scrollbar
│   │   ├── layout.tsx                       # Root Layout & Typography
│   │   └── page.tsx                         # Giao diện chính tương tác song ngữ
│   ├── components/
│   │   ├── subtitles/
│   │   │   ├── SubtitleList.tsx             # Danh sách phụ đề, auto-scroll, lọc từ khóa, xuất file
│   │   │   └── SubtitleRow.tsx              # Hàng phụ đề song ngữ, hiển thị thời gian & seekTo
│   │   ├── ui/
│   │   │   ├── Header.tsx                   # Thanh điều hướng, modal hướng dẫn cấu hình
│   │   │   ├── SearchForm.tsx               # Ô nhập link YouTube, chọn ngôn ngữ & video mẫu
│   │   │   └── StatusStepper.tsx            # Hiển thị các bước tiến trình (Validating -> Extracting -> Translating)
│   │   └── video/
│   │       └── YouTubePlayer.tsx            # Tích hợp YouTube Iframe API, vòng lặp sync 100ms & xử lý lỗi 101/150
│   ├── lib/
│   │   ├── cache/
│   │   │   └── index.ts                     # Hệ thống cache 2 tầng (In-Memory + File Persistent)
│   │   ├── transcription/
│   │   │   └── stitcher.ts                  # Thuật toán ghép câu thông minh (Sentence Stitcher)
│   │   ├── translation/
│   │   │   └── translator.ts                # Bộ dịch AI theo mảng batch (Gemini / OpenAI / Fallback)
│   │   └── utils/
│   │       ├── search.ts                    # Thuật toán Binary Search O(log N) tìm subtitle active
│   │       └── youtube.ts                   # Trích xuất videoId từ các định dạng URL và định dạng thời gian
│   └── types/
│       ├── subtitles.ts                     # Interface dữ liệu SubtitleSegment, Request, Response
│       └── youtube.d.ts                     # Khai báo TypeScript cho YouTube IFrame Player API
├── .cache/                                  # Thư mục lưu cache phụ đề lâu dài (tạo tự động)
├── .env.example                             # Mẫu cấu hình biến môi trường
├── .env.local                               # Cấu hình môi trường cục bộ
├── package.json
└── tsconfig.json
```

---

## 🛠️ Hướng dẫn cài đặt & Khởi chạy

### 1. Cài đặt các gói phụ thuộc (nếu chưa cài):
```bash
npm install
```

### 2. Cấu hình biến môi trường (Tùy chọn):
Chỉnh sửa file `.env.local`:
```env
# AI Translation API Keys (Nếu không nhập, hệ thống vẫn tự động chạy chế độ dự phòng miễn phí)
GEMINI_API_KEY=your_gemini_api_key_here
# hoặc
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Chạy môi trường phát triển (Development Server):
```bash
npm run dev
```
Mở trình duyệt tại: `http://localhost:3000`

### 4. Đóng gói kiểm tra (Production Build):
```bash
npm run build
```
