/**
 * Subtitle system — JSON cue format with effects, 9-grid positioning, dual-language.
 *
 * JSON schema:
 * {
 *   "defaults": {
 *     "font": "Outfit",
 *     "size": 48,             // primary text px (relative to 1080p canvas — scales at render)
 *     "color": "#ffffff",
 *     "color2": "#cccccc",
 *     "size2": null,          // defaults to size * 0.6 if omitted
 *     "position": "bottom-center",
 *     "effect": "fade"        // default effect applied to cues that omit it
 *   },
 *   "cues": [
 *     {
 *       "start": 0.0,
 *       "end": 3.5,
 *       "text": "Primary line",
 *       "text2": "Secondary / translation (optional)",
 *       "position": "bottom-center",   // overrides default
 *       "effect": "fade+glow-pulse",    // 1+ effects joined with '+'
 *       "font": "Impact",
 *       "size": 72,
 *       "color": "#ffe066",
 *       "size2": 36,
 *       "color2": "#f0f0f0"
 *     }
 *   ]
 * }
 *
 * Supported effects: fade, slide-up, slide-down, slide-left, slide-right,
 *                    typewriter, pop, glow-pulse.
 */

const DEFAULT_DEFAULTS = {
  font: 'Outfit',
  size: 48,
  color: '#ffffff',
  color2: '#e0e0e0',
  size2: null,
  position: 'bottom-center',
  effect: 'fade',
};

export function parseSubtitleJSON(json) {
  if (!json || typeof json !== 'object') throw new Error('Subtitle JSON must be an object');
  if (!Array.isArray(json.cues)) throw new Error('Subtitle JSON must have a "cues" array');

  const defaults = { ...DEFAULT_DEFAULTS, ...(json.defaults || {}) };
  const cues = [];

  for (let i = 0; i < json.cues.length; i++) {
    const c = json.cues[i];
    if (typeof c.start !== 'number' || typeof c.end !== 'number') {
      throw new Error(`Cue #${i}: start and end must be numbers`);
    }
    if (c.end <= c.start) {
      throw new Error(`Cue #${i}: end must be greater than start`);
    }
    if (typeof c.text !== 'string' || !c.text.length) {
      throw new Error(`Cue #${i}: text must be a non-empty string`);
    }
    cues.push({
      start: c.start,
      end: c.end,
      text: c.text,
      text2: typeof c.text2 === 'string' && c.text2.length ? c.text2 : null,
      position: c.position || defaults.position,
      effect: c.effect || defaults.effect,
      font: c.font || defaults.font,
      size: typeof c.size === 'number' ? c.size : defaults.size,
      color: c.color || defaults.color,
      size2: typeof c.size2 === 'number' ? c.size2 : defaults.size2,
      color2: c.color2 || defaults.color2,
    });
  }

  cues.sort((a, b) => a.start - b.start);
  return { defaults, cues };
}

/**
 * Returns true if `time` falls within a cue.
 */
function cueActive(cue, time) {
  return time >= cue.start && time < cue.end;
}

/**
 * Easing helpers
 */
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * Compute opacity + transform for a cue at a given local progress (0..1).
 * Returns { alpha, dx, dy, scale, charsFrac } where charsFrac ∈ [0,1] — portion of text revealed.
 */
function computeEffectState(effects, progress, duration) {
  const inOut = Math.min(0.25, duration * 0.25); // seconds of in/out (capped at 25% of cue)
  const enterP = Math.min(1, (progress * duration) / inOut);
  const exitP = Math.min(1, ((1 - progress) * duration) / inOut);

  let alpha = Math.min(enterP, exitP); // base fade (always applied subtly for smoothness)
  let dx = 0, dy = 0, scale = 1, charsFrac = 1;
  let glow = 0;

  const has = (name) => effects.includes(name);

  if (has('fade')) {
    alpha = Math.min(enterP, exitP);
  }

  if (has('slide-up')) {
    const eased = easeOutCubic(enterP);
    dy = (1 - eased) * 60;
    const exitE = easeOutCubic(exitP);
    dy += (1 - exitE) * -40;
  }
  if (has('slide-down')) {
    const eased = easeOutCubic(enterP);
    dy = (1 - eased) * -60;
    const exitE = easeOutCubic(exitP);
    dy += (1 - exitE) * 40;
  }
  if (has('slide-left')) {
    const eased = easeOutCubic(enterP);
    dx = (1 - eased) * 120;
    const exitE = easeOutCubic(exitP);
    dx += (1 - exitE) * -80;
  }
  if (has('slide-right')) {
    const eased = easeOutCubic(enterP);
    dx = (1 - eased) * -120;
    const exitE = easeOutCubic(exitP);
    dx += (1 - exitE) * 80;
  }

  if (has('pop')) {
    scale = easeOutBack(enterP) * Math.min(1, exitP * 1.5);
  }

  if (has('typewriter')) {
    // Reveal characters across first 60% of cue, then hold
    charsFrac = Math.min(1, progress / 0.6);
  }

  if (has('glow-pulse')) {
    glow = 0.5 + 0.5 * Math.sin(progress * Math.PI * 6);
  }

  return { alpha: Math.max(0, Math.min(1, alpha)), dx, dy, scale, charsFrac, glow };
}

/**
 * Layout: compute block anchor (top-left corner of the text block) based on 9-grid position.
 */
