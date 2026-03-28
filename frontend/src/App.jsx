import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import OriginDashboard from './components/OriginDashboard';
import CarrierDashboard from './components/CarrierDashboard';
import NodeDashboard from './components/NodeDashboard';
import SubsidiaryDashboard from './components/SubsidiaryDashboard';
import LoginPage from './components/LoginPage';
import { getSession } from './auth';
import './index.css';

const pv = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit:    { opacity: 0,        transition: { duration: 0.12 } },
};

/* Wraps a route so only the correct role can access it */
function ProtectedRoute({ allowedRole, children }) {
  const session = getSession();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  if (session.username !== allowedRole) {
    /* Redirect them to their own dashboard */
    return <Navigate to={session.route} replace />;
  }
  return children;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Root → login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Protected — strict role isolation */}
        <Route path="/origin" element={
          <ProtectedRoute allowedRole="origin">
            <motion.div variants={pv} initial="initial" animate="animate" exit="exit" style={{ height: '100vh' }}>
              <OriginDashboard />
            </motion.div>
          </ProtectedRoute>
        } />

        <Route path="/node" element={
          <ProtectedRoute allowedRole="node">
            <motion.div variants={pv} initial="initial" animate="animate" exit="exit" style={{ height: '100vh' }}>
              <NodeDashboard />
            </motion.div>
          </ProtectedRoute>
        } />

        <Route path="/carrier" element={
          <ProtectedRoute allowedRole="carrier">
            <motion.div variants={pv} initial="initial" animate="animate" exit="exit" style={{ height: '100vh' }}>
              <CarrierDashboard />
            </motion.div>
          </ProtectedRoute>
        } />

        <Route path="/subsidiary" element={
          <ProtectedRoute allowedRole="subsidiary">
            <motion.div variants={pv} initial="initial" animate="animate" exit="exit" style={{ height: '100vh' }}>
              <SubsidiaryDashboard />
            </motion.div>
          </ProtectedRoute>
        } />

        {/* Catch-all → login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
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
