import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { io } from 'socket.io-client';
import { Package, AlertTriangle, TruckIcon, Cpu } from 'lucide-react';
import Layout, { Card, StatCard, SectionLabel } from './Layout';
import { normalizeNode } from '../nodeUtils';

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
  const [inventory, setInventory]     = useState([]);
  const [allShipments, setAllShipments] = useState([]);
  const [selectedNode, setSelectedNode] = useState('COK');
  const [nodeStatus, setNodeStatus]     = useState('OPERATIONAL');

  function mapShipments(raw) {
    return (raw || []).map(shp => ({
      id: shp.id,
      carrier: shp.truck_id,
      eta: new Date(shp.estimated_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      cargo: shp.cargo,
      from: shp.origin + ' Hub',
      rerouted: shp.rerouted,
      // Normalize next_node: "Coimbatore" → "CBE", "Kochi" → "COK"
      next_node: normalizeNode(shp.next_node),
      status: shp.status,
    }));
  }

  function loadData() {
    return fetch('/api/node')
      .then(r => r.json())
      .then(data => {
        setInventory(data.inventory || []);
        setAllShipments(mapShipments(data.shipments));
      })
      .catch(() => {});
  }

  useEffect(function () {
    loadData();

    const ctx = gsap.context(function () {
      gsap.from('.g-stat', { opacity: 0, y: 14, stagger: 0.07, duration: 0.5 });
      gsap.from('.g-card', { opacity: 0, y: 16, stagger: 0.08, delay: 0.25, duration: 0.5 });
    }, contentRef);
    setTimeout(() => setListReady(true), 300);

    // Poll every 3s for live shipment updates
    const interval = setInterval(loadData, 3000);

    return () => {
      ctx.revert();
      clearInterval(interval);
    };
  }, []);

  // Socket.io — re-fetch immediately when a reroute happens
  useEffect(function () {
    const socket = io('http://localhost:3001', { transports: ['websocket', 'polling'] });

    socket.on('state_updated', function (data) {
      // Update shipments instantly from full state
      if (data.active_shipments) {
        setAllShipments(mapShipments(data.active_shipments));
      }
      if (data.inventory) {
        setInventory(data.inventory);
      }
      // Reflect operational status based on threats
      if (data.threats && data.threats.length > 0) {
        setNodeStatus('THREAT DETECTED');
      } else {
        setNodeStatus('OPERATIONAL');
      }
    });

    socket.on('route_reset', function () {
      setNodeStatus('OPERATIONAL');
      loadData();
    });

    return () => socket.disconnect();
  }, []);

  async function handleOptimize() {
    if (optimizing) return;
    setOptimizing(true);
    setDispatchLog(['Connecting to AI Optimizer...']);

    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Always pass full inventory + all shipments (not filtered)
        body: JSON.stringify({ inventory, shipments: allShipments }),
      });
      const data = await res.json();

      if (data.steps && data.steps.length > 0) {
        setDispatchLog([]);
        data.steps.forEach(function (step, i) {
          setTimeout(function () {
            setDispatchLog(prev => [...prev, step]);
            if (i === data.steps.length - 1) setOptimizing(false);
          }, (i + 1) * 800);
        });
      } else {
        setDispatchLog(['Error: No optimization steps returned.']);
        setOptimizing(false);
      }
    } catch {
      setDispatchLog(['Error connecting to AI Optimizer.']);
      setOptimizing(false);
    }
  }

  const critical = inventory.filter(i => i.status === 'critical').length;
  const low      = inventory.filter(i => i.status === 'low').length;

  // Shipments for the selected node — shown in "Incoming Today"
  const visibleShipments = allShipments.filter(s => s.next_node === selectedNode);

  const NODE_NAMES = {
    COK: 'KOCHI-01',
    CBE: 'COIMBATORE-02',
    MAA: 'CHENNAI-03',
    MDU: 'MADURAI-04',
    IXE: 'MANGALORE-05',
    MYS: 'MYSORE-06',
    SLM: 'SALEM-07',
    HBL: 'HUBLI-08',
    HYD: 'HYDERABAD-09',
    CCJ: 'CALICUT-10',
  };
  const nodeName = NODE_NAMES[selectedNode] || selectedNode;

  // Optimizer can run as long as we have inventory — not gated by filtered shipments
  const canOptimize = !optimizing && inventory.length > 0;

  return (
    <Layout title={`Node Operations · ${nodeName}`} status={nodeStatus} statusOk={nodeStatus === 'OPERATIONAL'}>
      <div ref={contentRef}>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <select
            value={selectedNode}
            onChange={e => setSelectedNode(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#FFFFFF', fontSize: '12px', fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif', outline: 'none', cursor: 'pointer' }}>
            <option value="COK">🟢 KOCHI Transit Node</option>
            <option value="CBE">🟢 COIMBATORE Dist. Node</option>
            <option value="MAA">🟢 CHENNAI Port Hub</option>
            <option value="MDU">🟢 MADURAI Transit Node</option>
            <option value="IXE">🟢 MANGALORE Coastal Depot</option>
            <option value="MYS">🟢 MYSORE Dist. Centre</option>
            <option value="SLM">🟢 SALEM Relay Node</option>
            <option value="HBL">🟢 HUBLI Freight Station</option>
            <option value="HYD">🟢 HYDERABAD Logistics Park</option>
            <option value="CCJ">🟢 CALICUT Gateway Node</option>
          </select>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {[
            { label: 'Total SKUs',     value: String(inventory.length),        sub: 'tracked items',                              accent: '#3B82F6', icon: Package },
            { label: 'Critical',       value: String(critical),                sub: critical ? 'reorder now' : 'none critical',   accent: critical ? '#EF4444' : '#9CA3AF', icon: AlertTriangle },
            { label: 'Low Stock',      value: String(low),                     sub: low ? 'monitor closely' : 'all ok',           accent: low ? '#F59E0B' : '#9CA3AF', icon: Package },
            { label: 'Incoming Today', value: String(allShipments.length),     sub: 'total active shipments',                     accent: '#10B981', icon: TruckIcon },
          ].map(s => <div key={s.label} className="g-stat"><StatCard {...s} /></div>)}
        </div>

        {/* Table + Incoming side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '14px', marginBottom: '14px' }}>

          {/* Inventory table */}
          <Card className="g-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 14px' }}>
              <SectionLabel>Local Inventory</SectionLabel>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 64px 56px 76px', gap: '12px', padding: '0 24px 10px', borderBottom: '1px solid #F3F4F6' }}>
              {['SKU', 'Description', 'Qty', 'Unit', 'Status'].map(h =>
                <span key={h} className="mono" style={{ fontSize: '10px', color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</span>
              )}
            </div>
            <AnimatePresence>
              {listReady && inventory.map(function (item, i) {
                const s = STATUS_STYLES[item.status] || STATUS_STYLES.nominal;
                return (
                  <motion.div key={item.sku}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.35 }}
                    style={{ display: 'grid', gridTemplateColumns: '90px 1fr 64px 56px 76px', gap: '12px', padding: '13px 24px', borderBottom: i < inventory.length - 1 ? '1px solid #F9F8F6' : 'none', alignItems: 'center' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FAFAF8'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
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
              <SectionLabel>Incoming Today — {nodeName}</SectionLabel>
              {visibleShipments.length === 0 && (
                <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '10px', fontFamily: 'DM Mono, monospace' }}>
                  No shipments routing to this node.
                </p>
              )}
              {visibleShipments.map(function (shp, i) {
                return (
                  <motion.div key={shp.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    style={{ padding: '10px 0', borderBottom: i < visibleShipments.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span className="mono" style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{shp.eta}</span>
                      {shp.rerouted && (
                        <span className="mono" style={{ fontSize: '9px', color: '#F59E0B', background: '#FFFBEB', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.06em' }}>REROUTED</span>
                      )}
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
              <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '14px' }}>AI-assisted dispatch sequencing based on live inventory and shipments.</p>
              <button onClick={handleOptimize} disabled={!canOptimize}
                style={{ width: '100%', padding: '10px', background: canOptimize ? '#111827' : '#F9F8F4', border: '1px solid', borderColor: canOptimize ? '#111827' : '#E5E4DE', borderRadius: '8px', color: canOptimize ? '#FFFFFF' : '#9CA3AF', fontSize: '12px', fontWeight: 600, cursor: canOptimize ? 'pointer' : 'not-allowed', fontFamily: 'Space Grotesk, sans-serif', marginBottom: dispatchLog.length > 0 ? '12px' : '0', transition: 'all 0.15s' }}>
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
