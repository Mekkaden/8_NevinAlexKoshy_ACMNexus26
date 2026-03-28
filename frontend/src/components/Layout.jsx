import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { Zap, Activity, LogOut } from 'lucide-react';
import { logout, getSession } from '../auth';

var ROLE_META = {
  origin:     { label: 'Origin Hub',      icon: '🌐' },
  node:       { label: 'Node Operations', icon: '🏭' },
  carrier:    { label: 'Heavy Carrier',   icon: '🚛' },
  subsidiary: { label: 'Subsidiary',      icon: '📦' },
};

/* ── Shared card primitives ─────────────────────── */
export function Card({ children, style, className }) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 12px 32px rgba(0,0,0,0.09)' }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className={className}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E5E4DE',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'border-color 0.25s',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

export function StatCard({ label, value, sub, accent, icon: Icon }) {
  var cardRef = useRef(null);

  function handleEnter() {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, {
      y: -4,
      boxShadow: '0 16px 40px rgba(0,0,0,0.1), 0 0 0 1px ' + (accent || '#3B82F6') + '33',
      duration: 0.25,
      ease: 'power2.out',
    });
  }

  function handleLeave() {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, {
      y: 0,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      duration: 0.3,
      ease: 'power2.out',
    });
  }

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E5E4DE',
        borderRadius: '12px',
        padding: '20px 22px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        cursor: 'default',
        transition: 'border-color 0.25s',
        willChange: 'transform',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <p className="mono" style={{ fontSize: '11px', color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
        {Icon && (
          <div style={{
            width: '30px', height: '30px',
            borderRadius: '8px',
            background: accent ? accent + '18' : '#F3F4F6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'badge-glow 2.4s ease-in-out infinite',
            '--glow-color': accent ? accent + '55' : 'rgba(59,130,246,0.3)',
          }}>
            <Icon size={14} color={accent || '#6B7280'} />
          </div>
        )}
      </div>
      <p className="mono" style={{
        fontSize: '30px', fontWeight: 700,
        letterSpacing: '-0.04em', lineHeight: 1,
        color: accent || '#111827',
        transition: 'color 0.5s',
      }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '7px' }}>{sub}</p>}
    </div>
  );
}

export function SectionLabel({ children }) {
  return (
    <p className="mono" style={{
      fontSize: '11px', color: '#9CA3AF',
      letterSpacing: '0.1em', textTransform: 'uppercase',
      marginBottom: '14px',
    }}>
      {children}
    </p>
  );
}

/* ── Layout shell ───────────────────────────────── */
function Layout({ children, title, status, statusOk }) {
  var navigate = useNavigate();
  var session  = getSession();
  var roleMeta = ROLE_META[session && session.username] || { label: 'Dashboard', icon: '⚡' };

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F2F1EC', overflow: 'hidden' }}>

      {/* ── Sidebar — Framer Motion initial/animate (no useEffect) ── */}
      <motion.aside
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ width: '216px', background: '#0E2030', display: 'flex', flexDirection: 'column', flexShrink: 0 }}
      >
        {/* Logo */}
        <div style={{ padding: '22px 18px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <motion.div
              whileHover={{ rotate: [0, -15, 15, -8, 0], transition: { duration: 0.5 } }}
              animate={{ boxShadow: ['0 0 0 0 rgba(245,196,34,0.4)', '0 0 0 8px rgba(245,196,34,0)', '0 0 0 0 rgba(245,196,34,0)'] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5 }}
              style={{
                width: '30px', height: '30px',
                background: '#F5C422', borderRadius: '7px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, cursor: 'pointer',
              }}
            >
              <Zap size={14} color="#0E2030" strokeWidth={2.5} fill="#0E2030" />
            </motion.div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#FAFAFA', letterSpacing: '-0.02em', lineHeight: 1 }}>LOG LAB</p>
              <p className="mono" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', marginTop: '2px' }}>SUPPLY CHAIN OS</p>
            </div>
          </div>
        </div>

        {/* Active module */}
        <nav style={{ flex: 1, padding: '18px 10px' }}>
          <p className="mono" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em', padding: '0 10px 10px', textTransform: 'uppercase' }}>Active Module</p>
          <motion.div
            initial={{ x: -12, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 320, damping: 26 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              width: '100%', padding: '10px 12px', borderRadius: '8px',
              background: '#F5C422', color: '#0E2030',
              fontSize: '13px', fontWeight: 600,
              fontFamily: 'Space Grotesk, sans-serif',
              boxShadow: '0 4px 14px rgba(245,196,34,0.25)',
            }}
          >
            <span style={{ fontSize: '15px' }}>{roleMeta.icon}</span>
            {roleMeta.label}
          </motion.div>
        </nav>

        {/* User + Logout */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ marginBottom: '12px' }}>
            <p className="mono" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', marginBottom: '4px' }}>LOGGED IN AS</p>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', fontFamily: 'Space Grotesk, sans-serif' }}>
              {session ? session.username : '—'}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02, background: 'rgba(239,68,68,0.18)' }}
            whileTap={{ scale: 0.97 }}
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 10px', borderRadius: '7px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
              color: 'rgba(239,68,68,0.7)', fontSize: '12px', fontWeight: 500,
              fontFamily: 'Space Grotesk, sans-serif', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <LogOut size={12} /> Logout
          </motion.button>
        </div>
      </motion.aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Top bar — Framer Motion initial/animate */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{
            height: '58px',
            background: '#FFFFFF',
            borderBottom: '1px solid #E5E4DE',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 36px',
            flexShrink: 0,
            boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={16} color="#9CA3AF" />
            <h1 style={{ fontSize: '17px', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>{title}</h1>
          </div>

          {/* Status dot with sonar ping */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <motion.div
                animate={{ scale: [1, 2.2, 2.2], opacity: [0.7, 0, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', repeatDelay: 0.5 }}
                style={{
                  position: 'absolute', width: '6px', height: '6px',
                  borderRadius: '50%',
                  background: statusOk === false ? '#F87171' : '#34D399',
                }}
              />
              <motion.div
                animate={statusOk === false ? { scale: [1, 0.7, 1], opacity: [1, 0.5, 1] } : { scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, repeat: statusOk === false ? Infinity : 0 }}
                style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: statusOk === false ? '#F87171' : '#34D399',
                  zIndex: 1,
                }}
              />
            </div>
            <span className="mono" style={{
              fontSize: '11px',
              color: statusOk === false ? '#EF4444' : '#9CA3AF',
              letterSpacing: '0.08em',
              transition: 'color 0.4s',
            }}>
              {status || 'ALL CLEAR'}
            </span>
          </div>
        </motion.header>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '28px 36px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}

export default Layout;
