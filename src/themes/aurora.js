/**
 * Aurora Theme (Factory Pattern)
 * Flowing aurora ribbons that sway to bass + mids, starry backdrop on treble.
 */
import { hexToRgb, drawVignette } from '../utils/color.js';

export const auroraMeta = {
  id: 'aurora',
  name: 'Aurora',
  description: 'Northern-lights ribbons with star dust — soft & cinematic',
  colorSlots: [
    { id: 'primary', label: 'Ribbon A', default: '#7cffb2' },
    { id: 'secondary', label: 'Ribbon B', default: '#60a5ff' },
    { id: 'accent', label: 'Stars', default: '#ffffff' },
    { id: 'background', label: 'Sky', default: '#05081a' },
  ],
  defaultSettings: {
    bassSensitivity: 0.55, trebleSensitivity: 0.6,
    colorIntensity: 0.7, effectStrength: 0.55,
  },
};

export function createAuroraTheme() {
  let state = {};

  function init(ctx, width, height) {
    const stars = [];
    const STAR_COUNT = Math.round((width * height) / 10000);
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.7,
        r: 0.3 + Math.random() * 1.3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.5,
      });
    }
    state = { stars, prevBass: 0, twinkle: 0 };
  }

  function render(ctx, audioData, settings, time, bgImage, width, height) {
    if (!state.stars) init(ctx, width, height);

    const { bass, mid, treble, energy, waveform, frequency } = audioData;
    const { bassSensitivity, trebleSensitivity, colorIntensity, effectStrength, waveformScale = 0.5, barScale = 0.5 } = settings;
    const colors = settings.colors || {};
    const pc = hexToRgb(colors.primary || '#7cffb2');
    const sc = hexToRgb(colors.secondary || '#60a5ff');
    const ac = hexToRgb(colors.accent || '#ffffff');
    const bg = hexToRgb(colors.background || '#05081a');

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, `rgb(${bg.r}, ${bg.g}, ${bg.b})`);
    skyGrad.addColorStop(0.7, `rgb(${Math.min(255, bg.r + 10)}, ${Math.min(255, bg.g + 14)}, ${Math.min(255, bg.b + 30)})`);
    skyGrad.addColorStop(1, `rgb(${Math.max(0, bg.r - 4)}, ${Math.max(0, bg.g - 4)}, ${Math.max(0, bg.b - 10)})`);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    if (bgImage) {
      ctx.save();
      ctx.globalAlpha = 0.35 + bass * 0.2;
      const bw = bgImage.width || bgImage.videoWidth || width;
      const bh = bgImage.height || bgImage.videoHeight || height;
      const s = Math.max(width / bw, height / bh);
      ctx.drawImage(bgImage, (width - bw * s) / 2, (height - bh * s) / 2, bw * s, bh * s);
      ctx.restore();
    }

    // Stars — twinkle with treble
    state.twinkle += 0.02 + treble * trebleSensitivity * 0.08;
    const trebBoost = 1 + treble * trebleSensitivity * 1.5;
    for (const s2 of state.stars) {
      const alpha = 0.4 + 0.5 * Math.abs(Math.sin(state.twinkle * s2.speed + s2.phase)) * trebBoost;
      ctx.fillStyle = `rgba(${ac.r}, ${ac.g}, ${ac.b}, ${Math.min(1, alpha * (0.5 + colorIntensity * 0.5))})`;
      ctx.beginPath();
      ctx.arc(s2.x, s2.y, s2.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ribbons (3 layered flowing bands)
    const ribbons = [
      { color: pc, yBase: height * 0.45, amp: 70, freq: 0.005, phase: 0,   thick: 140 },
      { color: sc, yBase: height * 0.52, amp: 90, freq: 0.004, phase: 1.3, thick: 180 },
      { color: pc, yBase: height * 0.6,  amp: 60, freq: 0.006, phase: 2.5, thick: 110 },
    ];

    const bassWave = 1 + bass * bassSensitivity * 0.8;
    const midWave = 1 + mid * 0.6;

    for (let ri = 0; ri < ribbons.length; ri++) {
      const rb = ribbons[ri];
      const segs = 80;
      const pts = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const x = t * width;
        const f = Math.floor(t * frequency.length * 0.5);
        const specBoost = (frequency[f] / 255) * 30 * bassSensitivity;
        const y = rb.yBase
          + Math.sin(x * rb.freq + time * 0.8 + rb.phase) * rb.amp * bassWave
          + Math.sin(x * rb.freq * 2.3 + time * 1.4 + rb.phase) * rb.amp * 0.4 * midWave
          + specBoost;
        pts.push({ x, y });
      }

      // Draw as filled ribbon with vertical gradient fade
      const grad = ctx.createLinearGradient(0, rb.yBase - rb.thick, 0, rb.yBase + rb.thick);
      grad.addColorStop(0, `rgba(${rb.color.r}, ${rb.color.g}, ${rb.color.b}, 0)`);
      grad.addColorStop(0.5, `rgba(${rb.color.r}, ${rb.color.g}, ${rb.color.b}, ${(0.35 + energy * 0.4) * colorIntensity})`);
      grad.addColorStop(1, `rgba(${rb.color.r}, ${rb.color.g}, ${rb.color.b}, 0)`);
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y - rb.thick);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y - rb.thick);
      for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y + rb.thick);
      ctx.closePath();
      ctx.fill();

      // Bright line on top of ribbon
      ctx.strokeStyle = `rgba(${rb.color.r}, ${rb.color.g}, ${rb.color.b}, ${(0.55 + energy * 0.35) * colorIntensity})`;
      ctx.lineWidth = 1 + waveformScale * 2.5;
      ctx.shadowColor = `rgba(${rb.color.r}, ${rb.color.g}, ${rb.color.b}, ${0.7 * colorIntensity})`;
      ctx.shadowBlur = 14 * colorIntensity;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Thin waveform accent near horizon
    const waveY = height * 0.82;
    const waveW = width * 0.8;
    const waveSX = (width - waveW) / 2;
    ctx.strokeStyle = `rgba(${ac.r}, ${ac.g}, ${ac.b}, ${(0.15 + energy * 0.2) * colorIntensity})`;
    ctx.lineWidth = 1 + waveformScale * 1.5;
    ctx.beginPath();
    for (let i = 0; i < 128; i++) {
      const t = i / 127;
      const wIdx = Math.floor(t * (waveform.length - 1));
      const v = (waveform[wIdx] - 128) / 128;
      const x = waveSX + t * waveW;
      const y = waveY + v * (20 + bass * 40 * bassSensitivity);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Ground reflection glow
    const floorGrad = ctx.createLinearGradient(0, height * 0.85, 0, height);
    floorGrad.addColorStop(0, 'rgba(0,0,0,0)');
    floorGrad.addColorStop(1, `rgba(${sc.r}, ${sc.g}, ${sc.b}, ${0.12 * colorIntensity})`);
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, height * 0.85, width, height * 0.15);

    // Bass pulse — subtle sky flash
    const hit = bass - state.prevBass;
    state.prevBass = bass;
    if (hit > 0.18 * bassSensitivity) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.18, hit * 0.7) * effectStrength;
      ctx.fillStyle = `rgb(${pc.r}, ${pc.g}, ${pc.b})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Very subtle bar indicator — unobtrusive
    if (barScale > 0.1) {
      const barCount = 32;
      const barAreaW = width * 0.4;
      const barSX = (width - barAreaW) / 2;
      const bw = (barAreaW / barCount) * (0.15 + barScale * 0.4);
      const bGap = (barAreaW / barCount) - bw;
      for (let i = 0; i < barCount; i++) {
        const fIdx = Math.floor((i / barCount) * frequency.length * 0.3);
        const v = frequency[fIdx] / 255;
        const h = v * 18 * bassSensitivity;
        const x = barSX + i * (bw + bGap);
        ctx.fillStyle = `rgba(${ac.r}, ${ac.g}, ${ac.b}, ${(0.15 + v * 0.25) * colorIntensity})`;
        ctx.fillRect(x, height - 22 - h, bw, h);
      }
    }

    drawVignette(ctx, width, height, width * 0.35, width * 0.8, 0.45);
  }

  function destroy() { state = {}; }
  return { ...auroraMeta, init, render, destroy };
}
