import React from 'react';

export default function ColorPicker({ label, value, onChange }) {
  return (
    <div className="color-picker-row">
      <input
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="color-swatch"
      />
      <span className="color-picker-label">{label}</span>
      <span className="color-picker-hex">{value}</span>
    </div>
  );
}
