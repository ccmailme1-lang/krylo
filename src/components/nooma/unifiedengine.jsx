import React, { useState, useRef, useEffect } from 'react';

const UnifiedEngine = () => {
  const [layer, setLayer] = useState(1); 
  const [activeCity, setActiveCity] = useState('AUSTIN');
  const [searchTerm, setSearchTerm] = useState('');
  const scrollRef = useRef(null);

  const locations = {
    'AUSTIN': { friction: '0.012', latency: '12MS', coords: '30.26N', color: '#fff', density: 15 },
    'BERLIN': { friction: '0.045', latency: '45MS', coords: '52.52N', color: '#fff', density: 25 },
    'TOKYO': { friction: '0.085', latency: '180MS', coords: '35.67N', color: '#ff3b30', density: 40 }
  };

  const current = locations[activeCity];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || layer !== 2) return;
    const handleWheel = (e) => {
      if (Math.abs(e.deltaY) < 1) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [layer]);

  return (
    <div style={{ backgroundColor: '#000', height: '100vh', width: '100vw', overflow: 'hidden', color: '#fff', fontFamily: 'Inter, sans-serif', position: 'fixed', top: 0, left: 0 }}>
      
      {/* LAYER 1: GLOBAL ETR (THE GATEWAY) */}
      {layer === 1 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '10vh 8vw', zIndex: 100, background: '#000' }}>
          <div style={{ fontSize: '10px', letterSpacing: '10px', color: '#333' }}>GLOBAL_ETR</div>
          
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{ fontSize: '22vw', fontWeight: '900', letterSpacing: '-0.06em', color: '#fff' }}>
              0.012<span style={{ fontSize: '6vw', opacity: 0.2 }}>μ</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #111', paddingTop: '40px' }}>
            <input 
              autoFocus
              placeholder="SEARCH_NODE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              onKeyDown={(e) => { 
                const target = searchTerm.trim();
                if(e.key === 'Enter' && locations[target]) { 
                  setActiveCity(target); 
                  setLayer(2); 
                } 
              }}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px', letterSpacing: '8px', width: '100%', outline: 'none', textTransform: 'uppercase' }}
            />
          </div>
        </div>
      )}

      {/* LAYER 2: SIGNAL MAP (YOUR PAGE) */}
      {layer === 2 && (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          
          <main style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* ABYSS BACKGROUND */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.4 }}>
              {[...Array(current.density)].map((_, i) => (
                <div key={i} style={{
                  position: 'absolute', left: `${(i * 137) % 100}%`, top: `${(i * 157) % 100}%`,
                  fontSize: '14px', fontWeight: '600', color: current.color,
                  animation: `dataDrift ${10 + (i % 5)}s linear infinite`
                }}>{current.friction}μ</div>
              ))}
            </div>

            {/* ETR CARD */}
            <div style={{ zIndex: 10, padding: '60px', border: `1px solid ${current.color === '#ff3b30' ? '#ff3b30' : '#222'}`, background: '#000', minWidth: '450px' }}>
              <div style={{ fontSize: '10px', letterSpacing: '8px', color: '#444', marginBottom: '20px' }}>{activeCity}_NODE</div>
              <div style={{ fontSize: '8rem', fontWeight: '900', color: current.color, lineHeight: 0.8 }}>{current.friction}</div>
              <div style={{ marginTop: '30px', borderTop: '1px solid #111', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '18px' }}>{current.latency}</div>
                <div onClick={() => setLayer(1)} style={{ cursor: 'pointer', fontSize: '10px', color: '#444', letterSpacing: '2px' }}>[ BACK ]</div>
              </div>
            </div>
          </main>

          {/* THUMB CAROUSEL */}
          <nav ref={scrollRef} style={{ height: '25vh', borderTop: '1px solid #111', display: 'flex', alignItems: 'center', padding: '0 8vw', gap: '10vw', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {Object.keys(locations).map(city => (
              <button key={city} onClick={() => setActiveCity(city)} style={{ background: 'none', border: 'none', color: activeCity === city ? '#fff' : '#111', fontSize: '10vw', fontWeight: '900', cursor: 'pointer', transition: '0.4s' }}>
                {city}
              </button>
            ))}
          </nav>
        </div>
      )}

      <style>{`
        @keyframes dataDrift { 0% { transform: translateY(100vh); opacity: 0; } 50% { opacity: 0.2; } 100% { transform: translateY(-20vh); opacity: 0; } }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default UnifiedEngine;
