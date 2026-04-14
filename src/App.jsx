import React, { useState, useRef, useCallback, useEffect } from 'react';
import DropZone from './components/DropZone.jsx';
import Slider from './components/Slider.jsx';
import ColorPicker from './components/ColorPicker.jsx';
import PreviewCanvas from './components/PreviewCanvas.jsx';
import { useAudioPlayer } from './hooks/useAudioPlayer.js';
import { useExport } from './hooks/useExport.js';
import { useThemeSettings } from './hooks/useThemeSettings.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import './styles/app.css';

export default function App() {
  const [audioFile, setAudioFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [bgImage, setBgImage] = useState(null);
  const [showColors, setShowColors] = useState(false);
  const [showTitle, setShowTitle] = useState(false);

  const canvasRef = useRef(null);

  const {
    themeId, setThemeId, theme, settings,
    updateSetting, updateColor, resetColors, resetAll,
    themeMetas, currentMeta, FONT_OPTIONS,
  } = useThemeSettings();

  const { isPlaying, toggle, stop } = useAudioPlayer({
    canvasRef, theme, settings, bgImage,
  });

  const { exportState, isExporting, startExport, cancelExport, resetExport } = useExport();

  useKeyboardShortcuts({
    onTogglePlay: useCallback(() => toggle(audioFile), [toggle, audioFile]),
    onStop: stop,
    isExporting,
  });

  useEffect(() => {
    if (!imageFile) { setBgImage(null); return; }
    const img = new Image();
    const url = URL.createObjectURL(imageFile);
    img.onload = () => setBgImage(img);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleExport = useCallback(() => {
    if (isPlaying) stop();
    startExport({ audioFile, bgImage, theme, settings });
  }, [audioFile, bgImage, theme, settings, isPlaying, stop, startExport]);

  const handleRefreshSession = useCallback(() => {
    if (isPlaying) stop();
    setAudioFile(null);
    setImageFile(null);
    setBgImage(null);
    resetAll();
    resetExport();
  }, [isPlaying, stop, resetAll, resetExport]);

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-logo">
          <span className="logo-icon">&#9674;</span>
          <span className="logo-text">Visualizer Studio</span>
        </div>
        <div className="header-right">
          <span className="shortcut-hint">Space: Play/Pause</span>
          <span className="shortcut-hint">Esc: Stop</span>
          <div className="header-badge">v2.0</div>
        </div>
      </header>

      <div className="app-body">
        <aside className="left-panel">
          {/* Media Inputs */}
          <section className="panel">
            <div className="panel-header">Media Input</div>
            <div className="panel-body">
              <DropZone
                label="Drop audio file (MP3, WAV)"
                accept="audio/*,.mp3,.wav,.ogg,.flac"
                icon="&#127925;"
                onFileSelect={setAudioFile}
                currentFile={audioFile}
              />
              <DropZone
                label="Drop background image (JPG, PNG)"
                accept="image/*,.jpg,.jpeg,.png,.webp"
                icon="&#128444;"
                onFileSelect={setImageFile}
                currentFile={imageFile}
              />
            </div>
          </section>

          {/* Theme Selector */}
          <section className="panel">
            <div className="panel-header">Theme / Preset</div>
            <div className="panel-body">
              <div className="theme-grid">
                {themeMetas.map((t) => (
                  <button
                    key={t.id}
                    className={`theme-card ${themeId === t.id ? 'active' : ''}`}
                    onClick={() => setThemeId(t.id)}
                    disabled={isExporting}
                  >
                    <div className="theme-card-swatches">
                      {t.colorSlots.slice(0, 3).map((slot) => (
                        <span key={slot.id} className="theme-swatch" style={{ background: slot.default }} />
                      ))}
                    </div>
                    <span className="theme-card-name">{t.name}</span>
                  </button>
                ))}
              </div>
              {currentMeta && <p className="theme-description">{currentMeta.description}</p>}
            </div>
          </section>

          {/* Audio Reactive + Visual Scale */}
          <section className="panel">
            <div className="panel-header">Audio Reactive</div>
            <div className="panel-body">
              <Slider label="Bass Sensitivity" value={settings.bassSensitivity} onChange={(v) => updateSetting('bassSensitivity', v)} />
              <Slider label="Treble Reactivity" value={settings.trebleSensitivity} onChange={(v) => updateSetting('trebleSensitivity', v)} />
              <Slider label="Color Intensity" value={settings.colorIntensity} onChange={(v) => updateSetting('colorIntensity', v)} />
              <Slider label="Effect Strength" value={settings.effectStrength} onChange={(v) => updateSetting('effectStrength', v)} />
              <div className="divider" />
              <Slider label="Waveform Thickness" value={settings.waveformScale ?? 0.5} onChange={(v) => updateSetting('waveformScale', v)} />
              <Slider label="Bar Thickness" value={settings.barScale ?? 0.5} onChange={(v) => updateSetting('barScale', v)} />
            </div>
          </section>

          {/* Color Palette */}
          <section className="panel">
            <div className="panel-header panel-header-toggle" onClick={() => setShowColors(!showColors)}>
              <span>Color Palette</span>
              <span className="toggle-icon">{showColors ? '\u25B2' : '\u25BC'}</span>
            </div>
            {showColors && currentMeta?.colorSlots && (
              <div className="panel-body">
                {currentMeta.colorSlots.map((slot) => (
                  <ColorPicker
                    key={slot.id}
                    label={slot.label}
                    value={settings.colors?.[slot.id] || slot.default}
                    onChange={(v) => updateColor(slot.id, v)}
                  />
                ))}
                <button className="btn btn-ghost" onClick={resetColors}>Reset to Defaults</button>
              </div>
            )}
          </section>

          {/* Song Info Overlay */}
          <section className="panel">
            <div className="panel-header panel-header-toggle" onClick={() => setShowTitle(!showTitle)}>
              <span>Song Info Overlay</span>
              <span className="toggle-icon">{showTitle ? '\u25B2' : '\u25BC'}</span>
            </div>
            {showTitle && (
              <div className="panel-body">
                <label className="input-row">
                  <span className="input-label">Show on video</span>
                  <input type="checkbox" className="toggle-checkbox" checked={settings.showTitle || false} onChange={(e) => updateSetting('showTitle', e.target.checked)} />
                </label>
                <input type="text" className="text-input" placeholder="Song title" value={settings.songTitle || ''} onChange={(e) => updateSetting('songTitle', e.target.value)} />
                <input type="text" className="text-input" placeholder="Artist name" value={settings.artistName || ''} onChange={(e) => updateSetting('artistName', e.target.value)} />
                <div className="select-row">
                  <span className="input-label">Font</span>
                  <select value={settings.titleFont || 'Outfit'} onChange={(e) => updateSetting('titleFont', e.target.value)}>
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.id} value={f.id} style={{ fontFamily: f.id }}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div className="select-row">
                  <span className="input-label">Position</span>
                  <select value={settings.titlePosition || 'bottom-left'} onChange={(e) => updateSetting('titlePosition', e.target.value)}>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-center">Bottom Center</option>
                    <option value="top-left">Top Left</option>
                    <option value="center">Center</option>
                  </select>
                </div>
                <div className="select-row">
                  <span className="input-label">Display</span>
                  <select value={settings.titleDisplay || 'always'} onChange={(e) => updateSetting('titleDisplay', e.target.value)}>
                    <option value="always">Always visible</option>
                    <option value="fade">Fade in/out (0-10s)</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
              </div>
            )}
          </section>

          {/* Actions */}
          <section className="panel">
            <div className="panel-header">Actions</div>
            <div className="panel-body actions-body">
              <button
                className={`btn ${isPlaying ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => toggle(audioFile)}
                disabled={!audioFile || isExporting}
              >
                {isPlaying ? 'Stop Preview' : 'Play Preview'}
              </button>

              {!isExporting && exportState.status !== 'done' && (
                <button className="btn btn-primary" onClick={handleExport} disabled={!audioFile}>
                  Generate Video
                </button>
              )}

              {isExporting && (
                <button className="btn btn-danger" onClick={cancelExport}>Cancel Export</button>
              )}

              {exportState.status === 'done' && (
                <button className="btn btn-secondary" onClick={resetExport}>New Export</button>
              )}

              <div className="divider" />
              <button className="btn btn-ghost" onClick={handleRefreshSession}>
                Reset Session
              </button>
            </div>
          </section>
        </aside>

        <main className="right-panel">
          <div className="preview-label">Preview</div>
          <PreviewCanvas ref={canvasRef} width={1920} height={1080} exportState={exportState} isActive={isPlaying || isExporting} />
          <div className="info-bar">
            <span>{audioFile ? audioFile.name : 'No audio loaded'}</span>
            <span>{imageFile ? imageFile.name : 'No background'}</span>
            <span>Theme: {currentMeta?.name || 'Unknown'}</span>
          </div>
        </main>
      </div>
    </div>
  );
}
