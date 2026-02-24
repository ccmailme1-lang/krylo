import React, { useState } from 'react';
// Strictly lowercase paths to match your folder structure
import CitySelector from './components/nooma/cityselector';
import AblinqAuditDesk from './components/ablinq/ablinqauditdesk';

function App() {
  const [mode, setMode] = useState('vision');

  return (
    <div style={{ 
      backgroundColor: 'black', 
      color: 'white', 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden' 
    }}>
      
      {/* GLOBAL TRUTH ENGINE NAV */}
      <nav style={{ 
        padding: '1.5rem', 
        borderBottom: '1px solid #222', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: 'monospace',
        fontSize: '0.8rem',
        letterSpacing: '1px',
        zIndex: 1000, 
        backgroundColor: 'black'
      }}>
        <div style={{ fontWeight: 'bold' }}>KRYLO // {mode.toUpperCase()}</div>
        
        <div style={{ display: 'flex', gap: '20px' }}>
          <button 
            onClick={() => setMode('vision')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'white', 
              cursor: 'pointer',
              opacity: mode === 'vision' ? 1 : 0.3,
              textDecoration: mode === 'vision' ? 'underline' : 'none',
              fontFamily: 'monospace'
            }}
          >
            [ VISION_MODE ]
          </button>
          
          <button 
            onClick={() => setMode('audit')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'white', 
              cursor: 'pointer',
              opacity: mode === 'audit' ? 1 : 0.3,
              textDecoration: mode === 'audit' ? 'underline' : 'none',
              fontFamily: 'monospace'
            }}
          >
            [ AUDIT_DESK ]
          </button>
        </div>
      </nav>

      {/* VIEWPORT AREA */}
      <main style={{ flexGrow: 1, position: 'relative', width: '100%' }}>
        {mode === 'vision' ? (
          <CitySelector />
        ) : (
          <AblinqAuditDesk />
        )}
      </main>

    </div>
  );
}

export default App;