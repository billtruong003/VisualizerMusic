import React, { useRef, useState, useCallback } from 'react';

export default function DropZone({ label, accept, icon, onFileSelect, currentFile }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) onFileSelect(file);
  };

  const cls = `drop-zone ${isDragOver ? 'drag-over' : ''} ${currentFile ? 'has-file' : ''}`;

  return (
    <div
      className={cls}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <div className="icon">{icon}</div>
      {currentFile ? (
        <p style={{ color: 'var(--accent-secondary)', fontWeight: 500 }}>
          {currentFile.name}
          <br />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {(currentFile.size / (1024 * 1024)).toFixed(1)} MB — click to change
          </span>
        </p>
      ) : (
        <p>{label}<br /><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>or click to browse</span></p>
      )}
    </div>
  );
}
