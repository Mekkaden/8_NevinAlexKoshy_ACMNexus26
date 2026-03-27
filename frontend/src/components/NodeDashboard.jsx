import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const INITIAL_INVENTORY = [
  { sku: 'SKU-4421', name: 'Industrial Bearings', qty: 340, status: 'nominal', unit: 'pcs' },
  { sku: 'SKU-8812', name: 'Hydraulic Fluid 5L', qty: 88, status: 'low', unit: 'cans' },
  { sku: 'SKU-2290', name: 'Control Modules', qty: 12, status: 'critical', unit: 'units' },
  { sku: 'SKU-5503', name: 'Safety Mesh Rolls', qty: 210, status: 'nominal', unit: 'rolls' },
  { sku: 'SKU-7714', name: 'Copper Cable 50m', qty: 54, status: 'low', unit: 'reels' },
];

const INCOMING_SHIPMENTS = [
  { id: 'SHP-001', carrier: 'TRK-007', eta: '11:30', cargo: 'Control Modules ×50', from: 'BLR Hub' },
  { id: 'SHP-002', carrier: 'TRK-012', eta: '14:15', cargo: 'Hydraulic Fluid ×200', from: 'CBE Depot' },
  { id: 'SHP-003', carrier: 'TRK-009', eta: '17:00', cargo: 'Mixed Cargo 4.2T', from: 'BLR Hub', rerouted: true },
];

function NodeDashboard() {
  const [inventory] = useState(INITIAL_INVENTORY);
  const [shipmentsVisible, setShipmentsVisible] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState('idle');
  const [dispatchLog, setDispatchLog] = useState([]);

  useEffect(function() {
    const timer = setTimeout(function() { setShipmentsVisible(true); }, 400);
    return function() { clearTimeout(timer); };
  }, []);

  function handleOptimizeDispatch() {
    setDispatchStatus('running');
    setDispatchLog([]);
    const steps = [
      '→ Analyzing current inventory levels…',
      '→ Cross-referencing incoming shipments…',
      '→ Prioritizing critical SKUs (Control Modules)…',
      '→ Assigning dock bays to TRK-007, TRK-012…',
      '✓ Dispatch schedule optimized!',
    ];
    steps.forEach(function(step, i) {
      setTimeout(function() {
        setDispatchLog(function(prev) { return [...prev, step]; });
        if (i === steps.length - 1) setDispatchStatus('done');
      }, (i + 1) * 700);
    });
  }

  const statusColor = { nominal: '#00e676', low: '#ffab00', critical: '#ff1744' };

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #050a14 0%, #071525 100%)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🏭</span>
            <span className="text-xs font-mono text-[#00c2ff] tracking-widest uppercase">Subsidiary Node · KOCHI-01</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Node Operations</h1>
          <p className="text-sm text-[#5a7a9a] mt-0.5">Inventory Control · Dispatch Management</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono text-[#5a7a9a] mb-1">NODE STATUS</div>
          <div className="flex items-center gap-2 justify-end">
            <span className="w-2 h-2 rounded-full bg-[#00e676]" style={{ boxShadow: '0 0 8px #00e676' }} />
            <span className="text-sm font-mono font-semibold text-[#00e676]">OPERATIONAL</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total SKUs', value: inventory.length, color: '#00c2ff' },
          { label: 'Critical Items', value: inventory.filter(function(i) { return i.status === 'critical'; }).length, color: '#ff1744' },
          { label: 'Incoming Today', value: INCOMING_SHIPMENTS.length, color: '#00e676' },
        ].map(function(stat) {
          return (
            <div key={stat.label} className="rounded-xl p-4 border border-[#1e2d45]" style={{ background: '#0d1623' }}>
              <div className="text-xs text-[#5a7a9a] mb-1">{stat.label}</div>
              <div className="text-3xl font-black font-mono" style={{ color: stat.color }}>{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* Inventory Table */}
      <div className="rounded-xl border overflow-hidden mb-6" style={{ background: '#0d1623', borderColor: '#1e2d45' }}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: '#1e2d45' }}>
          <span className="text-xs font-mono text-[#5a7a9a] tracking-widest">LOCAL INVENTORY</span>
          <span className="text-xs text-[#5a7a9a]">Updated 09:45</span>
        </div>
        <div className="divide-y divide-[#1e2d45]">
          {inventory.map(function(item, i) {
            return (
              <motion.div
                key={item.sku}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, type: 'spring', stiffness: 260, damping: 22 }}
                className="flex items-center gap-4 px-5 py-3 hover:bg-[#0a1829] transition-colors"
              >
                <span className="text-xs font-mono text-[#5a7a9a] w-20 shrink-0">{item.sku}</span>
                <span className="text-sm text-[#e8f4ff] flex-1">{item.name}</span>
                <span className="text-sm font-mono font-semibold text-white w-16 text-right">
                  {item.qty} <span className="text-xs text-[#5a7a9a]">{item.unit}</span>
                </span>
                <span
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0"
                  style={{
                    color: statusColor[item.status],
                    background: statusColor[item.status] + '18',
                    border: `1px solid ${statusColor[item.status]}40`,
                  }}
                >
                  {item.status}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Incoming Shipments */}
      <div className="rounded-xl border overflow-hidden mb-6" style={{ background: '#0d1623', borderColor: '#1e2d45' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: '#1e2d45' }}>
          <span className="text-xs font-mono text-[#5a7a9a] tracking-widest">INCOMING SHIPMENTS TODAY</span>
        </div>
        <div className="p-4 space-y-3">
          <AnimatePresence>
            {shipmentsVisible && INCOMING_SHIPMENTS.map(function(shp, i) {
              return (
                <motion.div
                  key={shp.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15, type: 'spring', stiffness: 260, damping: 22 }}
                  className="flex items-center gap-4 rounded-lg p-3"
                  style={{
                    background: shp.rerouted ? 'rgba(255,171,0,0.06)' : '#07101f',
                    border: `1px solid ${shp.rerouted ? '#ffab0040' : '#1e2d45'}`,
                  }}
                >
                  <div className="text-xs font-mono font-bold px-2 py-1 rounded" style={{ background: '#0a1829', color: '#00c2ff' }}>
                    {shp.eta}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{shp.cargo}</div>
                    <div className="text-xs text-[#5a7a9a] font-mono mt-0.5">{shp.id} · {shp.carrier} · from {shp.from}</div>
                  </div>
                  {shp.rerouted && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(255,171,0,0.15)', color: '#ffab00', border: '1px solid #ffab0040' }}>
                      REROUTED
                    </span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Optimize Dispatch */}
      <div className="rounded-xl border p-5" style={{ background: '#0d1623', borderColor: '#1e2d45' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold text-white">Optimize Local Deliveries</div>
            <div className="text-xs text-[#5a7a9a] mt-0.5">AI-assisted dispatch sequencing</div>
          </div>
          <button
            onClick={handleOptimizeDispatch}
            disabled={dispatchStatus === 'running'}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #00b4d8, #0077b6)', color: '#fff', boxShadow: '0 0 16px rgba(0,180,216,0.3)' }}
          >
            {dispatchStatus === 'running' ? 'Running…' : '⚡ Run Optimization'}
          </button>
        </div>
        {dispatchLog.length > 0 && (
          <div className="rounded-lg p-3 space-y-1.5" style={{ background: '#07101f', border: '1px solid #1e2d45' }}>
            {dispatchLog.map(function(line, i) {
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs font-mono"
                  style={{ color: line.startsWith('✓') ? '#00e676' : '#a0c8e8' }}
                >
                  {line}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default NodeDashboard;
