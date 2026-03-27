import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { io } from 'socket.io-client';
import { MapPin, Clock, Weight, Navigation, RotateCcw } from 'lucide-react';
import Layout, { Card, StatCard, SectionLabel } from './Layout';
import { normalizePath, NODE_LABELS } from '../nodeUtils';

/* ─── Edge Distance & Time Map ─────────────────────────────────────
   Mirrors data.json edges. Used to derive real ETA + distance.      */
const EDGE_DATA = {
  'BLR-COK': { distance_km: 356, estimated_time_hrs: 6.5 },
  'COK-TVM': { distance_km: 215, estimated_time_hrs: 4.0 },
  'BLR-CBE': { distance_km: 350, estimated_time_hrs: 6.0 },
  'CBE-TVM': { distance_km: 230, estimated_time_hrs: 4.5 },
};

/* ─── Node Labels ─────────────────────────────────────────────────── */
// Imported from nodeUtils — removed local duplicate

/* Compute total distance (km) and ETA (hrs) for a given path array */
function calcRouteStats(path) {
  let totalKm = 0;
  let totalHrs = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const key1 = `${path[i]}-${path[i + 1]}`;
    const key2 = `${path[i + 1]}-${path[i]}`;
    const edge = EDGE_DATA[key1] || EDGE_DATA[key2];
    if (edge) {
      totalKm  += edge.distance_km;
      totalHrs += edge.estimated_time_hrs;
    }
  }
  return { totalKm, totalHrs };
}

