/**
 * ExportEngine — Renders frames client-side, streams to backend for FFmpeg encoding
 *
 * Speed optimizations:
 *  1. Pre-computes ALL audio data upfront (FFT once, not per-frame)
 *  2. Pipelined blob conversion: convertToBlob runs on a browser worker thread
 *     while the main thread renders the next frame (spec guarantees snapshot-at-call).
 *  3. Concurrent uploads: up to 3 batches uploading simultaneously
 *  4. Larger batch size (60 frames)
 *  5. JPEG quality 0.82 (balance of quality + upload size)
 *  6. Video background: skip redundant seeks when currentTime already matches.
 */

import { OfflineAnalyzer } from './AudioAnalyzer.js';
import { drawTitleOverlay } from '../utils/color.js';
import { drawSubtitles } from '../utils/subtitles.js';

function isVideoElement(el) {
  return typeof HTMLVideoElement !== 'undefined' && el instanceof HTMLVideoElement;
}

function seekVideo(video, time) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      video.removeEventListener('seeked', finish);
      resolve();
    };
    video.addEventListener('seeked', finish);
    try {
      video.currentTime = time;
    } catch (e) {
      finish();
      return;
    }
    // Safety net — some browsers may not fire 'seeked' on tiny deltas
    setTimeout(finish, 150);
  });
}

export class ExportEngine {
  constructor() {
    this.aborted = false;
  }

  async run({ audioFile, backgroundImage, theme, settings, fps = 30, width = 1920, height = 1080, onProgress }) {
    this.aborted = false;
    const startTime = performance.now();
    onProgress(0, 'Decoding audio...');

    // 1. Decode audio
    const arrayBuffer = await audioFile.arrayBuffer();
    const analyzer = new OfflineAnalyzer();
    await analyzer.decode(arrayBuffer.slice(0));

    const duration = analyzer.duration;
    const totalFrames = Math.ceil(duration * fps);

    // 2. Pre-compute ALL audio frames
    onProgress(2, 'Analyzing audio frequencies...');
    analyzer.precomputeFrames(fps, (frame, total) => {
      if (this.aborted) return;
      const pct = 2 + Math.floor((frame / total) * 5);
      onProgress(pct, `Analyzing audio... ${frame}/${total}`);
    });

    if (this.aborted) throw new Error('Export aborted');
    onProgress(7, 'Initializing render...');

    // 3. Create offscreen canvas
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    theme.init(ctx, width, height);

    // 4. Start export session on server
    const sessionRes = await fetch('/api/export/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fps, width, height, totalFrames }),
    });
    const { sessionId } = await sessionRes.json();

    // 5. Upload original audio file
    const audioFormData = new FormData();
    audioFormData.append('audio', audioFile);
    await fetch(`/api/export/${sessionId}/audio`, {
      method: 'POST',
      body: audioFormData,
    });

    if (this.aborted) throw new Error('Export aborted');
    onProgress(10, 'Rendering frames...');

    // Prepare video background (seek mode — pause any ongoing playback)
    const videoBg = isVideoElement(backgroundImage) ? backgroundImage : null;
    if (videoBg) {
      videoBg.pause();
      videoBg.loop = true;
    }

    // 6. Render frames with pipelined blob conversion + concurrent upload
    const BATCH_SIZE = 60;
    const MAX_CONCURRENT_UPLOADS = 3;
    const BLOB_PIPELINE_DEPTH = 4; // in-flight convertToBlob calls
    const JPEG_QUALITY = 0.82;
    const SEEK_TOLERANCE = 0.5 / fps; // skip seek if already this close
    let batch = [];
    let batchIndex = 0;
    const uploadQueue = []; // track in-flight uploads
    const pendingBlobs = []; // in-flight convertToBlob promises {frame, promise}

    const flushBatch = async (isFinal) => {
      // Wait if too many concurrent uploads
      while (uploadQueue.length >= MAX_CONCURRENT_UPLOADS) {
        await Promise.race(uploadQueue);
      }
      const currentBatch = batch;
      const currentBatchIndex = batchIndex;
      batch = [];
      batchIndex++;
      const uploadPromise = this._uploadBatch(sessionId, currentBatch, currentBatchIndex)
        .then(() => {
          const idx = uploadQueue.indexOf(uploadPromise);
          if (idx > -1) uploadQueue.splice(idx, 1);
        });
      uploadQueue.push(uploadPromise);
    };

