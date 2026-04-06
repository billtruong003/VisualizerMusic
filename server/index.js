/**
 * Server — Express backend
 * 
 * Responsibilities:
 *   - Serve uploaded audio/image files
 *   - Manage export sessions (receive frames, run FFmpeg, serve MP4)
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// FFmpeg binary path — hardcoded for Windows since PATH may not be set
const FFMPEG_BIN = process.platform === 'win32'
  ? 'C:\\ffmpeg\\ffmpeg-8.1-essentials_build\\bin\\ffmpeg.exe'
  : 'ffmpeg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const EXPORTS_DIR = path.join(__dirname, '..', 'exports');

// Ensure directories exist
[UPLOADS_DIR, EXPORTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const app = express();
app.use(cors());
app.use(express.json());

// ---- Static serving ----
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/exports', express.static(EXPORTS_DIR));

// ---- File upload for media inputs ----
const mediaUpload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

app.post('/api/upload', mediaUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({
    filename: req.file.filename,
    originalName: req.file.originalname,
    url: `/uploads/${req.file.filename}`,
    size: req.file.size,
  });
});


// ============================================================
// EXPORT PIPELINE
// ============================================================

const exportSessions = new Map();

/**
 * 1. Start export session
 */
app.post('/api/export/start', (req, res) => {
  const { fps, width, height, totalFrames } = req.body;
  const sessionId = uuidv4();
  const sessionDir = path.join(EXPORTS_DIR, sessionId);
  const framesDir = path.join(sessionDir, 'frames');

  fs.mkdirSync(framesDir, { recursive: true });

  exportSessions.set(sessionId, {
    fps: fps || 30,
    width: width || 1920,
    height: height || 1080,
    totalFrames: totalFrames || 0,
    framesDir,
    sessionDir,
    audioPath: null,
    receivedFrames: 0,
  });

  res.json({ sessionId });
});

/**
 * 2. Upload audio for this session
 */
const sessionAudioUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const session = exportSessions.get(req.params.sessionId);
      if (!session) return cb(new Error('Invalid session'));
      cb(null, session.sessionDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `audio${ext}`);
    },
  }),
});

app.post('/api/export/:sessionId/audio', sessionAudioUpload.single('audio'), (req, res) => {
  const session = exportSessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  session.audioPath = path.join(session.sessionDir, req.file.filename);
  res.json({ ok: true });
});

/**
 * 3. Receive frame batches
 */
const frameUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const session = exportSessions.get(req.params.sessionId);
      if (!session) return cb(new Error('Invalid session'));
      cb(null, session.framesDir);
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    },
  }),
});

app.post('/api/export/:sessionId/frames', frameUpload.array('frames', 60), (req, res) => {
  const session = exportSessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  session.receivedFrames += req.files.length;
  res.json({ received: session.receivedFrames });
});

/**
 * 4. Finalize — run FFmpeg to combine frames + audio into MP4
 */
app.post('/api/export/:sessionId/finalize', async (req, res) => {
  const session = exportSessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const outputFile = path.join(session.sessionDir, 'output.mp4');

  try {
    // FFmpeg command:
    //   -framerate {fps}       — input frame rate
    //   -i frames/frame_%06d.jpg — input frames (sequential JPEG)
    //   -i audio.mp3           — input audio
    //   -c:v libx264           — H.264 video codec
    //   -preset medium         — encoding speed/quality tradeoff
    //   -crf 18                — quality (lower = better, 18 is visually lossless)
    //   -pix_fmt yuv420p       — pixel format compatible with most players/YouTube
    //   -c:a aac -b:a 192k    — AAC audio at 192kbps
    //   -shortest              — stop at shortest stream (in case frame count != audio length)
    //   -movflags +faststart   — YouTube-friendly: moves moov atom to start
    const ffmpegCmd = [
      `"${FFMPEG_BIN}" -y`,
      `-framerate ${session.fps}`,
      `-i "${path.join(session.framesDir, 'frame_%06d.jpg')}"`,
      session.audioPath ? `-i "${session.audioPath}"` : '',
      '-c:v libx264',
      '-preset medium',
      '-crf 18',
      '-pix_fmt yuv420p',
      session.audioPath ? '-c:a aac -b:a 192k' : '',
      '-shortest',
      '-movflags +faststart',
      `"${outputFile}"`,
    ].filter(Boolean).join(' ');

    console.log('[FFmpeg]', ffmpegCmd);
    await execAsync(ffmpegCmd, { maxBuffer: 10 * 1024 * 1024 });

    const downloadUrl = `/exports/${session.sessionId}/output.mp4`;
    res.json({ downloadUrl });

    // Cleanup frames after a delay (keep mp4)
    setTimeout(() => {
      try {
        fs.rmSync(session.framesDir, { recursive: true, force: true });
      } catch (e) { /* ok */ }
    }, 5000);
  } catch (err) {
    console.error('[FFmpeg Error]', err.message);
    res.status(500).json({ error: 'FFmpeg encoding failed', details: err.message });
  }
});

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});


// ---- Start server ----
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n  🎵 Music Visualizer Server running on http://localhost:${PORT}\n`);
});
