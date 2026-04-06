/**
 * Ambient / Acoustic Theme
 * 
 * Aesthetic: Smooth circular particle emitters, organic movement, reacting to mid/high.
 * Color palette: Soft teal, warm white, dusty rose.
 */

export const ambientTheme = {
  id: 'ambient',
  name: 'Ambient / Acoustic',
  description: 'Smooth circular particles reacting to mid/high frequencies',

  defaultSettings: {
    bassSensitivity: 0.4,
    trebleSensitivity: 0.7,
    colorIntensity: 0.6,
    effectStrength: 0.5,
  },

  _state: {},

  init(ctx, width, height) {
    this._state = {
      particles: [],
      rings: [],
      time: 0,
    };

    // Pre-spawn some particles
    for (let i = 0; i < 80; i++) {
      this._state.particles.push(this._createParticle(width, height));
    }
  },

  _createParticle(width, height, fromCenter = false) {
    const angle = Math.random() * Math.PI * 2;
    const dist = fromCenter ? (30 + Math.random() * 60) : (Math.random() * Math.max(width, height) * 0.5);
    return {
      x: width / 2 + Math.cos(angle) * dist,
      y: height / 2 + Math.sin(angle) * dist,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: 1.5 + Math.random() * 3,
      baseAlpha: 0.1 + Math.random() * 0.4,
      hue: 160 + Math.random() * 60, // teal range
      life: 1,
      decay: 0.0005 + Math.random() * 0.002,
      angle: angle,
      orbitSpeed: (Math.random() - 0.5) * 0.003,
      orbitDist: dist,
    };
  },

  render(ctx, audioData, settings, time, bgImage, width, height) {
    const { bass, mid, treble, energy, waveform, frequency } = audioData;
    const { bassSensitivity, trebleSensitivity, colorIntensity, effectStrength } = settings;

    const dt = 0.016; // ~60fps timestep

    // ---- Background ----
    ctx.fillStyle = `rgba(8, 12, 18, 1)`;
    ctx.fillRect(0, 0, width, height);

    if (bgImage) {
      ctx.save();
      const breathSine = Math.sin(time * 0.6) * 0.5 + 0.5; // Very slow breathing
      const bassPulse = bass * bassSensitivity;
      const midPulse = mid * 0.3;
      const breathAlpha = 0.25 + breathSine * 0.2 * effectStrength + bassPulse * 0.25 + midPulse * 0.15;
      const breathScale = 1.0 + breathSine * 0.008 * effectStrength + bassPulse * 0.015;

      ctx.globalAlpha = Math.min(0.85, breathAlpha);
      const baseScale = Math.max(width / bgImage.width, height / bgImage.height);
      const finalScale = baseScale * breathScale;
      const sw = bgImage.width * finalScale;
      const sh = bgImage.height * finalScale;
      ctx.drawImage(bgImage, (width - sw) / 2, (height - sh) / 2, sw, sh);

      // Soft dark overlay — lifts gently on energy
      ctx.globalAlpha = Math.max(0.2, 0.6 - energy * 0.2 - breathSine * 0.1 * effectStrength);
      ctx.fillStyle = `rgba(8, 12, 18, 1)`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // ---- Central glow ----
    const glowRadius = 80 + energy * 120;
    const glowGrad = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, glowRadius
    );
    glowGrad.addColorStop(0, `rgba(100, 220, 200, ${0.08 + mid * 0.12 * colorIntensity})`);
    glowGrad.addColorStop(0.5, `rgba(80, 180, 180, ${0.03 + mid * 0.05})`);
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    // ---- Spawn new particles on treble ----
    if (treble * trebleSensitivity > 0.25 && this._state.particles.length < 200) {
      const count = Math.floor(treble * trebleSensitivity * 4);
      for (let i = 0; i < count; i++) {
        this._state.particles.push(this._createParticle(width, height, true));
      }
    }

    // ---- Update & draw particles ----
    const cx = width / 2;
    const cy = height / 2;

    this._state.particles = this._state.particles.filter(p => {
      // Orbital motion influenced by audio
      p.angle += p.orbitSpeed * (1 + mid * 2);
      p.orbitDist += (energy * 0.5 - 0.1) * effectStrength;

      const targetX = cx + Math.cos(p.angle) * p.orbitDist;
      const targetY = cy + Math.sin(p.angle) * p.orbitDist;

      p.x += (targetX - p.x) * 0.02 + p.vx;
      p.y += (targetY - p.y) * 0.02 + p.vy;

      p.vx += (Math.random() - 0.5) * 0.1 * effectStrength;
      p.vy += (Math.random() - 0.5) * 0.1 * effectStrength;
      p.vx *= 0.98;
      p.vy *= 0.98;

      p.life -= p.decay;

      if (p.life <= 0) return false;
      if (p.x < -50 || p.x > width + 50 || p.y < -50 || p.y > height + 50) return false;

      // Draw
      const alpha = p.baseAlpha * p.life * (0.5 + energy * 0.5);
      const radius = p.radius * (1 + bass * bassSensitivity * 0.5);
      const hue = p.hue + treble * 40 * colorIntensity;

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 60%, 70%, ${alpha})`;
      ctx.fill();

      // Soft glow for larger particles
      if (radius > 2.5) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 60%, 70%, ${alpha * 0.1})`;
        ctx.fill();
      }

      return true;
    });

    // ---- Concentric rings pulsing with bass ----
    const ringCount = 4;
    for (let i = 0; i < ringCount; i++) {
      const baseRadius = 60 + i * 50;
      const pulseRadius = baseRadius + bass * bassSensitivity * 40 + Math.sin(time * 0.5 + i) * 10;
      const alpha = (0.06 + mid * 0.08) * (1 - i / ringCount);

      ctx.beginPath();
      ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(120, 220, 210, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // ---- Circular waveform ----
    const waveRadius = 100 + bass * bassSensitivity * 50;
    const wavePoints = 128;

    ctx.beginPath();
    ctx.strokeStyle = `rgba(220, 200, 180, ${0.15 + energy * 0.3})`;
    ctx.lineWidth = 1.5;

    for (let i = 0; i <= wavePoints; i++) {
      const t = i / wavePoints;
      const angle = t * Math.PI * 2;
      const dataIdx = Math.floor(t * (waveform.length - 1));
      const val = (waveform[dataIdx] - 128) / 128;
      const r = waveRadius + val * 30 * trebleSensitivity;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // ---- Soft vignette ----
    const vigGrad = ctx.createRadialGradient(cx, cy, width * 0.2, cx, cy, width * 0.65);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, width, height);
  },

  destroy() {
    this._state = {};
  },
};
