import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';

const STOPS = [
  { id: 1, recipient: 'Kerala Industrial Co.',  address: '12, MG Road, Ernakulam',       pkg: 'Control Modules ×10',    window: '10:00 – 10:30', status: 'delivered' },
  { id: 2, recipient: 'Coastal Supplies Ltd.',   address: '7, Marine Drive, Kochi',        pkg: 'Safety Mesh ×20 rolls',  window: '11:00 – 11:30', status: 'delivered' },
  { id: 3, recipient: 'TechNode Hardware',        address: '45, Palarivattom Junction',     pkg: 'Hydraulic Fluid ×12',    window: '12:00 – 12:30', status: 'active' },
  { id: 4, recipient: 'GenTech Solutions',        address: '3, Edappally Toll, NH-66',      pkg: 'Copper Cable ×8 reels',  window: '13:30 – 14:00', status: 'upcoming' },
  { id: 5, recipient: 'Nexus Warehouse Alpha',    address: '88, CSEZ Gate, Kakkanad',       pkg: 'Mixed Cargo 0.8T',       window: '15:00 – 15:45', status: 'upcoming' },
];

function SubsidiaryDashboard() {
  const rootRef = useRef(null);
  const [stops, setStops]       = useState(STOPS);
  const [listReady, setListReady] = useState(false);

  const delivered = stops.filter(function (s) { return s.status === 'delivered'; }).length;
  const pct       = Math.round((delivered / stops.length) * 100);
  const complete  = pct === 100;

  useEffect(function () {
    const ctx = gsap.context(function () {
      gsap.from('.g-heading', { opacity: 0, y: 28, duration: 0.75, ease: 'power3.out' });
      gsap.from('.g-big',     { opacity: 0, y: 16, duration: 0.6, delay: 0.25, ease: 'power2.out' });
      gsap.from('.g-bar',     { scaleX: 0, transformOrigin: 'left', duration: 0.8, delay: 0.4, ease: 'power2.out' });
      gsap.from('.g-section', { opacity: 0, y: 14, delay: 0.5, duration: 0.5 });
    }, rootRef);
    setTimeout(function () { setListReady(true); }, 500);
    return function () { ctx.revert(); };
  }, []);

  function handleMarkDelivered(id) {
    setStops(function (prev) {
      const idx = prev.findIndex(function (s) { return s.id === id; });
      return prev.map(function (s, i) {
        if (s.id === id) return Object.assign({}, s, { status: 'delivered' });
        if (i === idx + 1 && s.status !== 'delivered') return Object.assign({}, s, { status: 'active' });
        return s;
      });
    });
  }

  return (
    <div ref={rootRef} style={{ background: '#09090B', minHeight: 'calc(100vh - 49px)', padding: '48px' }}>

      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <p className="g-heading mono" style={{ fontSize: '11px', color: '#3F3F46', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>Subsidiary Branch · KOCHI-LM</p>
        <h1 className="g-heading" style={{ fontSize: '40px', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: '#FAFAFA' }}>Last-Mile Delivery</h1>
      </div>

      {/* Big progress number */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginBottom: '20px' }}>
        <div className="g-big" style={{ fontFamily: 'DM Mono, monospace', fontSize: '72px', fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 1, color: complete ? '#34D399' : '#FAFAFA', transition: 'color 0.6s' }}>
          {pct}<span style={{ fontSize: '36px', color: '#3F3F46', marginLeft: '4px' }}>%</span>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <p style={{ fontSize: '15px', color: '#52525B', marginBottom: '2px' }}>Route Complete</p>
          <p className="mono" style={{ fontSize: '12px', color: '#3F3F46' }}>{delivered} of {stops.length} stops delivered</p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '2px', background: '#27272A', borderRadius: '1px', marginBottom: '48px', overflow: 'hidden' }}>
        <motion.div
          className="g-bar"
          animate={{ width: pct + '%' }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          style={{ height: '100%', background: complete ? '#34D399' : '#FAFAFA', borderRadius: '1px' }}
        />
      </div>

      {/* Stop list */}
      <div className="g-section">
        <p className="mono" style={{ fontSize: '11px', color: '#3F3F46', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0' }}>Delivery Stops</p>

        <AnimatePresence>
          {listReady && stops.map(function (stop, i) {
            const active = stop.status === 'active';
            const done   = stop.status === 'delivered';

            return (
              <motion.div
                key={stop.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.45, ease: 'easeOut' }}
                style={{ borderTop: '1px solid #18181B', padding: '24px 0' }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto', gap: '20px', alignItems: 'start' }}>
                  {/* Number */}
                  <span className="mono" style={{ fontSize: '12px', color: done ? '#34D399' : active ? '#FAFAFA' : '#3F3F46', paddingTop: '2px', transition: 'color 0.4s' }}>
                    {done ? '✓' : `0${stop.id}`}
                  </span>

                  {/* Content */}
                  <div>
                    <p style={{ fontSize: '16px', fontWeight: active ? 600 : 400, color: done ? '#52525B' : active ? '#FAFAFA' : '#71717A', marginBottom: '4px', letterSpacing: '-0.01em', textDecoration: done ? 'none' : 'none', transition: 'color 0.4s' }}>
                      {stop.recipient}
                    </p>
                    <p className="mono" style={{ fontSize: '12px', color: '#3F3F46', marginBottom: '2px' }}>{stop.address}</p>
                    <p className="mono" style={{ fontSize: '12px', color: '#3F3F46' }}>{stop.pkg} · {stop.window}</p>

                    {/* Active action */}
                    <AnimatePresence>
                      {active && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{ marginTop: '16px', display: 'flex', gap: '10px' }}
                        >
                          <button
                            onClick={function () { handleMarkDelivered(stop.id); }}
                            style={{
                              padding: '9px 18px', background: '#FAFAFA', border: 'none',
                              borderRadius: '6px', color: '#09090B', fontSize: '13px', fontWeight: 600,
                              cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif', transition: 'opacity 0.15s',
                            }}
                            onMouseEnter={function (e) { e.currentTarget.style.opacity = '0.85'; }}
                            onMouseLeave={function (e) { e.currentTarget.style.opacity = '1'; }}
                          >
                            Mark Delivered →
                          </button>
                          <button
                            style={{
                              padding: '9px 18px', background: 'transparent',
                              border: '1px solid #27272A', borderRadius: '6px',
                              color: '#52525B', fontSize: '13px', cursor: 'pointer',
                              fontFamily: 'Space Grotesk, sans-serif',
                            }}
                          >
                            Navigate
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Status tag */}
                  <span className="mono" style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', paddingTop: '3px', color: done ? '#34D399' : active ? '#FAFAFA' : '#3F3F46', transition: 'color 0.4s' }}>
                    {done ? 'Done' : active ? 'En Route' : 'Pending'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Bottom border */}
        <div style={{ borderTop: '1px solid #18181B' }} />

        {/* Complete state */}
        <AnimatePresence>
          {complete && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              style={{ paddingTop: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}
            >
              <span className="mono" style={{ fontSize: '11px', color: '#34D399', letterSpacing: '0.1em' }}>
                ✓ ALL DELIVERIES COMPLETE · KOCHI ZONE ALPHA
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}

export default SubsidiaryDashboard;
