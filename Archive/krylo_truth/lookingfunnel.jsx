import React, { useRef, useEffect } from 'react';

const CRAWL_PHRASES = [
  "Nobody talks about money with family",
  "We all saw it but said nothing",
  "The promotion went to the wrong person",
  "Everyone knows the relationship is over",
  "We pretend the system works",
  "Nobody asks how you're really doing",
  "The meeting could have been an email",
  "We all know who's carrying the team",
  "Nobody admits they're faking confidence",
  "The grief doesn't go away after the funeral",
];

export default function LookingFunnel({ isReceding, onSubmit }) {
  const crawlRef = useRef(null);

  useEffect(() => {
    function setSmoothSpeed() {
      if (!crawlRef.current) return;
      const h = crawlRef.current.scrollHeight / 2;
      crawlRef.current.style.animationDuration = (h / 40) + 's';
    }
    setSmoothSpeed();
    window.addEventListener('resize', setSmoothSpeed);
    return () => window.removeEventListener('resize', setSmoothSpeed);
  }, []);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && e.target.value.trim()) {
      onSubmit(e.target.value.trim());
    }
  }

  // Duplicate phrases for seamless loop (same as source)
  const allPhrases = [...CRAWL_PHRASES, ...CRAWL_PHRASES];

  return (
    <div className={`looking-funnel${isReceding ? ' recede' : ''}`}>
      <a className="auth-link">Sign in</a>
      <div className="logo">KRYLO</div>
      <div className="scroll-container">
        <div className="crawl-track" ref={crawlRef}>
          {allPhrases.map((phrase, i) => (
            <div className="crawl-phrase" key={i}>{phrase}</div>
          ))}
        </div>
      </div>
      <div className="search-container">
        <input
          type="text"
          className="search-box"
          placeholder="Go ahead. Ask it."
          autoComplete="off"
          spellCheck="false"
          onKeyDown={handleKeyDown}
        />
        <div className="search-hint">Thinking silence out loud</div>
      </div>
    </div>
  );
}
