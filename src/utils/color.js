/**
 * Color utilities for theme rendering
 */

export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#000000');
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

export function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function createOffscreen(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(w, h);
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Pre-generate grain texture frames for VHS/film grain effect.
 * Uses drawImage + composite instead of per-pixel getImageData (10-50x faster).
 */
export function generateGrainFrames(w, h, count = 3) {
  const grainW = Math.ceil(w / 2);
  const grainH = Math.ceil(h / 2);
  const frames = [];

  for (let f = 0; f < count; f++) {
    const c = createOffscreen(grainW, grainH);
    const gCtx = c.getContext('2d');
    const imgData = gCtx.createImageData(grainW, grainH);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 80;
      d[i] = d[i + 1] = d[i + 2] = 128 + noise;
      d[i + 3] = 255;
    }
    gCtx.putImageData(imgData, 0, 0);
    frames.push(c);
  }
  return frames;
}

/**
 * Draw pre-generated grain overlay (fast, GPU-composited)
 */
export function drawGrainOverlay(ctx, grainFrames, frameIndex, w, h, alpha) {
  if (!grainFrames || grainFrames.length === 0) return;
  const frame = grainFrames[frameIndex % grainFrames.length];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(frame, 0, 0, w, h);
  ctx.restore();
}

/**
 * Draw vignette effect
 */
export function drawVignette(ctx, w, h, innerRadius, outerRadius, alpha) {
  const cx = w / 2, cy = h / 2;
  const grad = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, outerRadius);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${alpha})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Draw smooth waveform using quadratic Bezier curves
 */
export function drawSmoothWaveform(ctx, waveform, startX, waveWidth, centerY, amplitude, pointCount) {
  const points = [];
  for (let i = 0; i < pointCount; i++) {
    const t = i / (pointCount - 1);
    const dataIdx = Math.floor(t * (waveform.length - 1));
    const val = (waveform[dataIdx] - 128) / 128;
    points.push({
      x: startX + t * waveWidth,
      y: centerY + val * amplitude,
    });
  }

  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }

  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

/**
 * Draw song title & artist overlay.
 * Renders AFTER the theme so it's theme-independent.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} settings — must have songTitle, artistName, titlePosition, titleDisplay
 * @param {number} time — current playback time in seconds
 * @param {number} duration — total audio duration (Infinity for preview)
 * @param {number} w — canvas width
 * @param {number} h — canvas height
 */
export function drawTitleOverlay(ctx, settings, time, duration, w, h) {
  const { songTitle, artistName, titlePosition = 'bottom-left', titleDisplay = 'always', titleFont = 'Outfit' } = settings;
  if (!songTitle && !artistName) return;

  // Compute opacity based on display mode
  let alpha = 1;
  if (titleDisplay === 'fade') {
    // Fade in 0-2s, visible 2-8s, fade out 8-10s
    if (time < 2) alpha = time / 2;
    else if (time < 8) alpha = 1;
    else if (time < 10) alpha = 1 - (time - 8) / 2;
    else alpha = 0;
  } else if (titleDisplay === 'hidden') {
    return;
  }
  // 'always' → alpha stays 1

  if (alpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha * 0.95;

  // Position
  let x, y, align;
  switch (titlePosition) {
    case 'center':
      x = w / 2; y = h / 2 - 10; align = 'center'; break;
    case 'bottom-center':
      x = w / 2; y = h - 90; align = 'center'; break;
    case 'top-left':
      x = 60; y = 70; align = 'left'; break;
    default: // bottom-left
      x = 60; y = h - 90; align = 'left'; break;
  }

  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';

  // Text shadow for readability on any background
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  // Song title
  const fontFamily = `'${titleFont}', sans-serif`;
  if (songTitle) {
    ctx.font = `bold ${Math.round(w / 50)}px ${fontFamily}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillText(songTitle, x, y);
  }

  // Artist name
  if (artistName) {
    const artistY = songTitle ? y + Math.round(w / 38) : y;
    ctx.font = `${Math.round(w / 65)}px ${fontFamily}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(artistName, x, artistY);
  }

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.restore();
}

/**
 * Draw background image with breathing effect
 */
export function drawBreathingBg(ctx, bgImage, w, h, breathAlpha, breathScale) {
  ctx.save();
  ctx.globalAlpha = Math.min(1, breathAlpha);
  const baseScale = Math.max(w / bgImage.width, h / bgImage.height);
  const finalScale = baseScale * breathScale;
  const sw = bgImage.width * finalScale;
  const sh = bgImage.height * finalScale;
  ctx.drawImage(bgImage, (w - sw) / 2, (h - sh) / 2, sw, sh);
  ctx.restore();
}
