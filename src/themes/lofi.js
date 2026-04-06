/**
 * Lo-Fi / Chill Theme
 * 
 * Aesthetic: Soft slow-moving waveforms, VHS grain overlay, gentle background opacity breathing.
 * Color palette: Warm amber, muted purple, soft cream.
 */

export const lofiTheme = {
  id: 'lofi',
  name: 'Lo-Fi / Chill',
  description: 'Soft waveforms, VHS grain, gentle breathing background',

  defaultSettings: {
    bassSensitivity: 0.6,
    trebleSensitivity: 0.4,
    colorIntensity: 0.5,
    effectStrength: 0.5,
  },

  _state: {},

  init(ctx, width, height) {
    this._state = {
      grainCanvas: null,
      breathPhase: 0,
    };
    // Pre-generate grain texture
    if (typeof OffscreenCanvas !== 'undefined') {
      this._state.grainCanvas = new OffscreenCanvas(width / 2, height / 2);
    }
  },

  render(ctx, audioData, settings, time, bgImage, width, height) {
    const { bass, mid, treble, energy, waveform, frequency } = audioData;
    const { bassSensitivity, effectStrength, colorIntensity } = settings;

    // ---- Background with breathing effect ----
    // Slow sine breath + bass pulse = visible "living" background
    const breathSine = Math.sin(time * 1.2) * 0.5 + 0.5; // 0→1 smooth cycle
    const bassPulse = bass * bassSensitivity;
    const breathAlpha = 0.35 + breathSine * 0.25 * effectStrength + bassPulse * 0.3;
    // Subtle zoom breathing: scale pulses 1.0 → 1.03 on bass
    const breathScale = 1.0 + breathSine * 0.01 * effectStrength + bassPulse * 0.02;

    ctx.fillStyle = `rgba(10, 8, 15, 1)`;
    ctx.fillRect(0, 0, width, height);

    if (bgImage) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, breathAlpha);
      const baseScale = Math.max(width / bgImage.width, height / bgImage.height);
      const finalScale = baseScale * breathScale;
      const sw = bgImage.width * finalScale;
      const sh = bgImage.height * finalScale;
      ctx.drawImage(bgImage, (width - sw) / 2, (height - sh) / 2, sw, sh);
      // Brightness overlay — flashes slightly brighter on bass hits
      if (bassPulse > 0.3) {
        ctx.globalAlpha = (bassPulse - 0.3) * 0.15 * effectStrength;
        ctx.fillStyle = `rgba(255, 220, 180, 1)`;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.restore();
    } else {
      // Fallback gradient
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.6);
      gradient.addColorStop(0, `rgba(60, 40, 80, ${0.2 + breathAlpha * 0.5})`);
      gradient.addColorStop(1, 'rgba(10, 8, 15, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // ---- Waveform (soft, flowing) ----
    const waveY = height * 0.55;
    const waveWidth = width * 0.7;
    const waveStartX = (width - waveWidth) / 2;

    ctx.beginPath();
    ctx.strokeStyle = `rgba(255, 200, 140, ${0.3 + energy * colorIntensity * 0.6})`;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const points = 128;
    for (let i = 0; i < points; i++) {
      const t = i / (points - 1);
      const dataIdx = Math.floor(t * (waveform.length - 1));
      const val = (waveform[dataIdx] - 128) / 128;
      const x = waveStartX + t * waveWidth;
      const amplitude = 40 + bass * bassSensitivity * 60;
      const y = waveY + val * amplitude + Math.sin(t * 4 + time * 1.5) * 5 * effectStrength;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Second waveform layer (ghosted)
    ctx.beginPath();
    ctx.strokeStyle = `rgba(180, 150, 220, ${0.15 + mid * 0.2})`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < points; i++) {
      const t = i / (points - 1);
      const dataIdx = Math.floor(t * (waveform.length - 1));
      const val = (waveform[dataIdx] - 128) / 128;
      const x = waveStartX + t * waveWidth;
      const y = waveY + val * 30 + Math.sin(t * 3 + time * 0.8 + 1) * 8;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // ---- Frequency bars (subtle, bottom) ----
    const barCount = 48;
    const barWidth = (waveWidth / barCount) * 0.6;
    const barGap = (waveWidth / barCount) * 0.4;
    const maxBarHeight = height * 0.12;

    for (let i = 0; i < barCount; i++) {
      const freqIdx = Math.floor((i / barCount) * frequency.length * 0.5);
      const val = frequency[freqIdx] / 255;
      const barHeight = val * maxBarHeight * bassSensitivity;
      const x = waveStartX + i * (barWidth + barGap);
      const y = height - 40;

      const alpha = 0.15 + val * 0.35;
      ctx.fillStyle = `rgba(255, 200, 140, ${alpha})`;
      ctx.fillRect(x, y - barHeight, barWidth, barHeight);
    }

    // ---- VHS Grain overlay ----
    if (effectStrength > 0.1) {
      this._drawGrain(ctx, width, height, effectStrength * 0.12, time);
    }

    // ---- Vignette ----
    const vignetteGrad = ctx.createRadialGradient(
      width / 2, height / 2, width * 0.25,
      width / 2, height / 2, width * 0.7
    );
    vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, width, height);

    // ---- Scanlines ----
    if (effectStrength > 0.2) {
      ctx.fillStyle = `rgba(0,0,0,${effectStrength * 0.06})`;
      for (let y = 0; y < height; y += 3) {
        ctx.fillRect(0, y, width, 1);
      }
    }
  },

  _drawGrain(ctx, width, height, alpha, time) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const seed = Math.floor(time * 15);
    
    // Simple pseudo-random grain (fast)
    for (let i = 0; i < data.length; i += 16) { // Every 4th pixel for speed
      const noise = ((seed * 9301 + i * 49297) % 233280) / 233280;
      const grain = (noise - 0.5) * 255 * alpha;
      data[i] = Math.max(0, Math.min(255, data[i] + grain));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain));
    }
    
    ctx.putImageData(imageData, 0, 0);
  },

  destroy() {
    this._state = {};
  },
};
