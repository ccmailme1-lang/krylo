import React, { useState, useEffect } from 'react';

const AuditMVP = () => {
  const [selection, setSelection] = useState('AUSTIN');
  const [metrics, setMetrics] = useState({ friction: '0.012', latency: '12MS' });

  const data = {
    'AUSTIN': { friction: 0.012, latency: 12, coords: '30.26N 97.74W', status: 'STABLE', trend: [10, 20, 15, 30, 25, 40] },
    'BERLIN': { friction: 0.045, latency: 45, coords: '52.52N 13.40E', status: 'STABLE', trend: [40, 35, 50, 45, 60, 55] },
    'TOKYO': { friction: 0.085, latency: 180, coords: '35.67N 139.65E', status: 'CRITICAL', trend: [80, 95, 85, 90, 98, 92] }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const base = data[selection];
      const jitter = (Math.random() * 0.004 - 0.002).toFixed(3);
      setMetrics({
        friction: (base.friction + parseFloat(jitter)).toFixed(3),
        latency: `${base.latency + Math.floor(Math.random() * 5)}MS`
      });
    }, 150);
    return () => clearInterval(interval);
  }, [selection]);

  return (
    <div style={{ height: '100vh', backgroundColor: '#000', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', display: 'grid', gridTemplateColumns: '320px 1fr', overflow: 'hidden' }}>
      <aside style={{ borderRight: '1px solid #111', padding: '40px 30px', display: 'flex', flexDirection: 'column', background: '#050505', zIndex: 10 }}>
        <div style={{ fontSize: '0.6rem', letterSpacing: '4px', opacity: 0.4, marginBottom: '60px' }}>ABLINQ_SYSTEM_V.01</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.keys(data).map(city => (
            <button key={city} onClick={() => setSelection(city)}
              style={{ background: selection === city ? '#fff' : 'transparent', color: selection === city ? '#000' : '#444', border: '1px solid #1a1a1a', padding: '18px', textAlign: 'left', fontWeight: '900', cursor: 'pointer', fontSize: '0.75rem' }}>
              {city} <span style={{ float: 'right', fontSize: '0.6rem', opacity: 0.5 }}>{data[city].status}</span>
            </button>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', borderTop: '1px solid #111', paddingTop: '30px' }}>
          <div style={{ fontSize: '0.5rem', letterSpacing: '2px', color: '#444', marginBottom: '10px' }}>KINETIC_FLOW_STIFFNESS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>0.085</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '40px', marginTop: '20px' }}>
            {data[selection].trend.map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h}%`, background: selection === 'TOKYO' ? '#ff3b30' : '#fff', opacity: i === 5 ? 1 : 0.2 }} />
            ))}
          </div>
        </div>
      </aside>
      <main style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#1a1a1a 1px, transparent 1px)', backgroundSize: '50px 50px', opacity: 0.8 }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', letterSpacing: '12px', color: '#333', marginBottom: '20px' }}>{selection}_CORE</div>
          <div style={{ fontSize: '24vw', fontWeight: '900', lineHeight: 0.7, letterSpacing: '-0.06em', color: selection === 'TOKYO' ? '#ff3b30' : '#fff', fontVariantNumeric: 'tabular-nums' }}>
            {metrics.friction}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '60px', marginTop: '40px' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.6rem', color: '#444' }}>LATENCY</div>
              <div style={{ fontSize: '2vw', fontWeight: '900' }}>{metrics.latency}</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.6rem', color: '#444' }}>COORDINATES</div>
              <div style={{ fontSize: '2vw', fontWeight: '900' }}>{data[selection].coords}</div>
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '4px', background: '#0a0a0a' }}>
          <div style={{ height: '100%', background: selection === 'TOKYO' ? '#ff3b30' : '#fff', width: `${(parseFloat(metrics.friction) / 0.1) * 100}%`, boxShadow: selection === 'TOKYO' ? '0 0 30px #ff3b30' : 'none', transition: 'width 0.1s linear' }} />
        </div>
      </main>
    </div>
  );
};

export default AuditMVP;
