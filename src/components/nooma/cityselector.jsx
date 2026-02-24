/* --- BLOCK START: CITY SELECTOR (KRYL-302) --- */
import React from 'react';

const CITIES = [
  "New York", "London", "Tokyo", "Paris", 
  "Berlin", "Dubai", "Singapore", "Los Angeles"
];

export function CitySelector({ position }) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: '40px',
      transformStyle: 'preserve-3d' 
    }}>
      {CITIES.map((city, index) => {
        // Calculate relative distance from the "center" (Position 0)
        // We space them every 150px
        const itemOffset = (index * 150) + (position);
        
        // Exponential Depth: Items further from center sink deeper into Z-space
        const zDepth = Math.abs(itemOffset) * -1.2;
        const opacity = Math.max(0, 1 - Math.abs(itemOffset) / 600);
        const blur = Math.min(10, Math.abs(itemOffset) / 50);

        return (
          <div 
            key={city}
            style={{
              transform: `translate3d(0, 0, ${zDepth}px)`,
              opacity: opacity,
              filter: `blur(${blur}px)`,
              fontSize: '3.5rem',
              fontWeight: '900',
              letterSpacing: '5px',
              color: 'white',
              whiteSpace: 'nowrap',
              transition: 'none', // Critical: Driven by Physics Kernel
              willChange: 'transform, opacity'
            }}
          >
            {city.toUpperCase()}
          </div>
        );
      })}
    </div>
  );
}
/* --- BLOCK END: CITY SELECTOR --- */