/**
 * Minimal / Clean Theme (Factory Pattern)
 * Fixed: corner markers visibility, responsive sizes, treble usage
 */
import { hexToRgb, drawSmoothWaveform } from '../utils/color.js';

export const minimalMeta = {
  id: 'minimal',
  name: 'Minimal / Clean',
  description: 'Clean bars, thin waveform, understated elegance',
  colorSlots: [
    { id: 'primary', label: 'Bars', default: '#ffffff' },
    { id: 'secondary', label: 'Waveform', default: '#666666' },
    { id: 'accent', label: 'Highlight', default: '#4a90d9' },
    { id: 'background', label: 'Background', default: '#0a0a0a' },
  ],
  defaultSettings: {
    bassSensitivity: 0.6, trebleSensitivity: 0.5,
    colorIntensity: 0.4, effectStrength: 0.3,
  },
};

export function createMinimalTheme() {
  let state = {};

  function init() { state = { ready: true }; }

  function render(ctx, audioData, settings, time, bgImage, width, height) {
    if (!state.ready) init();

    const { bass, mid, treble, energy, waveform, frequency } = audioData;
    const { bassSensitivity, trebleSensitivity, colorIntensity, effectStrength, waveformScale = 0.5, barScale = 0.5 } = settings;
    const colors = settings.colors || {};
    const pc = hexToRgb(colors.primary || '#ffffff');
    const sc = hexToRgb(colors.secondary || '#666666');
    const ac = hexToRgb(colors.accent || '#4a90d9');
    const bg = hexToRgb(colors.background || '#0a0a0a');

    ctx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`;
    ctx.fillRect(0, 0, width, height);

    if (bgImage) {
      ctx.save();
      ctx.globalAlpha = 0.4 + bass * bassSensitivity * 0.15;
      const s = Math.max(width / bgImage.width, height / bgImage.height);
      ctx.drawImage(bgImage, (width - bgImage.width * s) / 2, (height - bgImage.height * s) / 2, bgImage.width * s, bgImage.height * s);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Center glow (smooth threshold)
    const glowAlpha = energy * 0.04 * colorIntensity;
    if (glowAlpha > 0.002) {
      const gG = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.4);
      gG.addColorStop(0, `rgba(${ac.r}, ${ac.g}, ${ac.b}, ${glowAlpha})`);
      gG.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gG;
      ctx.fillRect(0, 0, width, height);
    }

    // Dot grid
    if (effectStrength > 0.1) {
      const dotSpacing = 50;
      ctx.fillStyle = `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${0.03 + energy * 0.02})`;
      for (let x = dotSpacing; x < width; x += dotSpacing) {
        for (let y = dotSpacing; y < height; y += dotSpacing) {
          ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
        }
      }
    }

    // Frequency bars
    const barCount = 64;
    const barAreaW = width * 0.7;
    const barSX = (width - barAreaW) / 2;
    const bw = (barAreaW / barCount) * (0.2 + barScale * 0.6);
    const bGap = (barAreaW / barCount) - bw;
    const maxBH = height * 0.35;

    for (let i = 0; i < barCount; i++) {
      const fIdx = Math.floor((i / barCount) * frequency.length * 0.6);
      const val = frequency[fIdx] / 255;
      const bH = val * maxBH * bassSensitivity;
      const x = barSX + i * (bw + bGap);
      const y = height - 60;
      const mixT = val;
      const r = Math.round(sc.r + (pc.r - sc.r) * mixT);
      const g = Math.round(sc.g + (pc.g - sc.g) * mixT);
      const b = Math.round(sc.b + (pc.b - sc.b) * mixT);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(0.3 + val * 0.6) * (0.5 + colorIntensity)})`;
      ctx.fillRect(x, y - bH, bw, bH);
      if (bH > 2) {
        ctx.fillStyle = `rgba(${ac.r}, ${ac.g}, ${ac.b}, ${val * 0.8})`;
        ctx.fillRect(x, y - bH - 2, bw, 2);
      }
    }

    // Waveform (uses trebleSensitivity for amplitude modulation)
    const waveY = height * 0.4;
    const waveW = width * 0.6;
    const waveSX = (width - waveW) / 2;
    ctx.strokeStyle = `rgba(${sc.r}, ${sc.g}, ${sc.b}, ${0.2 + energy * 0.3})`;
    ctx.lineWidth = 1 + waveformScale * 2.5;
    ctx.lineCap = 'round';
    drawSmoothWaveform(ctx, waveform, waveSX, waveW, waveY, (25 + bass * 30) * (0.5 + trebleSensitivity), 100);

    // Divider line
    ctx.strokeStyle = `rgba(${pc.r}, ${pc.g}, ${pc.b}, 0.08)`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(barSX, height - 58);
    ctx.lineTo(barSX + barAreaW, height - 58);
    ctx.stroke();

    // Corner markers (improved visibility)
    const margin = 40, markLen = 20;
    ctx.strokeStyle = `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${0.15 + energy * 0.1})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(margin + markLen, margin); ctx.lineTo(margin, margin); ctx.lineTo(margin, margin + markLen);
    ctx.moveTo(width - margin - markLen, margin); ctx.lineTo(width - margin, margin); ctx.lineTo(width - margin, margin + markLen);
    ctx.moveTo(margin + markLen, height - margin); ctx.lineTo(margin, height - margin); ctx.lineTo(margin, height - margin - markLen);
    ctx.moveTo(width - margin - markLen, height - margin); ctx.lineTo(width - margin, height - margin); ctx.lineTo(width - margin, height - margin - markLen);
    ctx.stroke();
  }

  function destroy() { state = {}; }
  return { ...minimalMeta, init, render, destroy };
}
