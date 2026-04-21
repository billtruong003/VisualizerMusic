/**
 * Wave Tunnel Theme (Factory Pattern)
 * Concentric rings receding into a vanishing point, modulated by bass & treble.
 */
import { hexToRgb, drawVignette } from '../utils/color.js';

export const waveTunnelMeta = {
  id: 'waveTunnel',
  name: 'Wave Tunnel',
  description: 'Perspective tunnel of rings pulsing toward a vanishing point',
  colorSlots: [
    { id: 'primary', label: 'Ring Near', default: '#00f0ff' },
    { id: 'secondary', label: 'Ring Far', default: '#a020f0' },
    { id: 'accent', label: 'Spark', default: '#ffe066' },
    { id: 'background', label: 'Background', default: '#050010' },
  ],
  defaultSettings: {
    bassSensitivity: 0.85, trebleSensitivity: 0.6,
    colorIntensity: 0.75, effectStrength: 0.6,
  },
};

export function createWaveTunnelTheme() {
  let state = {};

  function init() {
    state = { depth: 0, sparks: [], prevBass: 0 };
  }

  function render(ctx, audioData, settings, time, bgImage, width, height) {
    if (!state.sparks) init();

    const { bass, mid, treble, energy, frequency } = audioData;
    const { bassSensitivity, trebleSensitivity, colorIntensity, effectStrength, waveformScale = 0.5, barScale = 0.5 } = settings;
    const colors = settings.colors || {};
    const pc = hexToRgb(colors.primary || '#00f0ff');
    const sc = hexToRgb(colors.secondary || '#a020f0');
    const ac = hexToRgb(colors.accent || '#ffe066');
    const bg = hexToRgb(colors.background || '#050010');

    const cx = width / 2, cy = height / 2;

    ctx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`;
    ctx.fillRect(0, 0, width, height);

    if (bgImage) {
      ctx.save();
      ctx.globalAlpha = 0.25 + bass * 0.25 * bassSensitivity;
      const bw = bgImage.width || bgImage.videoWidth || width;
      const bh = bgImage.height || bgImage.videoHeight || height;
      const s = Math.max(width / bw, height / bh);
      ctx.drawImage(bgImage, (width - bw * s) / 2, (height - bh * s) / 2, bw * s, bh * s);
      ctx.restore();
    }

    // Radial dark vignette so near rings pop
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.7);
    bgGrad.addColorStop(0, 'rgba(0,0,0,0)');
    bgGrad.addColorStop(1, `rgba(${bg.r}, ${bg.g}, ${bg.b}, 0.85)`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Advance depth (scrolls tunnel toward viewer)
    const scrollSpeed = 0.01 + energy * 0.02 + bass * bassSensitivity * 0.05;
    state.depth = (state.depth + scrollSpeed) % 1;

    // Draw N rings from far (small) to near (large)
    const RINGS = 20;
    const maxR = Math.max(width, height) * 0.85;
    for (let i = 0; i < RINGS; i++) {
      const t = ((i + state.depth) / RINGS); // 0 = far, 1 = near
      const radius = Math.pow(t, 2.2) * maxR;
      if (radius < 4) continue;

      const fIdx = Math.floor((i / RINGS) * frequency.length * 0.5);
      const val = frequency[fIdx] / 255;
      const wobble = 1 + val * 0.25 + bass * bassSensitivity * 0.2;

      // Segmented ring — slight distortion from bass
      const segments = 64;
      ctx.beginPath();
      for (let s2 = 0; s2 <= segments; s2++) {
        const a = (s2 / segments) * Math.PI * 2;
        const r = radius * (wobble + Math.sin(a * 6 + time * 2) * 0.03 * energy);
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (s2 === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Interpolate far (secondary) -> near (primary)
      const lerp = (a, b) => Math.round(a + (b - a) * t);
      const r = lerp(sc.r, pc.r);
      const g = lerp(sc.g, pc.g);
      const b = lerp(sc.b, pc.b);
      const alpha = (0.15 + t * 0.7) * (0.5 + colorIntensity * 0.5);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.lineWidth = (0.5 + t * 3 + waveformScale * 2) * (1 + val * 1.2);
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${0.4 * colorIntensity})`;
      ctx.shadowBlur = 8 * t * colorIntensity;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Frequency bars orbiting near the rim
    const orbitR = maxR * 0.55;
    const bars = 48;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time * 0.15);
    for (let i = 0; i < bars; i++) {
      const a = (i / bars) * Math.PI * 2;
      const fIdx = Math.floor((i / bars) * frequency.length * 0.5);
      const val = frequency[fIdx] / 255;
      const h = val * (60 + barScale * 100) * bassSensitivity;
      const x1 = Math.cos(a) * orbitR;
      const y1 = Math.sin(a) * orbitR;
      const x2 = Math.cos(a) * (orbitR + h);
      const y2 = Math.sin(a) * (orbitR + h);
      ctx.strokeStyle = `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${(0.3 + val * 0.6) * colorIntensity})`;
      ctx.lineWidth = 1.5 + barScale * 2.5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    ctx.restore();

    // Sparks on treble spikes
    if (treble * trebleSensitivity > 0.35 && state.sparks.length < 80) {
      const count = Math.floor(treble * trebleSensitivity * 4);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 6;
        state.sparks.push({
          x: cx, y: cy,
          vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          life: 1, decay: 0.012 + Math.random() * 0.015,
        });
      }
    }
    state.sparks = state.sparks.filter(p => {
      p.x += p.vx; p.y += p.vy;
      p.vx *= 1.02; p.vy *= 1.02;
      p.life -= p.decay;
      if (p.life <= 0) return false;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5 + barScale * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${ac.r}, ${ac.g}, ${ac.b}, ${p.life * 0.9})`;
      ctx.fill();
      return true;
    });

    // Bass shockwave on hard hit
    const hit = bass - state.prevBass;
    state.prevBass = bass;
    if (hit > 0.15 * bassSensitivity) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.4, hit * 1.5) * effectStrength;
      ctx.fillStyle = `rgb(${pc.r}, ${pc.g}, ${pc.b})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    drawVignette(ctx, width, height, width * 0.25, width * 0.75, 0.55);
  }

  function destroy() { state = {}; }
  return { ...waveTunnelMeta, init, render, destroy };
}
