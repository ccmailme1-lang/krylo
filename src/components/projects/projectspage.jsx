// WO-1813 — Projects Page
import React, { useState, useCallback } from 'react';
import { listProjects, saveProject, deleteProject } from '../../engine/projectregistry.js';

const MONO = "'IBM Plex Mono', monospace";
const LIME = '#66FF00';

const LENS_OPTIONS = ['INVESTOR','REALTOR','ATHLETE','SALES','LEGAL','RETIREMENT','GENERAL'];

function fmt(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProjectsPage({ onLoad }) {
  const [tab, setTab]         = useState('projects');
  const [projects, setProjects] = useState(() => listProjects());
  const [name, setName]       = useState('');
  const [lens, setLens]       = useState('GENERAL');
  const [saved, setSaved]     = useState(false);

  const refresh = () => setProjects(listProjects());

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    saveProject(name, { lens });
    setName('');
    setSaved(true);
    setTimeout(() => { setSaved(false); setTab('projects'); refresh(); }, 800);
  }, [name, lens]);

  const handleDelete = (id, e) => {
    e.stopPropagation();
    deleteProject(id);
    refresh();
  };

  const handleLoad = (project) => {
    onLoad?.(project);
  };

  return (
    <div style={{
      position: 'fixed', top: 48, left: 72, right: 0, bottom: 0,
      zIndex: 15, background: '#000', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: 580, fontFamily: MONO }}>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 0 }}>
          {['projects', 'new'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px 0',
                fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em',
                textTransform: 'uppercase',
                background: tab === t ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: tab === t ? '#fff' : 'rgba(255,255,255,0.35)',
                border: 'none', borderBottom: tab === t ? `1px solid ${LIME}` : '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              {t === 'projects' ? 'Projects' : 'New Project'}
            </button>
          ))}
        </div>

        {/* Projects tab */}
        {tab === 'projects' && (
          <div>
            {/* List */}
            <div style={{ minHeight: 260, maxHeight: 260, overflowY: 'auto', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {projects.length === 0 ? (
                <div style={{ padding: '40px 24px', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.14em', textAlign: 'center' }}>
                  NO SAVED PROJECTS
                </div>
              ) : projects.map(p => (
                <div
                  key={p.id}
                  onClick={() => handleLoad(p)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div>
                    <div style={{ fontSize: 10, color: '#fff', letterSpacing: '0.06em', marginBottom: 4 }}>{p.name}</div>
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em' }}>
                      {p.lens} · {fmt(p.createdAt)}
                    </div>
                  </div>
                  <button
                    onClick={e => handleDelete(p.id, e)}
                    style={{
                      background: 'transparent', border: 'none',
                      color: 'rgba(255,80,80,0.4)', fontSize: 14,
                      cursor: 'pointer', lineHeight: 1, padding: '0 4px',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,80,80,0.9)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,80,80,0.4)'}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Explorer strip */}
            <div style={{
              padding: '8px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.22em' }}>STORAGE</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>localStorage · Phase A</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.1em', marginLeft: 'auto' }}>
                {projects.length} / 50
              </span>
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setTab('new')}
                style={{
                  fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em',
                  background: LIME, color: '#000', border: 'none',
                  padding: '8px 20px', cursor: 'pointer',
                }}
              >
                NEW PROJECT
              </button>
            </div>
          </div>
        )}

        {/* New Project tab */}
        {tab === 'new' && (
          <div>
            <div style={{ padding: '24px 20px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

              {/* Project name */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.22em', marginBottom: 6 }}>PROJECT NAME</div>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder="Untitled Project"
                  autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff', padding: '9px 12px', outline: 'none',
                  }}
                />
              </div>

              {/* Lens */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.22em', marginBottom: 6 }}>LENS</div>
                <select
                  value={lens}
                  onChange={e => setLens(e.target.value)}
                  style={{
                    width: '100%', fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff', padding: '9px 12px', outline: 'none', cursor: 'pointer',
                  }}
                >
                  {LENS_OPTIONS.map(o => <option key={o} value={o} style={{ background: '#000' }}>{o}</option>)}
                </select>
              </div>
            </div>

            {/* Explorer strip */}
            <div style={{
              padding: '8px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.22em' }}>STORAGE</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>localStorage · Phase A</span>
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setTab('projects')}
                style={{
                  fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em',
                  background: 'transparent', color: 'rgba(255,255,255,0.35)',
                  border: '1px solid rgba(255,255,255,0.12)', padding: '8px 20px', cursor: 'pointer',
                }}
              >
                CANCEL
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim()}
                style={{
                  fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em',
                  background: saved ? 'rgba(102,255,0,0.2)' : LIME,
                  color: saved ? LIME : '#000',
                  border: saved ? `1px solid ${LIME}` : 'none',
                  padding: '8px 20px', cursor: name.trim() ? 'pointer' : 'not-allowed',
                  opacity: name.trim() ? 1 : 0.4,
                  transition: 'all 200ms',
                }}
              >
                {saved ? 'SAVED ✓' : 'SAVE PROJECT'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
