import { useEffect } from 'react';

export function useKeyboardShortcuts({ onTogglePlay, onStop, isExporting }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (!isExporting) onTogglePlay?.();
          break;
        case 'Escape':
          e.preventDefault();
          onStop?.();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onTogglePlay, onStop, isExporting]);
}
