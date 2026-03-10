import React from 'react';

/**
 * COMPONENT: dashboard
 * ROLE: MOP Controller Overlay
 * LAW: Lowercase / Base44
 */
export default function dashboard({ currentView }) {
  const B = 44;
  
  const status_map = {
    glove: { label: "THE_GLOVE", color: "#00ff41" },
    desk: { label: "THE_DESK", color: "#ffaa00" }
  };

  const current = status_map[currentView] || { label: "IDLE", color: "#333" };

  return (
    <div style={{ 
      fontFamily: 'monospace', 
      fontSize: '12px', 
      padding: `${B/4}px`, 
      border: `1px solid ${current.color}`,
      backgroundColor: 'rgba(0,0,0,0.8)',
      color: current.color,
      textTransform: 'uppercase'
    }}>
      [MOP_ACTIVE] :: {current.label} :: v2.0.0
    </div>
  );
}