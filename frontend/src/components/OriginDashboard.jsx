import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { AlertTriangle, Truck, Shield, Radio } from 'lucide-react';
import Layout, { Card, StatCard, SectionLabel } from './Layout';

const NODES = {
  BLR:   { x: 0.20, y: 0.12 },
  CBE:   { x: 0.36, y: 0.54 },
  KOCHI: { x: 0.70, y: 0.44 },
  TVM:   { x: 0.54, y: 0.84 },
};
const EDGES = [['BLR','KOCHI'],['KOCHI','TVM'],['BLR','CBE'],['CBE','TVM']];

function RouteMap({ threatened }) {
  return (
    <div style={{ position: 'relative', height: '220px', background: '#F9F8F4', borderRadius: '8px', border: '1px solid #E5E4DE', overflow: 'hidden' }}>
      <svg width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
        {EDGES.map(function ([a, b], i) {
          const f = NODES[a]; const t = NODES[b];
          const isKochi = a === 'KOCHI' || b === 'KOCHI';
          const stroke = threatened && isKochi ? '#EF4444' : '#10B981';
          return <line key={i} x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke={stroke} strokeWidth="0.004" opacity={threatened && isKochi ? 0.35 : 0.6} strokeDasharray={threatened && isKochi ? '0.025 0.012' : '0'} style={{ transition: 'all 0.8s' }} />;
        })}
      </svg>
      {Object.entries(NODES).map(function ([id, pos]) {
        const blocked = threatened && id === 'KOCHI';
        return (
          <div key={id} style={{ position: 'absolute', left: pos.x * 100 + '%', top: pos.y * 100 + '%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: blocked ? '#EF4444' : '#10B981', boxShadow: `0 0 0 4px ${blocked ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}`, transition: 'all 0.8s' }} />
            <span className="mono" style={{ fontSize: '9px', letterSpacing: '0.08em', color: blocked ? '#EF4444' : '#9CA3AF', transition: 'color 0.8s', fontWeight: 600 }}>{id}{blocked ? ' ✕' : ''}</span>
          </div>
        );
      })}
      <div className="mono" style={{ position: 'absolute', bottom: '10px', left: '14px', fontSize: '10px', color: '#9CA3AF' }}>
        {threatened ? '⚠ ROUTE COMPROMISED · VIA COIMBATORE' : '● BLR → KOCHI → TVM'}
      </div>
    </div>
  );
}

function OriginDashboard() {
  const contentRef = useRef(null);
  const [threatText, setThreatText] = useState('');
  const [loading, setLoading]       = useState(false);
  const [threatened, setThreatened] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [logs, setLogs] = useState([
    { t: '08:32', msg: 'Carrier TRK-009 departed Bangalore hub' },
    { t: '09:11', msg: 'ETA update — Kochi arrival 14:00' },
    { t: '09:45', msg: 'Node KOCHI-01 inventory sync complete' },
  ]);

  useEffect(function () {
    const ctx = gsap.context(function () {
      gsap.from('.g-stat', { opacity: 0, y: 14, stagger: 0.07, duration: 0.5, ease: 'power2.out' });
      gsap.from('.g-card', { opacity: 0, y: 16, stagger: 0.08, delay: 0.2, duration: 0.5 });
    }, contentRef);
    return function () { ctx.revert(); };
  }, []);

  // Restore threat state from server on mount (so navigation away/back doesn't reset UI)
  useEffect(function () {
    fetch('/api/route')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.status === 'rerouted') {
          setThreatened(true);
        }
      })
      .catch(function () {});
  }, []);

  function handleSimulate() {
    if (!threatText.trim() || loading) return;
    setLoading(true);
    const t = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    setLogs(function (prev) { return [{ t, msg: `Threat submitted: "${threatText}"` }, ...prev]; });
    fetch('/api/threat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: threatText }) })
      .catch(function () {})
      .finally(function () {
        setLoading(false); setThreatened(true); setSubmitted(true); setThreatText('');
        setTimeout(function () { setSubmitted(false); }, 4000);
      });
  }

  function handleKeyDown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSimulate(); } }

  const stats = [
    { label: 'Carriers Active', value: '3',                              sub: 'vehicles en route',   accent: '#3B82F6', icon: Truck },
    { label: 'Route Integrity', value: threatened ? '67%' : '100%',      sub: threatened ? 'degraded' : 'nominal', accent: threatened ? '#F59E0B' : '#10B981', icon: Shield },
    { label: 'AI Alerts',       value: threatened ? '1' : '0',           sub: threatened ? '1 critical' : 'none pending', accent: threatened ? '#EF4444' : '#9CA3AF', icon: AlertTriangle },
    { label: 'Nodes Online',    value: threatened ? '3 / 4' : '4 / 4',   sub: 'connected',           accent: threatened ? '#F59E0B' : '#10B981', icon: Radio },
  ];

  return (
    <Layout title="Supply Chain Overview" status={threatened ? 'THREAT ACTIVE' : 'ALL CLEAR'} statusOk={!threatened}>
      <div ref={contentRef}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {stats.map(function (s) {
            return <div key={s.label} className="g-stat"><StatCard {...s} /></div>;
          })}
        </div>

        {/* Middle row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '14px', marginBottom: '14px' }}>

          {/* Map card */}
          <Card className="g-card">
            <SectionLabel>Live Route Map</SectionLabel>
            <RouteMap threatened={threatened} />
          </Card>

          {/* Threat input card */}
          <Card className="g-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <SectionLabel>Threat Intelligence</SectionLabel>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px' }}>Input an environmental or logistics threat to trigger AI rerouting.</p>
            <textarea
              value={threatText}
              onChange={function (e) { setThreatText(e.target.value); }}
              onKeyDown={handleKeyDown}
              placeholder='e.g. "Heavy flooding in Kochi port area"'
              rows={5}
              style={{ flex: 1, width: '100%', background: '#F9F8F4', border: '1px solid #E5E4DE', borderRadius: '8px', color: '#111827', fontSize: '13px', fontFamily: 'DM Mono, monospace', padding: '12px', resize: 'none', outline: 'none', transition: 'border-color 0.15s', marginBottom: '12px' }}
              onFocus={function (e) { e.target.style.borderColor = '#10B981'; }}
              onBlur={function (e) { e.target.style.borderColor = '#E5E4DE'; }}
            />
            <AnimatePresence>
              {submitted && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mono" style={{ fontSize: '11px', color: '#10B981', marginBottom: '10px', letterSpacing: '0.06em' }}>
                  ✓ REPORT SENT — AI PROCESSING
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={handleSimulate}
              disabled={loading || !threatText.trim()}
              style={{ width: '100%', padding: '11px', background: threatened ? '#EF4444' : '#111827', border: 'none', borderRadius: '8px', color: '#FAFAFA', fontSize: '13px', fontWeight: 600, cursor: loading || !threatText.trim() ? 'not-allowed' : 'pointer', opacity: !threatText.trim() ? 0.4 : 1, fontFamily: 'Space Grotesk, sans-serif', transition: 'all 0.2s' }}
            >
              {loading ? 'Sending…' : 'Simulate Threat →'}
            </button>
          </Card>
        </div>

        {/* Event log card */}
        <Card className="g-card">
          <SectionLabel>Event Log</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {logs.map(function (log, i) {
              return (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ display: 'flex', gap: '20px', alignItems: 'baseline', padding: '8px 0', borderBottom: i < logs.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                  <span className="mono" style={{ fontSize: '11px', color: '#9CA3AF', minWidth: '38px' }}>{log.t}</span>
                  <span style={{ fontSize: '13px', color: '#6B7280' }}>{log.msg}</span>
                </motion.div>
              );
            })}
          </div>
        </Card>

      </div>
    </Layout>
  );
}

export default OriginDashboard;
