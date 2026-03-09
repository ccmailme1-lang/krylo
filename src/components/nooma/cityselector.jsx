import React, { useState, useEffect } from 'react';

const CitySelector = () => {
  const [selection, setSelection] = useState('');
  const [log, setLog] = useState([]);
  const physics = { stiffness: 0.085, mass: 200 };
  
  const auditData = {
    'AUSTIN': { friction: '0.012', latency: '12ms', health: 98, code: 'TX-01' },
    'BERLIN': { friction: '0.045', latency: '45ms', health: 82, code: 'DE-02' },
    'TOKYO': { friction: '0.085', latency: '180ms', health: 34, code: 'JP-03' }
  };

  // THE TRACKING LISTENER (Golden Nugget)
  useEffect(() => {
    if (selection) {
      const entry = {
        time: new Date().toLocaleTimeString(),
        domain: selection,
        friction: auditData[selection].friction,
        status: auditData[selection].health < 50 ? 'CRITICAL' : 'NOMINAL'
      };
      setLog(prev => [entry, ...prev].slice(0, 8)); // Keep last 8 for flow
    }
  }, [selection]);

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#000', color: '#fff', fontFamily: '"Courier New", monospace' }}>
      
      {/* SIDEBAR: THE FRICTION RECORD */}
      <aside style={{ width: '300px', borderRight: '1px solid #333', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '0.8rem', letterSpacing: '2px', color: '#666', marginBottom: '20px' }}>FRICTION_RECORD</h2>
        <div style={{ flex: 1, overflowY: 'hidden', fontSize: '0.7rem' }}>
          {log.length === 0 && <p style={{ opacity: 0.3 }}>[ AWAITING_EVENTS ]</p>}
          {log.map((entry, i) => (
            <div key={i} style={{ marginBottom: '15px', borderLeft: `2px solid ${entry.status === 'CRITICAL' ? 'red' : '#00ff00'}`, paddingLeft: '10px' }}>
              <div style={{ opacity: 0.5 }}>{entry.time}</div>
              <div style={{ fontWeight: 'bold' }}>{entry.domain} : {entry.friction}μ</div>
              <div style={{ color: entry.status === 'CRITICAL' ? 'red' : '#00ff00' }}>{entry.status}</div>
            </div>
          ))}
        </div>
        <div style={{ paddingTop: '20px', borderTop: '1px solid #333', fontSize: '0.6rem', opacity: 0.4 }}>
          SYSTEM_ID: ABLINQ_TRUTH_ENGINE_01
        </div>
      </aside>

      {/* MAIN: THE AUDIT DESK */}
      <main style={{ flex: 1, padding: '40px', backgroundColor: '#0a0a0a', position: 'relative' }}>
        <header style={{ marginBottom: '60px' }}>
          <div style={{ fontSize: '0.7rem', color: '#ff0000', fontWeight: 'bold' }}>// KINETIC_ALIGNMENT_VERIFIED</div>
          <h1 style={{ fontSize: '3rem', margin: '10px 0', letterSpacing: '-2px' }}>AUDIT_DESK</h1>
          <div style={{ display: 'flex', gap: '30px', opacity: 0.6, fontSize: '0.8rem' }}>
            <span>STIFFNESS: {physics.stiffness}</span>
            <span>MASS: {physics.mass}LB</span>
            <span>ENGINE: V3_FLASH</span>
          </div>
        </header>

        <section>
          <div style={{ display: 'flex', gap: '2px', background: '#333', padding: '2px', marginBottom: '40px' }}>
            {Object.keys(auditData).map(city => (
              <button 
                key={city} 
                onClick={() => setSelection(city)}
                style={{
                  flex: 1, padding: '20px', border: 'none', cursor: 'pointer',
                  background: selection === city ? '#fff' : '#111',
                  color: selection === city ? '#000' : '#fff',
                  fontWeight: 'bold', textTransform: 'uppercase'
                }}
              >
                {city}
              </button>
            ))}
          </div>

          {selection ? (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px' }}>
              {/* BIG METRIC */}
              <div style={{ border: '1px solid #333', padding: '40px', background: '#111' }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '20px' }}>FRICTION_COEFFICIENT_ANALYSIS</div>
                <div style={{ fontSize: '5rem', fontWeight: 'bold' }}>{auditData[selection].friction}</div>
                <div style={{ marginTop: '20px', height: '10px', background: '#333', position: 'relative' }}>
                  <div style={{ 
                    position: 'absolute', height: '100%', background: selection === 'TOKYO' ? 'red' : '#00ff00',
                    width: `${(parseFloat(auditData[selection].friction) / 0.1) * 100}%`,
                    transition: 'width 0.5s ease-out'
                  }} />
                </div>
              </div>

              {/* STATS COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ border: '1px solid #333', padding: '20px', background: '#111' }}>
                  <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>LATENCY_WEIGHT</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{auditData[selection].latency}</div>
                </div>
                <div style={{ border: '1px solid #333', padding: '20px', background: '#111' }}>
                  <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>DOMAIN_HEALTH</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: auditData[selection].health < 50 ? 'red' : '#00ff00' }}>
                    {auditData[selection].health}%
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ height: '300px', border: '1px dashed #333', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
              SELECT DOMAIN TO INITIATE TRUTH ENGINE
            </div>
          )}
        </section>

        {/* FOOTER TICKER */}
        <div style={{ position: 'absolute', bottom: '40px', left: '40px', right: '40px', borderTop: '1px solid #333', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
          <span>STATUS: {selection ? 'ACTIVE_AUDIT' : 'IDLE'}</span>
          <span style={{ color: selection === 'TOKYO' ? 'red' : 'inherit' }}>
            {selection === 'TOKYO' ? 'CRITICAL_FRICTION_ALARM: MASS_STIFFNESS_MISMATCH' : 'SYSTEM_NOMINAL'}
          </span>
          <span>© 2026 ABLINQ // NOOMA</span>
        </div>
      </main>
    </div>
  );
};

export default CitySelector;
