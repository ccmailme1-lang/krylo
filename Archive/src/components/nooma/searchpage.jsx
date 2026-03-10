import React, { useState, useMemo, useRef, useEffect } from 'react';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const scrollRef = useRef(null);

  const domains = [
    { name: 'AUSTIN_CORE', friction: '0.012', latency: '12MS' },
    { name: 'BERLIN_NODE', friction: '0.045', latency: '45MS' },
    { name: 'TOKYO_VOID', friction: '0.085', latency: '180MS' },
    { name: 'LONDON_EDGE', friction: '0.022', latency: '24MS' },
    { name: 'NYC_PRIMARY', friction: '0.031', latency: '30MS' }
  ];

  const filtered = useMemo(() => 
    domains.filter(d => d.name.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      if (Math.abs(e.deltaY) < 1) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [filtered]);

  return (
    <div style={{ backgroundColor: '#000', height: '100vh', width: '100vw', overflow: 'hidden', color: '#fff', fontFamily: '"Helvetica Neue", Arial, sans-serif' }}>
      <div style={{ position: 'fixed', top: '80px', left: '80px', zIndex: 100 }}>
        <input 
          autoFocus
          placeholder="Search truth..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            background: 'transparent', border: 'none',
            fontSize: '18px', fontWeight: '300', color: '#fff', outline: 'none',
            letterSpacing: '0.1em', opacity: 0.5,
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}
        />
      </div>
      <div ref={scrollRef} style={{ display: 'flex', overflowX: 'auto', height: '100vh', alignItems: 'center', scrollbarWidth: 'none' }}>
        {filtered.map((item, i) => (
          <div key={i} style={{ minWidth: '60vw', padding: '0 10vw', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '10px', letterSpacing: '8px', color: '#222', marginBottom: '20px' }}>NODE_{i + 1}</div>
            <div style={{ fontSize: '8vw', fontWeight: '200', letterSpacing: '-0.02em', color: '#fff', marginBottom: '10px' }}>{item.name}</div>
            <div style={{ fontSize: '20px', fontWeight: '100', color: '#444' }}>{item.friction}μ <span style={{ margin: '0 20px', opacity: 0.1 }}>/</span> {item.latency}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchPage;
