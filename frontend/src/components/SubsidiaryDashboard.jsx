import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { io } from 'socket.io-client';
import { CheckCircle2, Circle, Clock, MapPin } from 'lucide-react';
import Layout, { Card, StatCard, SectionLabel } from './Layout';

/* ─── Static fallback stops (shown when no live shipments exist) ─── */
const STATIC_STOPS = [
  { id: 1, recipient: 'Kerala Industrial Co.',  address: '12, MG Road, Ernakulam',     pkg: 'Control Modules ×10',   window: '10:00 – 10:30', status: 'delivered' },
  { id: 2, recipient: 'Coastal Supplies Ltd.',   address: '7, Marine Drive, Kochi',      pkg: 'Safety Mesh ×20 rolls', window: '11:00 – 11:30', status: 'delivered' },
  { id: 3, recipient: 'TechNode Hardware',        address: '45, Palarivattom Junction',   pkg: 'Hydraulic Fluid ×12',   window: '12:00 – 12:30', status: 'active' },
  { id: 4, recipient: 'GenTech Solutions',        address: '3, Edappally Toll, NH-66',    pkg: 'Copper Cable ×8 reels', window: '13:30 – 14:00', status: 'upcoming' },
  { id: 5, recipient: 'Nexus Warehouse Alpha',    address: '88, CSEZ Gate, Kakkanad',     pkg: 'Mixed Cargo 0.8T',      window: '15:00 – 15:45', status: 'upcoming' },
];

/* Map a live shipment to a delivery stop entry */
function shipmentToStop(shp, idx, baseStatuses) {
  const arrivalTime = shp.estimated_arrival
    ? new Date(shp.estimated_arrival).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '—';
  const departTime = shp.departed_at
    ? new Date(shp.departed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '—';
  return {
    id: shp.id,
    recipient: `${shp.destination} Hub — ${shp.truck_id}`,
    address: `Next Node: ${shp.next_node || shp.destination}${shp.rerouted ? ' (Rerouted)' : ''}`,
    pkg: shp.cargo,
    window: `${departTime} – ${arrivalTime}`,
    status: baseStatuses[idx] || 'upcoming',
    isLive: true,
    rerouted: shp.rerouted,
    estimated_arrival: shp.estimated_arrival,
  };
}

function SubsidiaryDashboard() {
  const contentRef  = useRef(null);
  const [stops, setStops]         = useState(STATIC_STOPS);
  const [listReady, setListReady] = useState(false);
  const [isLiveData, setIsLiveData] = useState(false);
  const [estDone, setEstDone]       = useState('15:45');

  function loadState() {
    fetch('/api/state')
      .then(r => r.json())
      .then(data => {
        const shipments = data.active_shipments || [];
        if (shipments.length > 0) {
          // Map live shipments to stop format
          const baseStatuses = ['active', 'upcoming', 'upcoming'];
          const liveStops = shipments.map((shp, i) => shipmentToStop(shp, i, baseStatuses));

          // Pad with static fallback stops if fewer than 3 live shipments
          const padded = liveStops.length < STATIC_STOPS.length
            ? [
                ...liveStops,
                ...STATIC_STOPS.slice(liveStops.length).map(s => ({ ...s, status: 'upcoming', isLive: false }))
              ]
            : liveStops;

          setStops(padded);
          setIsLiveData(true);

          // Derive est. done from last shipment arrival
          const lastArrival = shipments[shipments.length - 1]?.estimated_arrival;
          if (lastArrival) {
            setEstDone(new Date(lastArrival).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }));
          }
        } else {
          setStops(STATIC_STOPS);
          setIsLiveData(false);
        }
      })
      .catch(() => {
        setStops(STATIC_STOPS);
        setIsLiveData(false);
      });
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

  // Socket.io — update when route changes
  useEffect(function () {
    const socket = io('http://localhost:3001', { transports: ['websocket', 'polling'] });

    socket.on('state_updated', function () {
      loadState();
    });

    socket.on('route_reset', function () {
      loadState();
    });

    return () => socket.disconnect();
  }, []);

  function handleMarkDelivered(id) {
    setStops(prev => {
      const idx = prev.findIndex(s => s.id === id);
      return prev.map((s, i) => {
        if (s.id === id) return { ...s, status: 'delivered' };
        if (i === idx + 1 && s.status !== 'delivered') return { ...s, status: 'active' };
        return s;
      });
    });
  }

  function handleNavigate(stop) {
    const query = encodeURIComponent(stop.address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  }

  const delivered = stops.filter(s => s.status === 'delivered').length;
  const pct       = Math.round((delivered / stops.length) * 100);
  const complete  = pct === 100;

  return (
    <Layout
      title="Last-Mile Delivery · Kochi Zone"
      status={complete ? 'ROUTE COMPLETE' : `${delivered}/${stops.length} DELIVERED`}
      statusOk={complete}
    >
      <div ref={contentRef}>

        {/* Live data badge */}
        {isLiveData && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <span className="mono" style={{ fontSize: '10px', color: '#10B981', background: '#F0FDF4', border: '1px solid #D1FAE5', padding: '4px 10px', borderRadius: '20px', letterSpacing: '0.06em' }}>
              ● LIVE DATA
            </span>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {[
            { label: 'Completion',  value: pct + '%',                    sub: 'route progress',         accent: complete ? '#10B981' : '#3B82F6', icon: CheckCircle2 },
            { label: 'Delivered',   value: String(delivered),             sub: `of ${stops.length} stops`, accent: '#10B981', icon: CheckCircle2 },
            { label: 'Remaining',   value: String(stops.length - delivered), sub: 'stops pending',       accent: stops.length - delivered > 0 ? '#F59E0B' : '#9CA3AF', icon: Circle },
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
              style={{ height: '100%', background: complete ? '#10B981' : '#111827', borderRadius: '3px' }}
            />
          </div>
        </Card>

        {/* Stop list */}
        <Card className="g-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #F3F4F6' }}>
            <SectionLabel>Delivery Stops</SectionLabel>
          </div>

          <AnimatePresence>
            {listReady && stops.map(function (stop, i) {
              const active = stop.status === 'active';
              const done   = stop.status === 'delivered';

              return (
                <motion.div key={stop.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  style={{ borderBottom: i < stops.length - 1 ? '1px solid #F9F8F6' : 'none', background: active ? '#FAFAF8' : 'transparent', transition: 'background 0.3s' }}
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
                        {active && <span className="mono" style={{ fontSize: '9px', color: '#111827', background: '#F3F4F6', padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.08em' }}>EN ROUTE</span>}
                        {done   && <span className="mono" style={{ fontSize: '9px', color: '#10B981', background: '#F0FDF4', padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.08em' }}>DELIVERED</span>}
                        {stop.rerouted && <span className="mono" style={{ fontSize: '9px', color: '#F59E0B', background: '#FFFBEB', padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.08em' }}>REROUTED</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={10} color="#9CA3AF" /> {stop.address}
                        </span>
                      </div>
                      <p className="mono" style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px' }}>{stop.pkg} · {stop.window}</p>

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
    </Layout>
  );
}

export default SubsidiaryDashboard;
