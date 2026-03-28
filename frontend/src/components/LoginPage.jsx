import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react';
import { login, CREDENTIALS } from '../auth';

var ROLES = Object.keys(CREDENTIALS).map(function (key) {
  return { value: key, label: CREDENTIALS[key].label };
});

/* Floating network particle data */
var PARTICLES = [
  { cx: '12%',  cy: '20%', r: 5,  dur: 7,   delay: 0   },
  { cx: '80%',  cy: '15%', r: 4,  dur: 9,   delay: 1.2 },
  { cx: '65%',  cy: '70%', r: 6,  dur: 8,   delay: 0.5 },
  { cx: '25%',  cy: '78%', r: 3,  dur: 10,  delay: 2   },
  { cx: '88%',  cy: '55%', r: 5,  dur: 7.5, delay: 0.8 },
  { cx: '50%',  cy: '88%', r: 4,  dur: 9,   delay: 1.6 },
  { cx: '5%',   cy: '55%', r: 3,  dur: 11,  delay: 2.4 },
];

var LINES = [
  { x1: '12%', y1: '20%', x2: '25%', y2: '78%' },
  { x1: '80%', y1: '15%', x2: '65%', y2: '70%' },
  { x1: '65%', y1: '70%', x2: '88%', y2: '55%' },
  { x1: '25%', y1: '78%', x2: '50%', y2: '88%' },
  { x1: '5%',  y1: '55%', x2: '12%', y2: '20%' },
];

var EXTRA_CSS = `
@keyframes shake {
  0%,100% { transform: translateX(0); }
  15%      { transform: translateX(-8px); }
  30%      { transform: translateX(8px); }
  45%      { transform: translateX(-6px); }
  60%      { transform: translateX(6px); }
  75%      { transform: translateX(-3px); }
  90%      { transform: translateX(3px); }
}
@keyframes pulse-dot {
  0%,100% { opacity: 1; }
  50%      { opacity: 0.3; }
}
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes line-fade {
  0%,100% { opacity: 0.05; }
  50%      { opacity: 0.18; }
}
@keyframes pt-drift {
  0%   { transform: translate(0px,   0px);   opacity: 0;    }
  15%  { opacity: 0.5; }
  85%  { opacity: 0.3; }
  100% { transform: translate(8px, -48px);   opacity: 0;    }
}
`;

