import { useState, useRef, useCallback, useEffect } from 'react';
import { RealtimeAnalyzer } from '../engine/AudioAnalyzer.js';
import { RenderLoop } from '../engine/RenderLoop.js';

export function useAudioPlayer({ canvasRef, theme, settings, bgImage }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioElRef = useRef(null);
  const analyzerRef = useRef(null);
  const renderLoopRef = useRef(null);
  const objectUrlRef = useRef(null);

  // Sync theme to render loop
  useEffect(() => {
    if (renderLoopRef.current && theme) {
      renderLoopRef.current.setTheme(theme);
    }
  }, [theme]);

  // Sync settings to render loop
  useEffect(() => {
    if (renderLoopRef.current) {
      renderLoopRef.current.setSettings(settings);
    }
  }, [settings]);

  // Sync background image to render loop
  useEffect(() => {
    if (renderLoopRef.current) {
      renderLoopRef.current.setBackgroundImage(bgImage);
    }
  }, [bgImage]);

  const play = useCallback(async (audioFile) => {
    if (!audioFile) return;

    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;

    if (!audioElRef.current) {
      audioElRef.current = new Audio();
    }
    const audioEl = audioElRef.current;

    // Cleanup previous object URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    objectUrlRef.current = URL.createObjectURL(audioFile);
    audioEl.src = objectUrlRef.current;

    // Init analyzer
    if (!analyzerRef.current) {
      analyzerRef.current = new RealtimeAnalyzer();
    }
    await analyzerRef.current.init(audioEl);
    analyzerRef.current.resume();

    // Init render loop
    if (renderLoopRef.current) {
      renderLoopRef.current.destroy();
    }
    renderLoopRef.current = new RenderLoop(canvas, theme, settings);
    renderLoopRef.current.setBackgroundImage(bgImage);

    // Resume background video if any (paused by export or manual stop)
    if (bgImage && typeof bgImage.play === 'function' && bgImage.paused) {
      bgImage.play().catch(() => {});
    }

    // Start
    await audioEl.play();
    renderLoopRef.current.startPreview(() => analyzerRef.current.getData());
    setIsPlaying(true);

    audioEl.onended = () => {
      renderLoopRef.current?.stop();
      setIsPlaying(false);
    };
  }, [canvasRef, theme, settings, bgImage]);

  const stop = useCallback(() => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
    }
    renderLoopRef.current?.stop();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(async (audioFile) => {
    if (isPlaying) {
      stop();
    } else {
      await play(audioFile);
    }
  }, [isPlaying, play, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      if (audioElRef.current) {
        audioElRef.current.pause();
        audioElRef.current = null;
      }
      analyzerRef.current?.destroy();
      renderLoopRef.current?.destroy();
    };
  }, []);

  return { isPlaying, play, stop, toggle };
}
