import React from 'react';

export default function Slider({ label, value, onChange, min = 0, max = 1, step = 0.01 }) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="slider-row">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{value.toFixed(2)}</span>
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
