import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:4000';

function EmergencyModal({ newRoute, onDismiss }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Pulsing red background glow */}
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: [0.15, 0.35, 0.15] }}
        transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
        style={{ background: 'radial-gradient(ellipse at center, rgba(255,23,68,0.6) 0%, transparent 70%)' }}
      />

      <motion.div
        className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
        initial={{ scale: 0.5, y: 60 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        style={{
          background: 'linear-gradient(135deg, #1a0007 0%, #2d0010 100%)',
          border: '2px solid #ff1744',
          boxShadow: '0 0 60px rgba(255,23,68,0.7), 0 0 120px rgba(255,23,68,0.3)',
        }}
      >
        {/* Top bar */}
        <motion.div
          className="h-1.5 w-full"
          style={{ background: '#ff1744' }}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
        />

        <div className="p-8 text-center">
          {/* Alert icon */}
          <motion.div
            className="text-6xl mb-4 inline-block"
            animate={{ rotate: [-5, 5, -5], scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            🚨
          </motion.div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5"
            style={{ background: 'rgba(255,23,68,0.15)', border: '1px solid #ff1744' }}>
            <motion.span
              className="w-2 h-2 rounded-full bg-[#ff1744]"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 0.7 }}
            />
            <span className="text-xs font-mono font-bold text-[#ff1744] tracking-widest uppercase">
              Critical Alert · TRK-009
            </span>
          </div>

          {/* Main heading */}
          <motion.h1
            className="text-3xl font-black tracking-tight mb-2 leading-tight"
            style={{ color: '#ff1744', textShadow: '0 0 30px rgba(255,23,68,0.8)' }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            ROUTE COMPROMISED
          </motion.h1>
          <h2 className="text-xl font-bold text-white mb-6">
            NEW ROUTE ASSIGNED
          </h2>

          {/* Route display */}
          <div className="rounded-xl p-4 mb-6 text-left"
            style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,23,68,0.3)' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-mono text-[#ff6b6b] tracking-widest">COMPROMISED SEGMENT</span>
            </div>
            <div className="font-mono text-sm mb-3 flex items-center gap-2">
              <span className="line-through text-[#5a7a9a]">BLR → KOCHI → TVM</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{ background: 'rgba(255,23,68,0.2)', color: '#ff6b6b' }}>BLOCKED</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-[#00e676] tracking-widest">NEW ACTIVE ROUTE</span>
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-[#00e676]"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
              />
            </div>
            <div className="font-mono text-sm font-bold text-[#00e676]">
              {newRoute || 'BLR → COIMBATORE → TVM'}
            </div>
          </div>

          {/* Instructions */}
          <p className="text-sm text-[#a0c8e8] mb-6 leading-relaxed">
            Kochi route is compromised. Your GPS has been updated.<br />
            Proceed on the alternate route immediately.
          </p>

          <button
            onClick={onDismiss}
            className="w-full py-3.5 rounded-xl font-bold text-sm tracking-widest uppercase transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #ff1744, #c62828)',
              color: '#fff',
              boxShadow: '0 0 24px rgba(255,23,68,0.5)',
            }}
            onMouseEnter={function(e) { e.target.style.boxShadow = '0 0 40px rgba(255,23,68,0.8)'; }}
            onMouseLeave={function(e) { e.target.style.boxShadow = '0 0 24px rgba(255,23,68,0.5)'; }}
          >
            ✓ ACKNOWLEDGE & PROCEED
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CarrierDashboard() {
  const [showModal, setShowModal] = useState(false);
  const [newRoute, setNewRoute] = useState(null);
  const [socketStatus, setSocketStatus] = useState('connecting');
  const [events, setEvents] = useState([]);
  const [currentRoute, setCurrentRoute] = useState('BLR → KOCHI → TVM');
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(function() {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socket.on('connect', function() {
      setSocketStatus('connected');
      setEvents(function(prev) {
        return [{ time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }), msg: 'Connected to dispatch', type: 'success' }, ...prev];
      });
    });

    socket.on('disconnect', function() {
      setSocketStatus('disconnected');
    });

    socket.on('connect_error', function() {
      setSocketStatus('error');
    });

    socket.on('route_updated', function(data) {
      const route = data && data.newRoute ? data.newRoute : 'BLR → COIMBATORE → TVM';
      setNewRoute(route);
      setShowModal(true);
      setEvents(function(prev) {
        return [{ time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }), msg: '⚠ ROUTE_UPDATED received from dispatch', type: 'danger' }, ...prev];
      });
    });

    return function() {
      socket.disconnect();
    };
  }, []);

  function handleDismiss() {
    setShowModal(false);
    setAcknowledged(true);
    if (newRoute) setCurrentRoute(newRoute);
    setEvents(function(prev) {
      return [{ time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }), msg: 'Driver acknowledged new route', type: 'success' }, ...prev];
    });
  }

  function handleTestModal() {
    setNewRoute('BLR → COIMBATORE → TVM');
    setShowModal(true);
  }

  const stops = [
    { name: 'Bangalore Hub', status: 'completed', distance: '0 km' },
    { name: 'Hosur Checkpoint', status: 'completed', distance: '45 km' },
    { name: 'Salem Junction', status: 'active', distance: '120 km' },
    { name: acknowledged ? 'Coimbatore (Alt)' : 'Kochi Port', status: acknowledged ? 'upcoming' : 'upcoming', distance: acknowledged ? '95 km' : '180 km' },
    { name: 'Trivandrum Hub', status: 'upcoming', distance: acknowledged ? '295 km' : '420 km' },
  ];

  const statusColors = { connected: '#00e676', connecting: '#ffab00', disconnected: '#ff1744', error: '#ff1744' };
  const statusLabels = { connected: 'DISPATCH LIVE', connecting: 'CONNECTING…', disconnected: 'OFFLINE', error: 'CONN ERROR' };

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #050a14 0%, #071525 100%)' }}>
      <AnimatePresence>
        {showModal && <EmergencyModal newRoute={newRoute} onDismiss={handleDismiss} />}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🚚</span>
            <span className="text-xs font-mono text-[#00c2ff] tracking-widest uppercase">Heavy Carrier · TRK-009</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Driver Dashboard</h1>
          <p className="text-sm text-[#5a7a9a] mt-0.5">Live Route · Real-time Dispatch</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono text-[#5a7a9a] mb-1">DISPATCH STATUS</div>
          <div className="flex items-center gap-2 justify-end">
            <motion.span
              className="w-2 h-2 rounded-full"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              style={{ backgroundColor: statusColors[socketStatus], boxShadow: `0 0 8px ${statusColors[socketStatus]}` }}
            />
            <span className="text-sm font-mono font-semibold" style={{ color: statusColors[socketStatus] }}>
              {statusLabels[socketStatus]}
            </span>
          </div>
        </div>
      </div>

      {/* Alert banner if acknowledged */}
      <AnimatePresence>
        {acknowledged && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: 'rgba(255,171,0,0.1)', border: '1px solid #ffab00' }}
          >
            <span className="text-lg">⚠️</span>
            <span className="text-sm font-semibold text-[#ffab00]">Route updated — now navigating via Coimbatore</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Route Card */}
      <div className="rounded-xl border p-5 mb-5"
        style={{ background: acknowledged ? 'rgba(255,171,0,0.05)' : '#0d1623', borderColor: acknowledged ? '#ffab00' : '#1e2d45' }}>
        <div className="text-xs font-mono text-[#5a7a9a] mb-2 tracking-widest">ACTIVE ROUTE</div>
        <div className="font-mono text-xl font-bold" style={{ color: acknowledged ? '#ffab00' : '#00c2ff' }}>
          {currentRoute}
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-[#5a7a9a] font-mono">
          <span>ETA: {acknowledged ? '~6.5 hrs' : '~5 hrs'}</span>
          <span>·</span>
          <span>Distance: {acknowledged ? '490 km' : '378 km'}</span>
          <span>·</span>
          <span>Cargo: 4.2T</span>
        </div>
      </div>

      {/* Stop progress */}
      <div className="rounded-xl border p-5 mb-5" style={{ background: '#0d1623', borderColor: '#1e2d45' }}>
        <div className="text-xs font-mono text-[#5a7a9a] mb-4 tracking-widest">ROUTE PROGRESS</div>
        <div className="space-y-0">
          {stops.map(function(stop, i) {
            const isActive = stop.status === 'active';
            const isDone = stop.status === 'completed';
            return (
              <div key={i} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <motion.div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5"
                    animate={isActive ? { boxShadow: ['0 0 0px #00c2ff', '0 0 12px #00c2ff', '0 0 0px #00c2ff'] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    style={{
                      backgroundColor: isDone ? '#00e676' : isActive ? '#00c2ff' : 'transparent',
                      borderColor: isDone ? '#00e676' : isActive ? '#00c2ff' : '#2a3d55',
                      color: isDone ? '#050a14' : isActive ? '#050a14' : 'transparent',
                    }}
                  >
                    {isDone ? '✓' : ''}
                  </motion.div>
                  {i < stops.length - 1 && (
                    <div className="w-0.5 h-8 mt-1" style={{ backgroundColor: isDone ? '#00e676' : '#1e2d45' }} />
                  )}
                </div>
                <div className="pb-6">
                  <div className="text-sm font-semibold" style={{
                    color: isActive ? '#00c2ff' : isDone ? '#00e676' : '#a0c8e8',
                  }}>
                    {stop.name}
                    {isActive && <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,194,255,0.1)', color: '#00c2ff' }}>CURRENT</span>}
                  </div>
                  <div className="text-xs text-[#5a7a9a] font-mono mt-0.5">{stop.distance}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event log */}
      <div className="rounded-xl border p-4 mb-5" style={{ background: '#0d1623', borderColor: '#1e2d45' }}>
        <div className="text-xs font-mono text-[#5a7a9a] mb-3 tracking-widest">DISPATCH LOG</div>
        {events.length === 0 ? (
          <p className="text-xs text-[#5a7a9a] font-mono">Awaiting dispatch events…</p>
        ) : (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {events.map(function(ev, i) {
              const col = ev.type === 'danger' ? '#ff1744' : ev.type === 'success' ? '#00e676' : '#a0c8e8';
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-3 text-xs font-mono">
                  <span className="text-[#5a7a9a] shrink-0">{ev.time}</span>
                  <span style={{ color: col }}>▸ {ev.msg}</span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Test button */}
      <button
        onClick={handleTestModal}
        className="w-full py-3 rounded-xl text-sm font-semibold font-mono tracking-widest uppercase transition-all"
        style={{ background: 'rgba(255,23,68,0.1)', border: '1px dashed #ff1744', color: '#ff6b6b' }}
        onMouseEnter={function(e) { e.currentTarget.style.background = 'rgba(255,23,68,0.2)'; }}
        onMouseLeave={function(e) { e.currentTarget.style.background = 'rgba(255,23,68,0.1)'; }}
      >
        ⚡ Test Emergency Modal
      </button>
    </div>
  );
}

export default CarrierDashboard;
