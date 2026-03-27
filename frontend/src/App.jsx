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
  { id: 'origin',      num: '01', label: 'Origin Hub',         sub: 'Supply chain command & threat intelligence',  path: '/origin' },
  { id: 'node',        num: '02', label: 'Node Operations',     sub: 'Inventory management & local dispatch',       path: '/node' },
  { id: 'carrier',     num: '03', label: 'Heavy Carrier',       sub: 'Driver interface & live route tracking',      path: '/carrier' },
  { id: 'subsidiary',  num: '04', label: 'Subsidiary Branch',   sub: 'Last-mile delivery management',               path: '/subsidiary' },
];

/* ─── Login ─────────────────────────────────────── */
function LoginScreen() {
  const rootRef  = useRef(null);
  const navigate = useNavigate();

  useEffect(function () {
    const ctx = gsap.context(function () {
      gsap.from('.g-wordmark', { opacity: 0, y: 32, duration: 0.9, ease: 'power3.out' });
      gsap.from('.g-sub',      { opacity: 0, duration: 0.6, delay: 0.35 });
      gsap.from('.g-label',    { opacity: 0, y: 8,  duration: 0.5, delay: 0.55 });
      gsap.from('.g-row',      { opacity: 0, y: 16, stagger: 0.1, delay: 0.65, duration: 0.55, ease: 'power2.out' });
      gsap.from('.g-footer',   { opacity: 0, duration: 0.5, delay: 1.1 });
    }, rootRef);
    return function () { ctx.revert(); };
  }, []);

  function handleSelect(path) { navigate(path); }

  return (
    <div ref={rootRef} style={{ background: '#09090B', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>

        <div className="g-wordmark" style={{ marginBottom: '6px' }}>
          <h1 style={{ fontSize: '64px', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, color: '#FAFAFA', fontFamily: 'Space Grotesk, sans-serif' }}>
            NEXUS<span style={{ color: '#34D399' }}>26</span>
          </h1>
        </div>
        <p className="g-sub mono" style={{ color: '#52525B', fontSize: '13px', letterSpacing: '0.05em', marginBottom: '64px' }}>
          SUPPLY CHAIN OPERATING SYSTEM
        </p>

        <p className="g-label mono" style={{ color: '#3F3F46', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0' }}>
          Select Access Level
        </p>

        <div>
          {ROLES.map(function (role) {
            return (
              <button
                key={role.id}
                className="g-row"
                onClick={function () { handleSelect(role.path); }}
                style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%', textAlign: 'left', borderTop: '1px solid #27272A', padding: '22px 0', background: 'transparent', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={function (e) { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.querySelector('.arrow').style.transform = 'translateX(6px)'; e.currentTarget.querySelector('.arrow').style.color = '#FAFAFA'; }}
                onMouseLeave={function (e) { e.currentTarget.style.background = 'transparent'; e.currentTarget.querySelector('.arrow').style.transform = 'translateX(0)'; e.currentTarget.querySelector('.arrow').style.color = '#3F3F46'; }}
              >
                <span className="mono" style={{ color: '#3F3F46', fontSize: '12px', minWidth: '28px', userSelect: 'none' }}>{role.num}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '3px' }}>{role.label}</div>
                  <div style={{ fontSize: '12px', color: '#52525B', fontFamily: 'DM Mono, monospace' }}>{role.sub}</div>
                </div>
                <span className="arrow" style={{ fontSize: '18px', color: '#3F3F46', transition: 'all 0.2s', display: 'block' }}>→</span>
              </button>
            );
          })}
          <div style={{ borderTop: '1px solid #27272A' }} />
        </div>

        <p className="g-footer mono" style={{ color: '#27272A', fontSize: '11px', marginTop: '32px', letterSpacing: '0.06em' }}>
          ACM NEXUS 2026 · HACKATHON DEMO
        </p>
      </div>
    </div>
  );
}

/* ─── Shared Dashboard Header ────────────────────── */
function DashHeader({ roleLabel }) {
  const navigate = useNavigate();

  return (
    <div style={{ borderBottom: '1px solid #27272A', padding: '14px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#09090B', position: 'sticky', top: 0, zIndex: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span className="mono" style={{ color: '#3F3F46', fontSize: '11px', letterSpacing: '0.1em' }}>NEXUS26</span>
        <span style={{ color: '#27272A' }}>·</span>
        <span className="mono" style={{ color: '#A1A1AA', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{roleLabel}</span>
      </div>
      <button
        onClick={function () { navigate('/'); }}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid #27272A', borderRadius: '6px', padding: '6px 14px', color: '#71717A', fontSize: '12px', cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '-0.01em', transition: 'all 0.15s' }}
        onMouseEnter={function (e) { e.currentTarget.style.borderColor = '#52525B'; e.currentTarget.style.color = '#FAFAFA'; }}
        onMouseLeave={function (e) { e.currentTarget.style.borderColor = '#27272A'; e.currentTarget.style.color = '#71717A'; }}
      >
        ← Switch Role
      </button>
    </div>
  );
}

/* ─── Page wrappers (inject header + slide transition) ─ */
const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
};

function OriginPage()     { return <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit"><DashHeader roleLabel="Origin Hub"        /><OriginDashboard /></motion.div>; }
function NodePage()       { return <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit"><DashHeader roleLabel="Node Operations"    /><NodeDashboard /></motion.div>; }
function CarrierPage()    { return <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit"><DashHeader roleLabel="Heavy Carrier"      /><CarrierDashboard /></motion.div>; }
function SubsidiaryPage() { return <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit"><DashHeader roleLabel="Subsidiary Branch"  /><SubsidiaryDashboard /></motion.div>; }

/* ─── App ────────────────────────────────────────── */
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/"           element={<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit"><LoginScreen /></motion.div>} />
        <Route path="/origin"     element={<OriginPage />} />
        <Route path="/node"       element={<NodePage />} />
        <Route path="/carrier"    element={<CarrierPage />} />
        <Route path="/subsidiary" element={<SubsidiaryPage />} />
        {/* Catch-all → home */}
        <Route path="*"           element={<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit"><LoginScreen /></motion.div>} />
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
