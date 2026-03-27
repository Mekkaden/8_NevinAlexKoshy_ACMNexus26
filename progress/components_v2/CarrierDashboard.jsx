import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { io } from 'socket.io-client';
import { MapPin, Clock, Weight, Navigation } from 'lucide-react';
import Layout, { Card, StatCard, SectionLabel } from './Layout';

/* ─── Emergency Modal ────────────────────────────── */
function EmergencyModal({ newRoute, onDismiss }) {
  return (
    <motion.div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        initial={{ scale: 0.88, y: 40 }} animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 26 }}
        style={{ width: '460px', background: '#FFFFFF', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
      >
        {/* Red top bar */}
        <motion.div style={{ height: '4px', background: '#EF4444' }}
          animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 0.9 }} />

        <div style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '36px', height: '36px', background: '#FEF2F2', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '18px' }}>🚨</span>
            </div>
            <div>
              <p className="mono" style={{ fontSize: '10px', color: '#EF4444', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Critical Alert · TRK-009</p>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Route Compromised</h2>
            </div>
          </div>

          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px', lineHeight: 1.6 }}>
            The Kochi segment is blocked. Your GPS has been updated with an alternate route.
          </p>

          <div style={{ background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px' }}>
            <div style={{ marginBottom: '12px' }}>
              <p className="mono" style={{ fontSize: '10px', color: '#9CA3AF', letterSpacing: '0.08em', marginBottom: '4px' }}>BLOCKED SEGMENT</p>
              <p className="mono" style={{ fontSize: '14px', color: '#D1D5DB', textDecoration: 'line-through' }}>BLR → KOCHI → TVM</p>
            </div>
            <div>
              <p className="mono" style={{ fontSize: '10px', color: '#9CA3AF', letterSpacing: '0.08em', marginBottom: '4px' }}>NEW ACTIVE ROUTE</p>
              <p className="mono" style={{ fontSize: '16px', color: '#10B981', fontWeight: 500 }}>{newRoute || 'BLR → COIMBATORE → TVM'}</p>
            </div>
          </div>

          <button onClick={onDismiss}
            style={{ width: '100%', padding: '13px', background: '#EF4444', border: 'none', borderRadius: '10px', color: '#FFFFFF', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif', transition: 'opacity 0.15s' }}
            onMouseEnter={function (e) { e.currentTarget.style.opacity = '0.9'; }}
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
  const contentRef = useRef(null);
  const [showModal, setShowModal]       = useState(false);
  const [newRoute, setNewRoute]         = useState(null);
  const [socketStatus, setSocketStatus] = useState('connecting');
  const [currentRoute, setCurrentRoute] = useState('BLR → KOCHI → TVM');
  const [acknowledged, setAcknowledged] = useState(false);
  const [events, setEvents]             = useState([]);

  useEffect(function () {
    const ctx = gsap.context(function () {
      gsap.from('.g-stat', { opacity: 0, y: 14, stagger: 0.07, duration: 0.5 });
      gsap.from('.g-card', { opacity: 0, y: 16, stagger: 0.08, delay: 0.25, duration: 0.5 });
    }, contentRef);
    return function () { ctx.revert(); };
  }, []);

  useEffect(function () {
    const socket = io('http://localhost:4000', { transports: ['websocket', 'polling'] });
    socket.on('connect',      function () { setSocketStatus('connected');    addEvent('Connected to dispatch'); });
    socket.on('disconnect',   function () { setSocketStatus('disconnected'); });
    socket.on('connect_error',function () { setSocketStatus('error'); });
    socket.on('route_updated', function (d) {
      const r = d && d.newRoute ? d.newRoute : 'BLR → COIMBATORE → TVM';
      setNewRoute(r); setShowModal(true);
      addEvent('⚠ ROUTE_UPDATED received from dispatch');
    });
    return function () { socket.disconnect(); };
  }, []);

  function addEvent(msg) {
    const t = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    setEvents(function (prev) { return [{ t, msg }, ...prev.slice(0, 7)]; });
  }

  function handleDismiss() {
    setShowModal(false); setAcknowledged(true);
    if (newRoute) setCurrentRoute(newRoute);
    addEvent('Driver acknowledged new route');
  }

  const statusColor = { connected: '#10B981', connecting: '#F59E0B', disconnected: '#EF4444', error: '#EF4444' };
  const stops = [
    { name: 'Bangalore Hub',    status: 'done',    km: '0 km' },
    { name: 'Hosur Checkpoint', status: 'done',    km: '45 km' },
    { name: 'Salem Junction',   status: 'active',  km: '120 km' },
    { name: acknowledged ? 'Coimbatore (Alt)' : 'Kochi Port', status: 'upcoming', km: acknowledged ? '95 km' : '180 km' },
    { name: 'Trivandrum Hub',   status: 'upcoming', km: acknowledged ? '295 km' : '420 km' },
  ];

  return (
    <Layout title="Driver Dashboard · TRK-009" status={`DISPATCH ${socketStatus.toUpperCase()}`} statusOk={socketStatus === 'connected'}>
      <AnimatePresence>{showModal && <EmergencyModal newRoute={newRoute} onDismiss={handleDismiss} />}</AnimatePresence>

      <div ref={contentRef}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {[
            { label: 'Active Route',    value: acknowledged ? 'ALT' : 'MAIN', sub: currentRoute,               accent: acknowledged ? '#F59E0B' : '#3B82F6', icon: Navigation },
            { label: 'ETA',             value: acknowledged ? '6.5h' : '5h',  sub: 'to Trivandrum',            accent: '#111827', icon: Clock },
            { label: 'Distance Left',   value: acknowledged ? '490' : '378',  sub: 'kilometres',               accent: '#111827', icon: MapPin },
            { label: 'Cargo',           value: '4.2T',                         sub: 'mixed manifest',           accent: '#111827', icon: Weight },
          ].map(function (s) { return <div key={s.label} className="g-stat"><StatCard {...s} /></div>; })}
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
              <button onClick={function () { setNewRoute('BLR → COIMBATORE → TVM'); setShowModal(true); }}
                style={{ padding: '9px 16px', background: 'transparent', border: '1px solid #E5E4DE', borderRadius: '8px', color: '#6B7280', fontSize: '12px', cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif', transition: 'all 0.15s' }}
                onMouseEnter={function (e) { e.currentTarget.style.borderColor = '#EF4444'; e.currentTarget.style.color = '#EF4444'; }}
                onMouseLeave={function (e) { e.currentTarget.style.borderColor = '#E5E4DE'; e.currentTarget.style.color = '#6B7280'; }}
              >
                Test Emergency Modal →
              </button>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

export default CarrierDashboard;
