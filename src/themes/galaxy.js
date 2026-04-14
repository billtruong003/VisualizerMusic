/**
 * Galaxy / Space Theme (Factory Pattern)
 * Fixed: dust wrap smoothing, colorIntensity on arcs, responsive sizes
 */
import { hexToRgb, drawVignette } from '../utils/color.js';

export const galaxyMeta = {
  id: 'galaxy',
  name: 'Galaxy / Space',
  description: 'Star field, nebula clouds, cosmic dust & ring waveform',
  colorSlots: [
    { id: 'primary', label: 'Nebula', default: '#9b59b6' },
    { id: 'secondary', label: 'Stars', default: '#e8e8ff' },
    { id: 'accent', label: 'Nebula Blue', default: '#3498db' },
    { id: 'background', label: 'Space', default: '#020208' },
  ],
  defaultSettings: {
    bassSensitivity: 0.5, trebleSensitivity: 0.6,
    colorIntensity: 0.7, effectStrength: 0.5,
  },
};

export function createGalaxyTheme() {
  let state = {};

  function init(ctx, width, height) {
    const stars = [];
    for (let i = 0; i < 300; i++) {
      stars.push({
        x: Math.random() * width, y: Math.random() * height,
        size: 0.3 + Math.random() * 1.8,
        brightness: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.5 + Math.random() * 2,
        depth: Math.random(),
      });
    }
    const dust = [];
    for (let i = 0; i < 60; i++) {
      dust.push({
        x: Math.random() * width, y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        radius: 2 + Math.random() * 4,
        alpha: 0.05 + Math.random() * 0.15,
      });
    }
    state = { stars, dust, nebulaPhase: 0 };
  }

  function render(ctx, audioData, settings, time, bgImage, width, height) {
    if (!state.stars) init(ctx, width, height);

    const { bass, mid, treble, energy, waveform, frequency } = audioData;
    const { bassSensitivity, trebleSensitivity, colorIntensity, effectStrength, waveformScale = 0.5, barScale = 0.5 } = settings;
    const colors = settings.colors || {};
    const pc = hexToRgb(colors.primary || '#9b59b6');
    const sc = hexToRgb(colors.secondary || '#e8e8ff');
    const ac = hexToRgb(colors.accent || '#3498db');
    const bg = hexToRgb(colors.background || '#020208');
    const cx = width / 2, cy = height / 2;

    ctx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`;
    ctx.fillRect(0, 0, width, height);

    if (bgImage) {
      ctx.save();
      ctx.globalAlpha = 0.45 + energy * 0.15;
      const s = Math.max(width / bgImage.width, height / bgImage.height);
      ctx.drawImage(bgImage, (width - bgImage.width * s) / 2, (height - bgImage.height * s) / 2, bgImage.width * s, bgImage.height * s);
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Nebula clouds
    state.nebulaPhase += 0.003;
    const nx1 = cx + Math.sin(state.nebulaPhase) * 200;
    const ny1 = cy + Math.cos(state.nebulaPhase * 0.7) * 100;
    const nr1 = 200 + bass * bassSensitivity * 150 + Math.sin(time * 0.5) * 40;
    const n1 = ctx.createRadialGradient(nx1, ny1, 0, nx1, ny1, nr1);
    n1.addColorStop(0, `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${(0.08 + energy * 0.08) * colorIntensity})`);
    n1.addColorStop(0.5, `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${0.03 + energy * 0.03})`);
    n1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = n1;
    ctx.fillRect(0, 0, width, height);

    const nx2 = cx - Math.cos(state.nebulaPhase * 1.3) * 180;
    const ny2 = cy - Math.sin(state.nebulaPhase * 0.9) * 120;
    const nr2 = 180 + mid * 120;
    const n2 = ctx.createRadialGradient(nx2, ny2, 0, nx2, ny2, nr2);
    n2.addColorStop(0, `rgba(${ac.r}, ${ac.g}, ${ac.b}, ${(0.06 + energy * 0.06) * colorIntensity})`);
    n2.addColorStop(0.5, `rgba(${ac.r}, ${ac.g}, ${ac.b}, ${0.02 + energy * 0.02})`);
    n2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = n2;
    ctx.fillRect(0, 0, width, height);

    // Stars
    state.stars.forEach(star => {
      const twinkle = Math.sin(time * star.twinkleSpeed + star.x) * 0.3 + 0.7;
      const alpha = star.brightness * twinkle * (0.5 + energy * 0.5);
      const size = star.size * (1 + bass * star.depth * 0.3);
      ctx.beginPath();
      ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${sc.r}, ${sc.g}, ${sc.b}, ${alpha})`;
      ctx.fill();
      if (star.brightness > 0.7 && size > 1) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${sc.r}, ${sc.g}, ${sc.b}, ${alpha * 0.08})`;
        ctx.fill();
      }
    });

    // Dust (smooth wrap)
    state.dust.forEach(d => {
      d.x += d.vx + Math.sin(time * 0.5 + d.y * 0.01) * 0.2 * effectStrength;
      d.y += d.vy + Math.cos(time * 0.3 + d.x * 0.01) * 0.2 * effectStrength;
      d.x = ((d.x % width) + width) % width;
      d.y = ((d.y % height) + height) % height;
      const r = d.radius * (1 + mid * 0.5) * (0.5 + barScale);
      ctx.beginPath();
      ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${d.alpha * (0.5 + energy * 0.5)})`;
      ctx.fill();
    });

    // Spawn dust on treble (capped at 100)
    if (treble * trebleSensitivity > 0.4 && state.dust.length < 100) {
      state.dust.push({
        x: cx + (Math.random() - 0.5) * 200, y: cy + (Math.random() - 0.5) * 200,
        vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
        radius: 1 + Math.random() * 3, alpha: 0.1 + Math.random() * 0.2,
      });
    }

    // Ring waveform
    const waveR = 120 + bass * bassSensitivity * 60;
    ctx.beginPath();
    ctx.strokeStyle = `rgba(${sc.r}, ${sc.g}, ${sc.b}, ${0.15 + energy * 0.25})`;
    ctx.lineWidth = 1 + waveformScale * 2.5;
    for (let i = 0; i <= 180; i++) {
      const t = i / 180;
      const angle = t * Math.PI * 2;
      const dIdx = Math.floor(t * (waveform.length - 1));
      const val = (waveform[dIdx] - 128) / 128;
      const r = waveR + val * 35 * trebleSensitivity;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Inner ghost ring
    ctx.beginPath();
    ctx.strokeStyle = `rgba(${pc.r}, ${pc.g}, ${pc.b}, ${0.08 + energy * 0.12})`;
    ctx.lineWidth = 1 + waveformScale;
    const innerR = waveR * 0.7;
    for (let i = 0; i <= 180; i++) {
      const t = i / 180;
      const angle = t * Math.PI * 2 + time * 0.1;
      const dIdx = Math.floor(t * (waveform.length - 1));
      const val = (waveform[dIdx] - 128) / 128;
      const r = innerR + val * 20;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Frequency arcs (colorIntensity applied)
    for (let i = 0; i < 12; i++) {
      const fIdx = Math.floor((i / 12) * frequency.length * 0.4);
      const val = frequency[fIdx] / 255;
      if (val < 0.1) continue;
      const startAngle = (i / 12) * Math.PI * 2 + time * 0.05;
      const arcLen = (1 / 12) * Math.PI * 1.5 * val;
      const arcR = waveR + 40 + val * 30;
      ctx.beginPath();
      ctx.arc(cx, cy, arcR, startAngle, startAngle + arcLen);
      ctx.strokeStyle = `rgba(${ac.r}, ${ac.g}, ${ac.b}, ${val * 0.3 * (0.5 + colorIntensity)})`;
      ctx.lineWidth = 1.5 + barScale * 2;
      ctx.stroke();
    }

    drawVignette(ctx, width, height, width * 0.15, width * 0.65, 0.6);
  }

  function destroy() { state = {}; }
  return { ...galaxyMeta, init, render, destroy };
}
