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

/* ─── All graph edges for "dimmed" background lines ─────────────── */
var ALL_EDGES = [
  ['BLR','COK'], ['COK','TVM'], ['BLR','CBE'], ['CBE','TVM'],
  ['BLR','MAA'], ['MAA','MDU'], ['MDU','TVM'], ['BLR','IXE'],
  ['IXE','COK'], ['BLR','MYS'], ['MYS','CBE'], ['CBE','SLM'],
  ['SLM','MAA'], ['BLR','HBL'], ['HBL','IXE'], ['BLR','HYD'],
  ['HYD','MAA'], ['COK','CCJ'], ['CCJ','IXE'], ['MDU','CBE'],
];

/* ─── Look up a node object by id OR city name ──────────────────── */
function findNode(idOrName) {
  var found = null;
  for (var i = 0; i < ALL_NODES.length; i++) {
    if (ALL_NODES[i].id === idOrName || ALL_NODES[i].name === idOrName) {
      found = ALL_NODES[i];
      break;
    }
  }
  return found;
}

/* ─── Build a set of active edge keys from path ─────────────────── */
function buildActiveEdgeSet(path) {
  var set = new Set();
  for (var i = 0; i < path.length - 1; i++) {
    var a = path[i];
    var b = path[i + 1];
    set.add(a + '-' + b);
    set.add(b + '-' + a);
  }
  return set;
}

