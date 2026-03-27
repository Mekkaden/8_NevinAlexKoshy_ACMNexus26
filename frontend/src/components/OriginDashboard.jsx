import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import gsap from 'gsap';
import { AlertTriangle, Truck, Shield, Radio, RotateCcw } from 'lucide-react';
import Layout, { Card, StatCard, SectionLabel } from './Layout';
import { normalizeNode, normalizePath } from '../nodeUtils';

/* ─── Node positions (normalised 0-1) ────────────────────────────── */
const NODE_POS = {
  BLR:   { x: 0.20, y: 0.12 },
  CBE:   { x: 0.36, y: 0.54 },
  COK:   { x: 0.70, y: 0.44 },
  KOCHI: { x: 0.70, y: 0.44 }, // alias
  TVM:   { x: 0.54, y: 0.84 },
};

/* All possible edges in the graph */
const ALL_EDGES = [
  ['BLR', 'COK'],
  ['COK', 'TVM'],
  ['BLR', 'CBE'],
  ['CBE', 'TVM'],
];

/* Build a set of "active" edge keys from the current path */
function buildActiveEdgeSet(path) {
  const set = new Set();
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    set.add(`${a}-${b}`);
    set.add(`${b}-${a}`);
  }
  return set;
}

/* ─── Route Map ──────────────────────────────────────────────────── */
function RouteMap({ activePath, blockedNode }) {
  const activeEdges = buildActiveEdgeSet(activePath || []);
  const rerouted = activePath && activePath.some(n => n === 'CBE' || n === 'Coimbatore');
  const label = rerouted
    ? `⚠ ROUTE COMPROMISED · VIA COIMBATORE`
    : `● ${(activePath || []).join(' → ')}`;

  return (
    <div style={{ position: 'relative', height: '220px', background: '#F9F8F4', borderRadius: '8px', border: '1px solid #E5E4DE', overflow: 'hidden' }}>
      <svg width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
        {ALL_EDGES.map(function ([a, b], i) {
          const f = NODE_POS[a];
          const t = NODE_POS[b];
          if (!f || !t) return null;
          const isActive = activeEdges.has(`${a}-${b}`);
          const isBlocked = blockedNode && (a === blockedNode || b === blockedNode);
          const stroke = isBlocked ? '#EF4444' : isActive ? '#10B981' : '#D1D5DB';
          const opacity = isBlocked ? 0.35 : isActive ? 0.7 : 0.3;
          return (
            <line key={i}
              x1={f.x} y1={f.y} x2={t.x} y2={t.y}
              stroke={stroke}
              strokeWidth="0.005"
              opacity={opacity}
              strokeDasharray={isBlocked ? '0.025 0.012' : '0'}
              style={{ transition: 'all 0.8s' }}
            />
          );
        })}
      </svg>
      {Object.entries(NODE_POS).filter(([id]) => id !== 'KOCHI').map(function ([id, pos]) {
        const isBlocked = blockedNode === id;
        const isActive = activePath && activePath.includes(id);
        const dotColor = isBlocked ? '#EF4444' : isActive ? '#10B981' : '#D1D5DB';
        return (
          <div key={id} style={{ position: 'absolute', left: pos.x * 100 + '%', top: pos.y * 100 + '%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: dotColor, boxShadow: `0 0 0 4px ${dotColor}26`, transition: 'all 0.8s' }} />
            <span className="mono" style={{ fontSize: '9px', letterSpacing: '0.08em', color: isBlocked ? '#EF4444' : '#9CA3AF', transition: 'color 0.8s', fontWeight: 600 }}>
              {id}{isBlocked ? ' ✕' : ''}
            </span>
          </div>
        );
      })}
      <div className="mono" style={{ position: 'absolute', bottom: '10px', left: '14px', fontSize: '10px', color: '#9CA3AF' }}>
        {label}
      </div>
    </div>
  );
}


/* ─── Origin Dashboard ───────────────────────────────────────────── */
function OriginDashboard() {
  const contentRef = useRef(null);
  const [threatText, setThreatText]   = useState('');
  const [loading, setLoading]         = useState(false);
  const [threatened, setThreatened]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [resetting, setResetting]     = useState(false);
  const [blockedNode, setBlockedNode] = useState(null);

  // Live data from backend
  const [activePath, setActivePath]         = useState(['BLR', 'COK', 'TVM']);
  const [carriersActive, setCarriersActive] = useState(0);
  const [nodesOnline, setNodesOnline]       = useState(0);
  const [totalNodes, setTotalNodes]         = useState(0);
  const [threatCount, setThreatCount]       = useState(0);

  const [logs, setLogs] = useState([]);

  function addLog(msg) {
    const t = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    setLogs(prev => [{ t, msg }, ...prev.slice(0, 11)]);
  }

  // Helper to hydrate state from full backend snapshot
  function hydrateFromState(data) {
    if (data.currentRoute && data.currentRoute.path) {
      // Normalize path to short codes (BLR, COK, CBE, TVM)
      const normalizedPath = normalizePath(data.currentRoute.path);
      setActivePath(normalizedPath);
      const isRerouted = data.currentRoute.status === 'rerouted';
      setThreatened(isRerouted);
      if (!isRerouted) {
        setBlockedNode(null);
      } else if (data.threats && data.threats.length > 0) {
        // Derive blocked node from threats history and normalize to code
        const lastThreat = data.threats[data.threats.length - 1];
        setBlockedNode(normalizeNode(lastThreat.city));
      }
    }
    if (data.active_shipments) setCarriersActive(data.active_shipments.filter(s => s.status === 'in_transit').length);
    if (data.nodes) {
      const online = data.nodes.filter(n => n.status === 'active').length;
      setNodesOnline(online);
      setTotalNodes(data.nodes.length);
    }
    if (data.threats) setThreatCount(data.threats.length);
  }

  // Fetch full state on mount
  useEffect(function () {
    fetch('/api/state')
      .then(r => r.json())
      .then(data => {
        hydrateFromState(data);
        // Populate event log from existing threats
        if (data.threats && data.threats.length > 0) {
          const existingLogs = data.threats.map(th => ({
            t: new Date(th.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
            msg: `Threat detected: ${th.city} — ${th.action}`
          }));
          setLogs(existingLogs);
        } else {
          addLog('System online · Monitoring active');
        }
      })
      .catch(() => addLog('System online · Monitoring active'));
  }, []);

  // Socket.io for live updates
  useEffect(function () {
    const socket = io('http://localhost:3001', { transports: ['websocket', 'polling'] });

    socket.on('state_updated', function (data) {
      hydrateFromState(data);
    });

    socket.on('route_updated', function (d) {
      // Normalize blockedNode from full name to code (e.g. "Kochi" → "COK")
      if (d.blockedNode) setBlockedNode(normalizeNode(d.blockedNode));
      const newPathStr = normalizePath(d.newPath || []).join(' → ');
      addLog(`⚠ REROUTED — ${d.blockedNode} blocked · New path: ${newPathStr}`);
      setThreatened(true);
    });

    socket.on('route_reset', function () {
      setThreatened(false);
      setBlockedNode(null);
      setActivePath(['BLR', 'COK', 'TVM']);
      setThreatCount(0);
      addLog('✓ Route reset to default · BLR → COK → TVM');
    });

    return () => socket.disconnect();
  }, []);

  // GSAP entrance animations
  useEffect(function () {
    const ctx = gsap.context(function () {
      gsap.from('.g-stat', { opacity: 0, y: 14, stagger: 0.07, duration: 0.5, ease: 'power2.out' });
      gsap.from('.g-card', { opacity: 0, y: 16, stagger: 0.08, delay: 0.2, duration: 0.5 });
    }, contentRef);
    return () => ctx.revert();
  }, []);

  async function handleSimulate() {
    if (!threatText.trim() || loading) return;
    setLoading(true);
    setSubmitError('');
    addLog(`Threat submitted: "${threatText}"`);

    try {
      const res = await fetch('/api/threat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: threatText }),
      });
      const data = await res.json();

      if (data.routeResult && data.routeResult.rerouted) {
        setThreatened(true);
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 4000);
      } else if (data.message && !data.routeResult?.rerouted) {
        // AI found no actionable threat
        setSubmitError(data.aiResult?.reason || 'No actionable threat detected.');
        setTimeout(() => setSubmitError(''), 5000);
      }
    } catch {
      setSubmitError('Failed to reach server. Is the backend running?');
      setTimeout(() => setSubmitError(''), 5000);
    } finally {
      setLoading(false);
      setThreatText('');
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      await fetch('/api/reset', { method: 'POST' });
    } catch { /* ignore */ } finally {
      setResetting(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSimulate(); }
  }

  const routeIntegrity = threatened ? `${Math.round((1 - threatCount / totalNodes) * 100)}%` : '100%';

  const stats = [
    { label: 'Carriers Active',  value: String(carriersActive || 0),              sub: 'vehicles en route',                     accent: '#3B82F6', icon: Truck },
    { label: 'Route Integrity',  value: threatened ? routeIntegrity : '100%',      sub: threatened ? 'degraded' : 'nominal',      accent: threatened ? '#F59E0B' : '#10B981', icon: Shield },
    { label: 'AI Alerts',        value: String(threatCount),                        sub: threatCount ? `${threatCount} critical` : 'none pending', accent: threatCount ? '#EF4444' : '#9CA3AF', icon: AlertTriangle },
    { label: 'Nodes Online',     value: totalNodes ? `${nodesOnline} / ${totalNodes}` : '— / —', sub: 'connected', accent: threatened ? '#F59E0B' : '#10B981', icon: Radio },
  ];

  return (
    <Layout title="Supply Chain Overview" status={threatened ? 'THREAT ACTIVE' : 'ALL CLEAR'} statusOk={!threatened}>
      <div ref={contentRef}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {stats.map(s => <div key={s.label} className="g-stat"><StatCard {...s} /></div>)}
        </div>

        {/* Middle row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '14px', marginBottom: '14px' }}>

          {/* Map card */}
          <Card className="g-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <SectionLabel>Live Route Map</SectionLabel>
              {threatened && (
                <button onClick={handleReset} disabled={resetting}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'transparent', border: '1px solid #E5E4DE', borderRadius: '8px', color: '#6B7280', fontSize: '11px', fontWeight: 600, cursor: resetting ? 'not-allowed' : 'pointer', fontFamily: 'Space Grotesk, sans-serif', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.color = '#10B981'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E4DE'; e.currentTarget.style.color = '#6B7280'; }}
                >
                  <RotateCcw size={11} /> {resetting ? 'Resetting…' : 'Reset Route'}
                </button>
              )}
            </div>
            <RouteMap activePath={activePath} blockedNode={blockedNode} />
          </Card>

          {/* Threat input card */}
          <Card className="g-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <SectionLabel>Threat Intelligence</SectionLabel>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px' }}>Input an environmental or logistics threat to trigger AI rerouting.</p>
            <textarea
              value={threatText}
              onChange={e => setThreatText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='e.g. "Heavy flooding in Kochi port area"'
              rows={5}
              style={{ flex: 1, width: '100%', background: '#F9F8F4', border: '1px solid #E5E4DE', borderRadius: '8px', color: '#111827', fontSize: '13px', fontFamily: 'DM Mono, monospace', padding: '12px', resize: 'none', outline: 'none', transition: 'border-color 0.15s', marginBottom: '12px', boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = '#10B981'; }}
              onBlur={e => { e.target.style.borderColor = '#E5E4DE'; }}
            />
            <AnimatePresence>
              {submitted && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mono" style={{ fontSize: '11px', color: '#10B981', marginBottom: '10px', letterSpacing: '0.06em' }}>
                  ✓ REPORT SENT — AI PROCESSING
                </motion.div>
              )}
              {submitError && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mono" style={{ fontSize: '11px', color: '#EF4444', marginBottom: '10px', letterSpacing: '0.06em' }}>
                  ⚠ {submitError}
                </motion.div>
              )}
            </AnimatePresence>
            <button onClick={handleSimulate} disabled={loading || !threatText.trim()}
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
            {logs.length === 0 && (
              <p style={{ fontSize: '13px', color: '#D1D5DB', fontFamily: 'DM Mono, monospace' }}>Awaiting events…</p>
            )}
            {logs.map(function (log, i) {
              return (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ display: 'flex', gap: '20px', alignItems: 'baseline', padding: '8px 0', borderBottom: i < logs.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                  <span className="mono" style={{ fontSize: '11px', color: '#9CA3AF', minWidth: '38px' }}>{log.t}</span>
                  <span style={{ fontSize: '13px', color: log.msg.startsWith('⚠') ? '#EF4444' : '#6B7280' }}>{log.msg}</span>
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
