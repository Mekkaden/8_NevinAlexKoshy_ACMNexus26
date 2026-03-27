import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';

const INVENTORY = [
  { sku: 'SKU-4421', name: 'Industrial Bearings',    qty: 340,  unit: 'pcs',   status: 'nominal' },
  { sku: 'SKU-8812', name: 'Hydraulic Fluid 5L',     qty: 88,   unit: 'cans',  status: 'low' },
  { sku: 'SKU-2290', name: 'Control Modules',         qty: 12,   unit: 'units', status: 'critical' },
  { sku: 'SKU-5503', name: 'Safety Mesh Rolls',       qty: 210,  unit: 'rolls', status: 'nominal' },
  { sku: 'SKU-7714', name: 'Copper Cable 50m',        qty: 54,   unit: 'reels', status: 'low' },
];

const SHIPMENTS = [
  { id: 'SHP-001', carrier: 'TRK-007', eta: '11:30', cargo: 'Control Modules ×50',   from: 'BLR Hub' },
  { id: 'SHP-002', carrier: 'TRK-012', eta: '14:15', cargo: 'Hydraulic Fluid ×200',  from: 'CBE Depot' },
  { id: 'SHP-003', carrier: 'TRK-009', eta: '17:00', cargo: 'Mixed Cargo 4.2T',      from: 'BLR Hub', rerouted: true },
];

const STATUS_COLOR = { nominal: '#34D399', low: '#FBBF24', critical: '#F87171' };

