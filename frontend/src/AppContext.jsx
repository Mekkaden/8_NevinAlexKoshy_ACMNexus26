/**
 * AppContext.jsx
 * 
 * Global React context providing:
 *   - A single Socket.io connection shared across all dashboards
 *   - A live globalState snapshot from the backend (/api/state)
 *   - A refetch() helper any dashboard can call
 * 
 * Usage:
 *   const { globalState, isConnected, refetch } = useAppContext();
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [globalState, setGlobalState] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket]           = useState(null);

  const refetch = useCallback(function () {
    fetch('/api/state')
      .then(r => r.json())
      .then(data => setGlobalState(data))
      .catch(() => {});
  }, []);

  // Fetch initial state
  useEffect(function () {
    refetch();
  }, [refetch]);

  // Create a single shared socket connection
  useEffect(function () {
    const sock = io('http://localhost:3001', { transports: ['websocket', 'polling'] });

    sock.on('connect',       () => setIsConnected(true));
    sock.on('disconnect',    () => setIsConnected(false));
    sock.on('connect_error', () => setIsConnected(false));

    // Hydrate global state on any mutation event
    sock.on('state_updated', function (data) {
      setGlobalState(data);
    });

    sock.on('route_updated', function () {
      // Full state_updated already fired, but belt-and-suspenders refetch
      refetch();
    });

    sock.on('route_reset', function () {
      refetch();
    });

    setSocket(sock);

    return () => sock.disconnect();
  }, [refetch]);

  return (
    <AppContext.Provider value={{ globalState, isConnected, socket, refetch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within <AppProvider>');
  return ctx;
}

export default AppContext;
