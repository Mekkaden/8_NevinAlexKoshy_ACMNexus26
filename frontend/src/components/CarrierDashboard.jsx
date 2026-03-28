import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { io } from 'socket.io-client';
import { MapPin, Clock, Weight, Navigation, RotateCcw } from 'lucide-react';
import Layout, { Card, StatCard, SectionLabel } from './Layout';
import { normalizePath, NODE_LABELS } from '../nodeUtils';

var EDGE_DATA = {
  'BLR-COK': { distance_km: 356, estimated_time_hrs: 6.5 },
  'COK-TVM': { distance_km: 215, estimated_time_hrs: 4.0 },
  'BLR-CBE': { distance_km: 350, estimated_time_hrs: 6.0 },
  'CBE-TVM': { distance_km: 230, estimated_time_hrs: 4.5 },
};

function calcRouteStats(path) {
  var totalKm = 0;
  var totalHrs = 0;
  for (var i = 0; i < path.length - 1; i++) {
    var key1 = path[i] + '-' + path[i + 1];
    var key2 = path[i + 1] + '-' + path[i];
    var edge = EDGE_DATA[key1] || EDGE_DATA[key2];
    if (edge) { totalKm += edge.distance_km; totalHrs += edge.estimated_time_hrs; }
  }
  return { totalKm, totalHrs };
}