    const drainOneBlob = async () => {
      const oldest = pendingBlobs.shift();
      const blob = await oldest.promise;
      batch.push({ frame: oldest.frame, blob });
    };

    for (let frame = 0; frame < totalFrames; frame++) {
      if (this.aborted) throw new Error('Export aborted');

      const audioData = analyzer.getFrame(frame);
      const time = frame / fps;

      // Seek video background to matching timestamp (loop) — skip if already close
      if (videoBg && videoBg.duration > 0) {
        const targetTime = time % videoBg.duration;
        if (Math.abs(videoBg.currentTime - targetTime) > SEEK_TOLERANCE) {
          await seekVideo(videoBg, targetTime);
        }
      }

      // Render theme
      theme.render(ctx, audioData, settings, time, backgroundImage, width, height);

      // Title overlay
      if (settings.showTitle && (settings.songTitle || settings.artistName)) {
        drawTitleOverlay(ctx, settings, time, duration, width, height);
      }

      // Subtitles
      if (settings.showSubtitles && settings.subtitleData) {
        drawSubtitles(ctx, settings.subtitleData, time, width, height, settings.showSecondaryLang);
      }

      // Kick off blob conversion WITHOUT awaiting — spec says convertToBlob snapshots
      // the canvas at call time, so next frame's render won't corrupt this blob.
      // The encode runs on a browser-internal thread while we render the next frame.
      const promise = canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
      pendingBlobs.push({ frame, promise });

      // Keep pipeline depth bounded — drain oldest when full
      if (pendingBlobs.length >= BLOB_PIPELINE_DEPTH) {
        await drainOneBlob();
      }

      // Flush a full batch (drain remaining pipeline first)
      if (batch.length + pendingBlobs.length >= BATCH_SIZE || frame === totalFrames - 1) {
        while (pendingBlobs.length > 0 && (batch.length < BATCH_SIZE || frame === totalFrames - 1)) {
          await drainOneBlob();
        }
        if (batch.length >= BATCH_SIZE || frame === totalFrames - 1) {
          await flushBatch(frame === totalFrames - 1);
        }

        // Progress with ETA
        const elapsed = (performance.now() - startTime) / 1000;
        const framesPerSec = frame / elapsed;
        const remaining = framesPerSec > 0 ? Math.round((totalFrames - frame) / framesPerSec) : 0;
        const etaStr = remaining > 60 ? `${Math.floor(remaining / 60)}m${remaining % 60}s` : `${remaining}s`;
        const percent = 10 + Math.floor((frame / totalFrames) * 75);
        onProgress(percent, `Frame ${frame + 1}/${totalFrames} (~${etaStr} left)`);
      }
    }

    // Drain any remaining blobs and flush last batch
    while (pendingBlobs.length > 0) {
      await drainOneBlob();
    }
    if (batch.length > 0) {
      await flushBatch(true);
    }

    // Wait for all remaining uploads
    await Promise.all(uploadQueue);

    if (this.aborted) throw new Error('Export aborted');
    onProgress(87, 'Encoding MP4...');

    // 7. Finalize — tell server to run FFmpeg
    const finalizeRes = await fetch(`/api/export/${sessionId}/finalize`, {
      method: 'POST',
    });
    const result = await finalizeRes.json();
    if (!finalizeRes.ok) throw new Error(result.error || 'FFmpeg encoding failed');

    onProgress(100, 'Done!');
    return result.downloadUrl;
  }

  async _uploadBatch(sessionId, batch, batchIndex) {
    const formData = new FormData();
    for (const item of batch) {
      formData.append('frames', item.blob, `frame_${String(item.frame).padStart(6, '0')}.jpg`);
    }
    formData.append('batchIndex', String(batchIndex));

    const res = await fetch(`/api/export/${sessionId}/frames`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`Frame upload failed: ${res.status}`);
  }

  abort() {
    this.aborted = true;
  }
}
