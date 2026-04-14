/**
 * Ambient / Acoustic Theme (Factory Pattern)
 */
import { hexToRgb, drawVignette, drawBreathingBg } from '../utils/color.js';

export const ambientMeta = {
  id: 'ambient',
  name: 'Ambient / Acoustic',
  description: 'Smooth circular particles reacting to mid/high frequencies',
  colorSlots: [
    { id: 'primary', label: 'Particles', default: '#64dcc8' },
    { id: 'secondary', label: 'Waveform', default: '#e8dcc8' },
    { id: 'accent', label: 'Rings', default: '#78dcd2' },
    { id: 'background', label: 'Background', default: '#080c12' },
  ],
  defaultSettings: {
    bassSensitivity: 0.4, trebleSensitivity: 0.7,
    colorIntensity: 0.6, effectStrength: 0.5,
  },
};

export function createAmbientTheme() {
  let state = {};

  function createParticle(width, height, fromCenter) {
    const angle = Math.random() * Math.PI * 2;
    const dist = fromCenter ? (30 + Math.random() * 60) : (Math.random() * Math.max(width, height) * 0.5);
    return {
      x: width / 2 + Math.cos(angle) * dist,
      y: height / 2 + Math.sin(angle) * dist,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: 1.5 + Math.random() * 3,
      baseAlpha: 0.1 + Math.random() * 0.4,
      hueOffset: Math.random() * 60 - 30,
      life: 1,
      decay: 0.0005 + Math.random() * 0.002,
      angle, orbitSpeed: (Math.random() - 0.5) * 0.003, orbitDist: dist,
    };
  }

  function init(ctx, width, height) {
    state = { particles: [] };
    for (let i = 0; i < 80; i++) state.particles.push(createParticle(width, height, false));
  }

  function render(ctx, audioData, settings, time, bgImage, width, height) {
    if (!state.particles) init(ctx, width, height);

    const { bass, mid, treble, energy, waveform } = audioData;
    const { bassSensitivity, trebleSensitivity, colorIntensity, effectStrength, waveformScale = 0.5 } = settings;
    const colors = settings.colors || {};
    const pc = hexToRgb(colors.primary || '#64dcc8');
    const sc = hexToRgb(colors.secondary || '#e8dcc8');
    const ac = hexToRgb(colors.accent || '#78dcd2');
    const bg = hexToRgb(colors.background || '#080c12');

    ctx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`;
    ctx.fillRect(0, 0, width, height);

    if (bgImage) {
      const breathSine = Math.sin(time * 0.6) * 0.5 + 0.5;
      const bassPulse = bass * bassSensitivity;
      drawBreathingBg(ctx, bgImage, width, height,
        0.5 + breathSine * 0.2 * effectStrength + bassPulse * 0.2,
        1.0 + breathSine * 0.008 * effectStrength + bassPulse * 0.015);
      ctx.save();
      ctx.globalAlpha = Math.max(0.1, 0.35 - energy * 0.15);
      ctx.fillStyle = `rgba(${bg.r}, ${bg.g}, ${bg.b}, 1)`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    const cx = width / 2, cy = height / 2;

    // Central glow
    const glowR = 80 + energy * 120;
    const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    glowGrad.addColorStop(0, `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${0.08 + mid * 0.12 * colorIntensity})`);
    glowGrad.addColorStop(0.5, `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${0.03 + mid * 0.05})`);
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    // Spawn particles
    if (treble * trebleSensitivity > 0.25 && state.particles.length < 200) {
      const count = Math.floor(treble * trebleSensitivity * 4);
      for (let i = 0; i < count; i++) state.particles.push(createParticle(width, height, true));
    }

    // Update & draw particles — use hueOffset for color variety via shifted RGB
    state.particles = state.particles.filter(p => {
      p.angle += p.orbitSpeed * (1 + mid * 2);
      p.orbitDist += (energy * 0.5 - 0.1) * effectStrength;
      const tx = cx + Math.cos(p.angle) * p.orbitDist;
      const ty = cy + Math.sin(p.angle) * p.orbitDist;
      p.x += (tx - p.x) * 0.02 + p.vx;
      p.y += (ty - p.y) * 0.02 + p.vy;
      p.vx += (Math.random() - 0.5) * 0.1 * effectStrength;
      p.vy += (Math.random() - 0.5) * 0.1 * effectStrength;
      p.vx *= 0.98; p.vy *= 0.98;
      p.life -= p.decay;
      if (p.life <= 0 || p.x < -50 || p.x > width + 50 || p.y < -50 || p.y > height + 50) return false;

      const alpha = p.baseAlpha * p.life * (0.5 + energy * 0.5);
      const radius = p.radius * (1 + bass * bassSensitivity * 0.5);
      // Shift hue via color mixing
      const hueT = (p.hueOffset + 30) / 60; // 0-1
      const cr = Math.round(pc.r + (ac.r - pc.r) * hueT);
      const cg = Math.round(pc.g + (ac.g - pc.g) * hueT);
      const cb = Math.round(pc.b + (ac.b - pc.b) * hueT);

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
      ctx.fill();
      if (radius > 2.5) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha * 0.1})`;
        ctx.fill();
      }
      return true;
    });

    // Concentric rings (responsive line width)
    for (let i = 0; i < 4; i++) {
      const pulseR = 60 + i * 50 + bass * bassSensitivity * 40 + Math.sin(time * 0.5 + i) * 10;
      const alpha = (0.06 + mid * 0.08) * (1 - i / 4) * (0.5 + colorIntensity);
      ctx.beginPath();
      ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${ac.r}, ${ac.g}, ${ac.b}, ${alpha})`;
      ctx.lineWidth = 1 + waveformScale;
      ctx.stroke();
    }

    // Circular waveform
    const waveR = 100 + bass * bassSensitivity * 50;
    ctx.beginPath();
    ctx.strokeStyle = `rgba(${sc.r}, ${sc.g}, ${sc.b}, ${0.15 + energy * 0.3})`;
    ctx.lineWidth = 1 + waveformScale * 2;
    for (let i = 0; i <= 128; i++) {
      const t = i / 128;
      const angle = t * Math.PI * 2;
      const dIdx = Math.floor(t * (waveform.length - 1));
      const val = (waveform[dIdx] - 128) / 128;
      const r = waveR + val * 30 * trebleSensitivity;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    drawVignette(ctx, width, height, width * 0.2, width * 0.65, 0.55);
  }

  function destroy() { state = {}; }
  return { ...ambientMeta, init, render, destroy };
}
