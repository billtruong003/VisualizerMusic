/**
 * Watercolor / Pastel Theme (Factory Pattern)
 * Fixed: trail buildup, ctx.__lastY pollution, responsive sizes
 */
import { hexToRgb, drawVignette, drawSmoothWaveform } from '../utils/color.js';

export const watercolorMeta = {
  id: 'watercolor',
  name: 'Watercolor / Pastel',
  description: 'Soft gradient blobs, organic movement, pastel blending',
  colorSlots: [
    { id: 'primary', label: 'Blob A', default: '#ffb3ba' },
    { id: 'secondary', label: 'Blob B', default: '#bae1ff' },
    { id: 'accent', label: 'Blob C', default: '#baffc9' },
    { id: 'background', label: 'Background', default: '#0f0e12' },
  ],
  defaultSettings: {
    bassSensitivity: 0.5, trebleSensitivity: 0.5,
    colorIntensity: 0.7, effectStrength: 0.6,
  },
};

export function createWatercolorTheme() {
  let state = {};

  function init(ctx, width, height) {
    const blobs = [];
    for (let i = 0; i < 6; i++) {
      blobs.push({
        baseX: width * 0.2 + Math.random() * width * 0.6,
        baseY: height * 0.2 + Math.random() * height * 0.6,
        x: 0, y: 0,
        radius: 100 + Math.random() * 150,
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        speedX: 0.2 + Math.random() * 0.4,
        speedY: 0.15 + Math.random() * 0.35,
        colorIndex: i % 3,
      });
    }
    const drops = [];
    for (let i = 0; i < 40; i++) {
      drops.push({
        x: Math.random() * width, y: Math.random() * height,
        radius: 3 + Math.random() * 8,
        alpha: 0.05 + Math.random() * 0.1,
        driftX: (Math.random() - 0.5) * 0.3,
        driftY: (Math.random() - 0.5) * 0.3,
        colorIndex: Math.floor(Math.random() * 3),
      });
    }
    state = { blobs, drops };
  }

  function render(ctx, audioData, settings, time, bgImage, width, height) {
    if (!state.blobs) init(ctx, width, height);

    const { bass, mid, energy, waveform, frequency } = audioData;
    const { bassSensitivity, colorIntensity, effectStrength, waveformScale = 0.5, barScale = 0.5 } = settings;
    const colors = settings.colors || {};
    const pc = hexToRgb(colors.primary || '#ffb3ba');
    const sc = hexToRgb(colors.secondary || '#bae1ff');
    const ac = hexToRgb(colors.accent || '#baffc9');
    const bg = hexToRgb(colors.background || '#0f0e12');
    const palette = [pc, sc, ac];

    // Full clear every frame (fixes trail buildup)
    ctx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`;
    ctx.fillRect(0, 0, width, height);

    if (bgImage) {
      ctx.save();
      ctx.globalAlpha = 0.4 + energy * 0.15;
      const s = Math.max(width / bgImage.width, height / bgImage.height);
      ctx.drawImage(bgImage, (width - bgImage.width * s) / 2, (height - bgImage.height * s) / 2, bgImage.width * s, bgImage.height * s);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Soft blobs
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    state.blobs.forEach(blob => {
      blob.x = blob.baseX + Math.sin(time * blob.speedX + blob.phaseX) * 120 * effectStrength;
      blob.y = blob.baseY + Math.cos(time * blob.speedY + blob.phaseY) * 80 * effectStrength;
      const c = palette[blob.colorIndex];
      const r = blob.radius * (1 + bass * bassSensitivity * 0.3 + Math.sin(time * 0.5 + blob.phaseX) * 0.1);
      const alpha = (0.06 + energy * 0.06) * colorIntensity;
      const grad = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, r);
      grad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`);
      grad.addColorStop(0.4, `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha * 0.6})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(blob.x - r, blob.y - r, r * 2, r * 2);
    });
    ctx.restore();

    // Drops
    state.drops.forEach(d => {
      d.x += d.driftX + Math.sin(time * 0.8 + d.y * 0.01) * 0.3 * effectStrength;
      d.y += d.driftY + Math.cos(time * 0.6 + d.x * 0.01) * 0.3 * effectStrength;
      if (d.x < 0) d.x = width; if (d.x > width) d.x = 0;
      if (d.y < 0) d.y = height; if (d.y > height) d.y = 0;
      const c = palette[d.colorIndex];
      const r = d.radius * (1 + mid * 0.3) * (0.5 + barScale);
      ctx.beginPath();
      ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${d.alpha * (0.5 + energy * 0.5)})`;
      ctx.fill();
    });

    // Waveform
    const waveY = height * 0.5;
    const waveW = width * 0.6;
    const waveStartX = (width - waveW) / 2;
    const amp = 30 + bass * bassSensitivity * 40;

    ctx.strokeStyle = `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${0.2 + energy * 0.25})`;
    ctx.lineWidth = 1.5 + waveformScale * 3;
    ctx.lineCap = 'round';
    drawSmoothWaveform(ctx, waveform, waveStartX, waveW, waveY, amp, 100);

    ctx.strokeStyle = `rgba(${sc.r}, ${sc.g}, ${sc.b}, ${0.1 + mid * 0.15})`;
    ctx.lineWidth = 1 + waveformScale * 2;
    drawSmoothWaveform(ctx, waveform, waveStartX, waveW, waveY + 10, amp * 0.6, 80);

    // Frequency curve (fixed: no ctx property pollution)
    const barCount = 32;
    const barAreaW = width * 0.5;
    const barSX = (width - barAreaW) / 2;
    const points = [];
    for (let i = 0; i < barCount; i++) {
      const t = i / (barCount - 1);
      const fIdx = Math.floor(t * frequency.length * 0.4);
      const val = frequency[fIdx] / 255;
      points.push({
        x: barSX + t * barAreaW,
        y: height - 40 - val * height * 0.08 * bassSensitivity,
      });
    }
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const mid_x = (points[i - 1].x + points[i].x) / 2;
        const mid_y = (points[i - 1].y + points[i].y) / 2;
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, mid_x, mid_y);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.strokeStyle = `rgba(${ac.r}, ${ac.g}, ${ac.b}, ${0.2 + energy * 0.2})`;
      ctx.lineWidth = 1 + waveformScale * 2;
      ctx.stroke();
    }

    drawVignette(ctx, width, height, width * 0.25, width * 0.7, 0.4);
  }

  function destroy() { state = {}; }
  return { ...watercolorMeta, init, render, destroy };
}
