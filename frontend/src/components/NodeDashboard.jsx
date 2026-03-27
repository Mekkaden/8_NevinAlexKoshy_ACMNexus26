import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { Package, AlertTriangle, TruckIcon, Cpu } from 'lucide-react';
import Layout, { Card, StatCard, SectionLabel } from './Layout';

const INVENTORY = [
  { sku: 'SKU-4421', name: 'Industrial Bearings',  qty: 340, unit: 'pcs',   status: 'nominal' },
  { sku: 'SKU-8812', name: 'Hydraulic Fluid 5L',   qty: 88,  unit: 'cans',  status: 'low' },
  { sku: 'SKU-2290', name: 'Control Modules',       qty: 12,  unit: 'units', status: 'critical' },
  { sku: 'SKU-5503', name: 'Safety Mesh Rolls',     qty: 210, unit: 'rolls', status: 'nominal' },
  { sku: 'SKU-7714', name: 'Copper Cable 50m',      qty: 54,  unit: 'reels', status: 'low' },
];

const SHIPMENTS = [
  { id: 'SHP-001', carrier: 'TRK-007', eta: '11:30', cargo: 'Control Modules ×50',  from: 'BLR Hub' },
  { id: 'SHP-002', carrier: 'TRK-012', eta: '14:15', cargo: 'Hydraulic Fluid ×200', from: 'CBE Depot' },
  { id: 'SHP-003', carrier: 'TRK-009', eta: '17:00', cargo: 'Mixed Cargo 4.2T',     from: 'BLR Hub', rerouted: true },
];

const STATUS_STYLES = {
  nominal:  { color: '#10B981', bg: '#F0FDF4' },
  low:      { color: '#F59E0B', bg: '#FFFBEB' },
  critical: { color: '#EF4444', bg: '#FEF2F2' },
};

function NodeDashboard() {
  const contentRef  = useRef(null);
  const [listReady, setListReady]     = useState(false);
  const [dispatchLog, setDispatchLog] = useState([]);
  const [optimizing, setOptimizing]   = useState(false);

  useEffect(function () {
    const ctx = gsap.context(function () {
      gsap.from('.g-stat', { opacity: 0, y: 14, stagger: 0.07, duration: 0.5 });
      gsap.from('.g-card', { opacity: 0, y: 16, stagger: 0.08, delay: 0.25, duration: 0.5 });
    }, contentRef);
    setTimeout(function () { setListReady(true); }, 300);
    return function () { ctx.revert(); };
  }, []);

  function handleOptimize() {
    if (optimizing) return;
    setOptimizing(true); setDispatchLog([]);
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
    <Layout title="Node Operations · KOCHI-01" status="OPERATIONAL">
      <div ref={contentRef}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {[
            { label: 'Total SKUs',      value: String(INVENTORY.length), sub: 'tracked items',      accent: '#3B82F6', icon: Package },
            { label: 'Critical',        value: String(critical),         sub: critical ? 'reorder now' : 'none critical', accent: critical ? '#EF4444' : '#9CA3AF', icon: AlertTriangle },
            { label: 'Low Stock',       value: String(low),              sub: low ? 'monitor closely' : 'all ok', accent: low ? '#F59E0B' : '#9CA3AF', icon: Package },
            { label: 'Incoming Today',  value: String(SHIPMENTS.length), sub: 'shipments expected', accent: '#10B981', icon: TruckIcon },
          ].map(function (s) { return <div key={s.label} className="g-stat"><StatCard {...s} /></div>; })}
        </div>

        {/* Table + Incoming side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '14px', marginBottom: '14px' }}>

          {/* Inventory table */}
          <Card className="g-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 14px' }}>
              <SectionLabel>Local Inventory</SectionLabel>
            </div>

            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 64px 56px 76px', gap: '12px', padding: '0 24px 10px', borderBottom: '1px solid #F3F4F6' }}>
              {['SKU', 'Description', 'Qty', 'Unit', 'Status'].map(function (h) {
                return <span key={h} className="mono" style={{ fontSize: '10px', color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</span>;
              })}
            </div>

            <AnimatePresence>
              {listReady && INVENTORY.map(function (item, i) {
                const s = STATUS_STYLES[item.status];
                return (
                  <motion.div key={item.sku}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.35 }}
                    style={{ display: 'grid', gridTemplateColumns: '90px 1fr 64px 56px 76px', gap: '12px', padding: '13px 24px', borderBottom: i < INVENTORY.length - 1 ? '1px solid #F9F8F6' : 'none', alignItems: 'center' }}
                    onMouseEnter={function (e) { e.currentTarget.style.background = '#FAFAF8'; }}
                    onMouseLeave={function (e) { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span className="mono" style={{ fontSize: '11px', color: '#9CA3AF' }}>{item.sku}</span>
                    <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>{item.name}</span>
                    <span className="mono" style={{ fontSize: '14px', color: '#111827', fontWeight: 600 }}>{item.qty}</span>
                    <span className="mono" style={{ fontSize: '11px', color: '#9CA3AF' }}>{item.unit}</span>
                    <span className="mono" style={{ fontSize: '10px', color: s.color, background: s.bg, padding: '3px 8px', borderRadius: '20px', display: 'inline-block', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{item.status}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </Card>

          {/* Incoming shipments + optimizer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Card className="g-card">
              <SectionLabel>Incoming Today</SectionLabel>
              {SHIPMENTS.map(function (shp, i) {
                return (
                  <motion.div key={shp.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    style={{ padding: '10px 0', borderBottom: i < SHIPMENTS.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span className="mono" style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{shp.eta}</span>
                      {shp.rerouted && <span className="mono" style={{ fontSize: '9px', color: '#F59E0B', background: '#FFFBEB', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.06em' }}>REROUTED</span>}
                    </div>
                    <p style={{ fontSize: '12px', color: '#374151', marginBottom: '1px' }}>{shp.cargo}</p>
                    <p className="mono" style={{ fontSize: '10px', color: '#9CA3AF' }}>{shp.id} · {shp.carrier}</p>
                  </motion.div>
                );
              })}
            </Card>

            {/* AI Optimizer */}
            <Card className="g-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Cpu size={14} color="#6B7280" />
                <SectionLabel>AI Optimizer</SectionLabel>
              </div>
              <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '14px' }}>AI-assisted dispatch sequencing</p>
              <button onClick={handleOptimize} disabled={optimizing}
                style={{ width: '100%', padding: '10px', background: optimizing ? '#F9F8F4' : '#111827', border: '1px solid', borderColor: optimizing ? '#E5E4DE' : '#111827', borderRadius: '8px', color: optimizing ? '#9CA3AF' : '#FFFFFF', fontSize: '12px', fontWeight: 600, cursor: optimizing ? 'not-allowed' : 'pointer', fontFamily: 'Space Grotesk, sans-serif', marginBottom: dispatchLog.length > 0 ? '12px' : '0', transition: 'all 0.15s' }}>
                {optimizing ? 'Running…' : 'Run Optimization →'}
              </button>
              {dispatchLog.length > 0 && (
                <div style={{ background: '#F9F8F4', borderRadius: '8px', padding: '12px' }}>
                  {dispatchLog.map(function (line, i) {
                    return (
                      <motion.p key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="mono" style={{ fontSize: '11px', color: line.startsWith('✓') ? '#10B981' : '#6B7280', lineHeight: 1.9 }}>
                        {line}
                      </motion.p>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default NodeDashboard;
