// Verbatim Claude Design canvas, served from public/claude-design/.
// Loaded inside an iframe so the babel-standalone setup, the design-canvas
// wrapper, and every CSS file render exactly as shipped by Claude Design.

import { useState } from 'react';

type CanvasName = 'cultivation' | 'pipeline';

const CANVASES: { id: CanvasName; label: string; href: string; note: string }[] = [
  { id: 'cultivation', label: 'Cultivation, redesigned', href: '/claude-design/index.html', note: 'COO desk · Bento · Floor plan · Room detail · Floor tablet · Mobile · Handoff' },
  { id: 'pipeline', label: 'Pipeline Rollup', href: '/claude-design/pipeline.html', note: '30/60/90 paired-bar · executive read · revenue at risk' },
];

export function ClaudeDesignCanvas() {
  const [active, setActive] = useState<CanvasName>('cultivation');
  const canvas = CANVASES.find((c) => c.id === active)!;

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
        background: '#0E0E0E',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <span style={{
            fontWeight: 600, fontSize: 12, letterSpacing: '0.18em',
            color: '#F5F4F1',
          }}>CULTIVO</span>
          <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.12)' }} />
          <span style={{
            fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
            fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase',
            color: 'rgba(245,244,241,0.62)',
          }}>Claude Design · canvas</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {CANVASES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActive(c.id)}
              style={{
                fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
                fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase',
                padding: '6px 12px', borderRadius: 3,
                background: active === c.id ? '#E8E0D4' : 'transparent',
                color: active === c.id ? '#0A0A0A' : '#F5F4F1',
                border: '1px solid rgba(255,255,255,0.12)',
                cursor: 'pointer',
              }}
            >
              {c.label}
            </button>
          ))}
          <a
            href={canvas.href}
            target="_blank"
            rel="noreferrer"
            style={{
              fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
              fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase',
              padding: '6px 12px', borderRadius: 3,
              color: 'rgba(245,244,241,0.62)',
              border: '1px solid rgba(255,255,255,0.12)',
              textDecoration: 'none',
              marginLeft: 8,
            }}
          >
            Open in tab ↗
          </a>
        </div>
      </div>
      <div style={{
        padding: '8px 24px',
        fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
        fontSize: 11, letterSpacing: '0.04em',
        color: 'rgba(245,244,241,0.40)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        {canvas.note}
      </div>
      <iframe
        key={canvas.id}
        src={canvas.href}
        title={canvas.label}
        style={{ flex: 1, width: '100%', border: 'none', background: '#1B1A18' }}
      />
    </div>
  );
}
