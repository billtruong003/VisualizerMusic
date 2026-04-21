/**
 * Particle Storm Theme (Factory Pattern)
 * Dense particle field driven by frequency bands; bass pushes outward, treble adds sparks.
 */
import { hexToRgb, drawVignette } from '../utils/color.js';

export const particleStormMeta = {
  id: 'particleStorm',
  name: 'Particle Storm',
  description: 'Swirling field of reactive particles with bass shockwaves',
  colorSlots: [
    { id: 'primary', label: 'Bass Particle', default: '#ff3e6c' },
    { id: 'secondary', label: 'Mid Particle', default: '#5cf0ff' },
    { id: 'accent', label: 'Treble Spark', default: '#fff27a' },
    { id: 'background', label: 'Background', default: '#07040d' },
  ],
  defaultSettings: {
    bassSensitivity: 0.85, trebleSensitivity: 0.7,
    colorIntensity: 0.75, effectStrength: 0.7,
  },
};

const MAX_PARTICLES = 380;

function spawn(cx, cy, band) {
  const a = Math.random() * Math.PI * 2;
  const r = 10 + Math.random() * 40;
  const sp = 0.4 + Math.random() * 2.2;
  return {
    x: cx + Math.cos(a) * r,
    y: cy + Math.sin(a) * r,
    vx: Math.cos(a) * sp,
    vy: Math.sin(a) * sp,
    life: 1,
    decay: 0.004 + Math.random() * 0.012,
    band, // 'bass' | 'mid' | 'treble'
    size: 1 + Math.random() * 2.5,
  };
}

export function createParticleStormTheme() {
  let state = {};

  function init() {
    state = { particles: [], prevBass: 0, swirl: 0 };
  }

  function render(ctx, audioData, settings, time, bgImage, width, height) {
    if (!state.particles) init();

    const { bass, mid, treble, energy, frequency } = audioData;
    const { bassSensitivity, trebleSensitivity, colorIntensity, effectStrength, waveformScale = 0.5, barScale = 0.5 } = settings;
    const colors = settings.colors || {};
    const pc = hexToRgb(colors.primary || '#ff3e6c');
    const sc = hexToRgb(colors.secondary || '#5cf0ff');
    const ac = hexToRgb(colors.accent || '#fff27a');
    const bg = hexToRgb(colors.background || '#07040d');

    const cx = width / 2, cy = height / 2;

    // Motion-blur clear
    ctx.fillStyle = `rgba(${bg.r}, ${bg.g}, ${bg.b}, ${0.22 + effectStrength * 0.1})`;
    ctx.fillRect(0, 0, width, height);

    if (bgImage) {
      ctx.save();
      ctx.globalAlpha = 0.22 + bass * 0.2;
      const bw = bgImage.width || bgImage.videoWidth || width;
      const bh = bgImage.height || bgImage.videoHeight || height;
      const s = Math.max(width / bw, height / bh);
      ctx.drawImage(bgImage, (width - bw * s) / 2, (height - bh * s) / 2, bw * s, bh * s);
      ctx.restore();
    }

    // Spawn particles per band, rate-limited by MAX_PARTICLES
    const spawnBudget = Math.max(0, MAX_PARTICLES - state.particles.length);
    const bassSpawn = Math.min(spawnBudget, Math.floor(bass * bassSensitivity * 6));
    const midSpawn = Math.min(spawnBudget - bassSpawn, Math.floor(mid * 4));
    const trebSpawn = Math.min(spawnBudget - bassSpawn - midSpawn, Math.floor(treble * trebleSensitivity * 5));
    for (let i = 0; i < bassSpawn; i++) state.particles.push(spawn(cx, cy, 'bass'));
    for (let i = 0; i < midSpawn; i++) state.particles.push(spawn(cx, cy, 'mid'));
    for (let i = 0; i < trebSpawn; i++) state.particles.push(spawn(cx, cy, 'treble'));

    // Swirl field
    state.swirl += 0.003 + energy * 0.01;

    // Advance + draw particles
    const gustX = Math.cos(time * 0.6) * (0.15 + mid * 0.4);
    const gustY = Math.sin(time * 0.7) * (0.1 + mid * 0.3);

    state.particles = state.particles.filter(p => {
      // Swirling force around center
      const dx = p.x - cx, dy = p.y - cy;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
      const tang = p.band === 'treble' ? 0.04 : 0.015;
      p.vx += (-dy / d) * tang;
      p.vy += (dx / d) * tang;
      p.vx += gustX * 0.05;
      p.vy += gustY * 0.05;

      const expand = 1 + bass * bassSensitivity * 0.15;
      p.x += p.vx * expand;
      p.y += p.vy * expand;
      p.life -= p.decay;
      if (p.life <= 0 || p.x < -10 || p.x > width + 10 || p.y < -10 || p.y > height + 10) return false;

      const color = p.band === 'bass' ? pc : p.band === 'mid' ? sc : ac;
      const radius = p.size * (0.6 + barScale) * (p.band === 'treble' ? 0.7 : 1);
      const alpha = p.life * (0.6 + colorIntensity * 0.4);

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
      ctx.fill();

      if (p.band === 'treble' && colorIntensity > 0.3) {
        ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.7)`;
        ctx.shadowBlur = 10 * colorIntensity;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      return true;
    });

    // Bass shockwave — expanding ring when bass spikes
    const hit = bass - state.prevBass;
    state.prevBass = bass;
    if (hit > 0.12 * bassSensitivity) {
      ctx.save();
      const rings = 3;
      for (let i = 0; i < rings; i++) {
        const r = 40 + i * 30 + hit * 120;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${(0.5 - i * 0.12) * effectStrength})`;
        ctx.lineWidth = (2 + waveformScale * 3) * (1 - i * 0.2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Central glow pulsing on bass
    const glowR = 80 + bass * bassSensitivity * 140;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    g.addColorStop(0, `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${0.15 * colorIntensity + bass * 0.2})`);
    g.addColorStop(0.6, `rgba(${sc.r}, ${sc.g}, ${sc.b}, ${0.05 * colorIntensity})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // Bottom spectrum bars (grounds the whole thing)
    const barCount = 56;
    const maxBarH = height * 0.18;
    const barW = (width / barCount) * (0.2 + barScale * 0.5);
    const barGap = (width / barCount) - barW;
    for (let i = 0; i < barCount; i++) {
      const fIdx = Math.floor((i / barCount) * frequency.length * 0.5);
      const v = frequency[fIdx] / 255;
      const h = v * maxBarH * bassSensitivity;
      const x = i * (barW + barGap);
      const grad = ctx.createLinearGradient(0, height - h, 0, height);
      grad.addColorStop(0, `rgba(${sc.r}, ${sc.g}, ${sc.b}, ${0.5 + v * 0.4 * colorIntensity})`);
      grad.addColorStop(1, `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${0.1 + v * 0.3 * colorIntensity})`);
      ctx.fillStyle = grad;
      ctx.fillRect(x, height - h, barW, h);
    }

    drawVignette(ctx, width, height, width * 0.3, width * 0.75, 0.55);
  }

  function destroy() { state = {}; }
  return { ...particleStormMeta, init, render, destroy };
}
