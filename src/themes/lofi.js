/**
 * Lo-Fi / Chill Theme (Factory Pattern)
 */
import { hexToRgb, generateGrainFrames, drawGrainOverlay, drawVignette, drawSmoothWaveform, drawBreathingBg } from '../utils/color.js';

export const lofiMeta = {
  id: 'lofi',
  name: 'Lo-Fi / Chill',
  description: 'Soft waveforms, VHS grain, gentle breathing background',
  colorSlots: [
    { id: 'primary', label: 'Waveform', default: '#ffc88c' },
    { id: 'secondary', label: 'Ghost Wave', default: '#b496dc' },
    { id: 'accent', label: 'Bass Flash', default: '#ffdcb4' },
    { id: 'background', label: 'Background', default: '#0a080f' },
  ],
  defaultSettings: {
    bassSensitivity: 0.6, trebleSensitivity: 0.4,
    colorIntensity: 0.5, effectStrength: 0.5,
  },
};

export function createLofiTheme() {
  let state = {};

  function init(ctx, width, height) {
    state = {
      grainFrames: generateGrainFrames(width, height, 4),
      grainIndex: 0,
    };
  }

  function render(ctx, audioData, settings, time, bgImage, width, height) {
    if (!state.grainFrames) init(ctx, width, height);

    const { bass, mid, energy, waveform, frequency } = audioData;
    const { bassSensitivity, effectStrength, colorIntensity, waveformScale = 0.5, barScale = 0.5 } = settings;
    const colors = settings.colors || {};
    const pc = hexToRgb(colors.primary || '#ffc88c');
    const sc = hexToRgb(colors.secondary || '#b496dc');
    const ac = hexToRgb(colors.accent || '#ffdcb4');
    const bg = hexToRgb(colors.background || '#0a080f');

    const breathSine = Math.sin(time * 1.2) * 0.5 + 0.5;
    const bassPulse = bass * bassSensitivity;
    const breathAlpha = 0.55 + breathSine * 0.2 * effectStrength + bassPulse * 0.2;
    const breathScale = 1.0 + breathSine * 0.01 * effectStrength + bassPulse * 0.02;

    ctx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`;
    ctx.fillRect(0, 0, width, height);

    if (bgImage) {
      drawBreathingBg(ctx, bgImage, width, height, breathAlpha, breathScale);
      if (bassPulse > 0.3) {
        ctx.save();
        ctx.globalAlpha = (bassPulse - 0.3) * 0.15 * effectStrength;
        ctx.fillStyle = `rgb(${ac.r}, ${ac.g}, ${ac.b})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    } else {
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.6);
      gradient.addColorStop(0, `rgba(${bg.r + 50}, ${bg.g + 32}, ${bg.b + 65}, ${0.2 + breathAlpha * 0.5})`);
      gradient.addColorStop(1, `rgba(${bg.r}, ${bg.g}, ${bg.b}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // ---- Waveform (responsive thickness) ----
    const waveY = height * 0.55;
    const waveWidth = width * 0.7;
    const waveStartX = (width - waveWidth) / 2;
    const lineW = 1.5 + waveformScale * 4; // 1.5 → 5.5

    ctx.strokeStyle = `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${0.3 + energy * colorIntensity * 0.6})`;
    ctx.lineWidth = lineW;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawSmoothWaveform(ctx, waveform, waveStartX, waveWidth, waveY, 40 + bass * bassSensitivity * 60, 128);

    ctx.strokeStyle = `rgba(${sc.r}, ${sc.g}, ${sc.b}, ${0.15 + mid * 0.2})`;
    ctx.lineWidth = lineW * 0.6;
    drawSmoothWaveform(ctx, waveform, waveStartX, waveWidth, waveY, 30 + Math.sin(time * 0.8) * 8, 128);

    // ---- Frequency bars (responsive thickness) ----
    const barCount = 48;
    const barWidthBase = (waveWidth / barCount) * (0.3 + barScale * 0.6); // 0.3 → 0.9 of slot
    const barGap = (waveWidth / barCount) - barWidthBase;
    const maxBarHeight = height * 0.12;

    for (let i = 0; i < barCount; i++) {
      const freqIdx = Math.floor((i / barCount) * frequency.length * 0.5);
      const val = frequency[freqIdx] / 255;
      const barHeight = val * maxBarHeight * bassSensitivity;
      const x = waveStartX + i * (barWidthBase + barGap);
      const alpha = (0.15 + val * 0.35) * (0.5 + colorIntensity);
      ctx.fillStyle = `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${alpha})`;
      ctx.fillRect(x, height - 40 - barHeight, barWidthBase, barHeight);
    }

    // ---- VHS Grain ----
    if (effectStrength > 0.1 && state.grainFrames) {
      state.grainIndex = (state.grainIndex + 1) % state.grainFrames.length;
      drawGrainOverlay(ctx, state.grainFrames, state.grainIndex, width, height, effectStrength * 0.1);
    }

    drawVignette(ctx, width, height, width * 0.25, width * 0.7, 0.5);

    if (effectStrength > 0.2) {
      ctx.fillStyle = `rgba(0,0,0,${effectStrength * 0.05})`;
      for (let y = 0; y < height; y += 3) {
        ctx.fillRect(0, y, width, 1);
      }
    }
  }

  function destroy() { state = {}; }
  return { ...lofiMeta, init, render, destroy };
}
