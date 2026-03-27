import { useNavigate, useLocation } from 'react-router-dom';
import { Globe2, Warehouse, Truck, Package, Zap, Activity } from 'lucide-react';

const NAV = [
  { id: 'origin',     label: 'Origin Hub',      Icon: Globe2,     path: '/origin' },
  { id: 'node',       label: 'Node Operations', Icon: Warehouse,  path: '/node' },
  { id: 'carrier',    label: 'Heavy Carrier',   Icon: Truck,      path: '/carrier' },
  { id: 'subsidiary', label: 'Subsidiary',      Icon: Package,    path: '/subsidiary' },
];

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
  const location = useLocation();

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

        {/* Nav */}
        <nav style={{ flex: 1, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <p className="mono" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em', padding: '4px 10px 8px', textTransform: 'uppercase' }}>Dashboards</p>
          {NAV.map(function (item) {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={function () { navigate(item.path); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  width: '100%', padding: '9px 12px', borderRadius: '8px',
                  background: active ? '#F5C422' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  color: active ? '#0E2030' : 'rgba(255,255,255,0.5)',
                  fontSize: '13px', fontWeight: active ? 600 : 400,
                  fontFamily: 'Space Grotesk, sans-serif',
                  textAlign: 'left', transition: 'all 0.15s',
                }}
                onMouseEnter={function (e) { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#FAFAFA'; } }}
                onMouseLeave={function (e) { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; } }}
              >
                <item.Icon size={15} strokeWidth={active ? 2.5 : 1.8} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* System status */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34D399', flexShrink: 0 }} />
            <span className="mono" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>SYSTEM ONLINE</span>
          </div>
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
