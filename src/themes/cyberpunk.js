/**
 * Cyberpunk / EDM Theme
 * 
 * Aesthetic: Aggressive neon bars, heavy bass flash, chromatic aberration, glitch on drops.
 * Color palette: Electric cyan, hot magenta, neon green.
 */

export const cyberpunkTheme = {
  id: 'cyberpunk',
  name: 'Cyberpunk / EDM',
  description: 'Neon bars, bass flash, chromatic aberration & glitch effects',

  defaultSettings: {
    bassSensitivity: 0.8,
    trebleSensitivity: 0.7,
    colorIntensity: 0.8,
    effectStrength: 0.7,
  },

  _state: {},

  init(ctx, width, height) {
    this._state = {
      prevBass: 0,
      flashIntensity: 0,
      glitchTimer: 0,
      particles: [],
    };
  },

  render(ctx, audioData, settings, time, bgImage, width, height) {
    const { bass, mid, treble, energy, waveform, frequency } = audioData;
    const { bassSensitivity, trebleSensitivity, colorIntensity, effectStrength } = settings;

    // Detect bass hits (drop detection)
    const bassHit = bass - (this._state.prevBass || 0);
    this._state.prevBass = bass;

    if (bassHit > 0.15 * bassSensitivity) {
      this._state.flashIntensity = Math.min(1, bassHit * 3);
      this._state.glitchTimer = 0.15;
    }
    this._state.flashIntensity *= 0.9;
    this._state.glitchTimer = Math.max(0, this._state.glitchTimer - 0.016);

    // ---- Background ----
    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, 0, width, height);

    if (bgImage) {
      ctx.save();
      const bassPulse = bass * bassSensitivity;
      const breathAlpha = 0.3 + bassPulse * 0.45 + Math.sin(time * 2) * 0.08 * effectStrength;
      const breathScale = 1.0 + bassPulse * 0.03 + this._state.flashIntensity * 0.02;
      
      ctx.globalAlpha = Math.min(1, breathAlpha);
      const baseScale = Math.max(width / bgImage.width, height / bgImage.height);
      const finalScale = baseScale * breathScale;
      const sw = bgImage.width * finalScale;
      const sh = bgImage.height * finalScale;
      // Slight shake on bass hit
      const shakeX = this._state.flashIntensity * (Math.random() - 0.5) * 6 * effectStrength;
      const shakeY = this._state.flashIntensity * (Math.random() - 0.5) * 6 * effectStrength;
      ctx.drawImage(bgImage, (width - sw) / 2 + shakeX, (height - sh) / 2 + shakeY, sw, sh);

      // Tint overlay — lifts on bass
      ctx.globalAlpha = Math.max(0.1, 0.55 - bassPulse * 0.3);
      ctx.fillStyle = `rgba(5, 5, 15, 1)`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // ---- Bass flash ----
    if (this._state.flashIntensity > 0.05) {
      ctx.fillStyle = `rgba(0, 255, 255, ${this._state.flashIntensity * 0.25 * effectStrength})`;
      ctx.fillRect(0, 0, width, height);
    }

    // ---- Neon frequency bars (center-out) ----
    const barCount = 64;
    const centerY = height * 0.5;
    const barAreaWidth = width * 0.75;
    const barStartX = (width - barAreaWidth) / 2;
    const barW = (barAreaWidth / barCount) * 0.7;
    const barGap = (barAreaWidth / barCount) * 0.3;
    const maxBarH = height * 0.3;

    for (let i = 0; i < barCount; i++) {
      const freqIdx = Math.floor((i / barCount) * frequency.length * 0.6);
      const val = frequency[freqIdx] / 255;
      const barH = val * maxBarH * bassSensitivity;
      const x = barStartX + i * (barW + barGap);

      // Color cycle: cyan → magenta → green based on frequency
      const hue = (i / barCount) * 180 + time * 30;
      const saturation = 80 + val * 20;
      const lightness = 45 + val * 25;
      const alpha = 0.6 + val * 0.4;

      ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;

      // Bars go both up and down from center
      ctx.fillRect(x, centerY - barH, barW, barH);
      ctx.fillRect(x, centerY, barW, barH * 0.7);

      // Glow effect
      if (val > 0.5) {
        ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.8)`;
        ctx.shadowBlur = 15 * val * colorIntensity;
        ctx.fillRect(x, centerY - barH, barW, barH);
        ctx.shadowBlur = 0;
      }
    }

    // ---- Horizontal neon lines ----
    const lineY1 = centerY - maxBarH * bass * bassSensitivity - 10;
    const lineY2 = centerY + maxBarH * bass * bassSensitivity * 0.7 + 10;

    ctx.strokeStyle = `rgba(0, 255, 200, ${0.3 + energy * 0.5})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(barStartX, lineY1);
    ctx.lineTo(barStartX + barAreaWidth, lineY1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(barStartX, lineY2);
    ctx.lineTo(barStartX + barAreaWidth, lineY2);
    ctx.stroke();

    // ---- Waveform overlay (aggressive) ----
    ctx.beginPath();
    ctx.strokeStyle = `rgba(255, 0, 128, ${0.4 + treble * trebleSensitivity * 0.5})`;
    ctx.lineWidth = 2;
    const wavePoints = 200;
    for (let i = 0; i < wavePoints; i++) {
      const t = i / (wavePoints - 1);
      const dataIdx = Math.floor(t * (waveform.length - 1));
      const val = (waveform[dataIdx] - 128) / 128;
      const x = barStartX + t * barAreaWidth;
      const y = centerY + val * 60 * bassSensitivity;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // ---- Glitch effect ----
    if (this._state.glitchTimer > 0 && effectStrength > 0.2) {
      this._drawGlitch(ctx, width, height, this._state.glitchTimer * effectStrength, time);
    }

    // ---- Chromatic aberration ----
    if (effectStrength > 0.3 && energy > 0.3) {
      this._drawChromaticAberration(ctx, width, height, energy * effectStrength * 3);
    }

    // ---- Grid overlay (subtle) ----
    ctx.strokeStyle = `rgba(0, 255, 255, ${0.03 + energy * 0.03})`;
    ctx.lineWidth = 0.5;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  },

  _drawGlitch(ctx, width, height, intensity, time) {
    const sliceCount = Math.floor(3 + intensity * 8);
    for (let i = 0; i < sliceCount; i++) {
      const y = Math.random() * height;
      const sliceH = 2 + Math.random() * 20 * intensity;
      const offset = (Math.random() - 0.5) * 40 * intensity;

      try {
        const imageData = ctx.getImageData(0, Math.floor(y), width, Math.floor(sliceH));
        ctx.putImageData(imageData, Math.floor(offset), Math.floor(y));
      } catch (e) { /* cross-origin safety */ }
    }
  },

  _drawChromaticAberration(ctx, width, height, offset) {
    const px = Math.max(1, Math.floor(offset));
    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const copy = new Uint8ClampedArray(data);

      for (let i = 0; i < data.length; i += 4) {
        const pixelIndex = i / 4;
        const x = pixelIndex % width;

        // Shift red channel left
        const redSource = ((x - px + width) % width + Math.floor(pixelIndex / width) * width) * 4;
        if (redSource < copy.length) data[i] = copy[redSource];

        // Shift blue channel right
        const blueSource = ((x + px) % width + Math.floor(pixelIndex / width) * width) * 4 + 2;
        if (blueSource < copy.length) data[i + 2] = copy[blueSource];
      }

      ctx.putImageData(imageData, 0, 0);
    } catch (e) { /* safety */ }
  },

  destroy() {
    this._state = {};
  },
};
