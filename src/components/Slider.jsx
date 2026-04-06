import React from 'react';

export default function Slider({ label, value, onChange, min = 0, max = 1, step = 0.01 }) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
      }}>
        <span style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          fontWeight: 500,
          letterSpacing: '0.3px',
        }}>
          {label}
        </span>
        <span style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          background: `linear-gradient(to right, var(--accent-primary) ${percent}%, var(--bg-overlay) ${percent}%)`,
        }}
      />
    </div>
  );
}
