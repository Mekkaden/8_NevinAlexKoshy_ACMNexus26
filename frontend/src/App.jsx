import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import OriginDashboard from './components/OriginDashboard';
import CarrierDashboard from './components/CarrierDashboard';
import NodeDashboard from './components/NodeDashboard';
import SubsidiaryDashboard from './components/SubsidiaryDashboard';
import './index.css';

const ROLES = [
  {
    id: 'Origin',
    label: 'Origin Hub',
    icon: '🌐',
    description: 'Supply chain command & threat intelligence',
    color: '#00c2ff',
    glow: 'rgba(0,194,255,0.25)',
  },
  {
    id: 'Node',
    label: 'Node Ops',
    icon: '🏭',
    description: 'Subsidiary node · inventory & dispatch',
    color: '#00e676',
    glow: 'rgba(0,230,118,0.25)',
  },
  {
    id: 'Carrier',
    label: 'Heavy Carrier',
    icon: '🚚',
    description: 'Driver dashboard · live route tracking',
    color: '#ffab00',
    glow: 'rgba(255,171,0,0.25)',
  },
  {
    id: 'Subsidiary',
    label: 'Subsidiary Branch',
    icon: '📦',
    description: 'Last-mile delivery · Kochi zone',
    color: '#bf4cff',
    glow: 'rgba(191,76,255,0.25)',
  },
];

function RoleCard({ role, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      className="w-full text-left rounded-2xl p-6 border transition-all duration-200 group"
      style={{
        background: '#0d1623',
        borderColor: '#1e2d45',
      }}
      whileHover={{
        scale: 1.02,
        borderColor: role.color,
        boxShadow: `0 0 30px ${role.glow}`,
        backgroundColor: role.color + '0a',
      }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: role.color + '15', border: `1px solid ${role.color}30` }}
        >
          {role.icon}
        </div>
        <div className="flex-1">
          <div className="font-bold text-white text-lg mb-1 group-hover:text-inherit transition-colors"
            style={{}}>
            {role.label}
          </div>
          <div className="text-sm" style={{ color: '#5a7a9a' }}>{role.description}</div>
        </div>
        <div className="text-[#5a7a9a] group-hover:translate-x-1 transition-transform text-lg mt-1">→</div>
      </div>

      {/* Color bar */}
      <motion.div
        className="mt-4 h-0.5 rounded-full"
        style={{ background: `linear-gradient(90deg, ${role.color}, transparent)` }}
        initial={{ scaleX: 0, originX: 0 }}
        whileInView={{ scaleX: 1 }}
        transition={{ delay: 0.1, duration: 0.6 }}
      />
    </motion.button>
  );
}

function LoginScreen({ onSelect }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: 'linear-gradient(135deg, #050a14 0%, #071525 100%)' }}
    >
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: 'linear-gradient(#1e2d45 1px, transparent 1px), linear-gradient(90deg, #1e2d45 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-lg">
        {/* Logo / Branding */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg, #00c2ff, #0077ff)', boxShadow: '0 0 24px rgba(0,194,255,0.4)' }}>
              ⚡
            </div>
            <span className="text-2xl font-black tracking-tight text-white">
              NEXUS<span style={{ color: '#00c2ff' }}>26</span>
            </span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Supply Chain OS</h1>
          <p className="text-[#5a7a9a] text-sm">Self-healing · Real-time · AI-powered</p>

          {/* Live badge */}
          <div className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.3)' }}>
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-[#00e676]"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            />
            <span className="text-xs font-mono text-[#00e676]">SYSTEM ONLINE</span>
          </div>
        </motion.div>

        {/* Role selector */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-xs font-mono text-[#5a7a9a] tracking-widest mb-4 text-center uppercase">
            Select Your Role to Enter Dashboard
          </p>
          <div className="space-y-3">
            {ROLES.map(function(role, i) {
              return (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 260, damping: 22 }}
                >
                  <RoleCard
                    role={role}
                    onClick={function() { onSelect(role.id); }}
                  />
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.p
          className="text-center text-xs text-[#2a3d55] font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          NEXUS Hackathon Demo · V1 Boilerplate
        </motion.p>
      </div>
    </div>
  );
}

function BackButton({ role, onBack }) {
  const roleInfo = ROLES.find(function(r) { return r.id === role; });
  return (
    <motion.button
      onClick={onBack}
      className="fixed top-4 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all"
      style={{
        background: '#0d1623',
        border: `1px solid ${roleInfo ? roleInfo.color + '50' : '#1e2d45'}`,
        color: roleInfo ? roleInfo.color : '#5a7a9a',
      }}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      ← Switch Role
    </motion.button>
  );
}

function App() {
  const [role, setRole] = useState(null);

  function handleSelectRole(selectedRole) {
    setRole(selectedRole);
  }

  function handleBack() {
    setRole(null);
  }

  function renderDashboard() {
    if (role === 'Origin') return <OriginDashboard />;
    if (role === 'Node') return <NodeDashboard />;
    if (role === 'Carrier') return <CarrierDashboard />;
    if (role === 'Subsidiary') return <SubsidiaryDashboard />;
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      {!role ? (
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <LoginScreen onSelect={handleSelectRole} />
        </motion.div>
      ) : (
        <motion.div
          key={role}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <BackButton role={role} onBack={handleBack} />
          {renderDashboard()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App;
