/**
 * Retrowave / Synthwave Theme (Factory Pattern)
 * Fixed: responsive sizes, treble usage, mountain mid-freq response
 */
import { hexToRgb, generateGrainFrames, drawGrainOverlay, drawVignette, drawSmoothWaveform } from '../utils/color.js';

export const retrowaveMeta = {
  id: 'retrowave',
  name: 'Retrowave / Synthwave',
  description: '80s sunset, perspective grid, neon sun & retro scanlines',
  colorSlots: [
    { id: 'primary', label: 'Sun / Neon', default: '#ff2975' },
    { id: 'secondary', label: 'Grid', default: '#00b4d8' },
    { id: 'accent', label: 'Horizon Glow', default: '#ffd700' },
    { id: 'background', label: 'Sky Top', default: '#1a0a2e' },
  ],
  defaultSettings: {
    bassSensitivity: 0.7, trebleSensitivity: 0.5,
    colorIntensity: 0.7, effectStrength: 0.6,
  },
};

export function createRetrowaveTheme() {
  let state = {};

  function init(ctx, width, height) {
    state = {
      gridScroll: 0,
      grainFrames: generateGrainFrames(width, height, 3),
      grainIndex: 0,
    };
  }

  function render(ctx, audioData, settings, time, bgImage, width, height) {
    if (!state.grainFrames) init(ctx, width, height);

    const { bass, mid, treble, energy, waveform, frequency } = audioData;
    const { bassSensitivity, trebleSensitivity, colorIntensity, effectStrength, waveformScale = 0.5, barScale = 0.5 } = settings;
    const colors = settings.colors || {};
    const pc = hexToRgb(colors.primary || '#ff2975');
    const sc = hexToRgb(colors.secondary || '#00b4d8');
    const ac = hexToRgb(colors.accent || '#ffd700');
    const bg = hexToRgb(colors.background || '#1a0a2e');

    const horizonY = height * 0.52;

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, `rgb(${bg.r}, ${bg.g}, ${bg.b})`);
    skyGrad.addColorStop(0.4, `rgba(${bg.r + 30}, ${bg.g}, ${bg.b + 40}, 1)`);
    skyGrad.addColorStop(0.7, `rgba(${pc.r}, ${Math.min(255, pc.g + 40)}, ${pc.b}, 0.6)`);
    skyGrad.addColorStop(1, `rgb(${ac.r}, ${ac.g}, ${ac.b})`);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, horizonY);

    ctx.fillStyle = '#050508';
    ctx.fillRect(0, horizonY, width, height - horizonY);

    // Sun
    const sunR = 80 + bass * bassSensitivity * 30;
    const sunY = horizonY - sunR * 0.5 + Math.sin(time * 0.3) * 5;
    const sunX = width / 2;

    const sunGlow = ctx.createRadialGradient(sunX, sunY, sunR * 0.5, sunX, sunY, sunR * 2.5);
    sunGlow.addColorStop(0, `rgba(${ac.r}, ${ac.g}, ${ac.b}, ${(0.3 + energy * 0.3) * colorIntensity})`);
    sunGlow.addColorStop(0.5, `rgba(${pc.r}, ${pc.g}, ${pc.b}, 0.1)`);
    sunGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.clip();
    const sunFill = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
    sunFill.addColorStop(0, `rgb(${ac.r}, ${ac.g}, ${ac.b})`);
    sunFill.addColorStop(0.5, `rgb(${pc.r}, ${pc.g}, ${pc.b})`);
    sunFill.addColorStop(1, `rgba(${pc.r}, ${pc.g / 2}, ${pc.b}, 0.8)`);
    ctx.fillStyle = sunFill;
    ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
    for (let i = 0; i < 8; i++) {
      const sy = sunY - sunR + (sunR * 2 / 8) * i + sunR / 8;
      ctx.fillStyle = '#050508';
      ctx.fillRect(sunX - sunR, sy, sunR * 2, 2 + i * 1.5);
    }
    ctx.restore();

    // Perspective grid
    state.gridScroll = (state.gridScroll + 0.005 + bass * bassSensitivity * 0.02) % 1;
    ctx.strokeStyle = `rgba(${sc.r}, ${sc.g}, ${sc.b}, ${(0.25 + energy * 0.25) * colorIntensity})`;
    ctx.lineWidth = 1 + waveformScale * 0.5;

    ctx.beginPath();
    for (let i = -20; i <= 20; i++) {
      ctx.moveTo(width / 2 + i * 15, horizonY);
      ctx.lineTo(width / 2 + i * (width * 0.08), height);
    }
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const t = (i / 16 + state.gridScroll) % 1;
      const y = horizonY + t * t * (height - horizonY);
      ctx.moveTo(0, y); ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Mountain silhouette (responds to bass + mid)
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    const peaks = [0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.9, 1.0];
    const heights = [0.85, 0.6, 0.75, 0.5, 0.7, 0.55, 0.8, 0.9];
    for (let i = 0; i < peaks.length; i++) {
      const mx = width * peaks[i];
      const my = horizonY - (1 - heights[i]) * 80 - bass * bassSensitivity * 15 - mid * 10;
      ctx.lineTo(mx, my);
    }
    ctx.lineTo(width, horizonY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(5, 5, 12, 0.9)';
    ctx.fill();
    ctx.strokeStyle = `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${(0.3 + energy * 0.4) * colorIntensity})`;
    ctx.lineWidth = 1.5 + waveformScale;
    ctx.stroke();

    // Neon waveform
    const waveY = horizonY - 60;
    const waveW = width * 0.6;
    const waveSX = (width - waveW) / 2;
    ctx.strokeStyle = `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${0.5 + energy * 0.4})`;
    ctx.lineWidth = 1.5 + waveformScale * 3;
    ctx.shadowColor = `rgb(${pc.r}, ${pc.g}, ${pc.b})`;
    ctx.shadowBlur = 10 * colorIntensity;
    drawSmoothWaveform(ctx, waveform, waveSX, waveW, waveY, 30 + bass * 40, 150);
    ctx.shadowBlur = 0;

    // Frequency bars along bottom (responds to treble too)
    const barCount = 32;
    const barAreaW = width * 0.5;
    const barSX = (width - barAreaW) / 2;
    const bw = (barAreaW / barCount) * (0.3 + barScale * 0.6);
    const bGap = (barAreaW / barCount) - bw;
    for (let i = 0; i < barCount; i++) {
      const fIdx = Math.floor((i / barCount) * frequency.length * 0.5);
      const val = frequency[fIdx] / 255;
      const bH = val * height * 0.08 * bassSensitivity + treble * trebleSensitivity * 5;
      const x = barSX + i * (bw + bGap);
      ctx.fillStyle = `rgba(${sc.r}, ${sc.g}, ${sc.b}, ${(0.3 + val * 0.5) * colorIntensity})`;
      ctx.fillRect(x, height - 20 - bH, bw, bH);
    }

    // Scanlines + grain
    if (effectStrength > 0.2 && state.grainFrames) {
      state.grainIndex = (state.grainIndex + 1) % state.grainFrames.length;
      drawGrainOverlay(ctx, state.grainFrames, state.grainIndex, width, height, effectStrength * 0.06);
    }
    if (effectStrength > 0.3) {
      ctx.fillStyle = `rgba(0,0,0,${effectStrength * 0.04})`;
      for (let y = 0; y < height; y += 2) ctx.fillRect(0, y, width, 1);
    }

    drawVignette(ctx, width, height, width * 0.3, width * 0.75, 0.5);
  }

  function destroy() { state = {}; }
  return { ...retrowaveMeta, init, render, destroy };
}
