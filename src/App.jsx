import React, { useEffect, useRef } from 'react';

const CITIES = ["NEW YORK", "LONDON", "TOKYO", "PARIS", "BERLIN", "SINGAPORE", "SHANGHAI", "DUBAI"];

export default function App() {
  const canvasRef = useRef(null);
  const targetPos = useRef(0);
  const currentPos = useRef(0);
  const velocity = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId;
    let touchStartY = 0;

    const resize = () => {
      // 1. Retina / High-DPI scaling for sharp text
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      
      // 2. CSS sizing for layout
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    // --- INPUT HANDLERS (Desktop + Mobile) ---
    const handleWheel = (e) => {
      if (e.cancelable) e.preventDefault();
      targetPos.current -= e.deltaY * 3.5;
    };

    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      if (e.cancelable) e.preventDefault();
      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY - touchY;
      targetPos.current += deltaY * 5.0; // Touch sensitivity boost
      touchStartY = touchY;
    };

    // --- RENDER LOOP ---
    const draw = () => {
      // Physics: Smooth Spring Interpolation
      const force = (targetPos.current - currentPos.current) * 0.05;
      velocity.current = (velocity.current + force) * 0.92;
      currentPos.current += velocity.current;

      // Reset Canvas
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      // Manual Projection Geometry
      const focalLength = 1200; 
      const spacing = 1800;    
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Draw loop (Back-to-Front)
      for (let i = 40; i >= -5; i--) {
        // Infinite tunnel modulo logic
        const z = i * -spacing + (currentPos.current % (spacing * CITIES.length));

        // Geometric Clipping
        if (z > focalLength - 100 || z < -20000) continue;

        // The Scaling Truth: f / (f - z)
        const scale = focalLength / (focalLength - z);
        const alpha = Math.max(0, 1 - Math.abs(z) / 12000);

        ctx.save();
        ctx.translate(window.innerWidth / 2, window.innerHeight / 2);
        ctx.scale(scale, scale);

        // Brutalist Aesthetic: Pure White Mono
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.font = '900 120px monospace';

        const cityIndex = ((i % CITIES.length) + CITIES.length) % CITIES.length;
        ctx.fillText(CITIES[cityIndex], 0, 0);

        ctx.restore();
      }

      // HUD Overlay for technical monitoring
      ctx.fillStyle = '#444';
      ctx.font = '12px monospace';
      ctx.fillText(`./KRYLO  POS:${currentPos.current.toFixed(0)}  VEL:${velocity.current.toFixed(1)}`, 30, 40);

      frameId = requestAnimationFrame(draw);
    };

    // --- INITIALIZATION & EVENT BINDING ---
    window.addEventListener('resize', resize);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    resize();
    draw();

    // --- CLEANUP ---
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        backgroundColor: 'black',
        touchAction: 'none'
      }}
    />
  );
}