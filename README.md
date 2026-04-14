# Music Visualizer Studio

Ứng dụng web tạo video visualizer từ nhạc (MP3/WAV) + ảnh nền, render ra file MP4.
Upload nhạc, chọn theme, tuỳ chỉnh màu sắc & hiệu ứng, xuất video 1080p.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18-blue)
![Vite](https://img.shields.io/badge/Vite-5-purple)
![FFmpeg](https://img.shields.io/badge/FFmpeg-required-orange)

---

## Mục lục

- [Tính năng](#tính-năng)
- [Cài đặt nhanh (Windows)](#cài-đặt-nhanh-windows)
- [Cài đặt thủ công](#cài-đặt-thủ-công)
- [Sử dụng](#sử-dụng)
- [Themes](#themes)
- [Tuỳ chỉnh màu sắc](#tuỳ-chỉnh-màu-sắc)
- [Hiển thị tên bài hát](#hiển-thị-tên-bài-hát)
- [Export video](#export-video)
- [Phím tắt](#phím-tắt)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Cấu hình nâng cao](#cấu-hình-nâng-cao)
- [Xử lý lỗi thường gặp](#xử-lý-lỗi-thường-gặp)

---

## Tính năng

- **8 themes** visualizer với hiệu ứng đa dạng (Lo-Fi, Cyberpunk, Ambient, Retrowave, Minimal, Neon Pulse, Galaxy, Watercolor)
- **Tuỳ chỉnh màu sắc** cho từng theme (4 color slots mỗi theme)
- **Điều chỉnh độ dày** waveform và bars bằng slider
- **Hiển thị tên bài hát & nghệ sĩ** trên video với 6 font, 4 vị trí, 3 chế độ hiển thị
- **Preview realtime** trong browser với Web Audio API
- **Export MP4** 1920x1080 với FFmpeg (H.264 + AAC)
- **Hiển thị ETA** khi export ("~2m30s còn lại")
- **Phím tắt** (Space = play/pause, Esc = stop)
- **Responsive UI** hoạt động trên desktop, tablet, mobile
- **Idle animation** trên canvas khi chưa load nhạc

---

## Cài đặt nhanh (Windows)

### Yêu cầu
- **Node.js** 18+ — [Tải tại đây](https://nodejs.org/)
- **FFmpeg** — Cần cho export video

### Bước 1: Tải FFmpeg

Tải **FFmpeg Essentials** từ: https://www.gyan.dev/ffmpeg/builds/

Giải nén folder `ffmpeg-8.1-essentials_build` vào **thư mục gốc** của project sao cho đường dẫn như sau:

```
music-visualizer/
  ffmpeg-8.1-essentials_build/
    bin/
      ffmpeg.exe    <-- file này cần có
  src/
  server/
  package.json
```

### Bước 2: Chạy setup

**Double-click `setup.bat`**

Script sẽ tự động:
1. Kiểm tra Node.js đã cài chưa
2. Kiểm tra FFmpeg có ở đúng vị trí không
3. Cài đặt dependencies (`npm install`)
4. Tạo thư mục `uploads/` và `exports/`

### Bước 3: Chạy app

**Double-click `start.bat`**

- Tự động mở browser tại http://localhost:5173
- Backend chạy tại http://localhost:3001

---

## Cài đặt thủ công

```bash
# 1. Cài dependencies
npm install

# 2. Chạy dev server (frontend + backend đồng thời)
npm run dev

# 3. Mở browser
# http://localhost:5173
```

Trên **macOS/Linux**, FFmpeg cần nằm trong system PATH:
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg
```

---

## Sử dụng

### Quy trình cơ bản

```
1. Kéo thả file nhạc (MP3, WAV, OGG, FLAC)
2. Kéo thả ảnh nền (JPG, PNG, WebP) — tuỳ chọn
3. Chọn theme
4. Tuỳ chỉnh settings (bass, treble, màu sắc, ...)
5. Bấm "Play Preview" để xem trước
6. Bấm "Generate Video" để xuất MP4
7. Tải video khi hoàn tất
```

### Panel trái — Các mục cài đặt

| Panel | Mô tả |
|-------|-------|
| **Media Input** | Kéo thả file nhạc và ảnh nền |
| **Theme / Preset** | Chọn 1 trong 8 themes, hiện color swatches preview |
| **Audio Reactive** | Bass Sensitivity, Treble Reactivity, Color Intensity, Effect Strength, Waveform Thickness, Bar Thickness |
| **Color Palette** | Tuỳ chỉnh 4 màu cho theme đang chọn (bấm để mở rộng) |
| **Song Info Overlay** | Nhập tên bài hát, nghệ sĩ, chọn font/vị trí (bấm để mở rộng) |
| **Actions** | Play/Stop, Generate Video, Cancel, Reset Session |

---

## Themes

| Theme | Mô tả | Phong cách phù hợp |
|-------|-------|---------------------|
| **Lo-Fi / Chill** | Sóng nhạc mềm mại, VHS grain, background thở | Study, chill, lo-fi hip hop |
| **Cyberpunk / EDM** | Neon bars, bass flash, glitch, chromatic aberration | EDM, electronic, bass |
| **Ambient / Acoustic** | Particles xoay tròn, phản ứng mid/high | Acoustic, ambient, piano |
| **Retrowave / Synthwave** | Mặt trời 80s, lưới phối cảnh, núi silhouette | Synthwave, retro, 80s |
| **Minimal / Clean** | Bars sạch sẽ, waveform mỏng, dot grid | Lo-fi hip hop, jazz, indie |
| **Neon Pulse** | Vòng tròn giãn nở theo beat, spectrum xoay | Dance, pop, electronic |
| **Galaxy / Space** | Sao, tinh vân, bụi vũ trụ, waveform vòng | Space ambient, cinematic |
| **Watercolor / Pastel** | Blobs gradient mềm, pha màu screen blend | Indie, acoustic, soft |

---

## Tuỳ chỉnh màu sắc

Mỗi theme có **4 color slots** tuỳ chỉnh:

1. Mở panel **"Color Palette"** (bấm vào header để expand)
2. Click vào ô màu để chọn màu mới
3. Thay đổi áp dụng ngay lập tức trên preview
4. Bấm **"Reset to Defaults"** để khôi phục màu gốc

Ví dụ color slots của theme Lo-Fi:
- **Waveform** — mặc định: `#ffc88c` (amber)
- **Ghost Wave** — mặc định: `#b496dc` (tím nhạt)
- **Bass Flash** — mặc định: `#ffdcb4` (kem)
- **Background** — mặc định: `#0a080f` (tối)

---

## Hiển thị tên bài hát

1. Mở panel **"Song Info Overlay"**
2. Bật **"Show on video"**
3. Nhập **Song title** và **Artist name**
4. Chọn **Font**: Outfit, JetBrains Mono, Georgia, Arial, Courier New, Impact
5. Chọn **Vị trí**: Bottom Left, Bottom Center, Top Left, Center
6. Chọn **Kiểu hiển thị**:
   - **Always visible** — luôn hiện
   - **Fade in/out** — hiện dần trong 2 giây đầu, ẩn dần sau 8 giây
   - **Hidden** — ẩn hoàn toàn

Chữ hiển thị cả trong **preview** lẫn **video export**.

---

## Export video

### Quy trình export

```
1. Load nhạc + (tuỳ chọn) ảnh nền
2. Chỉnh settings + preview cho vừa ý
3. Bấm "Generate Video"
4. Đợi render + encode (có hiển thị ETA)
5. Bấm "Download MP4" khi hoàn tất
```

### Thông số kỹ thuật

| Thông số | Giá trị |
|----------|---------|
| Độ phân giải | 1920 x 1080 (Full HD) |
| FPS | 30 |
| Video codec | H.264 (libx264) |
| Audio codec | AAC 192kbps |
| Container | MP4 (faststart — tương thích YouTube) |
| Chất lượng | CRF 20 |
| Preset | fast |

### Thời gian export ước tính

| Độ dài nhạc | Render frames | FFmpeg encode | Tổng |
|-------------|--------------|---------------|------|
| 1 phút | ~1-2 phút | ~1-2 phút | **~2-4 phút** |
| 3 phút | ~3-5 phút | ~2-4 phút | **~5-9 phút** |
| 5 phút | ~5-8 phút | ~3-6 phút | **~8-14 phút** |

> Thời gian phụ thuộc vào cấu hình máy tính và tốc độ mạng (frames upload qua HTTP).

### Huỷ export

Bấm **"Cancel Export"** bất kỳ lúc nào. Frames đã upload sẽ bị xoá tự động.

---

## Phím tắt

| Phím | Chức năng |
|------|-----------|
| `Space` | Play / Pause preview |
| `Escape` | Dừng preview |

> Phím tắt không hoạt động khi đang nhập text (song title, artist name).

---

## Cấu trúc dự án

```
music-visualizer/
  src/
    main.jsx                    # React entry point
    App.jsx                     # Component chính, layout toàn app
    components/
      DropZone.jsx              # Kéo thả file upload
      Slider.jsx                # Thanh trượt điều chỉnh
      ColorPicker.jsx           # Chọn màu
      PreviewCanvas.jsx         # Canvas preview + idle animation + export overlay
    hooks/
      useAudioPlayer.js         # Quản lý audio + analyzer + render loop
      useExport.js              # Quản lý pipeline export
      useThemeSettings.js       # Quản lý theme + settings + màu sắc
      useKeyboardShortcuts.js   # Phím tắt
    engine/
      AudioAnalyzer.js          # Web Audio API (realtime) + Radix-2 FFT (offline)
      RenderLoop.js             # Vòng lặp render + title overlay
      ExportEngine.js           # Render frames + upload + pipeline tối ưu
      ThemeRegistry.js          # Registry theme (factory pattern)
    themes/
      lofi.js                   # Lo-Fi / Chill
      cyberpunk.js              # Cyberpunk / EDM
      ambient.js                # Ambient / Acoustic
      retrowave.js              # Retrowave / Synthwave
      minimal.js                # Minimal / Clean
      neonPulse.js              # Neon Pulse
      galaxy.js                 # Galaxy / Space
      watercolor.js             # Watercolor / Pastel
    utils/
      color.js                  # Hàm tiện ích: màu sắc, grain, vignette, title overlay
    styles/
      global.css                # Design tokens + component styles
      app.css                   # Layout + responsive breakpoints
  server/
    index.js                    # Express backend (upload + FFmpeg export)
  ffmpeg-8.1-essentials_build/  # FFmpeg binary (Windows)
  setup.bat                     # Script cài đặt Windows
  start.bat                     # Script chạy app Windows
  build.bat                     # Script build production Windows
  index.html                    # HTML entry point
  vite.config.js                # Cấu hình Vite + proxy
  package.json                  # Dependencies + scripts
```

---

## Cấu hình nâng cao

### Thay đổi port

```bash
# Backend port (mặc định: 3001)
PORT=4000 node server/index.js

# Frontend port — sửa trong vite.config.js
server: { port: 3000 }
```

### FFmpeg tuỳ chỉnh

Sửa đường dẫn FFmpeg trong `server/index.js`:

```javascript
// Linux/macOS — dùng ffmpeg trong PATH
const FFMPEG_BIN = 'ffmpeg';
```

### Tạo theme mới

1. Tạo file mới trong `src/themes/`:

```javascript
// src/themes/myTheme.js
import { hexToRgb, drawVignette, drawSmoothWaveform } from '../utils/color.js';

export const myThemeMeta = {
  id: 'myTheme',
  name: 'Tên Theme',
  description: 'Mô tả theme',
  colorSlots: [
    { id: 'primary', label: 'Màu chính', default: '#ff0000' },
    { id: 'secondary', label: 'Màu phụ', default: '#00ff00' },
    { id: 'accent', label: 'Điểm nhấn', default: '#0000ff' },
    { id: 'background', label: 'Nền', default: '#000000' },
  ],
  defaultSettings: {
    bassSensitivity: 0.6,
    trebleSensitivity: 0.5,
    colorIntensity: 0.6,
    effectStrength: 0.5,
  },
};

export function createMyTheme() {
  let state = {};

  function init(ctx, width, height) {
    state = { ready: true };
  }

  function render(ctx, audioData, settings, time, bgImage, width, height) {
    if (!state.ready) init(ctx, width, height);

    const { bass, mid, treble, energy, waveform, frequency } = audioData;
    const { bassSensitivity, waveformScale = 0.5, barScale = 0.5 } = settings;
    const colors = settings.colors || {};
    const pc = hexToRgb(colors.primary || '#ff0000');

    // Xoá canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Vẽ hiệu ứng ở đây...
  }

  function destroy() { state = {}; }

  return { ...myThemeMeta, init, render, destroy };
}
```

2. Đăng ký trong `src/engine/ThemeRegistry.js`:

```javascript
import { myThemeMeta, createMyTheme } from '../themes/myTheme.js';
register(myThemeMeta, createMyTheme);
```

3. Khởi động lại dev server — theme mới xuất hiện trong danh sách.

### AudioData object

Mỗi frame, hàm `render()` của theme nhận được:

```javascript
{
  bass: 0-1,        // Năng lượng bass (0-250Hz)
  mid: 0-1,         // Năng lượng mid (250-4000Hz)
  treble: 0-1,      // Năng lượng treble (4000Hz+)
  energy: 0-1,      // Năng lượng tổng hợp (weighted: 60% bass + 30% mid + 10% treble)
  waveform: Uint8Array(1024),   // Dạng sóng (0-255, 128 = im lặng)
  frequency: Uint8Array(1024),  // Phổ tần số (0-255, magnitude)
}
```

### Settings object

```javascript
{
  bassSensitivity: 0-1,     // Độ nhạy bass
  trebleSensitivity: 0-1,   // Độ nhạy treble
  colorIntensity: 0-1,      // Cường độ màu
  effectStrength: 0-1,      // Độ mạnh hiệu ứng
  waveformScale: 0-1,       // Độ dày waveform (0=mỏng, 1=dày)
  barScale: 0-1,            // Độ dày bars (0=mỏng, 1=dày)
  colors: {                 // Bảng màu tuỳ chỉnh
    primary: '#hex',
    secondary: '#hex',
    accent: '#hex',
    background: '#hex',
  },
}
```

---

## Xử lý lỗi thường gặp

### "FFmpeg not found"

FFmpeg chưa được cài đặt hoặc nằm sai vị trí.

**Windows:** Đảm bảo folder `ffmpeg-8.1-essentials_build/bin/ffmpeg.exe` nằm trong thư mục gốc project.

**macOS/Linux:** Cài FFmpeg qua package manager:
```bash
brew install ffmpeg     # macOS
sudo apt install ffmpeg # Ubuntu/Debian
```

### "Port 3001 already in use"

Có process cũ đang chiếm port. Kill nó:

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <số_PID> /F

# macOS/Linux
lsof -i :3001
kill -9 <số_PID>
```

### Export quá chậm

- Đảm bảo không có app nào khác đang dùng nhiều CPU
- Thử giảm độ dài nhạc (test với bài 1 phút trước)
- Kiểm tra tốc độ mạng (frames upload qua HTTP từ client đến server)
- Đóng các tab browser khác để giải phóng RAM

### Canvas đen / không hiện gì

- Kiểm tra đã drop file nhạc chưa
- Thử bấm "Play Preview"
- Thử đổi theme khác
- Reload trang nếu cần

### Video export không có tiếng

- Đảm bảo file nhạc không bị lỗi
- Thử format khác (MP3 thay WAV hoặc ngược lại)
- Kiểm tra file nhạc play được bình thường trong trình duyệt

### Lỗi "createMediaElementSource"

Lỗi này đã được xử lý tự động. Nếu vẫn gặp, reload trang.

---

## Scripts

```bash
# Chạy development (frontend + backend đồng thời)
npm run dev

# Build production
npm run build

# Chạy backend riêng
npm run server
```

**Windows batch files:**

| File | Mô tả |
|------|-------|
| `setup.bat` | Cài đặt lần đầu — kiểm tra Node, FFmpeg, chạy npm install |
| `start.bat` | Chạy app — tự mở browser |
| `build.bat` | Build production ra thư mục `dist/` |

---

## Tech Stack

| Lớp | Công nghệ |
|-----|-----------|
| Frontend | React 18, Vite 5 |
| Rendering | Canvas 2D API, OffscreenCanvas |
| Phân tích âm thanh | Web Audio API (realtime), Radix-2 FFT (offline export) |
| Backend | Express, Multer |
| Xử lý video | FFmpeg (H.264 + AAC) |
| Fonts | Outfit, JetBrains Mono (Google Fonts) |

---

## License

Copyright ©2026 BILL THE DEV

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.