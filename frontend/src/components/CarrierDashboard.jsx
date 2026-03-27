import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import gsap from 'gsap';

/* ─── Emergency Modal ─────────────────────────────── */
function EmergencyModal({ newRoute, onDismiss }) {
  return (
    <motion.div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.88)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ scale: 0.88, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        style={{
          width: '100%', maxWidth: '480px', margin: '0 24px',
          background: '#0D0000', border: '1px solid #7F1D1D',
          borderRadius: '8px', overflow: 'hidden',
        }}
      >
        {/* Red top bar */}
        <motion.div
          style={{ height: '3px', background: '#EF4444', width: '100%' }}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
        />

        <div style={{ padding: '40px' }}>
          {/* Label */}
          <div className="mono" style={{ fontSize: '10px', color: '#EF4444', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '20px' }}>
            Critical Alert · TRK-009
          </div>

          {/* Heading */}
          <motion.h2
            style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-0.03em', color: '#FAFAFA', lineHeight: 1.05, marginBottom: '6px' }}
            animate={{ opacity: [1, 0.8, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            Route Compromised
          </motion.h2>
          <p style={{ fontSize: '16px', color: '#71717A', marginBottom: '32px' }}>New route has been assigned.</p>

          {/* Route block */}
          <div style={{ borderTop: '1px solid #27272A', borderBottom: '1px solid #27272A', padding: '20px 0', marginBottom: '32px' }}>
            <div className="mono" style={{ fontSize: '11px', color: '#3F3F46', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Compromised segment</div>
            <div className="mono" style={{ fontSize: '15px', color: '#52525B', textDecoration: 'line-through', marginBottom: '16px' }}>BLR → KOCHI → TVM</div>
            <div className="mono" style={{ fontSize: '11px', color: '#3F3F46', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>New active route</div>
            <div className="mono" style={{ fontSize: '18px', color: '#34D399', fontWeight: 500 }}>{newRoute || 'BLR → COIMBATORE → TVM'}</div>
          </div>

          {/* Action */}
          <button
            onClick={onDismiss}
            style={{
              width: '100%', padding: '14px', background: '#EF4444', border: 'none',
              borderRadius: '6px', color: '#FAFAFA', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '-0.01em',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={function (e) { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={function (e) { e.currentTarget.style.opacity = '1'; }}
          >
            Acknowledge & Proceed →
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Carrier Dashboard ───────────────────────────── */
function CarrierDashboard() {
  const rootRef = useRef(null);
  const [showModal, setShowModal]       = useState(false);
  const [newRoute, setNewRoute]         = useState(null);
  const [socketStatus, setSocketStatus] = useState('connecting');
  const [currentRoute, setCurrentRoute] = useState('BLR → KOCHI → TVM');
  const [acknowledged, setAcknowledged] = useState(false);
  const [events, setEvents]             = useState([]);

  useEffect(function () {
    const ctx = gsap.context(function () {
      gsap.from('.g-hero', { opacity: 0, y: 32, duration: 0.8, ease: 'power3.out' });
      gsap.from('.g-section', { opacity: 0, y: 16, stagger: 0.1, delay: 0.4, duration: 0.5 });
    }, rootRef);
    return function () { ctx.revert(); };
  }, []);

  useEffect(function () {
    const socket = io('http://localhost:4000', { transports: ['websocket', 'polling'] });

    socket.on('connect', function () {
      setSocketStatus('connected');
      pushEvent('Connected to dispatch server');
    });
    socket.on('disconnect',    function () { setSocketStatus('disconnected'); });
    socket.on('connect_error', function () { setSocketStatus('error'); });
    socket.on('route_updated', function (data) {
      const route = data && data.newRoute ? data.newRoute : 'BLR → COIMBATORE → TVM';
      setNewRoute(route);
      setShowModal(true);
      pushEvent('ROUTE_UPDATED received from dispatch');
    });

    return function () { socket.disconnect(); };
  }, []);

  function pushEvent(msg) {
    const t = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    setEvents(function (prev) { return [{ t, msg }, ...prev.slice(0, 6)]; });
  }

  function handleDismiss() {
    setShowModal(false);
    setAcknowledged(true);
    if (newRoute) setCurrentRoute(newRoute);
    pushEvent('Driver acknowledged new route');
  }

  function handleTestModal() {
    setNewRoute('BLR → COIMBATORE → TVM');
    setShowModal(true);
  }

  const stops = [
    { name: 'Bangalore Hub',     status: 'done',     km: '0 km' },
    { name: 'Hosur Checkpoint',  status: 'done',     km: '45 km' },
    { name: 'Salem Junction',    status: 'active',   km: '120 km' },
    { name: acknowledged ? 'Coimbatore (Alt)' : 'Kochi Port', status: 'upcoming', km: acknowledged ? '95 km' : '180 km' },
    { name: 'Trivandrum Hub',    status: 'upcoming', km: acknowledged ? '295 km' : '420 km' },
  ];

  const statusColors = { connected: '#34D399', connecting: '#FBBF24', disconnected: '#F87171', error: '#F87171' };

  return (
    <div ref={rootRef} style={{ background: '#09090B', minHeight: 'calc(100vh - 49px)', padding: '48px' }}>
      <AnimatePresence>
        {showModal && <EmergencyModal newRoute={newRoute} onDismiss={handleDismiss} />}
      </AnimatePresence>

      {/* Hero */}
      <div className="g-hero" style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColors[socketStatus] }} />
          <span className="mono" style={{ fontSize: '11px', color: statusColors[socketStatus], letterSpacing: '0.1em' }}>
            {socketStatus === 'connected' ? 'DISPATCH LIVE' : socketStatus.toUpperCase()}
          </span>
        </div>
        <p className="mono" style={{ fontSize: '11px', color: '#3F3F46', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Heavy Carrier · TRK-009</p>
        <h1 style={{ fontSize: '48px', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, color: acknowledged ? '#FBBF24' : '#FAFAFA', fontFamily: 'DM Mono, monospace', transition: 'color 0.6s' }}>
          {currentRoute}
        </h1>
        {acknowledged && (
          <p style={{ fontSize: '13px', color: '#FBBF24', marginTop: '8px', fontFamily: 'DM Mono, monospace' }}>
            ⚠ Rerouted via Coimbatore · Kochi segment blocked
          </p>
        )}
      </div>

      {/* Route progress */}
      <div className="g-section" style={{ borderTop: '1px solid #27272A', paddingTop: '32px', marginBottom: '40px' }}>
        <p className="mono" style={{ fontSize: '11px', color: '#3F3F46', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '24px' }}>Route Progress</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {stops.map(function (stop, i) {
            const active = stop.status === 'active';
            const done   = stop.status === 'done';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', padding: '14px 0', borderBottom: i < stops.length - 1 ? '1px solid #18181B' : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '3px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, background: done ? '#34D399' : active ? '#FAFAFA' : '#27272A', transition: 'background 0.4s', boxShadow: active ? '0 0 0 3px rgba(250,250,250,0.1)' : 'none' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '15px', fontWeight: active ? 600 : 400, color: done ? '#52525B' : active ? '#FAFAFA' : '#3F3F46', transition: 'color 0.4s' }}>
                    {stop.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {active && <span className="mono" style={{ fontSize: '11px', color: '#FAFAFA', border: '1px solid #3F3F46', borderRadius: '4px', padding: '2px 8px', letterSpacing: '0.06em' }}>CURRENT</span>}
                    {done   && <span className="mono" style={{ fontSize: '11px', color: '#34D399' }}>✓</span>}
                    <span className="mono" style={{ fontSize: '12px', color: '#3F3F46' }}>{stop.km}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dispatch log */}
      <div className="g-section" style={{ borderTop: '1px solid #27272A', paddingTop: '32px', marginBottom: '40px' }}>
        <p className="mono" style={{ fontSize: '11px', color: '#3F3F46', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '20px' }}>Dispatch Log</p>
        {events.length === 0
          ? <p className="mono" style={{ fontSize: '13px', color: '#27272A' }}>Awaiting events…</p>
          : events.map(function (ev, i) {
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                  style={{ display: 'flex', gap: '24px', padding: '8px 0', borderBottom: '1px solid #111113' }}>
                  <span className="mono" style={{ fontSize: '12px', color: '#3F3F46', minWidth: '40px' }}>{ev.t}</span>
                  <span style={{ fontSize: '13px', color: '#71717A' }}>{ev.msg}</span>
                </motion.div>
              );
            })
        }
      </div>

      {/* Test button */}
      <div className="g-section">
        <button
          onClick={handleTestModal}
          style={{
            padding: '12px 24px', background: 'transparent',
            border: '1px solid #27272A', borderRadius: '6px',
            color: '#52525B', fontSize: '13px', cursor: 'pointer',
            fontFamily: 'Space Grotesk, sans-serif', transition: 'all 0.15s',
          }}
          onMouseEnter={function (e) { e.currentTarget.style.borderColor = '#F87171'; e.currentTarget.style.color = '#F87171'; }}
          onMouseLeave={function (e) { e.currentTarget.style.borderColor = '#27272A'; e.currentTarget.style.color = '#52525B'; }}
        >
          Test Emergency Modal →
        </button>
      </div>

    </div>
  );
}

export default CarrierDashboard;