function NodeDashboard() {
  const rootRef = useRef(null);
  const [dispatchLog, setDispatchLog] = useState([]);
  const [optimizing, setOptimizing]  = useState(false);
  const [listReady, setListReady]    = useState(false);

  useEffect(function () {
    const ctx = gsap.context(function () {
      gsap.from('.g-heading', { opacity: 0, y: 28, duration: 0.75, ease: 'power3.out' });
      gsap.from('.g-metric',  { opacity: 0, y: 16, stagger: 0.07, delay: 0.3, duration: 0.5 });
      gsap.from('.g-section', { opacity: 0, y: 14, stagger: 0.08, delay: 0.5, duration: 0.5 });
    }, rootRef);
    setTimeout(function () { setListReady(true); }, 300);
    return function () { ctx.revert(); };
  }, []);

  function handleOptimize() {
    if (optimizing) return;
    setOptimizing(true);
    setDispatchLog([]);
    const steps = [
      'Analyzing current inventory levels…',
      'Cross-referencing incoming shipments…',
      'Prioritizing critical SKUs (Control Modules)…',
      'Assigning dock bays to TRK-007, TRK-012…',
      '✓ Dispatch schedule optimized.',
    ];
    steps.forEach(function (step, i) {
      setTimeout(function () {
        setDispatchLog(function (prev) { return [...prev, step]; });
        if (i === steps.length - 1) setOptimizing(false);
      }, (i + 1) * 650);
    });
  }

  const critical = INVENTORY.filter(function (i) { return i.status === 'critical'; }).length;
  const low      = INVENTORY.filter(function (i) { return i.status === 'low'; }).length;

  return (
    <div ref={rootRef} style={{ background: '#09090B', minHeight: 'calc(100vh - 49px)', padding: '48px' }}>

      {/* Header */}
      <div style={{ marginBottom: '48px' }}>
        <p className="g-heading mono" style={{ fontSize: '11px', color: '#3F3F46', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>Subsidiary Node · KOCHI-01</p>
        <h1 className="g-heading" style={{ fontSize: '40px', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: '#FAFAFA' }}>Node Operations</h1>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: '#27272A', borderTop: '1px solid #27272A', borderBottom: '1px solid #27272A', marginBottom: '48px' }}>
        {[
          { label: 'Total SKUs',      val: INVENTORY.length, color: '#FAFAFA' },
          { label: 'Low Stock',       val: low,              color: low > 0 ? '#FBBF24' : '#52525B' },
          { label: 'Critical',        val: critical,         color: critical > 0 ? '#F87171' : '#52525B' },
        ].map(function (m) {
          return (
            <div key={m.label} className="g-metric" style={{ padding: '28px 0', background: '#09090B' }}>
              <div className="mono" style={{ fontSize: '11px', color: '#3F3F46', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>{m.label}</div>
              <div style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'DM Mono, monospace', color: m.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{m.val}</div>
            </div>
          );
        })}
      </div>

      {/* Inventory table */}
      <div className="g-section" style={{ marginBottom: '48px' }}>
        <p className="mono" style={{ fontSize: '11px', color: '#3F3F46', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '20px' }}>
          Local Inventory
        </p>

        {/* Table head */}
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 80px 64px', gap: '16px', padding: '0 0 12px', borderBottom: '1px solid #27272A' }}>
          {['SKU', 'Description', 'Qty', 'Unit', 'Status'].map(function (h) {
            return <span key={h} className="mono" style={{ fontSize: '11px', color: '#3F3F46', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</span>;
          })}
        </div>

        <AnimatePresence>
          {listReady && INVENTORY.map(function (item, i) {
            return (
              <motion.div
                key={item.sku}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.4, ease: 'easeOut' }}
                style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 80px 64px', gap: '16px', padding: '16px 0', borderBottom: '1px solid #111113', alignItems: 'center' }}
              >
                <span className="mono" style={{ fontSize: '12px', color: '#3F3F46' }}>{item.sku}</span>
                <span style={{ fontSize: '14px', color: '#A1A1AA' }}>{item.name}</span>
                <span className="mono" style={{ fontSize: '14px', color: '#FAFAFA', fontWeight: 500 }}>{item.qty}</span>
                <span className="mono" style={{ fontSize: '12px', color: '#52525B' }}>{item.unit}</span>
                <span className="mono" style={{ fontSize: '11px', color: STATUS_COLOR[item.status], letterSpacing: '0.06em', textTransform: 'uppercase' }}>{item.status}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Incoming shipments */}
      <div className="g-section" style={{ marginBottom: '48px', borderTop: '1px solid #27272A', paddingTop: '32px' }}>
        <p className="mono" style={{ fontSize: '11px', color: '#3F3F46', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '20px' }}>
          Incoming Today — {SHIPMENTS.length} shipments
        </p>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {SHIPMENTS.map(function (shp, i) {
            return (
              <motion.div
                key={shp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '16px 0', borderBottom: '1px solid #111113' }}
              >
                <span className="mono" style={{ fontSize: '14px', color: '#FAFAFA', fontWeight: 500, minWidth: '40px' }}>{shp.eta}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', color: '#A1A1AA', marginBottom: '2px' }}>{shp.cargo}</div>
                  <div className="mono" style={{ fontSize: '11px', color: '#3F3F46' }}>{shp.id} · {shp.carrier} · from {shp.from}</div>
                </div>
                {shp.rerouted && (
                  <span className="mono" style={{ fontSize: '10px', color: '#FBBF24', border: '1px solid #3F3F46', borderRadius: '4px', padding: '2px 8px', letterSpacing: '0.06em' }}>
                    REROUTED
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Optimize dispatch */}
      <div className="g-section" style={{ borderTop: '1px solid #27272A', paddingTop: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <p className="mono" style={{ fontSize: '11px', color: '#3F3F46', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>AI Dispatch Optimizer</p>
            <p style={{ fontSize: '14px', color: '#52525B' }}>Run AI-assisted delivery sequencing</p>
          </div>
          <button
            onClick={handleOptimize}
            disabled={optimizing}
            style={{
              padding: '10px 20px', background: optimizing ? 'transparent' : '#FAFAFA',
              border: '1px solid #FAFAFA', borderRadius: '6px',
              color: optimizing ? '#FAFAFA' : '#09090B', fontSize: '13px', fontWeight: 600,
              cursor: optimizing ? 'not-allowed' : 'pointer', opacity: optimizing ? 0.4 : 1,
              fontFamily: 'Space Grotesk, sans-serif', transition: 'all 0.15s',
            }}
          >
            {optimizing ? 'Running…' : 'Run Optimization →'}
          </button>
        </div>

        {dispatchLog.length > 0 && (
          <div style={{ background: '#111113', border: '1px solid #27272A', borderRadius: '6px', padding: '20px' }}>
            {dispatchLog.map(function (line, i) {
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                  className="mono" style={{ fontSize: '13px', color: line.startsWith('✓') ? '#34D399' : '#71717A', lineHeight: 1.8 }}>
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
