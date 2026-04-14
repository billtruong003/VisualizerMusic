import { useState, useRef, useCallback } from 'react';
import { ExportEngine } from '../engine/ExportEngine.js';

const IDLE_STATE = { status: 'idle', percent: 0, message: '', downloadUrl: null };

export function useExport() {
  const [exportState, setExportState] = useState(IDLE_STATE);
  const engineRef = useRef(null);

  const startExport = useCallback(async ({ audioFile, bgImage, theme, settings }) => {
    if (!audioFile) return;

    setExportState({ status: 'rendering', percent: 0, message: 'Starting export...', downloadUrl: null });

    const engine = new ExportEngine();
    engineRef.current = engine;

    try {
      const downloadUrl = await engine.run({
        audioFile,
        backgroundImage: bgImage,
        theme,
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
        setExportState(IDLE_STATE);
      } else {
        setExportState({ status: 'error', percent: 0, message: `Error: ${err.message}`, downloadUrl: null });
      }
    }
  }, []);

  const cancelExport = useCallback(() => {
    engineRef.current?.abort();
    setExportState(IDLE_STATE);
  }, []);

  const resetExport = useCallback(() => {
    setExportState(IDLE_STATE);
  }, []);

  const isExporting = exportState.status === 'rendering';

  return { exportState, isExporting, startExport, cancelExport, resetExport };
}
