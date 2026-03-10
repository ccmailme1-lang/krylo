import React from 'react';

export default function LensToggle({ activeLens, onSwitch }) {
  return (
    <div className="lens-toggle">
      <button
        className={`lens-btn${activeLens === '10k' ? ' active' : ''}`}
        onClick={() => onSwitch('10k')}
      >
        10K View
      </button>
      <button
        className={`lens-btn${activeLens === 'ground' ? ' active' : ''}`}
        onClick={() => onSwitch('ground')}
      >
        Ground Level
      </button>
      <button
        className={`lens-btn desktop-only${activeLens === 'map' ? ' active' : ''}`}
        onClick={() => onSwitch('map')}
      >
        Signal Map
      </button>
    </div>
  );
}
