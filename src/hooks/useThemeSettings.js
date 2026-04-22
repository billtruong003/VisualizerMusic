import { useState, useCallback, useEffect, useRef } from 'react';
import { createTheme, getAllThemeMetas, getThemeMeta } from '../engine/ThemeRegistry.js';

const BASE_SETTINGS = {
  bassSensitivity: 0.6,
  trebleSensitivity: 0.5,
  colorIntensity: 0.6,
  effectStrength: 0.5,
  // Visual scale controls
  waveformScale: 0.5,    // 0=thin, 1=thick
  barScale: 0.5,          // 0=thin, 1=thick
  // Title overlay
  showTitle: false,
  songTitle: '',
  artistName: '',
  titlePosition: 'bottom-left',
  titleDisplay: 'always',
  titleFont: 'Outfit',
  // Subtitles
  showSubtitles: false,
  showSecondaryLang: true,
  subtitleData: null,  // { defaults, cues } | null
};

const FONT_OPTIONS = [
  { id: 'Outfit', label: 'Outfit (Default)' },
  { id: 'JetBrains Mono', label: 'JetBrains Mono' },
  { id: 'Georgia', label: 'Georgia (Serif)' },
  { id: 'Arial', label: 'Arial' },
  { id: 'Courier New', label: 'Courier New' },
  { id: 'Impact', label: 'Impact' },
];

function buildDefaultColors(meta) {
  const colors = {};
  if (meta?.colorSlots) {
    meta.colorSlots.forEach(slot => {
      colors[slot.id] = slot.default;
    });
  }
  return colors;
}

export function useThemeSettings() {
  const [themeId, setThemeId] = useState('lofi');
  const [settings, setSettings] = useState(() => {
    const meta = getThemeMeta('lofi');
    return { ...BASE_SETTINGS, ...meta?.defaultSettings, colors: buildDefaultColors(meta) };
  });
  const themeRef = useRef(null);

  // Create new theme instance when themeId changes.
  // Don't destroy old theme here — RenderLoop.setTheme() handles that.
  useEffect(() => {
    themeRef.current = createTheme(themeId);
    const meta = getThemeMeta(themeId);
    if (meta) {
      setSettings(prev => ({
        ...BASE_SETTINGS,
        ...meta.defaultSettings,
        colors: buildDefaultColors(meta),
        // Preserve user's visual controls, title and subtitle settings across theme changes
        waveformScale: prev.waveformScale,
        barScale: prev.barScale,
        showTitle: prev.showTitle,
        songTitle: prev.songTitle,
        artistName: prev.artistName,
        titlePosition: prev.titlePosition,
        titleDisplay: prev.titleDisplay,
        titleFont: prev.titleFont,
        showSubtitles: prev.showSubtitles,
        showSecondaryLang: prev.showSecondaryLang,
        subtitleData: prev.subtitleData,
      }));
    }
  }, [themeId]);

  const theme = themeRef.current;
  const themeMetas = getAllThemeMetas();
  const currentMeta = getThemeMeta(themeId);

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateColor = useCallback((colorId, value) => {
    setSettings(prev => ({
      ...prev,
      colors: { ...prev.colors, [colorId]: value },
    }));
  }, []);

  const resetColors = useCallback(() => {
    const meta = getThemeMeta(themeId);
    setSettings(prev => ({ ...prev, colors: buildDefaultColors(meta) }));
  }, [themeId]);

  const resetAll = useCallback(() => {
    const meta = getThemeMeta(themeId);
    setSettings({
      ...BASE_SETTINGS,
      ...meta?.defaultSettings,
      colors: buildDefaultColors(meta),
    });
  }, [themeId]);

  return {
    themeId, setThemeId, theme, settings,
    updateSetting, updateColor, resetColors, resetAll,
    themeMetas, currentMeta, FONT_OPTIONS,
  };
}
