import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';

/* ─── Mini Canvas Map ─────────────────────────────── */
const NODES = {
  BLR:   { x: 0.22, y: 0.12 },
  CBE:   { x: 0.38, y: 0.52 },
  KOCHI: { x: 0.68, y: 0.44 },
  TVM:   { x: 0.55, y: 0.84 },
};
const EDGES = [
  ['BLR', 'KOCHI'], ['KOCHI', 'TVM'],
  ['BLR', 'CBE'],   ['CBE', 'TVM'],
];

function RouteMap({ threatened }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '240px', background: '#111113', borderRadius: '8px', overflow: 'hidden', border: '1px solid #27272A' }}>
      <svg width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
        {EDGES.map(function ([a, b], i) {
          const fromNode = NODES[a]; const toNode = NODES[b];
          const isKochi = a === 'KOCHI' || b === 'KOCHI';
          const stroke = threatened && isKochi ? '#F87171' : '#34D399';
          const opacity = threatened && isKochi ? 0.3 : 0.5;
          return <line key={i} x1={fromNode.x} y1={fromNode.y} x2={toNode.x} y2={toNode.y} stroke={stroke} strokeWidth="0.004" opacity={opacity} strokeDasharray={threatened && isKochi ? '0.02 0.01' : 'none'} style={{ transition: 'all 0.8s' }} />;
        })}
      </svg>
      {Object.entries(NODES).map(function ([id, pos]) {
        const isBlocked = threatened && id === 'KOCHI';
        return (
          <div key={id} style={{ position: 'absolute', left: pos.x * 100 + '%', top: pos.y * 100 + '%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isBlocked ? '#F87171' : '#34D399', boxShadow: `0 0 0 3px ${isBlocked ? 'rgba(248,113,113,0.15)' : 'rgba(52,211,153,0.15)'}`, transition: 'all 0.8s' }} />
            <span className="mono" style={{ fontSize: '9px', letterSpacing: '0.08em', color: isBlocked ? '#F87171' : '#52525B', transition: 'color 0.8s' }}>{id}{isBlocked ? ' ✕' : ''}</span>
          </div>
        );
      })}
      <div className="mono" style={{ position: 'absolute', bottom: '12px', left: '16px', fontSize: '10px', color: '#3F3F46', letterSpacing: '0.08em' }}>
        {threatened ? 'ROUTE COMPROMISED · VIA COIMBATORE' : 'ACTIVE · BLR → KOCHI → TVM'}
      </div>
      <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: threatened ? '#F87171' : '#34D399', animation: 'pulse 2s infinite' }} />
        <span className="mono" style={{ fontSize: '9px', color: threatened ? '#F87171' : '#34D399', letterSpacing: '0.1em' }}>{threatened ? 'ALERT' : 'LIVE'}</span>
      </div>
    </div>
  );
}

