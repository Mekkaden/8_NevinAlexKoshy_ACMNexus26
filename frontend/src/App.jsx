import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import OriginDashboard from './components/OriginDashboard';
import CarrierDashboard from './components/CarrierDashboard';
import NodeDashboard from './components/NodeDashboard';
import SubsidiaryDashboard from './components/SubsidiaryDashboard';
import './index.css';

const pv = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit:    { opacity: 0,        transition: { duration: 0.12 } },
};

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Root → straight to Origin Hub */}
        <Route path="/"           element={<Navigate to="/origin" replace />} />
        <Route path="/origin"     element={<motion.div variants={pv} initial="initial" animate="animate" exit="exit" style={{ height: '100vh' }}><OriginDashboard /></motion.div>} />
        <Route path="/node"       element={<motion.div variants={pv} initial="initial" animate="animate" exit="exit" style={{ height: '100vh' }}><NodeDashboard /></motion.div>} />
        <Route path="/carrier"    element={<motion.div variants={pv} initial="initial" animate="animate" exit="exit" style={{ height: '100vh' }}><CarrierDashboard /></motion.div>} />
        <Route path="/subsidiary" element={<motion.div variants={pv} initial="initial" animate="animate" exit="exit" style={{ height: '100vh' }}><SubsidiaryDashboard /></motion.div>} />
        {/* Catch-all → Origin */}
        <Route path="*"           element={<Navigate to="/origin" replace />} />
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
