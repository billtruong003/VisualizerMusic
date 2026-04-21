/**
 * ThemeRegistry — Central registry for visualizer themes (Factory Pattern)
 *
 * Each theme exports:
 *   - meta: { id, name, description, colorSlots, defaultSettings }
 *   - create(): ThemeInstance with { init, render, destroy }
 */

import { lofiMeta, createLofiTheme } from '../themes/lofi.js';
import { cyberpunkMeta, createCyberpunkTheme } from '../themes/cyberpunk.js';
import { ambientMeta, createAmbientTheme } from '../themes/ambient.js';
import { retrowaveMeta, createRetrowaveTheme } from '../themes/retrowave.js';
import { minimalMeta, createMinimalTheme } from '../themes/minimal.js';
import { neonPulseMeta, createNeonPulseTheme } from '../themes/neonPulse.js';
import { galaxyMeta, createGalaxyTheme } from '../themes/galaxy.js';
import { watercolorMeta, createWatercolorTheme } from '../themes/watercolor.js';
import { waveTunnelMeta, createWaveTunnelTheme } from '../themes/waveTunnel.js';
import { particleStormMeta, createParticleStormTheme } from '../themes/particleStorm.js';
import { auroraMeta, createAuroraTheme } from '../themes/aurora.js';

const registry = new Map();

function register(meta, factory) {
  registry.set(meta.id, { meta, factory });
}

// Register all built-in themes
register(lofiMeta, createLofiTheme);
register(cyberpunkMeta, createCyberpunkTheme);
register(ambientMeta, createAmbientTheme);
register(retrowaveMeta, createRetrowaveTheme);
register(minimalMeta, createMinimalTheme);
register(neonPulseMeta, createNeonPulseTheme);
register(galaxyMeta, createGalaxyTheme);
register(watercolorMeta, createWatercolorTheme);
register(waveTunnelMeta, createWaveTunnelTheme);
register(particleStormMeta, createParticleStormTheme);
register(auroraMeta, createAuroraTheme);

/**
 * Create a fresh theme instance (own state, no shared mutation)
 */
export function createTheme(id) {
  const entry = registry.get(id);
  return entry ? entry.factory() : registry.values().next().value.factory();
}

/**
 * Get theme metadata without creating an instance
 */
export function getThemeMeta(id) {
  return registry.get(id)?.meta || null;
}

/**
 * Get all theme metadata for UI listing
 */
export function getAllThemeMetas() {
  return Array.from(registry.values()).map(e => e.meta);
}

/**
 * Register a custom theme at runtime (plugin support)
 */
export function registerTheme(meta, factory) {
  register(meta, factory);
}
