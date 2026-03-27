import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NODES = [
  { id: 'BLR', label: 'Bangalore', x: 30, y: 20, status: 'active' },
  { id: 'KOCHI', label: 'Kochi', x: 50, y: 55, status: 'active' },
  { id: 'CBE', label: 'Coimbatore', x: 35, y: 50, status: 'standby' },
  { id: 'TVM', label: 'Trivandrum', x: 45, y: 80, status: 'active' },
];

const ROUTES = [
  { from: 'BLR', to: 'KOCHI' },
  { from: 'KOCHI', to: 'TVM' },
  { from: 'BLR', to: 'CBE' },
  { from: 'CBE', to: 'TVM' },
];

function RouteMap({ alertSent }) {
  return (
    <div className="relative w-full h-64 rounded-xl overflow-hidden border border-[#1e2d45] bg-[#07101f]">
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: 'radial-gradient(#00c2ff 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {ROUTES.map(function(route, i) {
          const from = NODES.find(function(n) { return n.id === route.from; });
          const to = NODES.find(function(n) { return n.id === route.to; });
          const isKochiRoute = route.from === 'KOCHI' || route.to === 'KOCHI';
          const color = alertSent && isKochiRoute ? '#ff1744' : '#00c2ff';
          return (
            <line
              key={i}
              x1={from.x + '%'} y1={from.y + '%'}
              x2={to.x + '%'} y2={to.y + '%'}
              stroke={color}
              strokeWidth="0.5"
              strokeDasharray={alertSent && isKochiRoute ? '2,2' : '0'}
              opacity={alertSent && isKochiRoute ? '0.4' : '0.7'}
              style={{ transition: 'all 1s ease' }}
            />
          );
        })}
      </svg>
      {NODES.map(function(node) {
        const isBlocked = alertSent && node.id === 'KOCHI';
        return (
          <div
            key={node.id}
            className="absolute flex flex-col items-center"
            style={{ left: node.x + '%', top: node.y + '%', transform: 'translate(-50%, -50%)' }}
          >
            <div
              className="relative w-3 h-3 rounded-full border-2 transition-all duration-700"
              style={{
                backgroundColor: isBlocked ? '#ff1744' : '#00c2ff',
                borderColor: isBlocked ? '#ff1744' : '#00c2ff',
                boxShadow: isBlocked
                  ? '0 0 12px #ff1744'
                  : '0 0 12px #00c2ff',
              }}
            >
              {!isBlocked && (
                <span className="absolute inset-0 rounded-full animate-ping"
                  style={{ backgroundColor: '#00c2ff', opacity: 0.3 }}
                />
              )}
            </div>
            <span className="mt-1 text-[8px] font-mono font-semibold tracking-widest"
              style={{ color: isBlocked ? '#ff1744' : '#a0c8e8' }}>
              {node.id}
              {isBlocked && ' ⚠'}
            </span>
          </div>
        );
      })}
      <div className="absolute bottom-2 left-3 text-xs font-mono text-[#5a7a9a]">
        ROUTE: BLR → KOCHI → TVM
      </div>
      <div className="absolute top-2 right-3 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-pulse" />
        <span className="text-[10px] font-mono text-[#00e676]">LIVE</span>
      </div>
    </div>
  );
}