/* ─── Emergency Modal ─── */
function EmergencyModal({ blockedNode, reason, newRoute, onDismiss }) {
  return (
    <motion.div
      style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ scale: 0.85, y: 50 }} animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 26 }}
        style={{ width: '460px', background: '#FFFFFF', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,0.3)' }}
      >
        {/* Pulsing red top bar — faster pulse */}
        <motion.div
          style={{ height: '4px', background: 'linear-gradient(90deg, #EF4444, #F59E0B, #EF4444)' }}
          animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />

        <div style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <motion.div
              animate={{ rotate: [0, -10, 10, -7, 7, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1.5 }}
              style={{ width: '36px', height: '36px', background: '#FEF2F2', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span style={{ fontSize: '18px' }}>🚨</span>
            </motion.div>
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
              <motion.p
                animate={{ color: ['#10B981', '#34D399', '#10B981'] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                className="mono" style={{ fontSize: '16px', fontWeight: 500 }}
              >
                {newRoute || 'Calculating…'}
              </motion.p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02, opacity: 0.92 }}
            whileTap={{ scale: 0.98 }}
            onClick={onDismiss}
            style={{ width: '100%', padding: '13px', background: '#EF4444', border: 'none', borderRadius: '10px', color: '#FFFFFF', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Acknowledge & Proceed →
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Carrier Dashboard ─── */
function CarrierDashboard() {
  var contentRef  = useRef(null);
  var resetBtnRef = useRef(null);

  var [showModal, setShowModal]       = useState(false);
  var [modalData, setModalData]       = useState({ blockedNode: null, reason: null, newRoute: null });
  var [socketStatus, setSocketStatus] = useState('connecting');
  var [acknowledged, setAcknowledged] = useState(false);
  var [events, setEvents]             = useState([]);
  var [routeNodes, setRouteNodes]     = useState(['BLR', 'COK', 'TVM']);
  var [currentRoute, setCurrentRoute] = useState('BLR → COK → TVM');
  var [truckId, setTruckId]           = useState('—');
  var [etaHrs, setEtaHrs]             = useState('—');
  var [distanceKm, setDistanceKm]     = useState('—');
  var [cargo, setCargo]               = useState('—');
  var [resetting, setResetting]       = useState(false);

  useEffect(function () {
    var ctx = gsap.context(function () {
      gsap.from('.g-stat', { opacity: 0, y: 18, stagger: 0.08, duration: 0.6, ease: 'back.out(1.4)' });
      gsap.from('.g-card', { opacity: 0, y: 20, stagger: 0.09, delay: 0.28, duration: 0.6, ease: 'power3.out' });
    }, contentRef);
    return function () { ctx.revert(); };
  }, []);

  function hydrateFromState(data) {
    if (data.currentRoute && data.currentRoute.path) {
      var path = normalizePath(data.currentRoute.path);
      setRouteNodes(path);
      setCurrentRoute(path.join(' → '));
      var stats = calcRouteStats(path);
      setDistanceKm(stats.totalKm > 0 ? String(stats.totalKm) : '—');
      setEtaHrs(stats.totalHrs > 0 ? stats.totalHrs.toFixed(1) + 'h' : '—');
    }
    if (data.active_shipments && data.active_shipments.length > 0) {
      var shp = data.active_shipments[0];
      setTruckId(shp.truck_id || '—');
      setCargo(shp.cargo || '—');
    }
  }

  useEffect(function () {
    fetch('/api/state').then(function (r) { return r.json(); }).then(hydrateFromState).catch(function () {});
  }, []);

  useEffect(function () {
    var socket = io('http://localhost:3001', { transports: ['websocket', 'polling'] });
    socket.on('connect',       function () { setSocketStatus('connected');    addEvent('Connected to dispatch'); });
    socket.on('disconnect',    function () { setSocketStatus('disconnected'); });
    socket.on('connect_error', function () { setSocketStatus('error'); });
    socket.on('route_init', function (routeObj) {
      if (routeObj && routeObj.path) {
        var path = normalizePath(routeObj.path);
        setRouteNodes(path); setCurrentRoute(path.join(' → '));
        var stats = calcRouteStats(path);
        setDistanceKm(stats.totalKm > 0 ? String(stats.totalKm) : '—');
        setEtaHrs(stats.totalHrs > 0 ? stats.totalHrs.toFixed(1) + 'h' : '—');
      }
    });
    socket.on('state_updated', hydrateFromState);
    socket.on('route_updated', function (d) {
      var newPath = d.newPath || [];
      setModalData({ blockedNode: d.blockedNode || null, reason: d.reason || null, newRoute: newPath.join(' → ') });
      setShowModal(true); setAcknowledged(false);
      addEvent('⚠ ROUTE_UPDATED — New dispatch received');
    });
    socket.on('route_reset', function (routeObj) {
      if (routeObj && routeObj.path) {
        setRouteNodes(routeObj.path); setCurrentRoute(routeObj.path.join(' → '));
        var stats = calcRouteStats(routeObj.path);
        setDistanceKm(String(stats.totalKm)); setEtaHrs(stats.totalHrs.toFixed(1) + 'h');
      }
      setAcknowledged(false); setShowModal(false);
      addEvent('✓ Route reset to default');
    });
    return function () { socket.disconnect(); };
  }, []);

  function addEvent(msg) {
    var t = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    setEvents(function (prev) { return [{ t, msg }].concat(prev.slice(0, 7)); });
  }

  function handleDismiss() {
    setShowModal(false); setAcknowledged(true);
    setCurrentRoute(modalData.newRoute || currentRoute);
    addEvent('Driver acknowledged new route');
  }

  async function handleReset() {
    setResetting(true);
    /* Spin the icon */
    if (resetBtnRef.current) {
      gsap.to(resetBtnRef.current.querySelector('svg'), { rotation: 360, duration: 0.6, ease: 'power2.inOut', onComplete: function () { gsap.set(resetBtnRef.current.querySelector('svg'), { rotation: 0 }); } });
    }
    try { await fetch('/api/reset', { method: 'POST' }); } catch {}
    finally { setResetting(false); }
  }

  var stops = routeNodes.map(function (node, i) {
    var soFar = calcRouteStats(routeNodes.slice(0, i + 1));
    var status = i === 0 ? 'done' : i === 1 ? 'active' : 'upcoming';
    return { name: NODE_LABELS[node] || node, status, km: i === 0 ? '0 km' : soFar.totalKm + ' km' };
  });

  return (
    <Layout title={'Driver Dashboard · ' + truckId} status={'DISPATCH ' + socketStatus.toUpperCase()} statusOk={socketStatus === 'connected'}>
      <AnimatePresence>
        {showModal && <EmergencyModal {...modalData} onDismiss={handleDismiss} />}
      </AnimatePresence>

      <div ref={contentRef}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {[
            { label: 'Active Route',  value: acknowledged ? 'ALT' : 'MAIN', sub: currentRoute,    accent: acknowledged ? '#F59E0B' : '#3B82F6', icon: Navigation },
            { label: 'ETA',           value: etaHrs,                         sub: 'to Trivandrum', accent: '#111827', icon: Clock },
            { label: 'Distance Left', value: distanceKm,                     sub: 'kilometres',    accent: '#111827', icon: MapPin },
            { label: 'Cargo',         value: '4.2T',                         sub: cargo,           accent: '#111827', icon: Weight },
          ].map(function (s) { return <div key={s.label} className="g-stat"><StatCard {...s} /></div>; })}
        </div>

        {/* Route + Dispatch */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>

          {/* Route stops */}
          <Card className="g-card">
            <SectionLabel>Route Progress</SectionLabel>
            {stops.map(function (stop, i) {
              var active = stop.status === 'active';
              var done   = stop.status === 'done';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0', borderBottom: i < stops.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                  {/* Dot with pulsing ring for active stop */}
                  <div style={{ position: 'relative', flexShrink: 0, width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {active && (
                      <motion.div
                        animate={{ scale: [1, 2.4, 2.4], opacity: [0.8, 0, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', repeatDelay: 0.3 }}
                        style={{ position: 'absolute', width: '10px', height: '10px', borderRadius: '50%', background: '#111827' }}
                      />
                    )}
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: done ? '#10B981' : active ? '#111827' : '#E5E7EB',
                      zIndex: 1,
                      transition: 'all 0.4s',
                    }} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: done ? '#9CA3AF' : active ? '#111827' : '#6B7280', fontWeight: active ? 600 : 400, textDecoration: done ? 'line-through' : 'none', transition: 'color 0.4s' }}>
                      {stop.name}
                    </span>
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
              ? <p className="mono" style={{ fontSize: '13px', color: '#D1D5DB' }}>Awaiting events…</p>
              : events.map(function (ev, i) {
                  var isWarning = ev.msg.startsWith('⚠');
                  var isOk      = ev.msg.startsWith('✓');
                  return (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: -10, backgroundColor: isWarning ? 'rgba(239,68,68,0.12)' : 'transparent' }}
                      animate={{ opacity: 1, x: 0, backgroundColor: 'transparent' }}
                      transition={{ duration: 0.45, type: 'spring', stiffness: 280, damping: 24 }}
                      style={{
                        display: 'flex', gap: '16px', padding: '9px 0',
                        borderBottom: i < events.length - 1 ? '1px solid #F3F4F6' : 'none',
                        alignItems: 'baseline',
                        borderLeft: isWarning ? '3px solid #EF4444' : isOk ? '3px solid #10B981' : '3px solid transparent',
                        paddingLeft: '8px',
                      }}
                    >
                      <span className="mono" style={{ fontSize: '11px', color: '#9CA3AF', minWidth: '36px' }}>{ev.t}</span>
                      <span style={{ fontSize: '13px', color: isWarning ? '#EF4444' : isOk ? '#10B981' : '#6B7280' }}>{ev.msg}</span>
                    </motion.div>
                  );
                })
            }
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #F3F4F6' }}>
              <motion.button
                ref={resetBtnRef}
                whileHover={{ borderColor: '#10B981', color: '#10B981', scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleReset}
                disabled={resetting}
                style={{
                  padding: '9px 16px', background: 'transparent',
                  border: '1px solid #E5E4DE', borderRadius: '8px',
                  color: '#6B7280', fontSize: '12px',
                  cursor: resetting ? 'not-allowed' : 'pointer',
                  fontFamily: 'Space Grotesk, sans-serif',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  transition: 'all 0.15s',
                }}
              >
                <RotateCcw size={11} /> {resetting ? 'Resetting…' : 'Reset Route'}
              </motion.button>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

export default CarrierDashboard;