function computeAnchor(position, w, h, blockWidth, blockHeight) {
  const margin = Math.round(w / 32);
  const leftX = margin;
  const rightX = w - margin;
  const cenX = w / 2;

  let topY, x, align;
  if (position === 'center') {
    topY = h / 2 - blockHeight / 2;
    x = cenX; align = 'center';
  } else if (position.startsWith('top-')) {
    topY = margin;
  } else if (position.startsWith('bottom-')) {
    topY = h - margin - blockHeight;
  } else if (position.startsWith('middle-')) {
    topY = h / 2 - blockHeight / 2;
  } else {
    topY = h - margin - blockHeight;
  }

  if (position.endsWith('-left')) { x = leftX; align = 'left'; }
  else if (position.endsWith('-right')) { x = rightX; align = 'right'; }
  else if (position.endsWith('-center') || position === 'center') { x = cenX; align = 'center'; }
  else { x = leftX; align = 'left'; }

  return { x, topY, align };
}

/**
 * Main draw function — call AFTER theme render, AFTER title overlay.
 *
 * @param ctx — canvas 2D context
 * @param subtitleData — parsed { defaults, cues } from parseSubtitleJSON
 * @param time — current time in seconds
 * @param w, h — canvas dimensions
 * @param showSecondary — whether to draw text2
 */
export function drawSubtitles(ctx, subtitleData, time, w, h, showSecondary = true) {
  if (!subtitleData || !Array.isArray(subtitleData.cues)) return;

  // Scale factor — JSON sizes are authored at 1080p reference; scale for any canvas size.
  const sizeScale = h / 1080;

  for (const cue of subtitleData.cues) {
    if (!cueActive(cue, time)) continue;

    const duration = cue.end - cue.start;
    const progress = (time - cue.start) / duration;
    const effects = cue.effect.split('+').map(e => e.trim()).filter(Boolean);

    const state = computeEffectState(effects, progress, duration);
    if (state.alpha <= 0.01) continue;

    const primarySize = Math.round(cue.size * sizeScale);
    const primaryFont = `bold ${primarySize}px '${cue.font}', sans-serif`;

    const hasSecondary = showSecondary && cue.text2;
    const secondarySize = hasSecondary
      ? Math.round(((cue.size2 != null ? cue.size2 : cue.size * 0.6)) * sizeScale)
      : 0;
    const secondaryFont = hasSecondary
      ? `${secondarySize}px '${cue.font}', sans-serif`
      : null;

    const gap = hasSecondary ? Math.round(primarySize * 0.25) : 0;

    // Text to display (handles typewriter)
    const primaryText = state.charsFrac < 1
      ? cue.text.slice(0, Math.ceil(cue.text.length * state.charsFrac))
      : cue.text;
    const secondaryText = hasSecondary
      ? (state.charsFrac < 1 ? cue.text2.slice(0, Math.ceil(cue.text2.length * state.charsFrac)) : cue.text2)
      : null;

    // Measure for block bounding box
    ctx.save();
    ctx.font = primaryFont;
    const primaryMetrics = ctx.measureText(primaryText);
    const primaryW = primaryMetrics.width;

    let secondaryW = 0;
    if (hasSecondary) {
      ctx.font = secondaryFont;
      secondaryW = ctx.measureText(secondaryText).width;
    }
    const blockW = Math.max(primaryW, secondaryW);
    const blockH = primarySize + (hasSecondary ? gap + secondarySize : 0);

    const { x, topY, align } = computeAnchor(cue.position, w, h, blockW, blockH);

    ctx.globalAlpha = state.alpha;

    // Apply pop scale around the block center
    if (state.scale !== 1) {
      const cxp = align === 'left' ? x : align === 'right' ? x : x;
      const cyp = topY + blockH / 2;
      ctx.translate(cxp, cyp);
      ctx.scale(state.scale, state.scale);
      ctx.translate(-cxp, -cyp);
    }

    const drawX = x + state.dx;
    const drawTopY = topY + state.dy;

    // Shadow — glow or readability drop shadow
    if (state.glow > 0) {
      ctx.shadowColor = cue.color;
      ctx.shadowBlur = 15 * sizeScale + state.glow * 25 * sizeScale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 8 * sizeScale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2 * sizeScale;
    }

    // Primary line (baseline alphabetic → y = top + primarySize)
    ctx.font = primaryFont;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = cue.color;
    ctx.fillText(primaryText, drawX, drawTopY + primarySize);

    // Secondary line
    if (hasSecondary && secondaryText) {
      ctx.font = secondaryFont;
      ctx.fillStyle = cue.color2;
      ctx.globalAlpha = state.alpha * 0.82;
      ctx.fillText(secondaryText, drawX, drawTopY + primarySize + gap + secondarySize);
    }

    ctx.restore();
  }
}

/**
 * Sample JSON for the UI hint.
 */
export const SUBTITLE_SAMPLE = {
  defaults: {
    font: 'Outfit',
    size: 56,
    color: '#ffffff',
    color2: '#ffd166',
    position: 'bottom-center',
    effect: 'fade',
  },
  cues: [
    { start: 0,   end: 3.5, text: 'Welcome to the show',        text2: 'Chào mừng đến với show', effect: 'fade+slide-up' },
    { start: 3.5, end: 6.5, text: 'Feel the beat',               text2: 'Cảm nhận nhịp điệu',     effect: 'typewriter' },
    { start: 6.5, end: 9,   text: 'DROP!',                       position: 'center', size: 96, effect: 'pop+glow-pulse', color: '#ff3e6c' },
  ],
};