/* ─── Origin Dashboard ─────────────────────────────── */
function OriginDashboard() {
  const rootRef = useRef(null);
  const [threatText, setThreatText]   = useState('');
  const [loading, setLoading]         = useState(false);
  const [threatened, setThreatened]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [logs, setLogs] = useState([
    { t: '08:32', msg: 'Carrier TRK-009 departed Bangalore hub' },
    { t: '09:11', msg: 'ETA update — Kochi arrival 14:00' },
    { t: '09:45', msg: 'Node KOCHI inventory sync complete' },
  ]);

  useEffect(function () {
    const ctx = gsap.context(function () {
      gsap.from('.g-h1', { opacity: 0, y: 24, duration: 0.7, ease: 'power3.out' });
      gsap.from('.g-stats > *', { opacity: 0, y: 16, stagger: 0.08, delay: 0.3, duration: 0.5 });
      gsap.from('.g-section', { opacity: 0, y: 20, stagger: 0.1, delay: 0.5, duration: 0.55 });
    }, rootRef);
    return function () { ctx.revert(); };
  }, []);

  function handleSimulate() {
    if (!threatText.trim() || loading) return;
    setLoading(true);
    const newLog = { t: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }), msg: `Threat submitted: "${threatText}"` };
    setLogs(function (prev) { return [newLog, ...prev]; });

    fetch('/api/threat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ threat: threatText }) })
      .catch(function () {})
      .finally(function () {
        setLoading(false);
        setThreatened(true);
        setSubmitted(true);
        setThreatText('');
        setTimeout(function () { setSubmitted(false); }, 4000);
      });
  }

  function handleKeyDown(e) { if (e.key === 'Enter') handleSimulate(); }

  const metrics = [
    { label: 'Carriers Active', val: '3',                 color: '#FAFAFA' },
    { label: 'Route Integrity', val: threatened ? '67%' : '100%', color: threatened ? '#FBBF24' : '#34D399' },
    { label: 'AI Alerts',       val: threatened ? '1' : '0',      color: threatened ? '#F87171' : '#52525B' },
  ];

  return (
    <div ref={rootRef} style={{ background: '#09090B', minHeight: 'calc(100vh - 49px)', padding: '48px' }}>

      {/* Heading row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '48px' }}>
        <div>
          <p className="g-h1 mono" style={{ fontSize: '11px', color: '#3F3F46', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>Origin Hub</p>
          <h1 className="g-h1" style={{ fontSize: '40px', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: '#FAFAFA' }}>Supply Chain Control</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: threatened ? '#F87171' : '#34D399' }} />
          <span className="mono" style={{ fontSize: '11px', color: threatened ? '#F87171' : '#34D399', letterSpacing: '0.1em' }}>{threatened ? 'THREAT ACTIVE' : 'ALL CLEAR'}</span>
        </div>
      </div>

      {/* Metrics row */}
      <div className="g-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: '#27272A', marginBottom: '48px', borderTop: '1px solid #27272A', borderBottom: '1px solid #27272A' }}>
        {metrics.map(function (m) {
          return (
            <div key={m.label} style={{ padding: '28px 0', background: '#09090B' }}>
              <div className="mono" style={{ fontSize: '11px', color: '#3F3F46', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>{m.label}</div>
              <div style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'DM Mono, monospace', color: m.color, letterSpacing: '-0.04em', lineHeight: 1, transition: 'color 0.6s' }}>{m.val}</div>
            </div>
          );
        })}
      </div>

      {/* Map + Threat input row */}
      <div className="g-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '48px' }}>

        {/* Map */}
        <div>
          <p className="mono" style={{ fontSize: '11px', color: '#3F3F46', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>Live Route Map</p>
          <RouteMap threatened={threatened} />
        </div>

        {/* Threat input */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <p className="mono" style={{ fontSize: '11px', color: '#3F3F46', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>Threat Intelligence</p>
            <textarea
              value={threatText}
              onChange={function (e) { setThreatText(e.target.value); }}
              onKeyDown={handleKeyDown}
              placeholder={'e.g. "Heavy flooding in Kochi port area"'}
              rows={5}
              style={{
                width: '100%', background: '#111113', border: '1px solid #27272A', borderRadius: '6px',
                color: '#FAFAFA', fontSize: '14px', fontFamily: 'DM Mono, monospace',
                padding: '16px', resize: 'none', outline: 'none', lineHeight: 1.6,
                transition: 'border-color 0.15s',
              }}
              onFocus={function (e) { e.target.style.borderColor = '#52525B'; }}
              onBlur={function (e) { e.target.style.borderColor = '#27272A'; }}
            />

            <AnimatePresence>
              {submitted && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mono" style={{ fontSize: '12px', color: '#34D399', marginTop: '10px', letterSpacing: '0.06em' }}
                >
                  ✓ REPORT SENT — AI PROCESSING
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleSimulate}
            disabled={loading || !threatText.trim()}
            style={{
              marginTop: '16px', width: '100%', padding: '14px',
              background: threatened ? 'transparent' : '#FAFAFA',
              border: `1px solid ${threatened ? '#F87171' : '#FAFAFA'}`,
              borderRadius: '6px', color: threatened ? '#F87171' : '#09090B',
              fontSize: '14px', fontWeight: 600, cursor: loading || !threatText.trim() ? 'not-allowed' : 'pointer',
              opacity: !threatText.trim() ? 0.35 : 1, fontFamily: 'Space Grotesk, sans-serif',
              letterSpacing: '-0.01em', transition: 'all 0.2s',
            }}
          >
            {loading ? 'Sending to AI…' : 'Simulate Threat →'}
          </button>
        </div>
      </div>

      {/* Log */}
      <div className="g-section" style={{ borderTop: '1px solid #27272A', paddingTop: '32px' }}>
        <p className="mono" style={{ fontSize: '11px', color: '#3F3F46', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '20px' }}>Event Log</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {logs.map(function (log, i) {
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', gap: '24px', alignItems: 'baseline' }}>
                <span className="mono" style={{ fontSize: '12px', color: '#3F3F46', minWidth: '40px' }}>{log.t}</span>
                <span style={{ fontSize: '14px', color: '#71717A' }}>{log.msg}</span>
              </motion.div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

export default OriginDashboard;