/* ─── Emergency Modal ────────────────────────────────────────────── */
function EmergencyModal({ blockedNode, reason, newRoute, onDismiss }) {
  return (
    <motion.div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        initial={{ scale: 0.88, y: 40 }} animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 26 }}
        style={{ width: '460px', background: '#FFFFFF', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
      >
        {/* Pulsing red top bar */}
        <motion.div style={{ height: '4px', background: '#EF4444' }}
          animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 0.9 }} />

        <div style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '36px', height: '36px', background: '#FEF2F2', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '18px' }}>🚨</span>
            </div>
            <div>
              <p className="mono" style={{ fontSize: '10px', color: '#EF4444', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Critical Alert</p>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Route Compromised</h2>
            </div>
          </div>

          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px', lineHeight: 1.6 }}>
            <strong style={{ color: '#EF4444' }}>{blockedNode || 'A node'}</strong> is blocked. {reason || 'GPS has been updated with an alternate route.'}
          </p>

          <div style={{ background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px' }}>
            <div style={{ marginBottom: '12px' }}>
              <p className="mono" style={{ fontSize: '10px', color: '#9CA3AF', letterSpacing: '0.08em', marginBottom: '4px' }}>BLOCKED NODE</p>
              <p className="mono" style={{ fontSize: '14px', color: '#D1D5DB' }}>{blockedNode || '—'}</p>
            </div>
            <div>
              <p className="mono" style={{ fontSize: '10px', color: '#9CA3AF', letterSpacing: '0.08em', marginBottom: '4px' }}>NEW ACTIVE ROUTE</p>
              <p className="mono" style={{ fontSize: '16px', color: '#10B981', fontWeight: 500 }}>{newRoute || 'Calculating…'}</p>
            </div>
          </div>

          <button onClick={onDismiss}
            style={{ width: '100%', padding: '13px', background: '#EF4444', border: 'none', borderRadius: '10px', color: '#FFFFFF', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif', transition: 'opacity 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            Acknowledge &amp; Proceed →
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Carrier Dashboard ──────────────────────────────────────────── */
function CarrierDashboard() {
  const contentRef = useRef(null);

  const [showModal, setShowModal]       = useState(false);
  const [modalData, setModalData]       = useState({ blockedNode: null, reason: null, newRoute: null });
  const [socketStatus, setSocketStatus] = useState('connecting');
  const [acknowledged, setAcknowledged] = useState(false);
  const [events, setEvents]             = useState([]);

  // Route state — hydrated from backend
  const [routeNodes, setRouteNodes] = useState(['BLR', 'COK', 'TVM']);
  const [currentRoute, setCurrentRoute] = useState('BLR → COK → TVM');
  const [truckId, setTruckId]       = useState('—');
  const [etaHrs, setEtaHrs]         = useState('—');
  const [distanceKm, setDistanceKm] = useState('—');
  const [cargo, setCargo]           = useState('—');
  const [resetting, setResetting]   = useState(false);

  useEffect(function () {
    const ctx = gsap.context(function () {
      gsap.from('.g-stat', { opacity: 0, y: 14, stagger: 0.07, duration: 0.5 });
      gsap.from('.g-card', { opacity: 0, y: 16, stagger: 0.08, delay: 0.25, duration: 0.5 });
    }, contentRef);
    return () => ctx.revert();
  }, []);

  // Hydrate route + shipment data from full state snapshot
  function hydrateFromState(data) {
    if (data.currentRoute && data.currentRoute.path) {
      // Normalize full names to codes before calculating stats
      const path = normalizePath(data.currentRoute.path);
      setRouteNodes(path);
      setCurrentRoute(path.join(' → '));

      const { totalKm, totalHrs } = calcRouteStats(path);
      setDistanceKm(totalKm > 0 ? String(totalKm) : '—');
      setEtaHrs(totalHrs > 0 ? totalHrs.toFixed(1) + 'h' : '—');
    }
    if (data.active_shipments && data.active_shipments.length > 0) {
      const shp = data.active_shipments[0];
      setTruckId(shp.truck_id || '—');
      setCargo(shp.cargo || '—');
    }
  }

  // Fetch on mount
  useEffect(function () {
    fetch('/api/state')
      .then(r => r.json())
      .then(data => hydrateFromState(data))
      .catch(() => {});
  }, []);

  // Socket.io
  useEffect(function () {
    const socket = io('http://localhost:3001', { transports: ['websocket', 'polling'] });

    socket.on('connect',       () => { setSocketStatus('connected');    addEvent('Connected to dispatch'); });
    socket.on('disconnect',    () => setSocketStatus('disconnected'));
    socket.on('connect_error', () => setSocketStatus('error'));

    socket.on('route_init', function (routeObj) {
      if (routeObj && routeObj.path) {
        const path = normalizePath(routeObj.path);
        setRouteNodes(path);
        setCurrentRoute(path.join(' → '));
        const { totalKm, totalHrs } = calcRouteStats(path);
        setDistanceKm(totalKm > 0 ? String(totalKm) : '—');
        setEtaHrs(totalHrs > 0 ? totalHrs.toFixed(1) + 'h' : '—');
      }
    });

    socket.on('state_updated', function (data) {
      hydrateFromState(data);
    });

    socket.on('route_updated', function (d) {
      const newPath = d.newPath || [];
      setModalData({
        blockedNode: d.blockedNode || null,
        reason: d.reason || null,
        newRoute: newPath.join(' → '),
      });
      setShowModal(true);
      setAcknowledged(false);
      addEvent('⚠ ROUTE_UPDATED — New dispatch received');
    });

    socket.on('route_reset', function (routeObj) {
      if (routeObj && routeObj.path) {
        setRouteNodes(routeObj.path);
        setCurrentRoute(routeObj.path.join(' → '));
        const { totalKm, totalHrs } = calcRouteStats(routeObj.path);
        setDistanceKm(String(totalKm));
        setEtaHrs(totalHrs.toFixed(1) + 'h');
      }
      setAcknowledged(false);
      setShowModal(false);
      addEvent('✓ Route reset to default');
    });

    return () => socket.disconnect();
  }, []);

  function addEvent(msg) {
    const t = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    setEvents(prev => [{ t, msg }, ...prev.slice(0, 7)]);
  }

  function handleDismiss() {
    setShowModal(false);
    setAcknowledged(true);
    setCurrentRoute(modalData.newRoute || currentRoute);
    addEvent('Driver acknowledged new route');
  }

  async function handleReset() {
    setResetting(true);
    try { await fetch('/api/reset', { method: 'POST' }); }
    catch { /* ignore */ }
    finally { setResetting(false); }
  }

  const statusColor = { connected: '#10B981', connecting: '#F59E0B', disconnected: '#EF4444', error: '#EF4444' };

  // Build stops with real cumulative distances
  const stops = routeNodes.map(function (node, i) {
    const soFar = calcRouteStats(routeNodes.slice(0, i + 1));
    let status = 'upcoming';
    if (i === 0) status = 'done';
    else if (i === 1) status = 'active';
    return {
      name: NODE_LABELS[node] || node,
      status,
      km: i === 0 ? '0 km' : `${soFar.totalKm} km`,
    };
  });

  return (
    <Layout title={`Driver Dashboard · ${truckId}`} status={`DISPATCH ${socketStatus.toUpperCase()}`} statusOk={socketStatus === 'connected'}>
      <AnimatePresence>
        {showModal && <EmergencyModal {...modalData} onDismiss={handleDismiss} />}
      </AnimatePresence>

      <div ref={contentRef}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {[
            { label: 'Active Route',  value: acknowledged ? 'ALT' : 'MAIN', sub: currentRoute,  accent: acknowledged ? '#F59E0B' : '#3B82F6', icon: Navigation },
            { label: 'ETA',           value: etaHrs,                          sub: 'to Trivandrum', accent: '#111827', icon: Clock },
            { label: 'Distance Left', value: distanceKm,                      sub: 'kilometres',  accent: '#111827', icon: MapPin },
            { label: 'Cargo',         value: '4.2T',                          sub: cargo,         accent: '#111827', icon: Weight },
          ].map(s => <div key={s.label} className="g-stat"><StatCard {...s} /></div>)}
        </div>

        {/* Route progress + dispatch log */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>

          {/* Route stops */}
          <Card className="g-card">
            <SectionLabel>Route Progress</SectionLabel>
            {stops.map(function (stop, i) {
              const active = stop.status === 'active';
              const done   = stop.status === 'done';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0', borderBottom: i < stops.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, background: done ? '#10B981' : active ? '#111827' : '#E5E7EB', boxShadow: active ? '0 0 0 3px rgba(17,24,39,0.12)' : 'none', transition: 'all 0.4s' }} />
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: done ? '#9CA3AF' : active ? '#111827' : '#6B7280', fontWeight: active ? 600 : 400, textDecoration: done ? 'line-through' : 'none', transition: 'color 0.4s' }}>{stop.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {active && <span className="mono" style={{ fontSize: '10px', color: '#111827', background: '#F3F4F6', padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.06em' }}>CURRENT</span>}
                      {done   && <span style={{ fontSize: '12px', color: '#10B981' }}>✓</span>}
                      <span className="mono" style={{ fontSize: '11px', color: '#9CA3AF' }}>{stop.km}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </Card>

          {/* Dispatch log */}
          <Card className="g-card">
            <SectionLabel>Dispatch Log</SectionLabel>
            {events.length === 0
              ? <p style={{ fontSize: '13px', color: '#D1D5DB', fontFamily: 'DM Mono, monospace' }}>Awaiting events…</p>
              : events.map(function (ev, i) {
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      style={{ display: 'flex', gap: '16px', padding: '9px 0', borderBottom: i < events.length - 1 ? '1px solid #F3F4F6' : 'none', alignItems: 'baseline' }}>
                      <span className="mono" style={{ fontSize: '11px', color: '#9CA3AF', minWidth: '36px' }}>{ev.t}</span>
                      <span style={{ fontSize: '13px', color: ev.msg.startsWith('⚠') ? '#EF4444' : '#6B7280' }}>{ev.msg}</span>
                    </motion.div>
                  );
                })
            }
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #F3F4F6' }}>
              <button onClick={handleReset} disabled={resetting}
                style={{ padding: '9px 16px', background: 'transparent', border: '1px solid #E5E4DE', borderRadius: '8px', color: '#6B7280', fontSize: '12px', cursor: resetting ? 'not-allowed' : 'pointer', fontFamily: 'Space Grotesk, sans-serif', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.color = '#10B981'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E4DE'; e.currentTarget.style.color = '#6B7280'; }}
              >
                <RotateCcw size={11} /> {resetting ? 'Resetting…' : 'Reset Route'}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

export default CarrierDashboard;
