/**
 * ThemeRegistry — Central registry for visualizer themes
 * 
 * Adding a new theme:
 *   1. Create a file in /themes/ that exports an object matching ThemeModule interface
 *   2. Import and register it here
 * 
 * ThemeModule interface:
 *   {
 *     id: string,
 *     name: string,
 *     description: string,
 *     defaultSettings: { bassSensitivity, trebleSensitivity, colorIntensity, effectStrength },
 *     init(ctx, width, height): void,
 *     render(ctx, audioData, settings, time, backgroundImage): void,
 *     destroy(): void,
 *   }
 */

import { lofiTheme } from '../themes/lofi.js';
import { cyberpunkTheme } from '../themes/cyberpunk.js';
import { ambientTheme } from '../themes/ambient.js';

const themes = new Map();

function register(theme) {
  themes.set(theme.id, theme);
}

// Register built-in themes
register(lofiTheme);
register(cyberpunkTheme);
register(ambientTheme);

export function getTheme(id) {
  return themes.get(id) || lofiTheme;
}

export function getAllThemes() {
  return Array.from(themes.values());
}

export function registerTheme(theme) {
  register(theme);
}