/* ─── Create a custom Leaflet divIcon for a node ────────────────── */
function makeNodeIcon(color, pulse) {
  var pulseAnim = pulse ? 'animation:leaflet-pulse 1.4s ease-in-out infinite;' : '';
  var html = '<div style="width:18px;height:18px;border-radius:50%;background:' + color + ';border:3px solid rgba(255,255,255,0.9);box-shadow:0 0 14px ' + color + 'cc, 0 0 4px rgba(0,0,0,0.6);' + pulseAnim + '"></div>';
  return L.divIcon({
    className: '',
    html: html,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

/* ─── Module-level OSRM route geometry cache (survives re-renders) ─ */
var ROAD_GEOMETRY_CACHE = {};

/* ─── Fetch real driving geometry — tries backend proxy first, then direct OSRM ─ */
function fetchOSRMRoute(fromNode, toNode) {
  var cacheKey = fromNode.id + '-' + toNode.id;
  if (ROAD_GEOMETRY_CACHE[cacheKey]) {
    return Promise.resolve(ROAD_GEOMETRY_CACHE[cacheKey]);
  }

  /* helper: parse [lat,lng] pairs from OSRM GeoJSON response (direct API) */
  function parseOSRMDirect(json) {
    if (json && json.routes && json.routes[0] && json.routes[0].geometry) {
      return json.routes[0].geometry.coordinates.map(function (c) {
        return [c[1], c[0]]; /* OSRM gives [lng,lat] → flip to [lat,lng] for Leaflet */
      });
    }
    return null;
  }

  /* Backend proxy URL */
  var proxyUrl = '/api/roads?fromLng=' + fromNode.lng + '&fromLat=' + fromNode.lat +
    '&toLng=' + toNode.lng + '&toLat=' + toNode.lat;

  /* Direct OSRM public URL (fallback — no CORS issue from backend) */
  var osrmUrl = 'https://router.project-osrm.org/route/v1/driving/' +
    fromNode.lng + ',' + fromNode.lat + ';' +
    toNode.lng  + ',' + toNode.lat  +
    '?overview=full&geometries=geojson';

  function store(coords) {
    if (!coords) { return null; }
    ROAD_GEOMETRY_CACHE[cacheKey] = coords;
    ROAD_GEOMETRY_CACHE[toNode.id + '-' + fromNode.id] = coords.slice().reverse();
    return coords;
  }

  /* Try backend proxy first (fast — cached on server) */
  return fetch(proxyUrl)
    .then(function (r) {
      if (!r.ok) { throw new Error('proxy ' + r.status); }
      return r.json();
    })
    .then(function (data) {
      if (data.coords && data.coords.length > 0) { return store(data.coords); }
      throw new Error('empty proxy response');
    })
    .catch(function () {
      /* Fallback: hit OSRM directly from the browser */
      return fetch(osrmUrl)
        .then(function (r) { return r.json(); })
        .then(function (json) { return store(parseOSRMDirect(json)); })
        .catch(function () { return null; });
    });
}

/* ─── Colour for a route based on delay probability ─────────────── */
function getRouteColor(delayProb, isSelected) {
  if (isSelected)      { return '#10b981'; }
  if (delayProb <= 20) { return '#22c55e'; }
  if (delayProb <= 40) { return '#f59e0b'; }
  return '#ef4444';
}

/* ═══════════════════════════════════════════════════════════════════
   LiveRouteMap — Multi-route map, colour-coded by delay probability
   ═══════════════════════════════════════════════════════════════════ */
function LiveRouteMap(props) {
  var routeAnalysis   = props.routeAnalysis;
  var selectedRouteId = props.selectedRouteId;
  var onSelectRoute   = props.onSelectRoute;
  var forcedPath      = props.forcedPath;
  var blockedNode     = props.blockedNode;
  var sourceNode      = props.sourceNode;   /* dynamic origin node id */
  var destNode        = props.destNode;     /* dynamic destination node id */

  var [roadGeometry, setRoadGeometry] = useState({});
  var [loadingRoutes, setLoadingRoutes] = useState(true);

  /* Resolve which route is currently highlighted */
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

  /* Fetch pre-warmed OSRM geometry from backend */
  useEffect(function () {
    var cancelled = false;
    setLoadingRoutes(true);

    function pollCache() {
      fetch('http://localhost:3001/api/roads/bulk')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (cancelled) { return; }
          var geom = {};
          if (data && data.cache) {
            ALL_EDGES.forEach(function (ep) {
              var fn = findNode(ep[0]);
              var tn = findNode(ep[1]);
              if (fn && tn) {
                var kFwd = fn.lng + ',' + fn.lat + ';' + tn.lng + ',' + tn.lat;
                var kRev = tn.lng + ',' + tn.lat + ';' + fn.lng + ',' + fn.lat;
                if (data.cache[kFwd]) {
                  geom[fn.id + '-' + tn.id] = data.cache[kFwd];
                } else if (data.cache[kRev]) {
                  geom[fn.id + '-' + tn.id] = data.cache[kRev].slice().reverse();
                }
              }
            });
            setRoadGeometry(geom);
          }
          if (data && !data.ready) {
            setTimeout(pollCache, 2000); /* wait for prewarm */
          } else {
            setLoadingRoutes(false);
          }
        })
        .catch(function () {
          if (!cancelled) { setTimeout(pollCache, 3000); }
        });
    }

    pollCache();
    return function () { cancelled = true; };
  }, []);

  /* Map positions for a segment */
  function segPos(a, b) {
    var fn = findNode(a); var tn = findNode(b);
    if (!fn || !tn) { return null; }
    return roadGeometry[fn.id + '-' + tn.id]
        || roadGeometry[tn.id + '-' + fn.id]
        || [[fn.lat, fn.lng], [tn.lat, tn.lng]];
  }

  /* Worst-delay routes first so optimal renders on top */
  var sortedRoutes = routeAnalysis && routeAnalysis.routes
    ? routeAnalysis.routes.slice().sort(function (a, b) { return b.delayProbability - a.delayProbability; })
    : [];

  return (
    <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e3a52', boxShadow: '0 4px 32px rgba(0,0,0,0.4)' }}>
      {loadingRoutes && (
        <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 1100, background: 'rgba(13,17,23,0.88)', border: '1px solid #1e3a52', borderRadius: '6px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', animation: 'leaflet-pulse 1s infinite' }} />
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#4b6a8a', letterSpacing: '0.06em' }}>LOADING ROAD DATA…</span>
        </div>
      )}
      <MapContainer center={[11.5, 77.5]} zoom={6} style={{ height: '480px', width: '100%', background: '#0d1117' }} zoomControl={true} scrollWheelZoom={true} attributionControl={false}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />

        {/* Dimmed background edges */}
        {ALL_EDGES.map(function (ep, idx) {
          var fn = findNode(ep[0]); var tn = findNode(ep[1]);
          if (!fn || !tn) { return null; }
          var pos = roadGeometry[fn.id + '-' + tn.id] || [[fn.lat, fn.lng], [tn.lat, tn.lng]];
          return <Polyline key={'bg' + idx} positions={pos} pathOptions={{ color: '#253545', weight: 1.2, opacity: 0.35 }} />;
        })}

        {/* Analysis routes: worst delay first (optimal on top) */}
        {sortedRoutes.map(function (route) {
          var isSel  = selectedRoute && selectedRoute.id === route.id;
          var color  = getRouteColor(route.delayProbability, isSel);
          var weight = isSel ? 5.5 : 2.8;
          var op     = isSel ? 1.0 : 0.72;
          var dash   = route.delayProbability > 40 ? '8 5' : route.delayProbability > 20 ? '14 6' : null;
          return route.path.slice(0, -1).map(function (_, si) {
            var pos = segPos(route.path[si], route.path[si + 1]);
            if (!pos) { return null; }
            return (
              <Polyline key={route.id + 's' + si} positions={pos}
                pathOptions={{ color: color, weight: weight, opacity: op, dashArray: dash, lineCap: 'round', lineJoin: 'round' }}
                eventHandlers={{ click: function () { onSelectRoute(route.id); } }}
              />
            );
          });
        })}

        {/* Threat-reroute forced path overlay (orange) */}
        {forcedPath && forcedPath.length > 1 && forcedPath.slice(0, -1).map(function (_, si) {
          var pos = segPos(forcedPath[si], forcedPath[si + 1]);
          if (!pos) { return null; }
          return <Polyline key={'fp' + si} positions={pos} pathOptions={{ color: '#f97316', weight: 5.5, opacity: 1, dashArray: '10 5', lineCap: 'round' }} />;
        })}

        {/* Node markers — origin/dest derived from dynamic props */}
        {ALL_NODES.map(function (node) {
          var inActive  = activeNodeSet.has(node.id);
          var isBlocked = blockedNode === node.id;
          var isOrigin  = node.id === sourceNode;    /* dynamic: whichever node is selected as source */
          var isDest    = node.id === destNode;      /* dynamic: whichever node is selected as dest */
          var show  = inActive || isBlocked || isOrigin || isDest;
          var color = isBlocked ? '#ef4444' : isOrigin ? '#3b82f6' : isDest ? '#f59e0b' : inActive ? '#10b981' : '#475569';
          return (
            <Marker key={node.id} position={[node.lat, node.lng]} icon={makeNodeIcon(color, inActive && !isBlocked)}>
              <Tooltip permanent={show} direction="top" offset={[0, -10]}>
                <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '11px', fontWeight: 600, color: isBlocked ? '#ef4444' : isOrigin ? '#3b82f6' : isDest ? '#f59e0b' : inActive ? '#10b981' : '#94a3b8', background: 'transparent', border: 'none' }}>
                  {node.name}{isBlocked ? ' ✕' : isOrigin ? ' ◉' : isDest ? ' ★' : ''}
                </span>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: '14px', left: '14px', zIndex: 1000, display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(13,17,23,0.82)', backdropFilter: 'blur(8px)', border: '1px solid #1e3a52', borderRadius: '8px', padding: '8px 14px' }}>
        {[['#10b981','OPTIMAL'],['#f59e0b','MODERATE'],['#ef4444','HIGH RISK'],['#f97316','AI REROUTED']].map(function (pair) {
          return (
            <div key={pair[1]} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: pair[0] }} />
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#64748b', letterSpacing: '0.06em' }}>{pair[1]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════
   RouteConfigPanel — Source & Destination selector
   ═══════════════════════════════════════════════════════════════════ */
function RouteConfigPanel(props) {
  var sourceNode = props.sourceNode;
  var destNode = props.destNode;
  var onSourceChange = props.onSourceChange;
  var onDestChange = props.onDestChange;
  var activePath = props.activePath;

  var selectStyle = {
    width: '100%',
    padding: '10px 14px',
    background: '#0d1117',
    border: '1px solid #1e3a52',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'Space Grotesk, sans-serif',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none',
  };

  var labelStyle = {
    fontFamily: 'DM Mono, monospace',
    fontSize: '10px',
    color: '#4b6a8a',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: '6px',
    display: 'block',
  };

  var pathDisplay = (activePath || []).map(function (id) {
    var node = findNode(id);
    return node ? node.name : id;
  }).join(' → ');

  return (
    <div style={{ background: 'linear-gradient(135deg, #0d1117 0%, #111827 100%)', border: '1px solid #1e3a52', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Navigation size={14} color="#3b82f6" />
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#4b6a8a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Route Configuration</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
        {/* Source */}
        <div>
          <span style={labelStyle}>Source Node</span>
          <div style={{ position: 'relative' }}>
            <select
              value={sourceNode}
              onChange={function (e) { onSourceChange(e.target.value); }}
              style={selectStyle}
            >
              {ALL_NODES.map(function (n) {
                return (
                  <option key={n.id} value={n.id}>{n.name}</option>
                );
              })}
            </select>
            <MapPin size={12} color="#3b82f6" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Destination */}
        <div>
          <span style={labelStyle}>Destination Node</span>
          <div style={{ position: 'relative' }}>
            <select
              value={destNode}
              onChange={function (e) { onDestChange(e.target.value); }}
              style={selectStyle}
            >
              {ALL_NODES.map(function (n) {
                return (
                  <option key={n.id} value={n.id}>{n.name}</option>
                );
              })}
            </select>
            <MapPin size={12} color="#f59e0b" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {/* Active path display */}
      <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#10b981', letterSpacing: '0.04em' }}>
          {pathDisplay || 'No active route'}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ThreatPanel — Node-specific threat intelligence
   ═══════════════════════════════════════════════════════════════════ */
function ThreatPanel(props) {
  var threatened = props.threatened;
  var loading = props.loading;
  var submitted = props.submitted;
  var submitError = props.submitError;
  var onSimulate = props.onSimulate;
  var onReset = props.onReset;
  var resetting = props.resetting;

  var threatText = props.threatText;
  var setThreatText = props.setThreatText;
  var targetNode = props.targetNode;
  var setTargetNode = props.setTargetNode;

  var inputStyle = {
    width: '100%',
    padding: '10px 14px',
    background: '#0d1117',
    border: '1px solid #1e3a52',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '13px',
    fontFamily: 'DM Mono, monospace',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };

  var labelStyle = {
    fontFamily: 'DM Mono, monospace',
    fontSize: '10px',
    color: '#4b6a8a',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: '6px',
    display: 'block',
  };

  /* Nodes that can be targeted (not origin/destination) */
  var targetableNodes = ALL_NODES.filter(function (n) {
    return n.role !== 'Origin';
  });

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSimulate(threatText, targetNode);
    }
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #0d1117 0%, #111827 100%)', border: '1px solid ' + (threatened ? '#ef444440' : '#1e3a52'), borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <AlertTriangle size={14} color={threatened ? '#ef4444' : '#4b6a8a'} />
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: threatened ? '#ef4444' : '#4b6a8a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Threat Intelligence
        </span>
      </div>

      <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
        Select a target node and describe the environmental threat to trigger AI rerouting.
      </p>

      {/* Target Node selector */}
      <div>
        <span style={labelStyle}>Target Node</span>
        <div style={{ position: 'relative' }}>
          <select
            value={targetNode}
            onChange={function (e) { setTargetNode(e.target.value); }}
            style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer' }}
          >
            <option value="">— Select node to target —</option>
            {targetableNodes.map(function (n) {
              return (
                <option key={n.id} value={n.name}>{n.name}</option>
              );
            })}
          </select>
          <AlertTriangle size={12} color="#ef4444" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* Threat description */}
      <div>
        <span style={labelStyle}>Threat Description</span>
        <textarea
          value={threatText}
          onChange={function (e) { setThreatText(e.target.value); }}
          onKeyDown={handleKeyDown}
          onFocus={function (e) { e.target.style.borderColor = '#ef4444'; }}
          onBlur={function (e) { e.target.style.borderColor = '#1e3a52'; }}
          placeholder={'e.g. "Heavy flooding reported near port area"'}
          rows={4}
          style={{ ...inputStyle, resize: 'none' }}
        />
      </div>

      {/* Status messages */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#10b981', letterSpacing: '0.06em', padding: '8px 12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '6px' }}
          >
            ✓ REPORT SENT — AI PROCESSING
          </motion.div>
        )}
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#ef4444', letterSpacing: '0.06em', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px' }}
          >
            ⚠ {submitError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={function () { onSimulate(threatText, targetNode); }}
          disabled={loading || !threatText.trim() || !targetNode}
          style={{
            flex: 1,
            padding: '11px',
            background: threatened ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.1)',
            border: '1px solid ' + (threatened ? '#ef444450' : '#10b98130'),
            borderRadius: '8px',
            color: threatened ? '#ef4444' : '#10b981',
            fontSize: '13px',
            fontWeight: 600,
            cursor: (loading || !threatText.trim() || !targetNode) ? 'not-allowed' : 'pointer',
            opacity: (!threatText.trim() || !targetNode) ? 0.4 : 1,
            fontFamily: 'Space Grotesk, sans-serif',
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'Sending…' : 'Simulate Threat →'}
        </button>

        {threatened && (
          <button
            onClick={onReset}
            disabled={resetting}
            style={{
              padding: '11px 16px',
              background: 'transparent',
              border: '1px solid #1e3a52',
              borderRadius: '8px',
              color: '#64748b',
              fontSize: '13px',
              fontWeight: 600,
              cursor: resetting ? 'not-allowed' : 'pointer',
              fontFamily: 'Space Grotesk, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={function (e) { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.color = '#10b981'; }}
            onMouseLeave={function (e) { e.currentTarget.style.borderColor = '#1e3a52'; e.currentTarget.style.color = '#64748b'; }}
          >
            <RotateCcw size={12} />
            {resetting ? 'Resetting…' : 'Reset'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   RouteComparisonPanel — Table showing all available routes
   ═══════════════════════════════════════════════════════════════════ */
function RouteComparisonPanel(props) {
  var analysis = props.analysis;
  var isAnalyzing = props.isAnalyzing;
  var selectedId = props.selectedId;
  var onSelect = props.onSelect;

  if (isAnalyzing) {
    return (
      <div style={{ padding: '20px', background: '#0d1117', border: '1px solid #1e3a52', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '120px' }}>
        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#3b82f6', animation: 'leaflet-pulse 1s infinite' }} />
        <span style={{ marginLeft: '12px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#4b6a8a' }}>SIMULATING WEATHER & TRAFFIC...</span>
      </div>
    );
  }

  if (!analysis || !analysis.routes || analysis.routes.length === 0) {
    return null;
  }

  return (
    <div style={{ background: '#0d1117', border: '1px solid #1e3a52', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#4b6a8a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Real-time Route Analysis
        </span>
        <span style={{ fontSize: '10px', color: '#94a3b8', background: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>
          {analysis.routes.length} Options Found
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {analysis.routes.map(function (rt) {
          var isSel = selectedId ? rt.id === selectedId : rt.isOptimal;
          var riskColor = rt.delayProbability <= 20 ? '#10b981' : rt.delayProbability <= 40 ? '#f59e0b' : '#ef4444';
          var pathNames = rt.path.map(function(n) { var nd = findNode(n); return nd ? nd.name : n; });
          return (
            <div
              key={rt.id}
              onClick={function () { onSelect(rt.id); }}
              style={{ padding: '12px', background: isSel ? 'rgba(59,130,246,0.1)' : 'transparent', border: '1px solid', borderColor: isSel ? '#3b82f6' : '#1e3a52', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  {rt.isOptimal && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', background: '#10b98120', color: '#10b981', padding: '2px 6px', borderRadius: '4px' }}>RECOMMENDED</span>}
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', fontFamily: 'Space Grotesk, sans-serif' }}>{rt.id.replace(/-/g, ' → ')}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }}>
                  Via: {pathNames.slice(1, -1).join(', ') || 'Direct'} • {Math.round(rt.distanceKm)} KM
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: '50px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: riskColor, fontFamily: 'Space Grotesk, sans-serif' }}>
                  {Math.round(rt.delayProbability)}%
                </div>
                <div style={{ fontSize: '9px', color: '#64748b', fontFamily: 'DM Mono, monospace' }}>DELAY PROB</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   OriginDashboard V2 — Main Component
   ═══════════════════════════════════════════════════════════════════ */
function OriginDashboard() {
  var contentRef = useRef(null);

  var [threatText, setThreatText]     = useState('');
  var [targetNode, setTargetNode]     = useState('');
  var [loading, setLoading]           = useState(false);
  var [threatened, setThreatened]     = useState(false);
  var [submitted, setSubmitted]       = useState(false);
  var [submitError, setSubmitError]   = useState('');
  var [resetting, setResetting]       = useState(false);
  var [blockedNode, setBlockedNode]   = useState(null);

  /* Route config state */
  var [sourceNode, setSourceNode]     = useState('BLR');
  var [destNode, setDestNode]         = useState('TVM');

  /* Route analysis state */
  var [routeAnalysis, setRouteAnalysis] = useState(null);
  var [selectedRouteId, setSelectedRouteId] = useState(null);
  var [isAnalyzing, setIsAnalyzing] = useState(false);

  /* Live data from backend */
  var [activePath, setActivePath]     = useState(['BLR', 'COK', 'TVM']);
  var [carriersActive, setCarriersActive] = useState(0);
  var [nodesOnline, setNodesOnline]   = useState(0);
  var [totalNodes, setTotalNodes]     = useState(0);
  var [threatCount, setThreatCount]   = useState(0);
  var [logs, setLogs]                 = useState([]);

  function addLog(msg) {
    var t = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    setLogs(function (prev) { return [{ t: t, msg: msg }].concat(prev.slice(0, 11)); });
  }

  function hydrateFromState(data) {
    if (data.currentRoute && data.currentRoute.path) {
      var normalizedPath = normalizePath(data.currentRoute.path);
      setActivePath(normalizedPath);
      var isRerouted = data.currentRoute.status === 'rerouted';
      setThreatened(isRerouted);
      if (!isRerouted) {
        setBlockedNode(null);
      } else if (data.threats && data.threats.length > 0) {
        var lastThreat = data.threats[data.threats.length - 1];
        setBlockedNode(normalizeNode(lastThreat.city));
      }
    }
    if (data.active_shipments) {
      var activeCount = 0;
      for (var i = 0; i < data.active_shipments.length; i++) {
        if (data.active_shipments[i].status === 'in_transit') { activeCount++; }
      }
      setCarriersActive(activeCount);
    }
    if (data.nodes) {
      var onlineCount = 0;
      for (var j = 0; j < data.nodes.length; j++) {
        if (data.nodes[j].status === 'active') { onlineCount++; }
      }
      setNodesOnline(onlineCount);
      setTotalNodes(data.nodes.length);
    }
    if (data.threats) { setThreatCount(data.threats.length); }
  }

  /* Fetch route analysis when source/dest changes */
  useEffect(function () {
    if (!sourceNode || !destNode || sourceNode === destNode) { return; }
    var cancelled = false;
    setIsAnalyzing(true);
    setRouteAnalysis(null);      /* clear old routes immediately so the map is clean */
    setSelectedRouteId(null);
    setActivePath([sourceNode, destNode]);   /* optimistic path until analysis returns */
    fetch('http://localhost:3001/api/route-analysis?from=' + sourceNode + '&to=' + destNode)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!cancelled) {
          setRouteAnalysis(data);
          setSelectedRouteId(null);
          setIsAnalyzing(false);
          /* Set activePath to the optimal route path so the map shows the right path */
          if (data && data.routes && data.routes.length > 0) {
            var optimalRoute = null;
            for (var k = 0; k < data.routes.length; k++) {
              if (data.routes[k].isOptimal) { optimalRoute = data.routes[k]; break; }
            }
            if (!optimalRoute) { optimalRoute = data.routes[0]; }
            setActivePath(optimalRoute.path);
            addLog('Analyzed ' + data.routes.length + ' routes from ' + sourceNode + ' → ' + destNode + '. Best delay: ' + Math.round(optimalRoute.delayProbability) + '%.');
          }
        }
      })
      .catch(function (e) {
        if (!cancelled) { setIsAnalyzing(false); addLog('Route analysis failed: ' + e.message); }
      });
    return function () { cancelled = true; };
  }, [sourceNode, destNode]);

  /* Fetch initial state on mount */
  useEffect(function () {
    fetch('/api/state')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        hydrateFromState(data);
        if (data.threats && data.threats.length > 0) {
          var existingLogs = data.threats.map(function (th) {
            return {
              t: new Date(th.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
              msg: 'Threat detected: ' + th.city + ' — ' + th.action,
            };
          });
          setLogs(existingLogs);
        } else {
          addLog('System online · Network monitoring active');
        }
      })
      .catch(function () { addLog('System online · Network monitoring active'); });
  }, []);

  /* Socket.io live updates */
  useEffect(function () {
    var socket = io('http://localhost:3001', { transports: ['websocket', 'polling'] });

    socket.on('state_updated', function (data) {
      hydrateFromState(data);
    });

    socket.on('route_updated', function (d) {
      if (d.blockedNode) { setBlockedNode(normalizeNode(d.blockedNode)); }
      var newPathStr = normalizePath(d.newPath || []).map(function (id) {
        var node = findNode(id);
        return node ? node.name : id;
      }).join(' → ');
      addLog('⚠ REROUTED — ' + d.blockedNode + ' blocked · New path: ' + newPathStr);
      setThreatened(true);
    });

    socket.on('route_reset', function () {
      setThreatened(false);
      setBlockedNode(null);
      /* Reset to the currently-selected source→dest, not a hardcoded path */
      setActivePath(function (prev) {
        /* Keep whatever activePath was before the threat started; just clear rerouted overlay */
        return prev;
      });
      setThreatCount(0);
      addLog('✓ Route cleared · Threat resolved');
    });

    return function () { socket.disconnect(); };
  }, []);

  /* GSAP entrance */
  useEffect(function () {
    var ctx = gsap.context(function () {
      gsap.from('.g-stat', { opacity: 0, y: 14, stagger: 0.07, duration: 0.5, ease: 'power2.out' });
      gsap.from('.g-card', { opacity: 0, y: 16, stagger: 0.08, delay: 0.2, duration: 0.5 });
    }, contentRef);
    return function () { ctx.revert(); };
  }, []);

  async function handleSimulate(text, target) {
    if (!text.trim() || !target || loading) { return; }
    setLoading(true);
    setSubmitError('');

    /* Compose the threat text: if target node is set, prepend it */
    var composedText = target ? text + ' (Affected node: ' + target + ')' : text;
    addLog('Threat submitted: "' + text + '" → Target: ' + target);

    try {
      var res = await fetch('/api/threat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: composedText, from: sourceNode, to: destNode }),
      });
      var data = await res.json();

      if (data.routeResult && data.routeResult.rerouted) {
        setThreatened(true);
        setSubmitted(true);
        setTimeout(function () { setSubmitted(false); }, 4000);
      } else {
        var reason = (data.aiResult && data.aiResult.reason) ? data.aiResult.reason : 'No actionable threat detected.';
        setSubmitError(reason);
        setTimeout(function () { setSubmitError(''); }, 5000);
      }
    } catch (err) {
      setSubmitError('Failed to reach server. Is the backend running?');
      setTimeout(function () { setSubmitError(''); }, 5000);
    }

    setLoading(false);
    setThreatText('');
    setTargetNode('');
  }

  async function handleReset() {
    setResetting(true);
    try {
      await fetch('/api/reset', { method: 'POST' });
    } catch (err) { /* ignore */ }
    setResetting(false);
  }

  var routeIntegrity = threatened ? (Math.round((1 - threatCount / Math.max(totalNodes, 1)) * 100) + '%') : '100%';

  var stats = [
    { label: 'Carriers Active',  value: String(carriersActive || 0),                          sub: 'vehicles en route',                          accent: '#3b82f6',  icon: Truck },
    { label: 'Route Integrity',  value: threatened ? routeIntegrity : '100%',                 sub: threatened ? 'degraded' : 'nominal',          accent: threatened ? '#f59e0b' : '#10b981', icon: Shield },
    { label: 'AI Alerts',        value: String(threatCount),                                   sub: threatCount ? (threatCount + ' critical') : 'none pending', accent: threatCount ? '#ef4444' : '#94a3b8', icon: AlertTriangle },
    { label: 'Nodes Online',     value: totalNodes ? (nodesOnline + ' / ' + totalNodes) : '— / —', sub: 'connected',                            accent: threatened ? '#f59e0b' : '#10b981', icon: Radio },
  ];

  var darkCard = {
    background: 'linear-gradient(135deg, #0d1117 0%, #111827 100%)',
    border: '1px solid #1e3a52',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  };

  return (
    <Layout title="Supply Chain Overview" status={threatened ? 'THREAT ACTIVE' : 'ALL CLEAR'} statusOk={!threatened}>
      <div ref={contentRef}>

        {/* Stats row — dark themed */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {stats.map(function (s) {
            return (
              <div key={s.label} className="g-stat">
                <div style={{ background: 'linear-gradient(135deg, #0d1117, #111827)', border: '1px solid #1e3a52', borderRadius: '12px', padding: '20px 22px', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <p className="mono" style={{ fontSize: '11px', color: '#4b6a8a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</p>
                    {s.icon && (
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: s.accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <s.icon size={14} color={s.accent} />
                      </div>
                    )}
                  </div>
                  <p className="mono" style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, color: s.accent, transition: 'color 0.4s' }}>{s.value}</p>
                  {s.sub && <p style={{ fontSize: '12px', color: '#334155', marginTop: '6px' }}>{s.sub}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Route Config & Comparison */}
        <div className="g-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <RouteConfigPanel
            sourceNode={sourceNode}
            destNode={destNode}
            onSourceChange={setSourceNode}
            onDestChange={setDestNode}
            activePath={activePath}
          />
          <RouteComparisonPanel
            analysis={routeAnalysis}
            isAnalyzing={isAnalyzing}
            selectedId={selectedRouteId}
            onSelect={setSelectedRouteId}
          />
        </div>

        {/* Map + Threat side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '14px', marginBottom: '14px' }}>

          {/* Big Leaflet Map */}
          <div className="g-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#4b6a8a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Live Route Map · South India Network
              </span>
              {threatened && (
                <span className="mono" style={{ fontSize: '10px', color: '#ef4444', letterSpacing: '0.08em', background: 'rgba(239,68,68,0.1)', padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  ⚠ REROUTED
                </span>
              )}
            </div>
            <LiveRouteMap
              routeAnalysis={routeAnalysis}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
              forcedPath={threatened ? activePath : null}
              blockedNode={blockedNode}
              sourceNode={sourceNode}
              destNode={destNode}
            />
          </div>

          {/* Threat panel */}
          <div className="g-card">
            <ThreatPanel
              threatened={threatened}
              loading={loading}
              submitted={submitted}
              submitError={submitError}
              onSimulate={handleSimulate}
              onReset={handleReset}
              resetting={resetting}
              threatText={threatText}
              setThreatText={setThreatText}
              targetNode={targetNode}
              setTargetNode={setTargetNode}
            />
          </div>
        </div>

        {/* Event Log */}
        <div className="g-card" style={darkCard}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#4b6a8a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px', display: 'block' }}>
            Event Log
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {logs.length === 0 && (
              <p style={{ fontSize: '13px', color: '#1e3a52', fontFamily: 'DM Mono, monospace' }}>Awaiting events…</p>
            )}
            {logs.map(function (log, i) {
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ display: 'flex', gap: '20px', alignItems: 'baseline', padding: '8px 0', borderBottom: i < logs.length - 1 ? '1px solid #1a2332' : 'none' }}
                >
                  <span className="mono" style={{ fontSize: '11px', color: '#2d4a63', minWidth: '38px' }}>{log.t}</span>
                  <span style={{ fontSize: '13px', color: log.msg.startsWith('⚠') ? '#ef4444' : log.msg.startsWith('✓') ? '#10b981' : '#475569' }}>{log.msg}</span>
                </motion.div>
              );
            })}
          </div>
        </div>

      </div>
    </Layout>
  );
}

export default OriginDashboard;
