// File: src/components/searchhome.jsx
// Status: Hardened Shell / No Path Changes

import React from 'react';

export default function searchhome({ onSlam }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.value.trim() !== "") {
      onSlam(e.target.value.toLowerCase());
    }
  };

  return (
    <div className="search-home-wrapper">
      <input 
        type="text"
        className="truth-input-field"
        placeholder="INPUT ETR..."
        onKeyDown={handleKeyDown}
        autoFocus
      />
    </div>
  );
}