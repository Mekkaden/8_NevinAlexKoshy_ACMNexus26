import { useNavigate, useLocation } from 'react-router-dom';
import { Zap, Activity, LogOut } from 'lucide-react';
import { logout, getSession } from '../auth';

/* Role → icon label mapping for the sidebar */
var ROLE_META = {
  origin:     { label: 'Origin Hub',      icon: '🌐' },
  node:       { label: 'Node Operations', icon: '🏭' },
  carrier:    { label: 'Heavy Carrier',   icon: '🚛' },
  subsidiary: { label: 'Subsidiary',      icon: '📦' },
};

/* ── Shared card primitives ─────────────────────── */
export function Card({ children, style }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E5E4DE', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', ...style }}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, sub, accent, icon: Icon }) {
  return (
    <Card style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <p className="mono" style={{ fontSize: '11px', color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
        {Icon && <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: accent ? accent + '18' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={14} color={accent || '#6B7280'} /></div>}
      </div>
      <p className="mono" style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, color: accent || '#111827', transition: 'color 0.4s' }}>{value}</p>
      {sub && <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '6px' }}>{sub}</p>}
    </Card>
  );
}

export function SectionLabel({ children }) {
  return <p className="mono" style={{ fontSize: '11px', color: '#9CA3AF', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>{children}</p>;
}

/* ── Layout shell ───────────────────────────────── */
function Layout({ children, title, status, statusOk }) {
  const navigate = useNavigate();
  const session = getSession();
  const roleMeta = ROLE_META[session && session.username] || { label: 'Dashboard', icon: '⚡' };

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F2F1EC', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: '216px', background: '#0E2030', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        {/* Logo */}
        <div style={{ padding: '22px 18px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '30px', height: '30px', background: '#F5C422', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={14} color="#0E2030" strokeWidth={2.5} fill="#0E2030" />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#FAFAFA', letterSpacing: '-0.02em', lineHeight: 1 }}>NEXUS26</p>
              <p className="mono" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', marginTop: '2px' }}>SUPPLY CHAIN OS</p>
            </div>
          </div>
        </div>

        {/* Current section (single, no nav) */}
        <nav style={{ flex: 1, padding: '18px 10px' }}>
          <p className="mono" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em', padding: '0 10px 10px', textTransform: 'uppercase' }}>Active Module</p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            width: '100%', padding: '10px 12px', borderRadius: '8px',
            background: '#F5C422',
            color: '#0E2030',
            fontSize: '13px', fontWeight: 600,
            fontFamily: 'Space Grotesk, sans-serif',
          }}>
            <span style={{ fontSize: '15px' }}>{roleMeta.icon}</span>
            {roleMeta.label}
          </div>
        </nav>

        {/* User + Logout */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Role badge */}
          <div style={{ marginBottom: '12px' }}>
            <p className="mono" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', marginBottom: '4px' }}>LOGGED IN AS</p>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', fontFamily: 'Space Grotesk, sans-serif' }}>
              {session ? session.username : '—'}
            </p>
          </div>
          {/* Logout button */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 10px', borderRadius: '7px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
              color: 'rgba(239,68,68,0.7)', fontSize: '12px', fontWeight: 500,
              fontFamily: 'Space Grotesk, sans-serif', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={function (e) { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={function (e) { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = 'rgba(239,68,68,0.7)'; }}
          >
            <LogOut size={12} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Top bar */}
        <header style={{ height: '58px', background: '#FFFFFF', borderBottom: '1px solid #E5E4DE', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 36px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={16} color="#9CA3AF" />
            <h1 style={{ fontSize: '17px', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>{title}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusOk === false ? '#F87171' : '#34D399' }} />
            <span className="mono" style={{ fontSize: '11px', color: '#9CA3AF', letterSpacing: '0.08em' }}>
              {status || 'ALL CLEAR'}
            </span>
          </div>
        </header>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '28px 36px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}

export default Layout;
