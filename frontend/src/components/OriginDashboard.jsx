import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import gsap from 'gsap';
import { AlertTriangle, Truck, Shield, Radio, RotateCcw, MapPin, Navigation } from 'lucide-react';
import L from 'leaflet';
import { MapContainer, TileLayer, Polyline, Marker, Tooltip } from 'react-leaflet';
import Layout, { Card, StatCard, SectionLabel } from './Layout';
import { normalizeNode, normalizePath } from '../nodeUtils';

/* ─── All nodes with real lat/lng coords ─────────────────────────── */
var ALL_NODES = [
  { id: 'BLR', name: 'Bangalore',   lat: 12.9716, lng: 77.5946, role: 'Origin' },
  { id: 'COK', name: 'Kochi',       lat: 9.9312,  lng: 76.2673, role: 'Node' },
  { id: 'CBE', name: 'Coimbatore',  lat: 11.0168, lng: 76.9558, role: 'Node' },
  { id: 'TVM', name: 'Trivandrum',  lat: 8.5241,  lng: 76.9366, role: 'Destination' },
  { id: 'MAA', name: 'Chennai',     lat: 13.0827, lng: 80.2707, role: 'Node' },
  { id: 'MDU', name: 'Madurai',     lat: 9.9252,  lng: 78.1198, role: 'Node' },
  { id: 'IXE', name: 'Mangalore',   lat: 12.9141, lng: 74.8560, role: 'Node' },
  { id: 'MYS', name: 'Mysore',      lat: 12.2958, lng: 76.6394, role: 'Node' },
  { id: 'SLM', name: 'Salem',       lat: 11.6643, lng: 78.1460, role: 'Node' },
  { id: 'HBL', name: 'Hubli',       lat: 15.3647, lng: 75.1240, role: 'Node' },
  { id: 'HYD', name: 'Hyderabad',   lat: 17.3850, lng: 78.4867, role: 'Node' },
  { id: 'CCJ', name: 'Calicut',     lat: 11.2588, lng: 75.7804, role: 'Node' },
];

var ALL_EDGES = [
  ['BLR','COK'], ['COK','TVM'], ['BLR','CBE'], ['CBE','TVM'],
  ['BLR','MAA'], ['MAA','MDU'], ['MDU','TVM'], ['BLR','IXE'],
  ['IXE','COK'], ['BLR','MYS'], ['MYS','CBE'], ['CBE','SLM'],
  ['SLM','MAA'], ['BLR','HBL'], ['HBL','IXE'], ['BLR','HYD'],
  ['HYD','MAA'], ['COK','CCJ'], ['CCJ','IXE'], ['MDU','CBE'],
];

function findNode(idOrName) {
  for (var i = 0; i < ALL_NODES.length; i++) {
    if (ALL_NODES[i].id === idOrName || ALL_NODES[i].name === idOrName) {
      return ALL_NODES[i];
    }
  }
  return null;
}

function buildActiveEdgeSet(path) {
  var set = new Set();
  for (var i = 0; i < path.length - 1; i++) {
    var a = path[i]; var b = path[i + 1];
    set.add(a + '-' + b); set.add(b + '-' + a);
  }
  return set;
}

function makeNodeIcon(color, pulse) {
  var pulseAnim = pulse ? 'animation:leaflet-pulse 1.4s ease-in-out infinite;' : '';
  var html = '<div style="width:18px;height:18px;border-radius:50%;background:' + color + ';border:3px solid #FFFFFF;box-shadow:0 0 14px ' + color + 'cc, 0 2px 4px rgba(0,0,0,0.1);' + pulseAnim + '"></div>';
  return L.divIcon({ className: '', html: html, iconSize: [18, 18], iconAnchor: [9, 9] });
}

var ROAD_GEOMETRY_CACHE = {};

function getRouteColor(delayProb, isSelected) {
  if (isSelected)      return '#3B82F6';
  if (delayProb <= 20) return '#10B981';
  if (delayProb <= 40) return '#F59E0B';
  return '#EF4444';
}

/* ═══════════════════════════════════════════════════════════════════
   LiveRouteMap
   ═══════════════════════════════════════════════════════════════════ */