function LoginPage() {
  var navigate = useNavigate();

  var [role, setRole]         = useState('');
  var [password, setPassword] = useState('');
  var [showPw, setShowPw]     = useState(false);
  var [error, setError]       = useState('');
  var [shaking, setShaking]   = useState(false);
  var [loading, setLoading]   = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!role) { triggerError('Please select your role.'); return; }
    if (!password) { triggerError('Password is required.'); return; }
    setLoading(true);
    setTimeout(function () {
      var result = login(role, password);
      setLoading(false);
      if (result.ok) {
        navigate(result.session.route, { replace: true });
      } else {
        triggerError(result.error);
        setPassword('');
      }
    }, 420);
  }

  function triggerError(msg) {
    setError(msg);
    setShaking(true);
    setTimeout(function () { setShaking(false); }, 640);
  }

  return (
    <>
      <style>{EXTRA_CSS}</style>

      {/* Full background */}
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 30% 20%, #0e2a45 0%, #0d1117 55%, #0a0f1a 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Space Grotesk, sans-serif',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Grid texture */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        {/* Network SVG particles */}
        <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
          {LINES.map(function (ln, i) {
            return (
              <line key={'ln' + i}
                x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2}
                stroke="rgba(245,196,34,0.15)" strokeWidth="1"
                style={{ animation: 'line-fade ' + (4 + i) + 's ease-in-out infinite', animationDelay: (i * 0.6) + 's' }}
              />
            );
          })}
          {PARTICLES.map(function (p, i) {
            return (
              <circle key={'pt' + i} cx={p.cx} cy={p.cy} r={p.r}
                fill="rgba(245,196,34,0.5)"
                style={{ animation: 'pt-drift ' + p.dur + 's ease-in-out infinite', animationDelay: p.delay + 's' }}
              />
            );
          })}
        </svg>

        {/* Card — use Framer Motion for reliable spring entrance */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 20, duration: 0.8 }}
          style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px' }}
        >
          <div
            style={{
              background: 'rgba(13,17,23,0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              padding: '44px 40px',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05) inset',
              animation: shaking ? 'shake 0.6s ease' : 'none',
            }}
          >

            {/* Logo row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px' }}>
              <motion.div
                whileHover={{ rotate: 360, transition: { duration: 0.5, ease: 'easeInOut' } }}
                style={{
                  width: '40px', height: '40px',
                  background: 'linear-gradient(135deg, #F5C422 0%, #f59e0b 100%)',
                  borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(245,196,34,0.35)',
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                <Zap size={18} color="#0E2030" strokeWidth={2.5} fill="#0E2030" />
              </motion.div>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#FAFAFA', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                  LOG LAB
                </div>
                <p className="mono" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginTop: '3px' }}>
                  SUPPLY CHAIN OS
                </p>
              </div>
              {/* Status dot */}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <motion.div
                    animate={{ scale: [1, 2.4, 2.4], opacity: [0.6, 0, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', repeatDelay: 0.5 }}
                    style={{ position: 'absolute', width: '6px', height: '6px', borderRadius: '50%', background: '#34D399' }}
                  />
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34D399', zIndex: 1 }} />
                </div>
                <span className="mono" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>SECURE</span>
              </div>
            </div>

            {/* Heading */}
            <div style={{ marginBottom: '28px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.03em', marginBottom: '6px' }}>
                Operator Login
              </h1>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                Select your role and enter your credentials to access the dashboard.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Role selector */}
              <div>
                <label className="mono" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '7px' }}>
                  Role / Department
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={role}
                    onChange={function (e) { setRole(e.target.value); setError(''); }}
                    style={{
                      width: '100%', padding: '12px 16px',
                      background: '#0d1117',
                      border: '1px solid ' + (error && !role ? '#ef4444' : 'rgba(255,255,255,0.12)'),
                      borderRadius: '10px',
                      color: role ? '#e2e8f0' : 'rgba(255,255,255,0.3)',
                      fontSize: '14px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 500,
                      outline: 'none', cursor: 'pointer',
                      appearance: 'none', WebkitAppearance: 'none',
                      transition: 'border-color 0.15s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={function (e) { e.target.style.borderColor = '#F5C422'; }}
                    onBlur={function (e) { e.target.style.borderColor = error && !role ? '#ef4444' : 'rgba(255,255,255,0.12)'; }}
                  >
                    <option value="">— Select your role —</option>
                    {ROLES.map(function (r) {
                      return <option key={r.value} value={r.value}>{r.label}</option>;
                    })}
                  </select>
                  <ShieldCheck size={14} color="rgba(255,255,255,0.2)" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="mono" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '7px' }}>
                  Access Key
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={function (e) { setPassword(e.target.value); setError(''); }}
                    placeholder="Enter access key"
                    autoComplete="current-password"
                    style={{
                      width: '100%', padding: '12px 44px 12px 16px',
                      background: '#0d1117',
                      border: '1px solid ' + (error ? '#ef4444' : 'rgba(255,255,255,0.12)'),
                      borderRadius: '10px',
                      color: '#e2e8f0',
                      fontSize: '14px', fontFamily: 'DM Mono, monospace',
                      outline: 'none',
                      transition: 'border-color 0.15s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={function (e) { e.target.style.borderColor = '#F5C422'; }}
                    onBlur={function (e) { e.target.style.borderColor = error ? '#ef4444' : 'rgba(255,255,255,0.12)'; }}
                  />
                  <button
                    type="button"
                    onClick={function () { setShowPw(function (p) { return !p; }); }}
                    style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'rgba(255,255,255,0.35)' }}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{
                      padding: '10px 14px',
                      background: 'rgba(239,68,68,0.12)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '8px',
                      fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#f87171',
                      letterSpacing: '0.04em',
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>⚠</span> {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={!loading ? { y: -2, boxShadow: '0 8px 28px rgba(245,196,34,0.45)' } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
                style={{
                  marginTop: '4px',
                  width: '100%', padding: '14px',
                  background: loading ? 'rgba(245,196,34,0.6)' : 'linear-gradient(135deg, #F5C422 0%, #f59e0b 100%)',
                  border: 'none', borderRadius: '10px',
                  color: '#0E2030',
                  fontSize: '14px', fontWeight: 700,
                  fontFamily: 'Space Grotesk, sans-serif',
                  cursor: loading ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 16px rgba(245,196,34,0.3)',
                  letterSpacing: '-0.01em',
                }}
              >
                {loading
                  ? <><span style={{ width: '14px', height: '14px', border: '2px solid #0E2030', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Authenticating…</>
                  : <><LogIn size={15} strokeWidth={2.5} /> Access Dashboard</>
                }
              </motion.button>

            </form>

            {/* Footer */}
            <p className="mono" style={{ fontSize: '10px', color: '#6B7280', marginTop: '24px', letterSpacing: '0.04em' }}>
              LOG LAB · CLIQUE × MITS · SECURED SESSION
            </p>

          </div>
        </motion.div>
      </div>
    </>
  );
}

export default LoginPage;
