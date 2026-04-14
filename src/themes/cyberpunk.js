/**
 * Cyberpunk / EDM Theme (Factory Pattern)
 */
import { hexToRgb, drawBreathingBg } from '../utils/color.js';

export const cyberpunkMeta = {
  id: 'cyberpunk',
  name: 'Cyberpunk / EDM',
  description: 'Neon bars, bass flash, chromatic aberration & glitch effects',
  colorSlots: [
    { id: 'primary', label: 'Neon Glow', default: '#00ffff' },
    { id: 'secondary', label: 'Waveform', default: '#ff0080' },
    { id: 'accent', label: 'Flash', default: '#39ff14' },
    { id: 'background', label: 'Background', default: '#05050a' },
  ],
  defaultSettings: {
    bassSensitivity: 0.8, trebleSensitivity: 0.7,
    colorIntensity: 0.8, effectStrength: 0.7,
  },
};

export function createCyberpunkTheme() {
  let state = {};

  function init(ctx, width, height) {
    state = { prevBass: 0, flashIntensity: 0, glitchTimer: 0 };
  }

  function render(ctx, audioData, settings, time, bgImage, width, height) {
    if (state.prevBass === undefined) init(ctx, width, height);

    const { bass, mid, treble, energy, waveform, frequency } = audioData;
    const { bassSensitivity, trebleSensitivity, colorIntensity, effectStrength, waveformScale = 0.5, barScale = 0.5 } = settings;
    const colors = settings.colors || {};
    const pc = hexToRgb(colors.primary || '#00ffff');
    const sc = hexToRgb(colors.secondary || '#ff0080');
    const ac = hexToRgb(colors.accent || '#39ff14');
    const bg = hexToRgb(colors.background || '#05050a');

    const bassHit = bass - (state.prevBass || 0);
    state.prevBass = bass;
    if (bassHit > 0.15 * bassSensitivity) {
      state.flashIntensity = Math.min(1, bassHit * 3);
      state.glitchTimer = 0.15;
    }
    state.flashIntensity *= 0.9;
    state.glitchTimer = Math.max(0, state.glitchTimer - 0.016);

    // ---- Background ----
    ctx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`;
    ctx.fillRect(0, 0, width, height);

    if (bgImage) {
      const bassPulse = bass * bassSensitivity;
      const breathAlpha = 0.55 + bassPulse * 0.3 + Math.sin(time * 2) * 0.08 * effectStrength;
      const breathScale = 1.0 + bassPulse * 0.03 + state.flashIntensity * 0.02;
      drawBreathingBg(ctx, bgImage, width, height, breathAlpha, breathScale);
      ctx.save();
      ctx.globalAlpha = Math.max(0.05, 0.3 - bassPulse * 0.2);
      ctx.fillStyle = `rgba(${bg.r}, ${bg.g}, ${bg.b + 5}, 1)`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // ---- Bass flash ----
    if (state.flashIntensity > 0.05) {
      ctx.fillStyle = `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${state.flashIntensity * 0.25 * effectStrength})`;
      ctx.fillRect(0, 0, width, height);
    }

    // ---- Neon frequency bars ----
    const barCount = 64;
    const centerY = height * 0.5;
    const barAreaWidth = width * 0.75;
    const barStartX = (width - barAreaWidth) / 2;
    const barW = (barAreaWidth / barCount) * (0.3 + barScale * 0.6);
    const barGap = (barAreaWidth / barCount) - barW;
    const maxBarH = height * 0.3;

    ctx.shadowBlur = 0; // Reset before loop
    for (let i = 0; i < barCount; i++) {
      const freqIdx = Math.floor((i / barCount) * frequency.length * 0.6);
      const val = frequency[freqIdx] / 255;
      const barH = val * maxBarH * bassSensitivity;
      const x = barStartX + i * (barW + barGap);

      const hue = (i / barCount) * 180 + time * 30;
      const sat = 80 + val * 20;
      const lum = 45 + val * 25;
      const alpha = (0.6 + val * 0.4) * (0.5 + colorIntensity * 0.5);

      ctx.fillStyle = `hsla(${hue}, ${sat}%, ${lum}%, ${alpha})`;
      ctx.fillRect(x, centerY - barH, barW, barH);
      ctx.fillRect(x, centerY, barW, barH * 0.7);

      if (val > 0.5 && colorIntensity > 0.3) {
        ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.8)`;
        ctx.shadowBlur = 15 * val * colorIntensity;
        ctx.fillRect(x, centerY - barH, barW, barH);
        ctx.shadowBlur = 0;
      }
    }

    // ---- Horizontal neon lines ----
    const lineY1 = centerY - maxBarH * bass * bassSensitivity - 10;
    const lineY2 = centerY + maxBarH * bass * bassSensitivity * 0.7 + 10;
    ctx.strokeStyle = `rgba(${ac.r}, ${ac.g}, ${ac.b}, ${0.3 + energy * 0.5})`;
    ctx.lineWidth = 1 + waveformScale;
    ctx.beginPath();
    ctx.moveTo(barStartX, lineY1); ctx.lineTo(barStartX + barAreaWidth, lineY1);
    ctx.moveTo(barStartX, lineY2); ctx.lineTo(barStartX + barAreaWidth, lineY2);
    ctx.stroke();

    // ---- Waveform ----
    ctx.beginPath();
    ctx.strokeStyle = `rgba(${sc.r}, ${sc.g}, ${sc.b}, ${0.4 + treble * trebleSensitivity * 0.5})`;
    ctx.lineWidth = 1.5 + waveformScale * 3;
    const wavePoints = 200;
    for (let i = 0; i < wavePoints; i++) {
      const t = i / (wavePoints - 1);
      const dataIdx = Math.floor(t * (waveform.length - 1));
      const val = (waveform[dataIdx] - 128) / 128;
      const x = barStartX + t * barAreaWidth;
      const y = centerY + val * 60 * bassSensitivity;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // ---- Glitch (capped at 4 slices) ----
    if (state.glitchTimer > 0 && effectStrength > 0.2) {
      const sliceCount = Math.min(4, Math.floor(3 + state.glitchTimer * effectStrength * 6));
      for (let i = 0; i < sliceCount; i++) {
        const sy = Math.random() * height;
        const sh = 2 + Math.random() * 15 * state.glitchTimer;
        const offset = (Math.random() - 0.5) * 30 * state.glitchTimer;
        try {
          const d = ctx.getImageData(0, Math.floor(sy), width, Math.floor(Math.max(1, sh)));
          ctx.putImageData(d, Math.floor(offset), Math.floor(sy));
        } catch (e) { /* safety */ }
      }
    }

    // ---- Chromatic aberration (conditional, skip if low energy) ----
    if (effectStrength > 0.4 && energy > 0.4) {
      const px = Math.max(1, Math.floor(energy * effectStrength * 3));
      try {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const copy = new Uint8ClampedArray(data);
        for (let i = 0; i < data.length; i += 4) {
          const pi = i >> 2;
          const x = pi % width;
          const row = Math.floor(pi / width) * width;
          const rs = ((x - px + width) % width + row) * 4;
          if (rs < copy.length) data[i] = copy[rs];
          const bs = ((x + px) % width + row) * 4 + 2;
          if (bs < copy.length) data[i + 2] = copy[bs];
        }
        ctx.putImageData(imageData, 0, 0);
      } catch (e) { /* safety */ }
    }

    // ---- Grid (batched) ----
    ctx.strokeStyle = `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${0.03 + energy * 0.03})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = 0; x < width; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
    for (let y = 0; y < height; y += 40) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
    ctx.stroke();
  }

  function destroy() { state = {}; }
  return { ...cyberpunkMeta, init, render, destroy };
}