function LiveRouteMap({ routeAnalysis, selectedRouteId, onSelectRoute, forcedPath, blockedNode, sourceNode, destNode }) {
  var [roadGeometry, setRoadGeometry] = useState({});
  var [loadingRoutes, setLoadingRoutes] = useState(true);

  var selectedRoute = null;
  if (routeAnalysis && routeAnalysis.routes) {
    if (selectedRouteId) {
      for (var ri = 0; ri < routeAnalysis.routes.length; ri++) {
        if (routeAnalysis.routes[ri].id === selectedRouteId) { selectedRoute = routeAnalysis.routes[ri]; break; }
      }
    }
    if (!selectedRoute) {
      for (var oi = 0; oi < routeAnalysis.routes.length; oi++) {
        if (routeAnalysis.routes[oi].isOptimal) { selectedRoute = routeAnalysis.routes[oi]; break; }
      }
    }
  }

  var effectivePath = (forcedPath && forcedPath.length > 1) ? forcedPath : (selectedRoute ? selectedRoute.path : []);
  var activeNodeSet = new Set(effectivePath.map(function (n) { var nd = findNode(n); return nd ? nd.id : n; }));

  useEffect(function () {
    var cancelled = false;
    setLoadingRoutes(true);
    function pollCache() {
      fetch('http://localhost:3001/api/roads/bulk')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (cancelled) return;
          var geom = {};
          if (data && data.cache) {
            ALL_EDGES.forEach(function (ep) {
              var fn = findNode(ep[0]); var tn = findNode(ep[1]);
              if (fn && tn) {
                var kFwd = fn.lng + ',' + fn.lat + ';' + tn.lng + ',' + tn.lat;
                var kRev = tn.lng + ',' + tn.lat + ';' + fn.lng + ',' + fn.lat;
                if (data.cache[kFwd]) geom[fn.id + '-' + tn.id] = data.cache[kFwd];
                else if (data.cache[kRev]) geom[fn.id + '-' + tn.id] = data.cache[kRev].slice().reverse();
              }
            });
            setRoadGeometry(geom);
          }
          if (data && !data.ready) setTimeout(pollCache, 2000);
          else setLoadingRoutes(false);
        })
        .catch(function () { if (!cancelled) setTimeout(pollCache, 3000); });
    }
    pollCache();
    return function () { cancelled = true; };
  }, []);

  function segPos(a, b) {
    var fn = findNode(a); var tn = findNode(b);
    if (!fn || !tn) return null;
    return roadGeometry[fn.id + '-' + tn.id] || roadGeometry[tn.id + '-' + fn.id] || [[fn.lat, fn.lng], [tn.lat, tn.lng]];
  }

  var sortedRoutes = routeAnalysis && routeAnalysis.routes
    ? routeAnalysis.routes.slice().sort(function (a, b) { return b.delayProbability - a.delayProbability; })
    : [];

  return (
    <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E4DE', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
      {loadingRoutes && (
        <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 1100, background: 'rgba(255,255,255,0.95)', border: '1px solid #E5E4DE', borderRadius: '8px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', animation: 'leaflet-pulse 1s infinite' }} />
          <span className="mono" style={{ fontSize: '10px', color: '#64748b', letterSpacing: '0.06em' }}>LOADING ROAD DATA…</span>
        </div>
      )}
      <MapContainer center={[11.5, 77.5]} zoom={6} style={{ height: '480px', width: '100%', background: '#F8FAFC' }} zoomControl={true} scrollWheelZoom={true} attributionControl={false}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
        {ALL_EDGES.map(function (ep, idx) {
          var fn = findNode(ep[0]); var tn = findNode(ep[1]);
          if (!fn || !tn) return null;
          var pos = roadGeometry[fn.id + '-' + tn.id] || [[fn.lat, fn.lng], [tn.lat, tn.lng]];
          return <Polyline key={'bg' + idx} positions={pos} pathOptions={{ color: '#CBD5E1', weight: 3, opacity: 0.6 }} />;
        })}
        {sortedRoutes.map(function (route) {
          var isSel  = selectedRoute && selectedRoute.id === route.id;
          var color  = getRouteColor(route.delayProbability, isSel);
          var weight = isSel ? 6 : 3;
          var op     = isSel ? 1.0 : 0.8;
          var dash   = isSel ? null : '8 6';
          return route.path.slice(0, -1).map(function (_, si) {
            var pos = segPos(route.path[si], route.path[si + 1]);
            if (!pos) return null;
            return (
              <Polyline key={route.id + 's' + si} positions={pos}
                pathOptions={{ color: color, weight: weight, opacity: op, dashArray: dash, lineCap: 'round', lineJoin: 'round' }}
                eventHandlers={{ click: function () { onSelectRoute(route.id); } }}
              />
            );
          });
        })}
        {forcedPath && forcedPath.length > 1 && forcedPath.slice(0, -1).map(function (_, si) {
          var pos = segPos(forcedPath[si], forcedPath[si + 1]);
          if (!pos) return null;
          return <Polyline key={'fp' + si} positions={pos} pathOptions={{ color: '#F59E0B', weight: 6, opacity: 1, dashArray: '10 5', lineCap: 'round' }} />;
        })}
        {ALL_NODES.map(function (node) {
          var inActive  = activeNodeSet.has(node.id);
          var isBlocked = blockedNode === node.id;
          var isOrigin  = node.id === sourceNode;
          var isDest    = node.id === destNode;
          var show  = inActive || isBlocked || isOrigin || isDest;
          var color = isBlocked ? '#EF4444' : isOrigin ? '#3B82F6' : isDest ? '#8B5CF6' : inActive ? '#10B981' : '#CBD5E1';
          return (
            <Marker key={node.id} position={[node.lat, node.lng]} icon={makeNodeIcon(color, inActive && !isBlocked)}>
              <Tooltip permanent={show} direction="top" offset={[0, -10]}>
                <span className="mono" style={{ fontSize: '10px', fontWeight: 600, color: '#111827', background: 'transparent', border: 'none', letterSpacing: '0.04em' }}>
                  {node.name}{isBlocked ? ' (THREAT)' : isOrigin ? ' (SRC)' : isDest ? ' (DEST)' : ''}
                </span>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
      <div style={{ position: 'absolute', bottom: '14px', left: '14px', zIndex: 1000, display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', border: '1px solid #E5E4DE', borderRadius: '8px', padding: '10px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        {[['#3B82F6','OPTIMAL / ACTIVE'],['#10B981','SAFE'],['#F59E0B','MODERATE'],['#EF4444','DANGER']].map(function (pair) {
          return (
            <div key={pair[1]} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: pair[0] }} />
              <span className="mono" style={{ fontSize: '9px', color: '#64748B', letterSpacing: '0.08em', fontWeight: 600 }}>{pair[1]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   RouteConfigPanel
   ═══════════════════════════════════════════════════════════════════ */
function RouteConfigPanel({ sourceNode, destNode, onSourceChange, onDestChange, activePath }) {
  var panelRef = useRef(null);

  function flashBorder(color) {
    if (!panelRef.current) return;
    gsap.fromTo(panelRef.current,
      { boxShadow: '0 0 0 0 ' + color + '00' },
      { boxShadow: '0 0 0 2px ' + color + ', 0 0 16px ' + color + '55', duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.out' }
    );
  }

  var selectStyle = {
    width: '100%', padding: '12px 14px',
    background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px',
    color: '#111827', fontSize: '13px', fontWeight: 600,
    fontFamily: 'Space Grotesk, sans-serif', outline: 'none', cursor: 'pointer',
    appearance: 'none', WebkitAppearance: 'none', transition: 'all 0.2s ease',
  };
  var labelStyle = {
    fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#64748B',
    letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', display: 'block', fontWeight: 500,
  };
  var pathDisplay = (activePath || []).map(function (id) {
    var node = findNode(id); return node ? node.name : id;
  }).join(' → ');

  return (
    <div ref={panelRef} style={{ background: '#FFFFFF', border: '1px solid #E5E4DE', borderRadius: '12px', padding: '24px', transition: 'box-shadow 0.3s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <Navigation size={16} color="#3B82F6" />
        <span className="mono" style={{ fontSize: '11px', color: '#111827', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Routing Parameters</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <span style={labelStyle}>Source Node</span>
          <div style={{ position: 'relative' }}>
            <motion.select whileFocus={{ borderColor: '#3B82F6', background: '#FFFFFF', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)' }}
              value={sourceNode}
              onChange={function (e) { onSourceChange(e.target.value); flashBorder('#3B82F6'); }}
              style={selectStyle}>
              {ALL_NODES.map(function (n) { return <option key={n.id} value={n.id}>{n.name}</option>; })}
            </motion.select>
            <MapPin size={14} color="#3B82F6" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>
        <div>
          <span style={labelStyle}>Destination Node</span>
          <div style={{ position: 'relative' }}>
            <motion.select whileFocus={{ borderColor: '#8B5CF6', background: '#FFFFFF', boxShadow: '0 0 0 3px rgba(139,92,246,0.1)' }}
              value={destNode}
              onChange={function (e) { onDestChange(e.target.value); flashBorder('#8B5CF6'); }}
              style={selectStyle}>
              {ALL_NODES.map(function (n) { return <option key={n.id} value={n.id}>{n.name}</option>; })}
            </motion.select>
            <MapPin size={14} color="#8B5CF6" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>
      <div style={{ padding: '12px 16px', background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
        <span className="mono" style={{ fontSize: '11px', color: '#065F46', letterSpacing: '0.04em', fontWeight: 500 }}>
          {pathDisplay || 'No active route'}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ThreatPanel
   ═══════════════════════════════════════════════════════════════════ */
function ThreatPanel({ threatened, loading, submitted, submitError, onSimulate, onReset, resetting, threatText, setThreatText, targetNode, setTargetNode }) {
  var inputStyle = {
    width: '100%', padding: '12px 14px', background: '#F9FAFB', border: '1px solid #E5E7EB',
    borderRadius: '8px', color: '#111827', fontSize: '13px', fontFamily: 'Space Grotesk, sans-serif',
    outline: 'none', transition: 'all 0.2s',
  };
  var labelStyle = {
    fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#64748B',
    letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', display: 'block', fontWeight: 500,
  };
  var targetableNodes = ALL_NODES.filter(function (n) { return n.role !== 'Origin'; });

  return (
    <motion.div
      animate={threatened
        ? { boxShadow: ['0 0 0 0 rgba(239,68,68,0)', '0 0 24px 4px rgba(239,68,68,0.25)', '0 0 0 0 rgba(239,68,68,0)'] }
        : { boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }
      }
      transition={threatened ? { duration: 1.8, repeat: Infinity, repeatDelay: 0.8 } : {}}
      style={{
        background: '#FFFFFF',
        border: '1px solid ' + (threatened ? '#FCA5A5' : '#E5E4DE'),
        borderRadius: '12px', padding: '24px',
        display: 'flex', flexDirection: 'column', gap: '20px',
        transition: 'border-color 0.4s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <motion.div animate={threatened ? { rotate: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.5, repeat: threatened ? Infinity : 0, repeatDelay: 2 }}>
          <AlertTriangle size={16} color={threatened ? '#EF4444' : '#111827'} />
        </motion.div>
        <span className="mono" style={{ fontSize: '11px', color: threatened ? '#EF4444' : '#111827', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
          Threat Injection Hub
        </span>
      </div>

      <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6, margin: 0 }}>
        Inject structured or unstructured threat intel. Agentic AI will map and reroute autonomously.
      </p>

      <div>
        <span style={labelStyle}>Target Node</span>
        <div style={{ position: 'relative' }}>
          <motion.select whileFocus={{ borderColor: '#EF4444', background: '#FFFFFF', boxShadow: '0 0 0 3px rgba(239,68,68,0.1)' }}
            value={targetNode} onChange={function (e) { setTargetNode(e.target.value); }}
            style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}>
            <option value="">— Select Target Zone —</option>
            {targetableNodes.map(function (n) { return <option key={n.id} value={n.name}>{n.name}</option>; })}
          </motion.select>
          <AlertTriangle size={14} color="#EF4444" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>
      </div>

      <div>
        <span style={labelStyle}>Intel / Simulation Description</span>
        <motion.textarea
          whileFocus={{ borderColor: '#3B82F6', background: '#FFFFFF', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)' }}
          value={threatText} onChange={function (e) { setThreatText(e.target.value); }}
          onKeyDown={function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSimulate(threatText, targetNode); } }}
          placeholder="E.g. Class 4 storm blocking Highway NH-66"
          rows={3} style={{ ...inputStyle, resize: 'none' }}
        />
      </div>

      <AnimatePresence>
        {submitted && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{ padding: '10px 14px', background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: '8px', color: '#065F46', fontSize: '11px', fontFamily: 'DM Mono, monospace', letterSpacing: '0.04em' }}>
            ✓ INTEL ACKNOWLEDGED — AGENT ROUTING
          </motion.div>
        )}
        {submitError && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#991B1B', fontSize: '11px', fontFamily: 'DM Mono, monospace', letterSpacing: '0.04em' }}>
            ⚠ {submitError}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', gap: '12px' }}>
        <motion.button
          whileHover={(!loading && threatText.trim() && targetNode) ? { scale: 1.02 } : {}}
          whileTap={{ scale: 0.97 }}
          animate={loading ? { background: ['#FEF2F2', '#fee2e2', '#FEF2F2'] } : {}}
          transition={loading ? { duration: 0.8, repeat: Infinity } : {}}
          onClick={function () { onSimulate(threatText, targetNode); }}
          disabled={loading || !threatText.trim() || !targetNode}
          style={{
            flex: 1, padding: '12px',
            background: threatened ? '#FEF2F2' : '#EFF6FF',
            border: '1px solid', borderColor: threatened ? '#FECACA' : '#BFDBFE',
            borderRadius: '8px',
            color: threatened ? '#DC2626' : '#2563EB',
            fontSize: '13px', fontWeight: 600,
            cursor: (loading || !threatText.trim() || !targetNode) ? 'not-allowed' : 'pointer',
            opacity: (!threatText.trim() || !targetNode) ? 0.5 : 1,
            fontFamily: 'Space Grotesk, sans-serif',
          }}
        >
          {loading ? 'Simulating...' : 'Commence Attack Protocol →'}
        </motion.button>
        {threatened && (
          <motion.button
            whileHover={{ scale: 1.02, background: '#F1F5F9' }}
            whileTap={{ scale: 0.98 }}
            onClick={onReset} disabled={resetting}
            style={{ padding: '12px 18px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: resetting ? 'not-allowed' : 'pointer', fontFamily: 'Space Grotesk, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RotateCcw size={14} />
            {resetting ? 'Heal...' : 'Heal'}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   RouteComparisonPanel
   ═══════════════════════════════════════════════════════════════════ */
function RouteComparisonPanel({ analysis, isAnalyzing, selectedId, onSelect }) {
  if (isAnalyzing) {
    return (
      <Card style={{ padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '140px' }}>
        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#3B82F6', animation: 'leaflet-pulse 1s infinite' }} />
        <span className="mono" style={{ marginLeft: '12px', fontSize: '11px', color: '#64748B', letterSpacing: '0.08em' }}>COMPUTING OPTIMAL PATHWAYS...</span>
      </Card>
    );
  }
  if (!analysis || !analysis.routes || analysis.routes.length === 0) return null;

  return (
    <Card style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span className="mono" style={{ fontSize: '11px', color: '#111827', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Route Matrix Calculation</span>
        <span className="mono" style={{ fontSize: '10px', color: '#64748B', background: '#F1F5F9', padding: '4px 8px', borderRadius: '6px' }}>
          {analysis.routes.length} Option{analysis.routes.length > 1 ? 's' : ''}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {analysis.routes.map(function (rt) {
          var isSel = selectedId ? rt.id === selectedId : rt.isOptimal;
          var riskColor = rt.delayProbability <= 20 ? '#10B981' : rt.delayProbability <= 40 ? '#F59E0B' : '#EF4444';
          var pathNames = rt.path.map(function (n) { var nd = findNode(n); return nd ? nd.name : n; });
          return (
            <motion.div key={rt.id}
              whileHover={{ scale: 1.005, y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.07)' }}
              onClick={function () { onSelect(rt.id); }}
              style={{
                padding: '16px',
                background: isSel ? '#EFF6FF' : '#FFFFFF',
                border: '1px solid', borderColor: isSel ? '#3B82F6' : '#E5E7EB',
                borderLeft: isSel ? '4px solid #3B82F6' : '4px solid transparent',
                borderRadius: '10px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'background 0.2s, border-color 0.2s',
                boxShadow: isSel ? '0 4px 16px rgba(59,130,246,0.12)' : '0 2px 4px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  {rt.isOptimal && <span className="mono" style={{ fontSize: '9px', background: '#D1FAE5', color: '#065F46', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>PRIORITY</span>}
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827', fontFamily: 'Space Grotesk, sans-serif' }}>{rt.id.replace(/-/g, ' → ')}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                  Via: {pathNames.slice(1, -1).join(', ') || 'Direct Drop'} • {Math.round(rt.distanceKm)} KM
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: '60px' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: riskColor, fontFamily: 'Space Grotesk, sans-serif' }}>{Math.round(rt.delayProbability)}%</div>
                <div className="mono" style={{ fontSize: '9px', color: '#94A3B8', letterSpacing: '0.04em' }}>DELAY</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   OriginDashboard V2
   ═══════════════════════════════════════════════════════════════════ */
function OriginDashboard() {
  var contentRef = useRef(null);
  var threatBannerRef = useRef(null);
  var [threatText, setThreatText]     = useState('');
  var [targetNode, setTargetNode]     = useState('');
  var [loading, setLoading]           = useState(false);
  var [threatened, setThreatened]     = useState(false);
  var [submitted, setSubmitted]       = useState(false);
  var [submitError, setSubmitError]   = useState('');
  var [resetting, setResetting]       = useState(false);
  var [blockedNode, setBlockedNode]   = useState(null);
  var [sourceNode, setSourceNode]     = useState('BLR');
  var [destNode, setDestNode]         = useState('TVM');
  var [routeAnalysis, setRouteAnalysis] = useState(null);
  var [selectedRouteId, setSelectedRouteId] = useState(null);
  var [isAnalyzing, setIsAnalyzing]   = useState(false);
  var [activePath, setActivePath]     = useState(['BLR', 'COK', 'TVM']);
  var [carriersActive, setCarriersActive] = useState(0);
  var [nodesOnline, setNodesOnline]   = useState(0);
  var [totalNodes, setTotalNodes]     = useState(0);
  var [threatCount, setThreatCount]   = useState(0);
  var [logs, setLogs]                 = useState([]);
  var [prevThreatened, setPrevThreatened] = useState(false);

  function addLog(msg) {
    var t = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    setLogs(function (prev) { return [{ t, msg }].concat(prev.slice(0, 11)); });
  }

  /* GSAP threat hero timeline */
  useEffect(function () {
    if (threatened && !prevThreatened) {
      /* Threat activated — red sweep */
      var tl = gsap.timeline();
      if (threatBannerRef.current) {
        tl.fromTo(threatBannerRef.current,
          { scaleX: 0, opacity: 1, transformOrigin: 'left center' },
          { scaleX: 1, opacity: 1, duration: 0.35, ease: 'power3.out' }
        ).to(threatBannerRef.current, { opacity: 0, duration: 0.3, delay: 0.4 });
      }
      gsap.fromTo('.g-stat',
        { boxShadow: '0 0 0 0 rgba(239,68,68,0)' },
        { boxShadow: '0 0 0 2px rgba(239,68,68,0.6)', duration: 0.3, stagger: 0.05, yoyo: true, repeat: 3, ease: 'power1.inOut' }
      );
    }
    if (!threatened && prevThreatened) {
      /* Healed — green sweep */
      gsap.fromTo('.g-stat',
        { boxShadow: '0 0 0 0 rgba(16,185,129,0)' },
        { boxShadow: '0 0 0 2px rgba(16,185,129,0.5)', duration: 0.3, stagger: 0.05, yoyo: true, repeat: 2, ease: 'power1.inOut' }
      );
    }
    setPrevThreatened(threatened);
  }, [threatened]);

  function hydrateFromState(data) {
    if (data.currentRoute && data.currentRoute.path) {
      setActivePath(normalizePath(data.currentRoute.path));
      var isRerouted = data.currentRoute.status === 'rerouted';
      setThreatened(isRerouted);
      if (!isRerouted) setBlockedNode(null);
      else if (data.threats && data.threats.length > 0) {
        setBlockedNode(normalizeNode(data.threats[data.threats.length - 1].city));
      }
    }
    if (data.active_shipments) {
      setCarriersActive(data.active_shipments.filter(function (s) { return s.status === 'in_transit'; }).length);
    }
    if (data.nodes) {
      setNodesOnline(data.nodes.filter(function (n) { return n.status === 'active'; }).length);
      setTotalNodes(data.nodes.length);
    }
    if (data.threats) setThreatCount(data.threats.length);
  }

  useEffect(function () {
    if (!sourceNode || !destNode || sourceNode === destNode) return;
    var cancelled = false;
    setIsAnalyzing(true);
    setRouteAnalysis(null);
    setSelectedRouteId(null);
    setActivePath([sourceNode, destNode]);
    fetch('http://localhost:3001/api/route-analysis?from=' + sourceNode + '&to=' + destNode)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!cancelled) {
          setRouteAnalysis(data);
          setSelectedRouteId(null);
          setIsAnalyzing(false);
          if (data && data.routes && data.routes.length > 0) {
            var optimalRoute = data.routes.find(function (r) { return r.isOptimal; }) || data.routes[0];
            setActivePath(optimalRoute.path);
            addLog('Analysis Matrix complete. Optimal Delay: ' + Math.round(optimalRoute.delayProbability) + '%.');
          }
        }
      })
      .catch(function (e) { if (!cancelled) { setIsAnalyzing(false); addLog('Route bounds error: ' + e.message); } });
    return function () { cancelled = true; };
  }, [sourceNode, destNode]);

  useEffect(function () {
    fetch('/api/state').then(function (r) { return r.json(); }).then(function (data) {
      hydrateFromState(data);
      if (data.threats && data.threats.length > 0) {
        setLogs(data.threats.map(function (th) { return { t: new Date(th.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }), msg: '🚨 ' + th.city + ' — ' + th.action }; }));
      } else addLog('Global Systems Online. Network Stable.');
    }).catch(function () { addLog('Global Systems Online. Network Stable.'); });
  }, []);

  useEffect(function () {
    var socket = io('http://localhost:3001', { transports: ['websocket', 'polling'] });
    socket.on('state_updated', hydrateFromState);
    socket.on('route_updated', function (d) {
      if (d.blockedNode) setBlockedNode(normalizeNode(d.blockedNode));
      var newPathStr = normalizePath(d.newPath || []).map(function (id) { var n = findNode(id); return n ? n.name : id; }).join(' → ');
      addLog('🚨 AI HEAL INITIATED — ' + d.blockedNode + ' locked out. New vector: ' + newPathStr);
      setThreatened(true);
    });
    socket.on('route_reset', function () {
      setThreatened(false); setBlockedNode(null); setThreatCount(0);
      addLog('✓ Network Restored. All nodes unlocked.');
    });
    return function () { socket.disconnect(); };
  }, []);

  /* Entrance animation */
  useEffect(function () {
    var ctx = gsap.context(function () {
      gsap.from('.g-stat', { opacity: 0, scale: 0.88, y: 32, stagger: 0.1, duration: 0.85, ease: 'back.out(1.7)' });
      gsap.from('.g-card', { opacity: 0, y: 44, stagger: 0.13, delay: 0.3, duration: 1.0, ease: 'power3.out' });
    }, contentRef);
    return function () { ctx.revert(); };
  }, []);

  async function handleSimulate(text, target) {
    if (!text.trim() || !target || loading) return;
    setLoading(true); setSubmitError('');
    var composedText = target ? text + ' (Affected node: ' + target + ')' : text;
    addLog('Transmitting Threat intel: "' + text + '" → Target: ' + target);
    try {
      var res = await fetch('/api/threat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: composedText, from: sourceNode, to: destNode }),
      });
      var data = await res.json();
      if (data.routeResult && data.routeResult.rerouted) {
        setThreatened(true); setSubmitted(true); setTimeout(function () { setSubmitted(false); }, 4000);
      } else {
        setSubmitError((data.aiResult && data.aiResult.reason) ? data.aiResult.reason : 'Discarded by Agent.');
        setTimeout(function () { setSubmitError(''); }, 5000);
      }
    } catch (err) {
      setSubmitError('Connection Timeout.'); setTimeout(function () { setSubmitError(''); }, 5000);
    }
    setLoading(false); setThreatText(''); setTargetNode('');
  }

  async function handleReset() {
    setResetting(true);
    try { await fetch('/api/reset', { method: 'POST' }); } catch (err) {}
    setResetting(false);
  }

  var routeIntegrity = threatened ? (Math.round((1 - threatCount / Math.max(totalNodes, 1)) * 100) + '%') : '100%';
  var stats = [
    { label: 'Carrier Payload',    value: String(carriersActive || 0), sub: 'trucks in transit',                     accent: '#3B82F6',                          icon: Truck },
    { label: 'Network Integrity',  value: routeIntegrity,              sub: threatened ? 'routing degraded' : 'optimal layout', accent: threatened ? '#F59E0B' : '#10B981', icon: Shield },
    { label: 'Agent Interventions',value: String(threatCount),         sub: threatCount ? 'autonomous blocks' : 'zero alerts', accent: threatCount ? '#EF4444' : '#64748B', icon: AlertTriangle },
    { label: 'Active Edge Nodes',  value: totalNodes ? (nodesOnline + '/' + totalNodes) : '—', sub: 'regional ping success', accent: threatened ? '#F59E0B' : '#8B5CF6', icon: Radio },
  ];

  return (
    <Layout title="Global Architecture Hub" status={threatened ? 'THREAT ACTIVE' : 'SYSTEM OPTIMAL'} statusOk={!threatened}>
      <div ref={contentRef} style={{ position: 'relative' }}>

        {/* Threat flash banner */}
        <div ref={threatBannerRef} style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '3px',
          background: 'linear-gradient(90deg, #EF4444, #F59E0B, #EF4444)',
          zIndex: 9999, opacity: 0, transformOrigin: 'left center', pointerEvents: 'none',
        }} />

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {stats.map(function (s) { return <div key={s.label} className="g-stat"><StatCard {...s} /></div>; })}
        </div>

        {/* Route Config */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '24px' }}>
          <div className="g-card">
            <RouteConfigPanel sourceNode={sourceNode} destNode={destNode} onSourceChange={setSourceNode} onDestChange={setDestNode} activePath={activePath} />
          </div>
          <div className="g-card">
            <RouteComparisonPanel analysis={routeAnalysis} isAnalyzing={isAnalyzing} selectedId={selectedRouteId} onSelect={setSelectedRouteId} />
          </div>
        </div>

        {/* Map + Sidebar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', marginBottom: '24px' }}>
          <div className="g-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 4px' }}>
              <span className="mono" style={{ fontSize: '11px', color: '#111827', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Territorial Operations Map</span>
              <AnimatePresence>
                {threatened && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: [1, 1.04, 1] }} exit={{ opacity: 0 }}
                    transition={{ scale: { repeat: Infinity, duration: 1.2 } }}
                    className="mono"
                    style={{ fontSize: '10px', color: '#EF4444', background: '#FEF2F2', padding: '4px 10px', borderRadius: '6px', fontWeight: 600, border: '1px solid #FECACA' }}
                  >
                    ⚠ ACTIVE REROUTE
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <LiveRouteMap routeAnalysis={routeAnalysis} selectedRouteId={selectedRouteId} onSelectRoute={setSelectedRouteId} forcedPath={threatened ? activePath : null} blockedNode={blockedNode} sourceNode={sourceNode} destNode={destNode} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="g-card">
              <ThreatPanel
                threatened={threatened} loading={loading} submitted={submitted} submitError={submitError}
                onSimulate={handleSimulate} onReset={handleReset} resetting={resetting}
                threatText={threatText} setThreatText={setThreatText}
                targetNode={targetNode} setTargetNode={setTargetNode}
              />
            </div>

            {/* System Audit Trace */}
            <Card className="g-card" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span className="mono" style={{ fontSize: '11px', color: '#111827', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '16px', display: 'block' }}>
                System Audit Trace
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }}>
                {logs.length === 0 && <p style={{ fontSize: '13px', color: '#94A3B8', fontFamily: 'Space Grotesk' }}>Recording telemetry...</p>}
                {logs.map(function (log, i) {
                  return (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                      style={{
                        display: 'flex', gap: '16px', alignItems: 'baseline',
                        padding: '8px 0',
                        borderBottom: i < logs.length - 1 ? '1px solid #F1F5F9' : 'none',
                        borderLeft: log.msg.includes('🚨') ? '3px solid #EF4444' : log.msg.includes('✓') ? '3px solid #10B981' : '3px solid transparent',
                        paddingLeft: '10px',
                        transition: 'border-color 0.3s',
                      }}
                    >
                      <span className="mono" style={{ fontSize: '10px', color: '#64748B', minWidth: '40px', fontWeight: 500 }}>{log.t}</span>
                      <span style={{ fontSize: '13px', color: log.msg.includes('🚨') ? '#EF4444' : log.msg.includes('✓') ? '#10B981' : '#334155', fontWeight: 500, lineHeight: 1.4 }}>{log.msg}</span>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>

      </div>
    </Layout>
  );
}

export default OriginDashboard;
