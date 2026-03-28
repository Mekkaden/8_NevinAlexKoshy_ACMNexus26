import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react';
import { login, CREDENTIALS } from '../auth';

var ROLES = Object.keys(CREDENTIALS).map(function (key) {
  return { value: key, label: CREDENTIALS[key].label };
});

var shakeKeyframes = `
@keyframes shake {
  0%,100% { transform: translateX(0); }
  15%      { transform: translateX(-8px); }
  30%      { transform: translateX(8px); }
  45%      { transform: translateX(-6px); }
  60%      { transform: translateX(6px); }
  75%      { transform: translateX(-3px); }
  90%      { transform: translateX(3px); }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulse-dot {
  0%,100% { opacity: 1; }
  50%      { opacity: 0.3; }
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
    /* Slight artificial delay for UX */
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
    setTimeout(function () { setShaking(false); }, 600);
  }

  return (
    <>
      <style>{shakeKeyframes}</style>
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 30% 20%, #0e2a45 0%, #0d1117 55%, #0a0f1a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Space Grotesk, sans-serif',
        padding: '24px',
      }}>

        {/* Background grid texture */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        <div style={{
          position: 'relative', zIndex: 1,
          animation: 'fadeUp 0.5s ease both',
          width: '100%', maxWidth: '420px',
        }}>

          {/* Card */}
          <div style={{
            background: 'rgba(13,17,23,0.82)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '44px 40px',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
            animation: shaking ? 'shake 0.55s ease' : 'none',
          }}>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px' }}>
              <div style={{
                width: '40px', height: '40px',
                background: 'linear-gradient(135deg, #F5C422 0%, #f59e0b 100%)',
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(245,196,34,0.3)',
              }}>
                <Zap size={18} color="#0E2030" strokeWidth={2.5} fill="#0E2030" />
              </div>
              <div>
                <p style={{ fontSize: '18px', fontWeight: 700, color: '#FAFAFA', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  NEXUS26
                </p>
                <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginTop: '3px' }}>
                  SUPPLY CHAIN OS
                </p>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34D399', animation: 'pulse-dot 2s infinite' }} />
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>SECURE</span>
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

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Role selector */}
              <div>
                <label style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '7px' }}>
                  Role / Department
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={role}
                    onChange={function (e) { setRole(e.target.value); setError(''); }}
                    style={{
                      width: '100%', padding: '12px 16px',
                      background: '#0d1117',
                      border: '1px solid ' + (error && !role ? '#ef4444' : 'rgba(255,255,255,0.1)'),
                      borderRadius: '10px',
                      color: role ? '#e2e8f0' : 'rgba(255,255,255,0.3)',
                      fontSize: '14px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 500,
                      outline: 'none', cursor: 'pointer',
                      appearance: 'none', WebkitAppearance: 'none',
                      transition: 'border-color 0.15s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={function (e) { e.target.style.borderColor = '#F5C422'; }}
                    onBlur={function (e) { e.target.style.borderColor = error && !role ? '#ef4444' : 'rgba(255,255,255,0.1)'; }}
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
                <label style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '7px' }}>
                  
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
                      border: '1px solid ' + (error ? '#ef4444' : 'rgba(255,255,255,0.1)'),
                      borderRadius: '10px',
                      color: '#e2e8f0',
                      fontSize: '14px', fontFamily: 'DM Mono, monospace',
                      outline: 'none',
                      transition: 'border-color 0.15s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={function (e) { e.target.style.borderColor = '#F5C422'; }}
                    onBlur={function (e) { e.target.style.borderColor = error ? '#ef4444' : 'rgba(255,255,255,0.1)'; }}
                  />
                  <button type="button" onClick={function () { setShowPw(function (p) { return !p; }); }}
                    style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'rgba(255,255,255,0.35)' }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '8px',
                  fontFamily: 'DM Mono, monospace',
                  fontSize: '11px',
                  color: '#f87171',
                  letterSpacing: '0.04em',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <span style={{ fontSize: '14px' }}>⚠</span> {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
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
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 16px rgba(245,196,34,0.25)',
                  letterSpacing: '-0.01em',
                }}
                onMouseEnter={function (e) { if (!loading) { e.currentTarget.style.boxShadow = '0 6px 24px rgba(245,196,34,0.4)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                onMouseLeave={function (e) { e.currentTarget.style.boxShadow = '0 4px 16px rgba(245,196,34,0.25)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {loading
                  ? <><span style={{ width: '14px', height: '14px', border: '2px solid #0E2030', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Authenticating…</>
                  : <><LogIn size={15} strokeWidth={2.5} /> Access Dashboard</>
                }
              </button>
            </form>

            {/* Footer hint */}
            <p style={{ marginTop: '28px', fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.15)', textAlign: 'center', letterSpacing: '0.06em' }}>
              ACM NEXUS 26 · CLIQUE × MITS · SECURED SESSION
            </p>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

export default LoginPage;
