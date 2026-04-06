/**
 * RenderLoop — Drives the canvas render in both preview and export modes
 */

export class RenderLoop {
  constructor(canvas, theme, settings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.theme = theme;
    this.settings = settings;
    this.backgroundImage = null;
    this.rafId = null;
    this.running = false;
    this.startTime = 0;
  }

  setTheme(theme) {
    if (this.theme?.destroy) this.theme.destroy();
    this.theme = theme;
    this.theme.init(this.ctx, this.canvas.width, this.canvas.height);
  }

  setSettings(settings) {
    this.settings = { ...this.settings, ...settings };
  }

  setBackgroundImage(img) {
    this.backgroundImage = img;
  }

  /**
   * Start the realtime preview loop
   * @param {Function} getAudioData — () => AudioData from RealtimeAnalyzer
   */
  startPreview(getAudioData) {
    this.running = true;
    this.startTime = performance.now();
    this.theme.init(this.ctx, this.canvas.width, this.canvas.height);

    const loop = () => {
      if (!this.running) return;

      const audioData = getAudioData();
      const time = (performance.now() - this.startTime) / 1000;

      this.theme.render(
        this.ctx,
        audioData,
        this.settings,
        time,
        this.backgroundImage,
        this.canvas.width,
        this.canvas.height
      );

      this.rafId = requestAnimationFrame(loop);
    };

    loop();
  }

  /**
   * Render a single frame at a specific time (used for export)
   */
  renderFrame(audioData, time) {
    this.theme.render(
      this.ctx,
      audioData,
      this.settings,
      time,
      this.backgroundImage,
      this.canvas.width,
      this.canvas.height
    );
  }

  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  destroy() {
    this.stop();
    if (this.theme?.destroy) this.theme.destroy();
  }
}
