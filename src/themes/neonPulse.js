/**
 * Neon Pulse Theme (Factory Pattern)
 * Fixed: trail buildup, ring cap, responsive line widths
 */
import { hexToRgb, drawVignette } from '../utils/color.js';

export const neonPulseMeta = {
  id: 'neonPulse',
  name: 'Neon Pulse',
  description: 'Beat-synced rings, rotating spectrum, glowing pulse',
  colorSlots: [
    { id: 'primary', label: 'Main Ring', default: '#bf40ff' },
    { id: 'secondary', label: 'Inner Ring', default: '#ff6ec7' },
    { id: 'accent', label: 'Particles', default: '#00d4ff' },
    { id: 'background', label: 'Background', default: '#08080f' },
  ],
  defaultSettings: {
    bassSensitivity: 0.8, trebleSensitivity: 0.6,
    colorIntensity: 0.7, effectStrength: 0.6,
  },
};

export function createNeonPulseTheme() {
  let state = {};

  function init(ctx, width, height) {
    state = { rings: [], particles: [], prevBass: 0, rotAngle: 0 };
  }

  function render(ctx, audioData, settings, time, bgImage, width, height) {
    if (!state.rings) init(ctx, width, height);

    const { bass, treble, energy, frequency } = audioData;
    const { bassSensitivity, trebleSensitivity, colorIntensity, effectStrength, waveformScale = 0.5, barScale = 0.5 } = settings;
    const colors = settings.colors || {};
    const pc = hexToRgb(colors.primary || '#bf40ff');
    const sc = hexToRgb(colors.secondary || '#ff6ec7');
    const ac = hexToRgb(colors.accent || '#00d4ff');
    const bg = hexToRgb(colors.background || '#08080f');
    const cx = width / 2, cy = height / 2;

    // Full clear every frame (fixes trail buildup)
    ctx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`;
    ctx.fillRect(0, 0, width, height);

    if (bgImage) {
      ctx.save();
      ctx.globalAlpha = 0.45 + bass * 0.2;
      const s = Math.max(width / bgImage.width, height / bgImage.height);
      ctx.drawImage(bgImage, (width - bgImage.width * s) / 2, (height - bgImage.height * s) / 2, bgImage.width * s, bgImage.height * s);
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Spawn rings on bass hit (capped at 20)
    const bassHit = bass - state.prevBass;
    state.prevBass = bass;
    if (bassHit > 0.12 * bassSensitivity && state.rings.length < 20) {
      state.rings.push({
        radius: 30, maxRadius: 250 + energy * 200,
        life: 1, speed: 3 + bassHit * 10,
      });
    }

    // Center glow
    const glowR = 60 + bass * bassSensitivity * 80;
    const gG = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    gG.addColorStop(0, `rgba(${sc.r}, ${sc.g}, ${sc.b}, ${0.15 + energy * 0.2})`);
    gG.addColorStop(0.5, `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${0.05 + energy * 0.1})`);
    gG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gG;
    ctx.fillRect(0, 0, width, height);

    // Expanding rings
    state.rings = state.rings.filter(ring => {
      ring.radius += ring.speed;
      ring.life -= 0.015;
      if (ring.life <= 0 || ring.radius > ring.maxRadius) return false;
      const alpha = ring.life * 0.6 * (0.5 + colorIntensity);
      ctx.beginPath();
      ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${alpha})`;
      ctx.lineWidth = (2 + ring.life * 3) * (0.5 + waveformScale);
      ctx.stroke();
      if (ring.radius > 20) {
        ctx.beginPath();
        ctx.arc(cx, cy, ring.radius * 0.85, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${sc.r}, ${sc.g}, ${sc.b}, ${alpha * 0.5})`;
        ctx.lineWidth = 1 + waveformScale * 0.5;
        ctx.stroke();
      }
      return true;
    });

    // Rotating spectrum
    state.rotAngle += 0.005 + energy * 0.01;
    const specR = 80 + bass * bassSensitivity * 30;
    const specMaxH = 120;
    const specBars = 48;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(state.rotAngle);
    ctx.shadowBlur = 0;
    for (let i = 0; i < specBars; i++) {
      const angle = (i / specBars) * Math.PI * 2;
      const fIdx = Math.floor((i / specBars) * frequency.length * 0.5);
      const val = frequency[fIdx] / 255;
      const barH = val * specMaxH * bassSensitivity;
      const x1 = Math.cos(angle) * specR;
      const y1 = Math.sin(angle) * specR;
      const x2 = Math.cos(angle) * (specR + barH);
      const y2 = Math.sin(angle) * (specR + barH);
      const hue = (i / specBars) * 360;
      ctx.strokeStyle = `hsla(${hue}, 80%, ${50 + val * 30}%, ${(0.4 + val * 0.5) * (0.5 + colorIntensity * 0.5)})`;
      ctx.lineWidth = 2 + barScale * 3;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      if (val > 0.6 && colorIntensity > 0.3) {
        ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.6)`;
        ctx.shadowBlur = 8 * colorIntensity;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
    ctx.restore();

    // Particles (capped at 150)
    if (treble * trebleSensitivity > 0.3 && state.particles.length < 150) {
      const count = Math.floor(treble * trebleSensitivity * 3);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 1 + Math.random() * 3;
        state.particles.push({
          x: cx, y: cy,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 1, decay: 0.008 + Math.random() * 0.015,
          radius: 1 + Math.random() * 2,
        });
      }
    }
    state.particles = state.particles.filter(p => {
      p.x += p.vx * (1 + energy); p.y += p.vy * (1 + energy);
      p.life -= p.decay;
      if (p.life <= 0) return false;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * (0.5 + barScale), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${ac.r}, ${ac.g}, ${ac.b}, ${p.life * 0.6})`;
      ctx.fill();
      return true;
    });

    // Static circles
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, specR + i * 50, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${pc.r}, ${pc.g}, ${pc.b}, 0.04)`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    drawVignette(ctx, width, height, width * 0.2, width * 0.7, 0.6);
  }

  function destroy() { state = {}; }
  return { ...neonPulseMeta, init, render, destroy };
}
