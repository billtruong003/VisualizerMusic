import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

const PreviewCanvas = forwardRef(function PreviewCanvas({ width = 1920, height = 1080, exportState, isActive }, ref) {
  const canvasRef = useRef(null);
  const idleRafRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  // Idle animation — subtle gradient when no audio playing
  useEffect(() => {
    if (isActive) {
      if (idleRafRef.current) cancelAnimationFrame(idleRafRef.current);
      idleRafRef.current = null;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function drawIdle(t) {
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#080810';
      ctx.fillRect(0, 0, w, h);

      // Slow rotating gradient
      const cx = w / 2, cy = h / 2;
      const angle = t * 0.0003;
      const gx = cx + Math.sin(angle) * w * 0.2;
      const gy = cy + Math.cos(angle * 0.7) * h * 0.15;
      const grad = ctx.createRadialGradient(gx, gy, 0, cx, cy, w * 0.5);
      grad.addColorStop(0, 'rgba(108, 92, 231, 0.06)');
      grad.addColorStop(0.5, 'rgba(0, 206, 201, 0.03)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle center text
      ctx.save();
      ctx.globalAlpha = 0.15 + Math.sin(t * 0.001) * 0.05;
      ctx.font = `${Math.round(w / 40)}px 'Outfit', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e8e8f0';
      ctx.fillText('Drop audio to begin', cx, cy);

      ctx.font = `${Math.round(w / 80)}px 'JetBrains Mono', monospace`;
      ctx.globalAlpha = 0.08 + Math.sin(t * 0.0015) * 0.03;
      ctx.fillText(`${w}×${h}`, cx, cy + Math.round(w / 28));
      ctx.restore();

      idleRafRef.current = requestAnimationFrame(drawIdle);
    }

    idleRafRef.current = requestAnimationFrame(drawIdle);
    return () => {
      if (idleRafRef.current) cancelAnimationFrame(idleRafRef.current);
    };
  }, [isActive]);

  return (
    <div className="preview-container">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="preview-canvas"
      />

      {/* Export overlay */}
      {exportState && exportState.status !== 'idle' && (
        <div className="export-overlay">
          <div className={`export-message ${exportState.status === 'error' ? 'error' : ''}`}>
            {exportState.message}
          </div>

          {exportState.status === 'rendering' && (
            <div className="export-progress">
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${exportState.percent}%` }}
                />
              </div>
              <div className="export-percent">{exportState.percent}%</div>
            </div>
          )}

          {exportState.status === 'done' && exportState.downloadUrl && (
            <a
              href={exportState.downloadUrl}
              download="visualizer.mp4"
              className="btn btn-primary"
              style={{ marginTop: 8 }}
            >
              Download MP4
            </a>
          )}
        </div>
      )}

      {/* Resolution badge when idle */}
      {(!exportState || exportState.status === 'idle') && !isActive && (
        <div className="resolution-badge">1920x1080 / 16:9</div>
      )}
    </div>
  );
});

export default PreviewCanvas;