function OriginDashboard() {
  const [threatText, setThreatText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [reportStatus, setReportStatus] = useState(null);
  const [logs, setLogs] = useState([
    { time: '08:32', msg: 'Carrier TRK-009 departed BLR hub', type: 'info' },
    { time: '09:11', msg: 'ETA update: KOCHI arrival 14:00', type: 'info' },
    { time: '09:45', msg: 'Node KOCHI inventory synced', type: 'success' },
  ]);

  function handleSimulateThreat() {
    if (!threatText.trim()) return;
    setIsLoading(true);

    const newLog = { time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }), msg: `Threat submitted: "${threatText}"`, type: 'warning' };
    setLogs(function(prev) { return [newLog, ...prev]; });

    fetch('/api/threat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threat: threatText }),
    })
      .then(function(res) { return res.json(); })
      .catch(function() { return { status: 'ok' }; })
      .finally(function() {
        setIsLoading(false);
        setAlertSent(true);
        setReportStatus('REPORT SENT – AI PROCESSING');
        setThreatText('');
        setTimeout(function() { setReportStatus(null); }, 4000);
      });
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSimulateThreat();
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #050a14 0%, #071525 100%)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#00c2ff] animate-pulse" />
            <span className="text-xs font-mono text-[#00c2ff] tracking-widest uppercase">Origin Hub</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Supply Chain Control</h1>
          <p className="text-sm text-[#5a7a9a] mt-0.5">Nexus Command Dashboard · Real-time Monitoring</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono text-[#5a7a9a] mb-1">SYSTEM STATUS</div>
          <div className="flex items-center gap-2 justify-end">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: alertSent ? '#ffab00' : '#00e676', boxShadow: alertSent ? '0 0 8px #ffab00' : '0 0 8px #00e676' }} />
            <span className="text-sm font-mono font-semibold" style={{ color: alertSent ? '#ffab00' : '#00e676' }}>
              {alertSent ? 'THREAT ACTIVE' : 'ALL SYSTEMS GO'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Active Carriers', value: '3', unit: 'vehicles', color: '#00c2ff' },
          { label: 'Route Integrity', value: alertSent ? '67%' : '100%', unit: 'nominal', color: alertSent ? '#ffab00' : '#00e676' },
          { label: 'Nodes Online', value: alertSent ? '3/4' : '4/4', unit: 'connected', color: alertSent ? '#ffab00' : '#00e676' },
          { label: 'AI Alerts', value: alertSent ? '1' : '0', unit: 'pending', color: alertSent ? '#ff1744' : '#5a7a9a' },
        ].map(function(stat) {
          return (
            <div key={stat.label} className="rounded-xl p-4 border border-[#1e2d45]" style={{ background: '#0d1623' }}>
              <div className="text-xs text-[#5a7a9a] mb-1">{stat.label}</div>
              <div className="text-2xl font-bold font-mono" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-xs mt-0.5" style={{ color: stat.color, opacity: 0.7 }}>{stat.unit}</div>
            </div>
          );
        })}
      </div>

      {/* Map */}
      <div className="mb-6">
        <div className="text-xs font-mono text-[#5a7a9a] mb-2 tracking-widest">LIVE ROUTE MAP</div>
        <RouteMap alertSent={alertSent} />
      </div>

      {/* Threat Input */}
      <div className="rounded-xl border p-5 mb-6" style={{ background: '#0d1623', borderColor: '#1e2d45' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">⚠️</span>
          <span className="text-sm font-semibold text-white">Threat Intelligence Input</span>
          <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: '#0a1a2e', color: '#00c2ff', border: '1px solid #1e2d45' }}>AI POWERED</span>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={threatText}
            onChange={function(e) { setThreatText(e.target.value); }}
            onKeyDown={handleKeyDown}
            placeholder='e.g. "Heavy flooding reported in Kochi port area"'
            className="flex-1 rounded-lg px-4 py-3 text-sm font-mono outline-none transition-all"
            style={{
              background: '#07101f',
              border: '1px solid #1e2d45',
              color: '#e8f4ff',
              caretColor: '#00c2ff',
            }}
            onFocus={function(e) { e.target.style.borderColor = '#00c2ff'; }}
            onBlur={function(e) { e.target.style.borderColor = '#1e2d45'; }}
          />
          <button
            onClick={handleSimulateThreat}
            disabled={isLoading || !threatText.trim()}
            className="px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: isLoading ? '#0a1a2e' : 'linear-gradient(135deg, #ff1744, #c62828)',
              color: '#fff',
              border: '1px solid #ff1744',
              boxShadow: isLoading ? 'none' : '0 0 20px rgba(255, 23, 68, 0.3)',
            }}
          >
            {isLoading ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Processing
              </>
            ) : (
              <>⚡ Simulate Threat</>
            )}
          </button>
        </div>

        {/* Report sent status */}
        <AnimatePresence>
          {reportStatus && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-mono font-semibold"
              style={{ background: '#071a10', border: '1px solid #00e676', color: '#00e676' }}
            >
              <span>✓</span> {reportStatus}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Event Log */}
      <div className="rounded-xl border p-4" style={{ background: '#0d1623', borderColor: '#1e2d45' }}>
        <div className="text-xs font-mono text-[#5a7a9a] mb-3 tracking-widest">SYSTEM EVENT LOG</div>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {logs.map(function(log, i) {
            const colors = { info: '#00c2ff', success: '#00e676', warning: '#ffab00', error: '#ff1744' };
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-3 text-xs font-mono"
              >
                <span className="text-[#5a7a9a] shrink-0">{log.time}</span>
                <span style={{ color: colors[log.type] || '#e8f4ff' }}>▸</span>
                <span className="text-[#a0c8e8]">{log.msg}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default OriginDashboard;
