import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { io } from 'socket.io-client';
import { CheckCircle2, Circle, Clock, MapPin, Cpu, Zap } from 'lucide-react';
import Layout, { Card, StatCard, SectionLabel } from './Layout';

function SubsidiaryDashboard() {
  const contentRef  = useRef(null);
  const [stops, setStops]         = useState([]);
  const [cargoPayload, setCargoPayload] = useState("No inbound cargo detected.");
  const [listReady, setListReady] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [estDone, setEstDone]       = useState('—');

  function loadState() {
    fetch('/api/state')
      .then(r => r.json())
      .then(data => {
        // Find inbound cargo to Kochi (or general active cargo)
        const shipments = data.active_shipments || [];
        if (shipments.length > 0) {
          const combinedCargo = shipments.map(s => s.cargo).join(', ');
          setCargoPayload(combinedCargo);
        } else {
          setCargoPayload("No inbound cargo detected.");
        }

        // Load the agentic last mile route if generated
        const routeStops = data.last_mile_route || [];
        setStops(routeStops);
        
        if (routeStops.length > 0) {
          setEstDone(routeStops[routeStops.length - 1].window.split(' - ')[1] || '17:00');
        } else {
          setEstDone('—');
        }
      })
      .catch((e) => console.error("Failed to load state", e));
  }

  useEffect(function () {
    loadState();

    const ctx = gsap.context(function () {
      gsap.from('.g-stat', { opacity: 0, y: 14, stagger: 0.07, duration: 0.5 });
      gsap.from('.g-card', { opacity: 0, y: 16, stagger: 0.08, delay: 0.25, duration: 0.5 });
    }, contentRef);
    setTimeout(() => setListReady(true), 300);
    return () => ctx.revert();
  }, []);

  // Socket.io — update when state changes globally
  useEffect(function () {
    const socket = io('http://localhost:3001', { transports: ['websocket', 'polling'] });
    socket.on('state_updated', loadState);
    socket.on('route_reset', loadState);
    return () => socket.disconnect();
  }, []);

  function handleMarkDelivered(id) {
    // In a real app we'd save this to backend, but local state is fine for UI feeling
    setStops(prev => {
      const idx = prev.findIndex(s => s.id === id);
      return prev.map((s, i) => {
        if (s.id === id) return { ...s, status: 'delivered' };
        if (i === idx + 1 && s.status !== 'delivered') return { ...s, status: 'active' };
        return s;
      });
    });
  }

  async function handleOptimize() {
    setIsOptimizing(true);
    setStops([]); // Clear UI to show it's working
    try {
      await fetch('/api/last-mile/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: 'Kochi', cargo: cargoPayload })
      });
      // socket.io state_updated will trigger loadState() rapidly
    } catch (e) {
      console.error(e);
    } finally {
      setIsOptimizing(false);
    }
  }

  function handleNavigate(stop) {
    const query = encodeURIComponent(stop.address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  }

  // Local active state logic (since backend doesn't track active drop by drop)
  // Give the first non-delivered stop the 'active' status visually
  const localStops = stops.map((s, i) => {
    if (!s.status) {
      const allPrevDelivered = stops.slice(0, i).every(prev => prev.status === 'delivered');
      s.status = allPrevDelivered ? 'active' : 'upcoming';
    }
    return s;
  });

  const delivered = localStops.filter(s => s.status === 'delivered').length;
  const totalStops = localStops.length;
  const pct       = totalStops > 0 ? Math.round((delivered / totalStops) * 100) : 0;
  const complete  = totalStops > 0 && pct === 100;

  return (
    <Layout
      title="Last-Mile Delivery · Kochi Zone"
      status={complete ? 'ROUTE COMPLETE' : totalStops > 0 ? `${delivered}/${totalStops} DELIVERED` : 'AWAITING DISPATCH'}
      statusOk={complete || totalStops === 0}
    >
      <div ref={contentRef}>

        {/* Top Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
          <div>
            <SectionLabel>Inbound Freight Payload</SectionLabel>
            <p className="mono" style={{ fontSize: '13px', color: '#111827', fontWeight: 500 }}>{cargoPayload}</p>
          </div>
          <button 
            onClick={handleOptimize} 
            disabled={isOptimizing || cargoPayload === "No inbound cargo detected."}
            style={{
              padding: '10px 18px', background: isOptimizing ? 'rgba(59,130,246,0.1)' : '#EFF6FF', 
              border: '1px solid #BFDBFE', borderRadius: '8px', 
              color: '#2563EB', fontSize: '12px', fontWeight: 600, 
              display: 'flex', alignItems: 'center', gap: '8px', cursor: isOptimizing ? 'wait' : 'pointer',
              fontFamily: 'Space Grotesk, sans-serif', transition: 'all 0.2s'
            }}
          >
            {isOptimizing ? (
              <span style={{ width: '14px', height: '14px', border: '2px solid #3B82F6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            ) : (
              <Cpu size={14} />
            )}
            {isOptimizing ? 'Agent routing via Mapbox AI...' : 'Optimize Route (Agentic AI)'}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {[
            { label: 'Completion',  value: pct + '%',                    sub: 'route progress',         accent: complete ? '#10B981' : '#3B82F6', icon: CheckCircle2 },
            { label: 'Delivered',   value: String(delivered),             sub: `of ${totalStops || 0} stops`, accent: '#10B981', icon: CheckCircle2 },
            { label: 'Remaining',   value: String(totalStops - delivered), sub: 'stops pending',       accent: totalStops - delivered > 0 ? '#F59E0B' : '#9CA3AF', icon: Circle },
            { label: 'Est. Done',   value: estDone,                      sub: 'end of route',           accent: '#9CA3AF', icon: Clock },
          ].map(s => <div key={s.label} className="g-stat"><StatCard {...s} /></div>)}
        </div>

        {/* Progress bar card */}
        <Card className="g-card" style={{ marginBottom: '14px', padding: '16px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <SectionLabel>Route Progress</SectionLabel>
            <span className="mono" style={{ fontSize: '11px', color: complete ? '#10B981' : '#9CA3AF' }}>{pct}%</span>
          </div>
          <div style={{ height: '6px', background: '#F3F4F6', borderRadius: '3px', overflow: 'hidden' }}>
            <motion.div
              animate={{ width: pct + '%' }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              style={{ height: '100%', background: complete ? '#10B981' : totalStops === 0 ? '#E5E7EB' : '#111827', borderRadius: '3px' }}
            />
          </div>
        </Card>

        {/* Stop list */}
        <Card className="g-card" style={{ padding: '0', overflow: 'hidden', minHeight: '300px' }}>
          <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #F3F4F6' }}>
            <SectionLabel>Agentic Delivery Vector</SectionLabel>
          </div>

          <AnimatePresence>
            {listReady && localStops.length === 0 && !isOptimizing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '60px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px', fontFamily: 'Space Grotesk, sans-serif' }}>
                 No route computed. Click "Optimize Route" to trigger the routing agent.
              </motion.div>
            )}

            {listReady && localStops.map(function (stop, i) {
              const active = stop.status === 'active';
              const done   = stop.status === 'delivered';

              return (
                <motion.div key={stop.recipient + i}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15, duration: 0.5, type: 'spring' }}
                  style={{ borderBottom: i < localStops.length - 1 ? '1px solid #F9F8F6' : 'none', background: active ? '#FAFAF8' : 'transparent', transition: 'background 0.3s' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: '16px', alignItems: 'start', padding: '16px 24px' }}>

                    {/* Icon */}
                    <div style={{ paddingTop: '1px' }}>
                      {done
                        ? <CheckCircle2 size={18} color="#10B981" strokeWidth={2} />
                        : active
                          ? <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#111827' }} />
                            </div>
                          : <Circle size={18} color="#D1D5DB" strokeWidth={1.5} />
                      }
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
                      
                      {/* Agent Reasoning Box */}
                      {stop.reasoning && (
                        <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', borderLeft: '2px solid #3B82F6', marginTop: '6px' }}>
                          <p style={{ fontSize: '11px', color: '#475569', fontFamily: 'Space Grotesk, sans-serif', margin: 0, display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                            <Zap size={10} color="#3B82F6" style={{ marginTop: '2px', flexShrink: 0 }} /> 
                            <span>{stop.reasoning}</span>
                          </p>
                        </div>
                      )}

                      {/* Active stop actions */}
                      <AnimatePresence>
                        {active && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                            <button onClick={() => handleMarkDelivered(stop.id)}
                              style={{ padding: '8px 16px', background: '#111827', border: 'none', borderRadius: '8px', color: '#FFFFFF', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif', transition: 'opacity 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                            >
                              Mark Delivered →
                            </button>
                            <button onClick={() => handleNavigate(stop)}
                              style={{ padding: '8px 14px', background: 'transparent', border: '1px solid #E5E4DE', borderRadius: '8px', color: '#6B7280', fontSize: '12px', cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif', transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.color = '#3B82F6'; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E4DE'; e.currentTarget.style.color = '#6B7280'; }}
                            >
                              Navigate ↗
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Stop number */}
                    <span className="mono" style={{ fontSize: '11px', color: '#D1D5DB', paddingTop: '2px' }}>0{i + 1}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Completion banner */}
          <AnimatePresence>
            {complete && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ padding: '16px 24px', background: '#F0FDF4', borderTop: '1px solid #D1FAE5', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={16} color="#10B981" />
                <span className="mono" style={{ fontSize: '11px', color: '#10B981', letterSpacing: '0.08em' }}>ALL DELIVERIES COMPLETE · KOCHI ZONE ALPHA</span>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}

export default SubsidiaryDashboard;
