import React, { useState, useRef, useCallback, useEffect } from 'react';
import DropZone from './components/DropZone.jsx';
import Slider from './components/Slider.jsx';
import PreviewCanvas from './components/PreviewCanvas.jsx';
import { RealtimeAnalyzer } from './engine/AudioAnalyzer.js';
import { RenderLoop } from './engine/RenderLoop.js';
import { ExportEngine } from './engine/ExportEngine.js';
import { getTheme, getAllThemes } from './engine/ThemeRegistry.js';
import './styles/app.css';

const DEFAULT_SETTINGS = {
  bassSensitivity: 0.6,
  trebleSensitivity: 0.5,
  colorIntensity: 0.6,
  effectStrength: 0.5,
};

export default function App() {
  // Media state
  const [audioFile, setAudioFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [bgImage, setBgImage] = useState(null);

  // Theme & settings
  const [themeId, setThemeId] = useState('lofi');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);

  // Export state
  const [exportState, setExportState] = useState({ status: 'idle', percent: 0, message: '', downloadUrl: null });

  // Refs
  const canvasRef = useRef(null);
  const audioElRef = useRef(null);
  const analyzerRef = useRef(null);
  const renderLoopRef = useRef(null);
  const exportEngineRef = useRef(null);

  // ---- Handle image load ----
  useEffect(() => {
    if (!imageFile) {
      setBgImage(null);
      return;
    }
    const img = new Image();
    img.onload = () => setBgImage(img);
    img.src = URL.createObjectURL(imageFile);
    return () => URL.revokeObjectURL(img.src);
  }, [imageFile]);

  // ---- Update render loop when theme/settings/bgImage changes ----
  useEffect(() => {
    if (renderLoopRef.current) {
      renderLoopRef.current.setTheme(getTheme(themeId));
    }
  }, [themeId]);

  useEffect(() => {
    if (renderLoopRef.current) {
      renderLoopRef.current.setSettings(settings);
    }
  }, [settings]);

  useEffect(() => {
    if (renderLoopRef.current) {
      renderLoopRef.current.setBackgroundImage(bgImage);
    }
  }, [bgImage]);

  // ---- When theme changes, apply its default settings ----
  useEffect(() => {
    const theme = getTheme(themeId);
    if (theme.defaultSettings) {
      setSettings({ ...DEFAULT_SETTINGS, ...theme.defaultSettings });
    }
  }, [themeId]);

  // ---- Play / Stop ----
  const handlePlay = useCallback(async () => {
    if (!audioFile) return;

    if (isPlaying) {
      // Stop
      if (audioElRef.current) {
        audioElRef.current.pause();
        audioElRef.current.currentTime = 0;
      }
      renderLoopRef.current?.stop();
      setIsPlaying(false);
      return;
    }

    // Create audio element
    if (!audioElRef.current) {
      audioElRef.current = new Audio();
    }
    const audioEl = audioElRef.current;
    audioEl.src = URL.createObjectURL(audioFile);

    // Init analyzer
    if (!analyzerRef.current) {
      analyzerRef.current = new RealtimeAnalyzer();
    }
    await analyzerRef.current.init(audioEl);
    analyzerRef.current.resume();

    // Init render loop
    const canvas = canvasRef.current.getCanvas();
    const theme = getTheme(themeId);

    if (renderLoopRef.current) {
      renderLoopRef.current.destroy();
    }
    renderLoopRef.current = new RenderLoop(canvas, theme, settings);
    renderLoopRef.current.setBackgroundImage(bgImage);

    // Start playback
    await audioEl.play();
    renderLoopRef.current.startPreview(() => analyzerRef.current.getData());
    setIsPlaying(true);

    // Auto-stop when audio ends
    audioEl.onended = () => {
      renderLoopRef.current?.stop();
      setIsPlaying(false);
    };
  }, [audioFile, isPlaying, themeId, settings, bgImage]);

  // ---- Export ----
  const handleExport = useCallback(async () => {
    if (!audioFile) return;

    // Stop preview if playing
    if (isPlaying) {
      audioElRef.current?.pause();
      renderLoopRef.current?.stop();
      setIsPlaying(false);
    }

    setExportState({ status: 'rendering', percent: 0, message: 'Starting export...', downloadUrl: null });

    const engine = new ExportEngine();
    exportEngineRef.current = engine;

    try {
      const downloadUrl = await engine.run({
        audioFile,
        backgroundImage: bgImage,
        theme: getTheme(themeId),
        settings,
        fps: 30,
        width: 1920,
        height: 1080,
        onProgress: (percent, message) => {
          setExportState({ status: 'rendering', percent, message, downloadUrl: null });
        },
      });

      setExportState({ status: 'done', percent: 100, message: 'Export complete!', downloadUrl });
    } catch (err) {
      if (err.message === 'Export aborted') {
        setExportState({ status: 'idle', percent: 0, message: '', downloadUrl: null });
      } else {
        setExportState({ status: 'error', percent: 0, message: `Error: ${err.message}`, downloadUrl: null });
      }
    }
  }, [audioFile, bgImage, themeId, settings, isPlaying]);

  const handleCancelExport = useCallback(() => {
    exportEngineRef.current?.abort();
    setExportState({ status: 'idle', percent: 0, message: '', downloadUrl: null });
  }, []);

  const handleResetExport = useCallback(() => {
    setExportState({ status: 'idle', percent: 0, message: '', downloadUrl: null });
  }, []);

  const themes = getAllThemes();
  const isExporting = exportState.status === 'rendering';

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo">
          <span className="logo-icon">◈</span>
          <span className="logo-text">Visualizer Studio</span>
        </div>
        <div className="header-badge">v1.0 MVP</div>
      </header>

      <div className="app-body">
        {/* ============ LEFT PANEL ============ */}
        <aside className="left-panel">
          {/* Media Inputs */}
          <section className="panel">
            <div className="panel-header">Media Input</div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <DropZone
                label="Drop audio file (MP3, WAV)"
                accept="audio/*,.mp3,.wav,.ogg,.flac"
                icon="🎵"
                onFileSelect={setAudioFile}
                currentFile={audioFile}
              />
              <DropZone
                label="Drop background image (JPG, PNG)"
                accept="image/*,.jpg,.jpeg,.png,.webp"
                icon="🖼"
                onFileSelect={setImageFile}
                currentFile={imageFile}
              />
            </div>
          </section>

          {/* Theme Selector */}
          <section className="panel">
            <div className="panel-header">Theme / Preset</div>
            <div style={{ padding: 16 }}>
              <select
                value={themeId}
                onChange={(e) => setThemeId(e.target.value)}
                disabled={isExporting}
              >
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <p style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                marginTop: 8,
                lineHeight: 1.5,
              }}>
                {getTheme(themeId).description}
              </p>
            </div>
          </section>

          {/* Settings */}
          <section className="panel">
            <div className="panel-header">Audio Reactive Settings</div>
            <div style={{ padding: 16 }}>
              <Slider
                label="Bass Sensitivity"
                value={settings.bassSensitivity}
                onChange={(v) => setSettings((s) => ({ ...s, bassSensitivity: v }))}
              />
              <Slider
                label="Treble Reactivity"
                value={settings.trebleSensitivity}
                onChange={(v) => setSettings((s) => ({ ...s, trebleSensitivity: v }))}
              />
              <Slider
                label="Color Intensity"
                value={settings.colorIntensity}
                onChange={(v) => setSettings((s) => ({ ...s, colorIntensity: v }))}
              />
              <Slider
                label="Effect Strength"
                value={settings.effectStrength}
                onChange={(v) => setSettings((s) => ({ ...s, effectStrength: v }))}
              />
            </div>
          </section>

          {/* Actions */}
          <section className="panel">
            <div className="panel-header">Actions</div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className={`btn ${isPlaying ? 'btn-danger' : 'btn-secondary'}`}
                onClick={handlePlay}
                disabled={!audioFile || isExporting}
              >
                {isPlaying ? '■  Stop Preview' : '▶  Play Preview'}
              </button>

              {!isExporting && exportState.status !== 'done' && (
                <button
                  className="btn btn-primary"
                  onClick={handleExport}
                  disabled={!audioFile}
                >
                  ⬡  Generate Video
                </button>
              )}

              {isExporting && (
                <button className="btn btn-danger" onClick={handleCancelExport}>
                  ✕  Cancel Export
                </button>
              )}

              {exportState.status === 'done' && (
                <button className="btn btn-secondary" onClick={handleResetExport}>
                  ↺  New Export
                </button>
              )}
            </div>
          </section>
        </aside>

        {/* ============ RIGHT PANEL ============ */}
        <main className="right-panel">
          <div className="preview-label">Preview</div>
          <PreviewCanvas
            ref={canvasRef}
            width={1920}
            height={1080}
            exportState={exportState}
          />

          {/* Audio info bar */}
          <div className="info-bar">
            <span>
              {audioFile ? `🎵 ${audioFile.name}` : 'No audio loaded'}
            </span>
            <span>
              {imageFile ? `🖼 ${imageFile.name}` : 'No background'}
            </span>
            <span>
              Theme: {getTheme(themeId).name}
            </span>
          </div>
        </main>
      </div>
    </div>
  );
}
