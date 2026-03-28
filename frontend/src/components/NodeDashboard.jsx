import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { io } from 'socket.io-client';
import { Package, AlertTriangle, TruckIcon, Cpu } from 'lucide-react';
import Layout, { Card, StatCard, SectionLabel } from './Layout';
import { normalizeNode } from '../nodeUtils';

var STATUS_STYLES = {
  nominal:  { color: '#10B981', bg: '#F0FDF4', glow: 'rgba(16,185,129,0.3)' },
  low:      { color: '#F59E0B', bg: '#FFFBEB', glow: 'rgba(245,158,11,0.3)' },
  critical: { color: '#EF4444', bg: '#FEF2F2', glow: 'rgba(239,68,68,0.35)' },
};

function NodeDashboard() {
  var contentRef   = useRef(null);
  var headerRef    = useRef(null);
  var [listReady, setListReady]       = useState(false);
  var [dispatchLog, setDispatchLog]   = useState([]);
  var [optimizing, setOptimizing]     = useState(false);
  var [inventory, setInventory]       = useState([]);
  var [allShipments, setAllShipments] = useState([]);
  var [selectedNode, setSelectedNode] = useState('COK');
  var [nodeStatus, setNodeStatus]     = useState('OPERATIONAL');
  var [prevNode, setPrevNode]         = useState('COK');

  function mapShipments(raw) {
    return (raw || []).map(function (shp) {
      return {
        id: shp.id,
        carrier: shp.truck_id,
        eta: new Date(shp.estimated_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        cargo: shp.cargo,
        from: shp.origin + ' Hub',
        rerouted: shp.rerouted,
        next_node: normalizeNode(shp.next_node),
        status: shp.status,
      };
    });
  }

  function loadData() {
    return fetch('/api/node')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        setInventory(data.inventory || []);
        setAllShipments(mapShipments(data.shipments));
      })
      .catch(function () {});
  }

  useEffect(function () {
    loadData();
    var ctx = gsap.context(function () {
      gsap.from('.g-stat', { opacity: 0, y: 18, stagger: 0.08, duration: 0.6, ease: 'back.out(1.4)' });
      gsap.from('.g-card', { opacity: 0, y: 20, stagger: 0.09, delay: 0.28, duration: 0.6, ease: 'power3.out' });
    }, contentRef);
    setTimeout(function () { setListReady(true); }, 300);
    var interval = setInterval(loadData, 3000);
    return function () { ctx.revert(); clearInterval(interval); };
  }, []);

  /* Flash header when node changes */
  useEffect(function () {
    if (selectedNode !== prevNode) {
      if (headerRef.current) {
        gsap.fromTo(headerRef.current,
          { color: '#3B82F6' },
          { color: '#111827', duration: 0.8, ease: 'power2.out' }
        );
      }
      setPrevNode(selectedNode);
    }
  }, [selectedNode]);

  useEffect(function () {
    var socket = io('http://localhost:3001', { transports: ['websocket', 'polling'] });
    socket.on('state_updated', function (data) {
      if (data.active_shipments) setAllShipments(mapShipments(data.active_shipments));
      if (data.inventory) setInventory(data.inventory);
      if (data.threats && data.threats.length > 0) setNodeStatus('THREAT DETECTED');
      else setNodeStatus('OPERATIONAL');
    });
    socket.on('route_reset', function () { setNodeStatus('OPERATIONAL'); loadData(); });
    return function () { socket.disconnect(); };
  }, []);

  async function handleOptimize() {
    if (optimizing) return;
    setOptimizing(true);
    setDispatchLog(['Connecting to AI Optimizer...']);
    try {
      var res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory, shipments: allShipments }),
      });
      var data = await res.json();
      if (data.steps && data.steps.length > 0) {
        setDispatchLog([]);
        data.steps.forEach(function (step, i) {
          setTimeout(function () {
            setDispatchLog(function (prev) { return prev.concat(step); });
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

  var critical = inventory.filter(function (i) { return i.status === 'critical'; }).length;
  var low      = inventory.filter(function (i) { return i.status === 'low'; }).length;
  var visibleShipments = allShipments.filter(function (s) { return s.next_node === selectedNode; });

  var NODE_NAMES = {
    COK: 'KOCHI-01',     CBE: 'COIMBATORE-02', MAA: 'CHENNAI-03',
    MDU: 'MADURAI-04',   IXE: 'MANGALORE-05',  MYS: 'MYSORE-06',
    SLM: 'SALEM-07',     HBL: 'HUBLI-08',      HYD: 'HYDERABAD-09',
    CCJ: 'CALICUT-10',
  };
  var nodeName   = NODE_NAMES[selectedNode] || selectedNode;
  var canOptimize = !optimizing && inventory.length > 0;

  return (
    <Layout title={'Node Operations · ' + nodeName} status={nodeStatus} statusOk={nodeStatus === 'OPERATIONAL'}>
      <div ref={contentRef}>

        {/* Node selector */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <motion.select
            whileFocus={{ boxShadow: '0 0 0 3px rgba(59,130,246,0.15)' }}
            value={selectedNode}
            onChange={function (e) { setSelectedNode(e.target.value); }}
            style={{
              padding: '8px 12px', borderRadius: '8px',
              border: '1px solid #E5E7EB', background: '#FFFFFF',
              fontSize: '12px', fontWeight: 600,
              fontFamily: 'Space Grotesk, sans-serif',
              outline: 'none', cursor: 'pointer',
              transition: 'box-shadow 0.2s',
            }}
          >
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
          </motion.select>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {[
            { label: 'Total SKUs',     value: String(inventory.length),    sub: 'tracked items',                              accent: '#3B82F6', icon: Package },
            { label: 'Critical',       value: String(critical),            sub: critical ? 'reorder now' : 'none critical',   accent: critical ? '#EF4444' : '#9CA3AF', icon: AlertTriangle },
            { label: 'Low Stock',      value: String(low),                 sub: low ? 'monitor closely' : 'all ok',           accent: low ? '#F59E0B' : '#9CA3AF', icon: Package },
            { label: 'Incoming Today', value: String(allShipments.length), sub: 'total active shipments',                     accent: '#10B981', icon: TruckIcon },
          ].map(function (s) { return <div key={s.label} className="g-stat"><StatCard {...s} /></div>; })}
        </div>

        {/* Table + Side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '14px', marginBottom: '14px' }}>

          {/* Inventory table */}
          <Card className="g-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 14px' }}>
              <SectionLabel>Local Inventory</SectionLabel>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 64px 56px 76px', gap: '12px', padding: '0 24px 10px', borderBottom: '1px solid #F3F4F6' }}>
              {['SKU', 'Description', 'Qty', 'Unit', 'Status'].map(function (h) {
                return <span key={h} className="mono" style={{ fontSize: '10px', color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</span>;
              })}
            </div>
            <AnimatePresence>
              {listReady && inventory.map(function (item, i) {
                var s = STATUS_STYLES[item.status] || STATUS_STYLES.nominal;
                var isPulsing = item.status === 'critical' || item.status === 'low';
                return (
                  <motion.div key={item.sku}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.35 }}
                    style={{
                      display: 'grid', gridTemplateColumns: '90px 1fr 64px 56px 76px',
                      gap: '12px', padding: '13px 24px',
                      borderBottom: i < inventory.length - 1 ? '1px solid #F9F8F6' : 'none',
                      alignItems: 'center',
                      borderLeft: '3px solid transparent',
                      transition: 'background 0.2s, border-left-color 0.2s',
                    }}
                    onMouseEnter={function (e) {
                      e.currentTarget.style.background = '#FAFAF8';
                      e.currentTarget.style.borderLeftColor = s.color;
                    }}
                    onMouseLeave={function (e) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderLeftColor = 'transparent';
                    }}
                  >
                    <span className="mono" style={{ fontSize: '11px', color: '#9CA3AF' }}>{item.sku}</span>
                    <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>{item.name}</span>
                    <span className="mono" style={{ fontSize: '14px', color: '#111827', fontWeight: 600 }}>{item.qty}</span>
                    <span className="mono" style={{ fontSize: '11px', color: '#9CA3AF' }}>{item.unit}</span>
                    {/* status pill — pulsing glow for critical/low */}
                    <motion.span
                      animate={isPulsing ? {
                        boxShadow: ['0 0 0 0 ' + s.glow, '0 0 0 4px ' + s.glow, '0 0 0 0 ' + s.glow],
                      } : {}}
                      transition={isPulsing ? { duration: 1.6, repeat: Infinity } : {}}
                      className="mono"
                      style={{
                        fontSize: '10px', color: s.color, background: s.bg,
                        padding: '3px 8px', borderRadius: '20px',
                        display: 'inline-block', letterSpacing: '0.06em',
                        textTransform: 'uppercase', fontWeight: 600,
                      }}
                    >
                      {item.status}
                    </motion.span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </Card>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Incoming shipments */}
            <Card className="g-card">
              <SectionLabel>Incoming Today — {nodeName}</SectionLabel>
              {visibleShipments.length === 0 && (
                <p className="mono" style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '10px' }}>No shipments routing to this node.</p>
              )}
              {visibleShipments.map(function (shp, i) {
                return (
                  <motion.div key={shp.id}
                    initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1, type: 'spring', stiffness: 280, damping: 24 }}
                    style={{
                      padding: '10px 0 10px 10px',
                      borderBottom: i < visibleShipments.length - 1 ? '1px solid #F3F4F6' : 'none',
                      borderLeft: '3px solid ' + (shp.rerouted ? '#F59E0B' : '#3B82F6'),
                      transition: 'border-color 0.3s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span className="mono" style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{shp.eta}</span>
                      {shp.rerouted && (
                        <motion.span
                          animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.3, repeat: Infinity }}
                          className="mono" style={{ fontSize: '9px', color: '#F59E0B', background: '#FFFBEB', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.06em' }}
                        >
                          REROUTED
                        </motion.span>
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
                <motion.div animate={optimizing ? { rotate: 360 } : {}} transition={optimizing ? { duration: 2, repeat: Infinity, ease: 'linear' } : {}}>
                  <Cpu size={14} color="#6B7280" />
                </motion.div>
                <SectionLabel>AI Optimizer</SectionLabel>
              </div>
              <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '14px' }}>AI-assisted dispatch sequencing based on live inventory and shipments.</p>

              <motion.button
                whileHover={canOptimize ? { scale: 1.02, boxShadow: '0 4px 16px rgba(17,24,39,0.2)' } : {}}
                whileTap={canOptimize ? { scale: 0.98 } : {}}
                animate={optimizing ? { boxShadow: ['0 0 0 0 rgba(59,130,246,0)', '0 0 0 3px rgba(59,130,246,0.4)', '0 0 0 0 rgba(59,130,246,0)'] } : {}}
                transition={optimizing ? { duration: 1.2, repeat: Infinity } : {}}
                onClick={handleOptimize}
                disabled={!canOptimize}
                style={{
                  width: '100%', padding: '10px',
                  background: canOptimize
                    ? 'linear-gradient(135deg, #111827 0%, #1d2d3f 100%)'
                    : '#F9F8F4',
                  border: '1px solid', borderColor: canOptimize ? '#111827' : '#E5E4DE',
                  borderRadius: '8px',
                  color: canOptimize ? '#FFFFFF' : '#9CA3AF',
                  fontSize: '12px', fontWeight: 600,
                  cursor: canOptimize ? 'pointer' : 'not-allowed',
                  fontFamily: 'Space Grotesk, sans-serif',
                  marginBottom: dispatchLog.length > 0 ? '12px' : '0',
                  transition: 'all 0.15s',
                }}
              >
                {optimizing ? 'Running…' : 'Run Optimization →'}
              </motion.button>

              {dispatchLog.length > 0 && (
                <div style={{ background: '#F9F8F4', borderRadius: '8px', padding: '12px', fontFamily: 'DM Mono, monospace' }}>
                  {dispatchLog.map(function (line, i) {
                    return (
                      <motion.p key={i}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, type: 'spring', stiffness: 300 }}
                        style={{ fontSize: '11px', color: line.startsWith('✓') ? '#10B981' : '#6B7280', lineHeight: 1.9 }}
                      >
                        {line}
                        {/* cursor on last line while optimizing */}
                        {optimizing && i === dispatchLog.length - 1 && (
                          <span style={{ animation: 'cursor-blink 0.9s step-start infinite', color: '#10B981', marginLeft: '2px' }}>|</span>
                        )}
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
