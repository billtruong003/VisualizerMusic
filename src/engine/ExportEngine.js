/**
 * ExportEngine — Renders frames client-side, streams to backend for FFmpeg encoding
 * 
 * Flow:
 *   1. Decode full audio offline
 *   2. For each frame (at target FPS), compute FFT data at that timestamp
 *   3. Render frame using theme.render() on an offscreen canvas
 *   4. Convert to JPEG blob, send to server in batches
 *   5. Server pipes frames to FFmpeg, muxes with original audio, outputs MP4
 */

import { OfflineAnalyzer } from './AudioAnalyzer.js';

export class ExportEngine {
  constructor() {
    this.aborted = false;
  }

  /**
   * @param {Object} params
   * @param {File} params.audioFile — original audio file
   * @param {HTMLImageElement} params.backgroundImage — loaded image element (or null)
   * @param {Object} params.theme — theme module
   * @param {Object} params.settings — user settings
   * @param {number} params.fps — target FPS (default 30)
   * @param {number} params.width — output width (default 1920)
   * @param {number} params.height — output height (default 1080)
   * @param {Function} params.onProgress — (percent: number, status: string) => void
   * @returns {Promise<string>} — download URL for the exported MP4
   */
  async run({ audioFile, backgroundImage, theme, settings, fps = 30, width = 1920, height = 1080, onProgress }) {
    this.aborted = false;
    onProgress(0, 'Decoding audio...');

    // 1. Decode audio
    const arrayBuffer = await audioFile.arrayBuffer();
    const analyzer = new OfflineAnalyzer();
    await analyzer.decode(arrayBuffer.slice(0)); // slice to avoid detached buffer

    const duration = analyzer.duration;
    const totalFrames = Math.ceil(duration * fps);

    onProgress(5, 'Initializing render...');

    // 2. Create offscreen canvas
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    theme.init(ctx, width, height);

    // 3. Start export session on server
    const sessionRes = await fetch('/api/export/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fps, width, height, totalFrames }),
    });
    const { sessionId } = await sessionRes.json();

    // 4. Upload original audio file
    const audioFormData = new FormData();
    audioFormData.append('audio', audioFile);
    await fetch(`/api/export/${sessionId}/audio`, {
      method: 'POST',
      body: audioFormData,
    });

    onProgress(10, 'Rendering frames...');

    // 5. Render frames and send in batches
    const BATCH_SIZE = 30; // frames per batch
    let batch = [];
    let batchIndex = 0;

    for (let frame = 0; frame < totalFrames; frame++) {
      if (this.aborted) throw new Error('Export aborted');

      const time = frame / fps;
      const audioData = analyzer.getDataAtTime(time);

      theme.render(ctx, audioData, settings, time, backgroundImage, width, height);

      // Convert to JPEG blob
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
      batch.push({ frame, blob });

      if (batch.length >= BATCH_SIZE || frame === totalFrames - 1) {
        // Send batch
        const formData = new FormData();
        for (const item of batch) {
          formData.append('frames', item.blob, `frame_${String(item.frame).padStart(6, '0')}.jpg`);
        }
        formData.append('batchIndex', String(batchIndex));

        await fetch(`/api/export/${sessionId}/frames`, {
          method: 'POST',
          body: formData,
        });

        batch = [];
        batchIndex++;

        const percent = 10 + Math.floor((frame / totalFrames) * 75);
        onProgress(percent, `Rendering frame ${frame + 1}/${totalFrames}...`);
      }
    }

    onProgress(85, 'Encoding MP4...');

    // 6. Finalize — tell server to run FFmpeg
    const finalizeRes = await fetch(`/api/export/${sessionId}/finalize`, {
      method: 'POST',
    });
    const { downloadUrl } = await finalizeRes.json();

    onProgress(100, 'Done!');
    return downloadUrl;
  }

  abort() {
    this.aborted = true;
  }
}
