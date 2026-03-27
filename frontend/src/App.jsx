import { useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import OriginDashboard from './components/OriginDashboard';
import CarrierDashboard from './components/CarrierDashboard';
import NodeDashboard from './components/NodeDashboard';
import SubsidiaryDashboard from './components/SubsidiaryDashboard';
import './index.css';

const ROLES = [
  { id: 'origin',     num: '01', label: 'Origin Hub',        sub: 'Supply chain command & threat intelligence', path: '/origin' },
  { id: 'node',       num: '02', label: 'Node Operations',   sub: 'Inventory management & local dispatch',      path: '/node' },
  { id: 'carrier',    num: '03', label: 'Heavy Carrier',     sub: 'Driver interface & live route tracking',     path: '/carrier' },
  { id: 'subsidiary', num: '04', label: 'Subsidiary Branch', sub: 'Last-mile delivery management',              path: '/subsidiary' },
];

/* ─── Login ─────────────────────────────────────── */
function LoginScreen() {
  const rootRef  = useRef(null);
  const navigate = useNavigate();

  useEffect(function () {
    const ctx = gsap.context(function () {
      gsap.from('.g-wordmark', { opacity: 0, y: 32, duration: 0.9, ease: 'power3.out' });
      gsap.from('.g-sub',      { opacity: 0, duration: 0.6, delay: 0.3 });
      gsap.from('.g-row',      { opacity: 0, y: 14, stagger: 0.1, delay: 0.6, duration: 0.5, ease: 'power2.out' });
      gsap.from('.g-footer',   { opacity: 0, duration: 0.5, delay: 1.1 });
    }, rootRef);
    return function () { ctx.revert(); };
  }, []);

  return (
    <div ref={rootRef} style={{ background: '#09090B', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: '540px' }}>

        <div className="g-wordmark" style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', background: '#F5C422', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '20px', lineHeight: 1 }}>⚡</span>
          </div>
          <h1 style={{ fontSize: '52px', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, color: '#FAFAFA' }}>
            NEXUS<span style={{ color: '#F5C422' }}>26</span>
          </h1>
        </div>
        <p className="g-sub mono" style={{ color: '#52525B', fontSize: '12px', letterSpacing: '0.06em', marginBottom: '60px', marginLeft: '58px' }}>
          SUPPLY CHAIN OPERATING SYSTEM
        </p>

        <div>
          {ROLES.map(function (role) {
            return (
              <button key={role.id} className="g-row"
                onClick={function () { navigate(role.path); }}
                style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%', textAlign: 'left', borderTop: '1px solid #1F1F23', padding: '20px 0', background: 'transparent', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={function (e) { e.currentTarget.style.background = 'rgba(245,196,34,0.04)'; e.currentTarget.querySelector('.lbl').style.color = '#F5C422'; e.currentTarget.querySelector('.arr').style.transform = 'translateX(6px)'; e.currentTarget.querySelector('.arr').style.color = '#F5C422'; }}
                onMouseLeave={function (e) { e.currentTarget.style.background = 'transparent'; e.currentTarget.querySelector('.lbl').style.color = '#FAFAFA'; e.currentTarget.querySelector('.arr').style.transform = 'translateX(0)'; e.currentTarget.querySelector('.arr').style.color = '#3F3F46'; }}
              >
                <span className="mono" style={{ color: '#3F3F46', fontSize: '12px', minWidth: '28px' }}>{role.num}</span>
                <div style={{ flex: 1 }}>
                  <div className="lbl" style={{ fontSize: '17px', fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '3px', transition: 'color 0.15s' }}>{role.label}</div>
                  <div style={{ fontSize: '12px', color: '#52525B', fontFamily: 'DM Mono, monospace' }}>{role.sub}</div>
                </div>
                <span className="arr" style={{ fontSize: '16px', color: '#3F3F46', transition: 'all 0.2s' }}>→</span>
              </button>
            );
          })}
          <div style={{ borderTop: '1px solid #1F1F23' }} />
        </div>

        <p className="g-footer mono" style={{ color: '#27272A', fontSize: '11px', marginTop: '28px', letterSpacing: '0.06em' }}>
          ACM NEXUS 2026 · HACKATHON DEMO
        </p>
      </div>
    </div>
  );
}

/* ─── Animated routes ───────────────────────────── */
const pv = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit:    { opacity: 0,        transition: { duration: 0.15 } },
};

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <motion.div variants={pv} initial="initial" animate="animate" exit="exit">
            <LoginScreen />
          </motion.div>
        } />
        <Route path="/origin"     element={<motion.div variants={pv} initial="initial" animate="animate" exit="exit" style={{ height: '100vh' }}><OriginDashboard /></motion.div>} />
        <Route path="/node"       element={<motion.div variants={pv} initial="initial" animate="animate" exit="exit" style={{ height: '100vh' }}><NodeDashboard /></motion.div>} />
        <Route path="/carrier"    element={<motion.div variants={pv} initial="initial" animate="animate" exit="exit" style={{ height: '100vh' }}><CarrierDashboard /></motion.div>} />
        <Route path="/subsidiary" element={<motion.div variants={pv} initial="initial" animate="animate" exit="exit" style={{ height: '100vh' }}><SubsidiaryDashboard /></motion.div>} />
        <Route path="*" element={<motion.div variants={pv} initial="initial" animate="animate" exit="exit"><LoginScreen /></motion.div>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}

export default App;
