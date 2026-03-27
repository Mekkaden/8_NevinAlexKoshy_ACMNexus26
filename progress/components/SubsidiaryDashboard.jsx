import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DELIVERY_STOPS = [
  { id: 1, address: '12, MG Road, Ernakulam', recipient: 'Kerala Industrial Co.', pkg: 'Control Modules ×10', time: '10:00 – 10:30', status: 'delivered' },
  { id: 2, address: '7, Marine Drive, Kochi', recipient: 'Coastal Supplies Ltd.', pkg: 'Safety Mesh ×20 rolls', time: '11:00 – 11:30', status: 'delivered' },
  { id: 3, address: '45, Palarivattom Jn.', recipient: 'TechNode Hardware', pkg: 'Hydraulic Fluid ×12 cans', time: '12:00 – 12:30', status: 'active' },
  { id: 4, address: '3, Edappally Toll, NH-66', recipient: 'GenTech Solutions', pkg: 'Copper Cable ×8 reels', time: '13:30 – 14:00', status: 'upcoming' },
  { id: 5, address: '88, CSEZ Gate, Kakkanad', recipient: 'Nexus Warehouse Alpha', pkg: 'Mixed Cargo 0.8T', time: '15:00 – 15:45', status: 'upcoming' },
];

function SubsidiaryDashboard() {
  const [stops, setStops] = useState([]);
  const [progress, setProgress] = useState(40);

  useEffect(function() {
    const timer = setTimeout(function() { setStops(DELIVERY_STOPS); }, 300);
    return function() { clearTimeout(timer); };
  }, []);

  function handleMarkDelivered(id) {
    setStops(function(prev) {
      const idx = prev.findIndex(function(s) { return s.id === id; });
      const updated = prev.map(function(s, i) {
        if (s.id === id) return Object.assign({}, s, { status: 'delivered' });
        if (i === idx + 1 && s.status !== 'delivered') return Object.assign({}, s, { status: 'active' });
        return s;
      });
      const done = updated.filter(function(s) { return s.status === 'delivered'; }).length;
      setProgress(Math.round((done / updated.length) * 100));
      return updated;
    });
  }

  const delivered = stops.filter(function(s) { return s.status === 'delivered'; }).length;
  const statusColor = { delivered: '#00e676', active: '#00c2ff', upcoming: '#2a3d55' };
  const statusLabel = { delivered: 'DELIVERED', active: 'EN ROUTE', upcoming: 'PENDING' };
  const statusText = { delivered: '#00e676', active: '#00c2ff', upcoming: '#5a7a9a' };

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #050a14 0%, #071525 100%)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📦</span>
            <span className="text-xs font-mono text-[#00c2ff] tracking-widest uppercase">Subsidiary Branch · KOCHI-LM</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Last-Mile Delivery</h1>
          <p className="text-sm text-[#5a7a9a] mt-0.5">5 stops · Kochi Zone Alpha</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono text-[#5a7a9a] mb-1">PROGRESS</div>
          <div className="text-2xl font-black font-mono" style={{ color: '#00c2ff' }}>{delivered}/{stops.length}</div>
          <div className="text-xs text-[#5a7a9a] font-mono">completed</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-mono text-[#5a7a9a]">ROUTE COMPLETION</span>
          <span className="text-xs font-mono font-bold" style={{ color: progress === 100 ? '#00e676' : '#00c2ff' }}>{progress}%</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#1e2d45' }}>
          <motion.div
            className="h-full rounded-full"
            animate={{ width: progress + '%' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            style={{ background: progress === 100 ? '#00e676' : 'linear-gradient(90deg, #00c2ff, #0077ff)', boxShadow: '0 0 10px rgba(0,194,255,0.5)' }}
          />
        </div>
      </div>

      {/* Stop list */}
      <div className="space-y-3">
        <AnimatePresence>
          {stops.map(function(stop, i) {
            const isActive = stop.status === 'active';
            const isDone = stop.status === 'delivered';

            return (
              <motion.div
                key={stop.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  delay: i * 0.12,
                  type: 'spring',
                  stiffness: 280,
                  damping: 24,
                }}
                className="rounded-xl border overflow-hidden transition-all"
                style={{
                  background: isActive ? 'rgba(0,194,255,0.05)' : isDone ? 'rgba(0,230,118,0.03)' : '#0d1623',
                  borderColor: isActive ? '#00c2ff40' : isDone ? '#00e67630' : '#1e2d45',
                }}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Stop number */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                      style={{
                        background: isDone ? '#00e676' : isActive ? '#00c2ff' : '#1e2d45',
                        color: isDone || isActive ? '#050a14' : '#5a7a9a',
                        boxShadow: isActive ? '0 0 16px rgba(0,194,255,0.5)' : isDone ? '0 0 12px rgba(0,230,118,0.4)' : 'none',
                      }}
                    >
                      {isDone ? '✓' : stop.id}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white truncate">{stop.recipient}</span>
                        <span
                          className="shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full tracking-widest"
                          style={{
                            color: statusText[stop.status],
                            background: statusColor[stop.status] + '18',
                            border: `1px solid ${statusColor[stop.status]}40`,
                          }}
                        >
                          {statusLabel[stop.status]}
                        </span>
                      </div>
                      <div className="text-xs text-[#5a7a9a] mb-1 truncate">📍 {stop.address}</div>
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span style={{ color: '#a0c8e8' }}>📦 {stop.pkg}</span>
                        <span className="text-[#5a7a9a]">🕐 {stop.time}</span>
                      </div>
                    </div>
                  </div>

                  {/* Active stop action */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-[#1e2d45] flex items-center gap-3"
                      >
                        <button
                          onClick={function() { handleMarkDelivered(stop.id); }}
                          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                          style={{ background: 'linear-gradient(135deg, #00c2ff, #0077ff)', color: '#fff', boxShadow: '0 0 16px rgba(0,194,255,0.3)' }}
                          onMouseEnter={function(e) { e.currentTarget.style.boxShadow = '0 0 24px rgba(0,194,255,0.6)'; }}
                          onMouseLeave={function(e) { e.currentTarget.style.boxShadow = '0 0 16px rgba(0,194,255,0.3)'; }}
                        >
                          ✓ Mark Delivered
                        </button>
                        <button
                          className="px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                          style={{ background: '#0d1e30', border: '1px solid #1e2d45', color: '#5a7a9a' }}
                        >
                          Navigate
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Active pulse bar */}
                {isActive && (
                  <motion.div
                    className="h-0.5 w-full"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    style={{ background: 'linear-gradient(90deg, transparent, #00c2ff, transparent)' }}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Complete state */}
      <AnimatePresence>
        {progress === 100 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="mt-6 rounded-xl p-6 text-center border"
            style={{ background: 'rgba(0,230,118,0.05)', borderColor: '#00e67640' }}
          >
            <div className="text-4xl mb-2">🎉</div>
            <div className="text-lg font-bold text-[#00e676]">All Deliveries Complete!</div>
            <div className="text-sm text-[#5a7a9a] mt-1">Kochi Zone Alpha route finished.</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SubsidiaryDashboard;
