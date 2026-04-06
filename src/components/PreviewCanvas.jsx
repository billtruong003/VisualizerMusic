import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

const PreviewCanvas = forwardRef(function PreviewCanvas({ width = 1920, height = 1080, exportState }, ref) {
  const canvasRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      aspectRatio: '16/9',
      background: '#080810',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      border: '1px solid var(--border-subtle)',
    }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />

      {/* Export overlay */}
      {exportState && exportState.status !== 'idle' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: exportState.status === 'error' ? 'var(--accent-danger)' : 'var(--text-primary)',
          }}>
            {exportState.message}
          </div>

          {exportState.status === 'rendering' && (
            <div style={{ width: '60%' }}>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${exportState.percent}%` }}
                />
              </div>
              <div style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                textAlign: 'center',
                marginTop: 8,
              }}>
                {exportState.percent}%
              </div>
            </div>
          )}

          {exportState.status === 'done' && exportState.downloadUrl && (
            <a
              href={exportState.downloadUrl}
              download="visualizer.mp4"
              className="btn btn-primary"
              style={{ marginTop: 8 }}
            >
              ⬇ Download MP4
            </a>
          )}
        </div>
      )}

      {/* Idle state */}
      {(!exportState || exportState.status === 'idle') && (
        <div style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          background: 'rgba(0,0,0,0.5)',
          padding: '3px 8px',
          borderRadius: 4,
        }}>
          1920×1080 · 16:9
        </div>
      )}
    </div>
  );
});

export default PreviewCanvas;
