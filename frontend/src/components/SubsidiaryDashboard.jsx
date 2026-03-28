import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { io } from 'socket.io-client';
import { CheckCircle2, Circle, Clock, MapPin, Cpu, Zap } from 'lucide-react';
import Layout, { Card, StatCard, SectionLabel } from './Layout';

/* Tiny confetti burst component — 3 dots explode outward on mount */
function ConfettiBurst() {
  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', pointerEvents: 'none', zIndex: 10 }}>
      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', position: 'absolute', animation: 'burst-up 0.55s ease-out forwards' }} />
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34D399', position: 'absolute', animation: 'burst-left 0.55s ease-out forwards', animationDelay: '0.05s' }} />
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6EE7B7', position: 'absolute', animation: 'burst-right 0.55s ease-out forwards', animationDelay: '0.05s' }} />
    </div>
  );
}

function SubsidiaryDashboard() {
  var contentRef     = useRef(null);
  var progressBarRef = useRef(null);
  var [stops, setStops]               = useState([]);
  var [cargoPayload, setCargoPayload] = useState('No inbound cargo detected.');
  var [listReady, setListReady]       = useState(false);
  var [isOptimizing, setIsOptimizing] = useState(false);
  var [estDone, setEstDone]           = useState('—');
  var [burstId, setBurstId]           = useState(null);   // which stop just got delivered

  function loadState() {
    fetch('/api/state')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var shipments = data.active_shipments || [];
        if (shipments.length > 0) setCargoPayload(shipments.map(function (s) { return s.cargo; }).join(', '));
        else setCargoPayload('No inbound cargo detected.');
        var routeStops = data.last_mile_route || [];
        setStops(routeStops);
        if (routeStops.length > 0) setEstDone(routeStops[routeStops.length - 1].window.split(' - ')[1] || '17:00');
        else setEstDone('—');
      })
      .catch(function (e) { console.error('Failed to load state', e); });
  }

  useEffect(function () {
    loadState();
    var ctx = gsap.context(function () {
      gsap.from('.g-stat', { opacity: 0, y: 18, stagger: 0.08, duration: 0.6, ease: 'back.out(1.4)' });
      gsap.from('.g-card', { opacity: 0, y: 20, stagger: 0.09, delay: 0.28, duration: 0.6, ease: 'power3.out' });
    }, contentRef);
    setTimeout(function () { setListReady(true); }, 300);
    return function () { ctx.revert(); };
  }, []);

  useEffect(function () {
    var socket = io('http://localhost:3001', { transports: ['websocket', 'polling'] });
    socket.on('state_updated', loadState);
    socket.on('route_reset', loadState);
    return function () { socket.disconnect(); };
  }, []);

  function handleMarkDelivered(id) {
    /* Trigger burst animation briefly */
    setBurstId(id);
    setTimeout(function () { setBurstId(null); }, 650);

    setStops(function (prev) {
      var idx = prev.findIndex(function (s) { return s.id === id; });
      return prev.map(function (s, i) {
        if (s.id === id) return Object.assign({}, s, { status: 'delivered' });
        if (i === idx + 1 && s.status !== 'delivered') return Object.assign({}, s, { status: 'active' });
        return s;
      });
    });
  }

  async function handleOptimize() {
    setIsOptimizing(true);
    setStops([]);
    try {
      await fetch('/api/last-mile/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: 'Kochi', cargo: cargoPayload }),
      });
    } catch (e) { console.error(e); }
    finally { setIsOptimizing(false); }
  }

  function handleNavigate(stop) {
    var query = encodeURIComponent(stop.address);
    window.open('https://www.google.com/maps/search/?api=1&query=' + query, '_blank');
  }

  var localStops = stops.map(function (s, i) {
    if (!s.status) {
      var allPrevDelivered = stops.slice(0, i).every(function (prev) { return prev.status === 'delivered'; });
      s.status = allPrevDelivered ? 'active' : 'upcoming';
    }
    return s;
  });

  var delivered  = localStops.filter(function (s) { return s.status === 'delivered'; }).length;
  var totalStops = localStops.length;
  var pct        = totalStops > 0 ? Math.round((delivered / totalStops) * 100) : 0;
  var complete   = totalStops > 0 && pct === 100;

  /* Progress bar color: blue → green as percentage rises */
  var barColor = complete ? '#10B981' : pct > 60 ? '#34D399' : pct > 30 ? '#3B82F6' : '#6366F1';

  return (
    <Layout
      title="Last-Mile Delivery · Kochi Zone"
      status={complete ? 'ROUTE COMPLETE' : totalStops > 0 ? (delivered + '/' + totalStops + ' DELIVERED') : 'AWAITING DISPATCH'}
      statusOk={complete || totalStops === 0}
    >
      <div ref={contentRef}>

        {/* Top Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
          <div>
            <SectionLabel>Inbound Freight Payload</SectionLabel>
            <p className="mono" style={{ fontSize: '13px', color: '#111827', fontWeight: 500 }}>{cargoPayload}</p>
          </div>
          <motion.button
            whileHover={!isOptimizing && cargoPayload !== 'No inbound cargo detected.' ? { scale: 1.03, boxShadow: '0 6px 20px rgba(59,130,246,0.2)' } : {}}
            whileTap={{ scale: 0.97 }}
            animate={isOptimizing ? {
              boxShadow: ['0 0 0 0 rgba(59,130,246,0)', '0 0 0 4px rgba(59,130,246,0.35)', '0 0 0 0 rgba(59,130,246,0)'],
            } : {}}
            transition={isOptimizing ? { duration: 1.1, repeat: Infinity } : {}}
            onClick={handleOptimize}
            disabled={isOptimizing || cargoPayload === 'No inbound cargo detected.'}
            style={{
              padding: '10px 18px',
              background: isOptimizing ? 'rgba(59,130,246,0.1)' : '#EFF6FF',
              border: '1px solid #BFDBFE', borderRadius: '8px',
              color: '#2563EB', fontSize: '12px', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '8px',
              cursor: isOptimizing ? 'wait' : 'pointer',
              fontFamily: 'Space Grotesk, sans-serif', transition: 'all 0.2s',
            }}
          >
            {isOptimizing ? (
              <span style={{ width: '14px', height: '14px', border: '2px solid #3B82F6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }} />
            ) : (
              <motion.div whileHover={{ rotate: 20 }} transition={{ duration: 0.2 }}><Cpu size={14} /></motion.div>
            )}
            {isOptimizing ? 'Agent routing via Mapbox AI...' : 'Optimize Route (Agentic AI)'}
          </motion.button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {[
            { label: 'Completion',  value: pct + '%',                     sub: 'route progress',             accent: complete ? '#10B981' : '#3B82F6', icon: CheckCircle2 },
            { label: 'Delivered',   value: String(delivered),              sub: 'of ' + (totalStops || 0) + ' stops', accent: '#10B981', icon: CheckCircle2 },
            { label: 'Remaining',   value: String(totalStops - delivered), sub: 'stops pending',              accent: (totalStops - delivered) > 0 ? '#F59E0B' : '#9CA3AF', icon: Circle },
            { label: 'Est. Done',   value: estDone,                        sub: 'end of route',               accent: '#9CA3AF', icon: Clock },
          ].map(function (s) { return <div key={s.label} className="g-stat"><StatCard {...s} /></div>; })}
        </div>

        {/* Progress bar */}
        <Card className="g-card" style={{ marginBottom: '14px', padding: '16px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <SectionLabel>Route Progress</SectionLabel>
            <motion.span
              key={pct}
              initial={{ scale: 1.2, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }}
              className="mono" style={{ fontSize: '11px', color: complete ? '#10B981' : '#9CA3AF' }}
            >
              {pct}%
            </motion.span>
          </div>
          <div style={{ height: '8px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
            <motion.div
              ref={progressBarRef}
              animate={{ width: pct + '%', background: barColor }}
              transition={{ type: 'spring', stiffness: 80, damping: 18 }}
              style={{ height: '100%', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}
            >
              {/* Shimmer sweep */}
              {pct > 0 && (
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, width: '40%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  animation: 'bar-shimmer 1.8s ease-in-out infinite',
                  left: '-60%',
                }} />
              )}
            </motion.div>
          </div>
          {complete && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mono"
              style={{ fontSize: '10px', color: '#10B981', marginTop: '8px', letterSpacing: '0.06em', textAlign: 'center' }}>
              ✓ ALL STOPS CLEARED
            </motion.p>
          )}
        </Card>

        {/* Stop list */}
        <motion.div
          animate={complete ? { animation: 'completion-glow 1.5s ease-out forwards' } : {}}
        >
          <Card className="g-card" style={{ padding: '0', overflow: 'hidden', minHeight: '300px' }}>
            <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #F3F4F6' }}>
              <SectionLabel>Agentic Delivery Vector</SectionLabel>
            </div>

            <AnimatePresence>
              {listReady && localStops.length === 0 && !isOptimizing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ padding: '60px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px', fontFamily: 'Space Grotesk, sans-serif' }}>
                  No route computed. Click "Optimize Route" to trigger the routing agent.
                </motion.div>
              )}

              {listReady && localStops.map(function (stop, i) {
                var active = stop.status === 'active';
                var done   = stop.status === 'delivered';
                var isBursting = burstId === stop.id;

                return (
                  <motion.div key={stop.recipient + i}
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.13, duration: 0.5, type: 'spring', stiffness: 280, damping: 24 }}
                    style={{
                      borderBottom: i < localStops.length - 1 ? '1px solid #F9F8F6' : 'none',
                      background: active ? '#FAFAF8' : 'transparent',
                      transition: 'background 0.3s',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: '16px', alignItems: 'start', padding: '16px 24px' }}>

                      {/* Icon */}
                      <div style={{ paddingTop: '1px', position: 'relative' }}>
                        {isBursting && <ConfettiBurst />}
                        {done ? (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}>
                            <CheckCircle2 size={18} color="#10B981" strokeWidth={2} />
                          </motion.div>
                        ) : active ? (
                          <div style={{ position: 'relative', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {/* Breathing ring */}
                            <motion.div
                              animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                              style={{ position: 'absolute', width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #111827' }}
                            />
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#111827' }} />
                          </div>
                        ) : (
                          <Circle size={18} color="#D1D5DB" strokeWidth={1.5} />
                        )}
                      </div>

                      {/* Content */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '14px', fontWeight: active ? 600 : 500, color: done ? '#9CA3AF' : '#111827', textDecoration: done ? 'line-through' : 'none', transition: 'color 0.3s' }}>
                            {stop.recipient}
                          </span>
                          {active && <span className="mono" style={{ fontSize: '9px', color: '#111827', background: '#F3F4F6', padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.08em' }}>NEXT DROP</span>}
                          {done   && <span className="mono" style={{ fontSize: '9px', color: '#10B981', background: '#F0FDF4', padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.08em' }}>DELIVERED</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={10} color="#9CA3AF" /> {stop.address}
                          </span>
                        </div>
                        <p className="mono" style={{ fontSize: '11px', color: '#111827', marginBottom: '6px' }}>{stop.pkg} · {stop.window}</p>

                        {/* Agent reasoning */}
                        <AnimatePresence>
                          {stop.reasoning && (
                            <motion.div
                              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                              style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', borderLeft: '2px solid #3B82F6', marginTop: '6px' }}
                            >
                              <p style={{ fontSize: '11px', color: '#475569', fontFamily: 'Space Grotesk, sans-serif', margin: 0, display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                <Zap size={10} color="#3B82F6" style={{ marginTop: '2px', flexShrink: 0 }} />
                                <span>{stop.reasoning}</span>
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Active stop actions */}
                        <AnimatePresence>
                          {active && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                              style={{ display: 'flex', gap: '8px', marginTop: '12px' }}
                            >
                              <motion.button
                                whileHover={{ scale: 1.04, boxShadow: '0 4px 16px rgba(16,185,129,0.2)' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={function () { handleMarkDelivered(stop.id); }}
                                style={{ padding: '8px 16px', background: '#111827', border: 'none', borderRadius: '8px', color: '#FFFFFF', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif', transition: 'opacity 0.15s', position: 'relative', overflow: 'visible' }}
                              >
                                Mark Delivered →
                              </motion.button>
                              <motion.button
                                whileHover={{ borderColor: '#3B82F6', color: '#3B82F6', scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={function () { handleNavigate(stop); }}
                                style={{ padding: '8px 14px', background: 'transparent', border: '1px solid #E5E4DE', borderRadius: '8px', color: '#6B7280', fontSize: '12px', cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif', transition: 'all 0.15s' }}
                              >
                                Navigate ↗
                              </motion.button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Stop number */}
                      <span className="mono" style={{ fontSize: '11px', color: '#D1D5DB', paddingTop: '2px' }}>
                        0{i + 1}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Completion banner */}
            <AnimatePresence>
              {complete && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  style={{ padding: '16px 24px', background: '#F0FDF4', borderTop: '1px solid #D1FAE5', display: 'flex', alignItems: 'center', gap: '10px', animation: 'completion-glow 2s ease-out forwards' }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 0.8, repeat: 3 }}
                  >
                    <CheckCircle2 size={16} color="#10B981" />
                  </motion.div>
                  <span className="mono" style={{ fontSize: '11px', color: '#10B981', letterSpacing: '0.08em' }}>ALL DELIVERIES COMPLETE · KOCHI ZONE ALPHA</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}

export default SubsidiaryDashboard;
