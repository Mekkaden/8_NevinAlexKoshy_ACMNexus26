/**
 * ACM NEXUS 26 – Self-Healing Supply Chain – Backend Server
 * Stack: Node.js, Express, Socket.io, Gemini AI, native 'fs'
 * No database. data.json is the in-memory graph store.
 */

require("dotenv").config();

// ─── Native HTTPS for OSRM proxy (no extra deps) ───────────────────
var https = require("https");

// In-memory cache for OSRM road geometries
var ROAD_GEOMETRY_CACHE = {};

// ─── All node coordinates (for geometry pre-warm at startup) ─────────
var ALL_NODE_COORDS = {
  'BLR': { lng: 77.5946, lat: 12.9716 },
  'COK': { lng: 76.2673, lat:  9.9312 },
  'CBE': { lng: 76.9558, lat: 11.0168 },
  'TVM': { lng: 76.9366, lat:  8.5241 },
  'MAA': { lng: 80.2707, lat: 13.0827 },
  'MDU': { lng: 78.1198, lat:  9.9252 },
  'IXE': { lng: 74.8560, lat: 12.9141 },
  'MYS': { lng: 76.6394, lat: 12.2958 },
  'SLM': { lng: 78.1460, lat: 11.6643 },
  'HBL': { lng: 75.1240, lat: 15.3647 },
  'HYD': { lng: 78.4867, lat: 17.3850 },
  'CCJ': { lng: 75.7804, lat: 11.2588 },
};

// All edges to pre-warm (same as frontend ALL_EDGES)
var ALL_GRAPH_EDGES = [
  ['BLR','COK'], ['COK','TVM'], ['BLR','CBE'], ['CBE','TVM'],
  ['BLR','MAA'], ['MAA','MDU'], ['MDU','TVM'], ['BLR','IXE'],
  ['IXE','COK'], ['BLR','MYS'], ['MYS','CBE'], ['CBE','SLM'],
  ['SLM','MAA'], ['BLR','HBL'], ['HBL','IXE'], ['BLR','HYD'],
  ['HYD','MAA'], ['COK','CCJ'], ['CCJ','IXE'], ['MDU','CBE'],
];

// ─── City name map for wttr.in weather lookups (keyed by short code) ───
var CITY_WEATHER_NAMES = {
  'BLR': 'Bangalore', 'COK': 'Kochi',       'CBE': 'Coimbatore',
  'TVM': 'Trivandrum', 'MAA': 'Chennai',    'MDU': 'Madurai',
  'IXE': 'Mangalore',  'MYS': 'Mysore',     'SLM': 'Salem',
  'HBL': 'Hubli',      'HYD': 'Hyderabad',  'CCJ': 'Kozhikode'
};

// ─── Traffic congestion class per node (keyed by short code) ─────────
var CITY_CONGESTION = {
  'BLR': 'high', 'MAA': 'high', 'HYD': 'high',
  'COK': 'medium', 'CBE': 'medium', 'MDU': 'medium',
  'IXE': 'low', 'MYS': 'low', 'SLM': 'low',
  'HBL': 'low', 'CCJ': 'low', 'TVM': 'low'
};

// ─── Weather score cache (10-min TTL) ────────────────────────────────
var WEATHER_SCORE_CACHE = {};
var WEATHER_CACHE_TTL = 10 * 60 * 1000;

function fetchWeatherScore(node) {
  var cached = WEATHER_SCORE_CACHE[node];
  if (cached && (Date.now() - cached.fetchedAt) < WEATHER_CACHE_TTL) {
    return Promise.resolve(cached);
  }
  var cityName = CITY_WEATHER_NAMES[node] || node;
  var url = 'https://wttr.in/' + encodeURIComponent(cityName) + '?format=j1';
  return new Promise(function (resolve) {
    var fallback = { score: 0.05, desc: 'Unknown', icon: '\u26C5', fetchedAt: Date.now() };
    var req = https.get(url, { headers: { 'User-Agent': 'ACM-NEXUS26/1.0' } }, function (res) {
      var raw = '';
      res.on('data', function (c) { raw += c; });
      res.on('end', function () {
        try {
          var data = JSON.parse(raw);
          var cur = data.current_condition && data.current_condition[0];
          if (!cur) { return resolve(fallback); }
          var desc = (cur.weatherDesc && cur.weatherDesc[0] && cur.weatherDesc[0].value) || '';
          var precip = parseFloat(cur.precipMM || '0');
          var cloud  = parseFloat(cur.cloudcover || '0');
          var wind   = parseFloat(cur.windspeedKmph || '0');
          var lower  = desc.toLowerCase();
          var score = 0.05; var icon = '\u2600';
          if (lower.indexOf('thunder') !== -1 || lower.indexOf('storm') !== -1)  { score = 0.55; icon = '\u26C8'; }
          else if (lower.indexOf('heavy rain') !== -1 || precip > 5)             { score = 0.42; icon = '\uD83C\uDF27'; }
          else if (lower.indexOf('rain') !== -1 || precip > 1)                   { score = 0.28; icon = '\uD83C\uDF26'; }
          else if (lower.indexOf('fog') !== -1 || lower.indexOf('mist') !== -1)  { score = 0.20; icon = '\uD83C\uDF2B'; }
          else if (lower.indexOf('overcast') !== -1 || cloud > 75)               { score = 0.12; icon = '\u2601'; }
          else if (lower.indexOf('cloud') !== -1 || cloud > 40)                  { score = 0.08; icon = '\u26C5'; }
          if (wind > 50) { score = Math.min(0.90, score + 0.10); }
          var result = { score: score, desc: desc || 'Clear', icon: icon, fetchedAt: Date.now() };
          WEATHER_SCORE_CACHE[node] = result;
          resolve(result);
        } catch (e) { resolve(fallback); }
      });
    });
    req.on('error', function () { resolve(fallback); });
    req.setTimeout(5000, function () { req.destroy(); resolve(fallback); });
  });
}

function getTrafficScore(node) {
  var istMs = Date.now() + (5 * 60 + 30) * 60000 - (new Date().getTimezoneOffset() * 60000);
  var hour = new Date(istMs).getUTCHours();
  var cong = CITY_CONGESTION[node] || 'low';
  var base = cong === 'high' ? 0.20 : cong === 'medium' ? 0.10 : 0.05;
  var peak = 0;
  if (hour >= 7  && hour < 11) { peak = cong === 'high' ? 0.35 : cong === 'medium' ? 0.20 : 0.10; }
  else if (hour >= 17 && hour < 20) { peak = cong === 'high' ? 0.40 : cong === 'medium' ? 0.25 : 0.12; }
  else if (hour >= 22 || hour < 5)  { base *= 0.4; }
  return Math.min(0.85, base + peak);
}

function findAllRoutePaths(start, end, edges) {
  /* edges come from data.edges — use distance_km as weight */
  var adj = {};
  edges.forEach(function (e) {
    var w = e.distance_km || e.weight || 150;
    if (!adj[e.from]) { adj[e.from] = []; }
    if (!adj[e.to])   { adj[e.to]   = []; }
    adj[e.from].push({ to: e.to,   weight: w });
    adj[e.to].push({   to: e.from, weight: w });
  });
  var allPaths = [];
  function dfs(curr, visited, path, cost) {
    if (curr === end) { allPaths.push({ path: path.slice(), cost: cost }); return; }
    if (path.length > 7) { return; }   /* allow slightly longer paths for non-BLR starts */
    var neighbors = adj[curr] || [];
    for (var i = 0; i < neighbors.length; i++) {
      var nb = neighbors[i];
      if (!visited.has(nb.to)) {
        visited.add(nb.to); path.push(nb.to);
        dfs(nb.to, visited, path, cost + nb.weight);
        path.pop(); visited.delete(nb.to);
      }
    }
  }
  dfs(start, new Set([start]), [start], 0);
  allPaths.sort(function (a, b) { return a.cost - b.cost; });
  var minCost = allPaths.length > 0 ? allPaths[0].cost : Infinity;
  return allPaths.filter(function (p) { return p.cost <= minCost * 2.0; }).slice(0, 5);
}

function fetchOSRMGeometry(fromLng, fromLat, toLng, toLat) {
  var cacheKey = fromLng + "," + fromLat + ";" + toLng + "," + toLat;
  if (ROAD_GEOMETRY_CACHE[cacheKey]) {
    return Promise.resolve(ROAD_GEOMETRY_CACHE[cacheKey]);
  }
  var url = "https://router.project-osrm.org/route/v1/driving/" +
    fromLng + "," + fromLat + ";" + toLng + "," + toLat +
    "?overview=full&geometries=geojson";
  return new Promise(function (resolve) {
    var req = https.get(url, { headers: { "User-Agent": "ACM-NEXUS26-HackathonDemo/1.0" } }, function (res) {
      var raw = "";
      res.on("data", function (chunk) { raw += chunk; });
      res.on("end", function () {
        try {
          var data = JSON.parse(raw);
          if (data.routes && data.routes[0]) {
            var coords = data.routes[0].geometry.coordinates.map(function (c) {
              return [c[1], c[0]];
            });
            ROAD_GEOMETRY_CACHE[cacheKey] = coords;
            resolve(coords);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on("error", function () { resolve(null); });
    /* Increased to 8s for reliability */
    req.setTimeout(8000, function () { req.destroy(); resolve(null); });
  });
}

/* ── Pre-warm geometry cache at startup (sequential to avoid rate limiting) ── */
function prewarmGeometryCache() {
  console.log('[OSRM] Pre-warming road geometry cache for', ALL_GRAPH_EDGES.length, 'edges...');
  var idx = 0;
  function next() {
    if (idx >= ALL_GRAPH_EDGES.length) {
      console.log('[OSRM] Geometry cache ready (' + Object.keys(ROAD_GEOMETRY_CACHE).length + ' segments cached)');
      return;
    }
    var ep = ALL_GRAPH_EDGES[idx++];
    var from = ALL_NODE_COORDS[ep[0]];
    var to   = ALL_NODE_COORDS[ep[1]];
    if (!from || !to) { next(); return; }
    fetchOSRMGeometry(from.lng, from.lat, to.lng, to.lat)
      .then(function (coords) {
        if (coords) {
          /* Also cache reverse direction */
          var revKey = to.lng + ',' + to.lat + ';' + from.lng + ',' + from.lat;
          if (!ROAD_GEOMETRY_CACHE[revKey]) {
            ROAD_GEOMETRY_CACHE[revKey] = coords.slice().reverse();
          }
        }
        /* 400ms delay between requests to be polite to the public OSRM server */
        setTimeout(next, 400);
      });
  }
  next();
}

var express = require("express");
var http = require("http");
var socketIo = require("socket.io");
var fs = require("fs");
var path = require("path");

// Use Febin's improved AI agent module
var { parseThreatIntelligence, generateDispatchOptimization } = require("./ai_agent");

var DATA_FILE = path.join(__dirname, "data.json");
var PORT = process.env.PORT || 3001;

// ─────────────────────────────────────────────
// Helper: Read data.json
// ─────────────────────────────────────────────
function readData() {
  var raw = fs.readFileSync(DATA_FILE, "utf8");
  return JSON.parse(raw);
}

// ─────────────────────────────────────────────
// Helper: Write data.json
// ─────────────────────────────────────────────
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

// ─────────────────────────────────────────────
// AI Agent: Call ai_agent.js (parseThreatIntelligence)
// Returns { blocked_node, reason, severity }
// ─────────────────────────────────────────────
async function analyzeThreatWithGemini(text) {
  try {
    var result = await parseThreatIntelligence(text);
    console.log("[ai_agent.js] Response:", result);
    return result;
  } catch (err) {
    console.error("[ai_agent.js] Error:", err.message);
    return fallbackAnalyze(text);
  }
}

// ─── Normalize city name OR code → short code ─────────────────────────
var NAME_TO_CODE = {
  'Bangalore': 'BLR', 'bangalore': 'BLR', 'BLR': 'BLR',
  'Kochi': 'COK',     'kochi': 'COK',     'COK': 'COK',
  'Coimbatore': 'CBE','coimbatore': 'CBE','CBE': 'CBE',
  'Trivandrum': 'TVM','trivandrum': 'TVM','TVM': 'TVM',
  'Chennai': 'MAA',   'chennai': 'MAA',   'MAA': 'MAA',
  'Madurai': 'MDU',   'madurai': 'MDU',   'MDU': 'MDU',
  'Mangalore': 'IXE', 'mangalore': 'IXE', 'IXE': 'IXE',
  'Mysore': 'MYS',    'mysore': 'MYS',    'MYS': 'MYS',
  'Salem': 'SLM',     'salem': 'SLM',     'SLM': 'SLM',
  'Hubli': 'HBL',     'hubli': 'HBL',     'HBL': 'HBL',
  'Hyderabad': 'HYD', 'hyderabad': 'HYD', 'HYD': 'HYD',
  'Calicut': 'CCJ',   'calicut': 'CCJ',   'CCJ': 'CCJ',
  'Kozhikode': 'CCJ', 'kozhikode': 'CCJ',
};

function normalizeToCode(nameOrCode) {
  return NAME_TO_CODE[nameOrCode] || nameOrCode;
}

// Code → display name (for logs)
var CODE_TO_NAME = {
  'BLR':'Bangalore','COK':'Kochi','CBE':'Coimbatore','TVM':'Trivandrum',
  'MAA':'Chennai','MDU':'Madurai','IXE':'Mangalore','MYS':'Mysore',
  'SLM':'Salem','HBL':'Hubli','HYD':'Hyderabad','CCJ':'Calicut'
};

// ─────────────────────────────────────────────
// Fallback: simple keyword detection → returns short codes
// ─────────────────────────────────────────────
function fallbackAnalyze(text) {
  var lower = text.toLowerCase();
  if (lower.indexOf('kochi') !== -1)      return { blocked_node: 'COK', reason: 'Keyword match: Kochi' };
  if (lower.indexOf('coimbatore') !== -1) return { blocked_node: 'CBE', reason: 'Keyword match: Coimbatore' };
  if (lower.indexOf('chennai') !== -1)    return { blocked_node: 'MAA', reason: 'Keyword match: Chennai' };
  if (lower.indexOf('madurai') !== -1)    return { blocked_node: 'MDU', reason: 'Keyword match: Madurai' };
  if (lower.indexOf('mangalore') !== -1)  return { blocked_node: 'IXE', reason: 'Keyword match: Mangalore' };
  if (lower.indexOf('mysore') !== -1)     return { blocked_node: 'MYS', reason: 'Keyword match: Mysore' };
  if (lower.indexOf('salem') !== -1)      return { blocked_node: 'SLM', reason: 'Keyword match: Salem' };
  if (lower.indexOf('hubli') !== -1)      return { blocked_node: 'HBL', reason: 'Keyword match: Hubli' };
  if (lower.indexOf('hyderabad') !== -1)  return { blocked_node: 'HYD', reason: 'Keyword match: Hyderabad' };
  if (lower.indexOf('calicut') !== -1 || lower.indexOf('kozhikode') !== -1)
                                          return { blocked_node: 'CCJ', reason: 'Keyword match: Calicut' };
  if (lower.indexOf('bangalore') !== -1)  return { blocked_node: 'BLR', reason: 'Keyword match: Bangalore' };
  if (lower.indexOf('trivandrum') !== -1) return { blocked_node: 'TVM', reason: 'Keyword match: Trivandrum' };
  return { blocked_node: null, reason: 'No known node affected' };
}

// ─────────────────────────────────────────────
// Dynamic Pathfinding — avoids blockedNode (short code)
// Uses data.edges which has consistent short codes
// ─────────────────────────────────────────────
function recalculateRoute(blockedNodeRaw, data, fromOverride, toOverride) {
  /* Normalize whatever the AI returned (city name or code) to a short code */
  var blockedNode = normalizeToCode(blockedNodeRaw);

  /* Normalize currentRoute.path entries too (may be legacy mixed names) */
  var original = (data.currentRoute.path || []).map(normalizeToCode);

  /* Derive start/end — use overrides from frontend if provided */
  var start = fromOverride ? normalizeToCode(fromOverride) : (original[0]  || 'BLR');
  var end   = toOverride   ? normalizeToCode(toOverride)   : (original[original.length - 1] || 'TVM');

  /* If start or end is the blocked node itself, bail out gracefully */
  if (blockedNode === start || blockedNode === end) {
    console.log('[recalculate] Blocked node', blockedNode, 'is an endpoint — cannot reroute');
    return { rerouted: false, currentPath: original, blockedNode: blockedNode, error: 'Blocked node is an endpoint' };
  }

  /* Build adjacency from data.edges (short codes throughout) */
  var adj = {};
  data.edges.forEach(function (e) {
    var w = e.distance_km || e.weight || 150;
    if (!adj[e.from]) { adj[e.from] = []; }
    if (!adj[e.to])   { adj[e.to]   = []; }
    adj[e.from].push({ to: e.to,   weight: w });
    adj[e.to].push({   to: e.from, weight: w });
  });

  /* DFS: find all paths from start→end avoiding blockedNode */
  var paths = [];
  function dfs(curr, target, visited, currentPath, currentCost) {
    if (curr === target) { paths.push({ path: currentPath.slice(), cost: currentCost }); return; }
    if (currentPath.length > 7) { return; }
    var neighbors = adj[curr] || [];
    for (var i = 0; i < neighbors.length; i++) {
      var nb = neighbors[i];
      if (!visited.has(nb.to) && nb.to !== blockedNode) {
        visited.add(nb.to);
        currentPath.push(nb.to);
        dfs(nb.to, target, visited, currentPath, currentCost + nb.weight);
        currentPath.pop();
        visited.delete(nb.to);
      }
    }
  }
  dfs(start, end, new Set([start]), [start], 0);

  if (paths.length === 0) {
    console.log('[recalculate] No safe route found from', start, 'to', end, 'avoiding', blockedNode);
    return { rerouted: false, currentPath: original, blockedNode: blockedNode, error: 'No safe route' };
  }

  paths.sort(function (a, b) { return a.cost - b.cost; });
  var optimalPath = paths[0].path;
  var via = optimalPath.filter(function (x) { return x !== start && x !== end; })
                       .map(function (c) { return CODE_TO_NAME[c] || c; }).join(', ');

  /* Persist new route using short codes */
  data.currentRoute.path   = optimalPath;
  data.currentRoute.status = 'rerouted';
  data.threats.push({
    city:      CODE_TO_NAME[blockedNode] || blockedNode,
    timestamp: new Date().toISOString(),
    action:    'Dynamically rerouted via ' + (via || 'direct')
  });

  /* Redirect active shipments */
  if (data.active_shipments) {
    data.active_shipments.forEach(function (shp) {
      if (shp.next_node === blockedNode || shp.next_node === (CODE_TO_NAME[blockedNode] || blockedNode)) {
        shp.rerouted  = true;
        shp.next_node = optimalPath[1] || end;
      }
    });
  }

  console.log('[recalculate] Rerouted:', optimalPath.join(' -> '), '(blocked:', blockedNode, ')');
  return {
    rerouted:     true,
    originalPath: original,
    newPath:      optimalPath,
    blockedNode:  blockedNode
  };
}

// ─────────────────────────────────────────────
// Main server boot
// ─────────────────────────────────────────────
function startServer() {
  var app = express();
  var httpServer = http.createServer(app);

  var io = socketIo(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  // Middleware
  app.use(express.json());
  app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  // Health
  app.get("/", function (req, res) {
    res.json({ status: "ok", message: "ACM NEXUS 26 – Threat Server" });
  });

  // GET current route
  app.get("/api/route", function (req, res) {
    var data = readData();
    res.json(data.currentRoute);
  });

  // GET full state snapshot — used by all dashboards on mount
  app.get("/api/state", function (req, res) {
    var data = readData();
    res.json(data);
  });

  // GET active shipments (alias)
  app.get("/api/shipments", function (req, res) {
    var data = readData();
    res.json(data.active_shipments || []);
  });

  // GET node operations data (inventory + shipments)
  app.get("/api/node", function (req, res) {
    var data = readData();
    res.json({
      inventory: data.inventory || [],
      shipments: data.active_shipments || []
    });
  });

  // Reset route (useful for demo reset)
  app.post("/api/reset", function (req, res) {
    var data = readData();
    /* Use short codes consistently */
    data.currentRoute = { path: ["BLR", "COK", "TVM"], status: "active" };
    data.threats = [];
    if (data.active_shipments) {
      data.active_shipments.forEach(function (shp) {
        shp.rerouted = false;
        shp.next_node = "COK";
        shp.threat_alert = null;
        shp.active_route = "PATH_A";
        shp.route_label = "BLR \u2192 Kochi \u2192 TVM";
      });
    }
    writeData(data);
    io.emit("route_reset", { path: ["BLR", "COK", "TVM"], status: "active" });
    io.emit("state_updated", readData());
    res.json({ message: "Route reset to default." });
  });

  // POST threat — main AI endpoint
  app.post("/api/threat", async function (req, res) {
    var body = req.body;
    if (!body || typeof body.text !== "string" || body.text.trim() === "") {
      return res.status(400).json({ error: "Body must have a non-empty 'text' field." });
    }

    var threatText = body.text.trim();
    /* Optional source/dest overrides from frontend route config */
    var fromNode = body.from ? normalizeToCode(body.from) : null;
    var toNode   = body.to   ? normalizeToCode(body.to)   : null;
    console.log("[POST /api/threat]", threatText, fromNode ? ('| from=' + fromNode + ' to=' + toNode) : '');

    // Step 1: AI analysis (returns city name or code)
    var aiResult = await analyzeThreatWithGemini(threatText);
    /* Normalize to short code regardless of what AI returned */
    var blockedNode = aiResult.blocked_node ? normalizeToCode(aiResult.blocked_node) : null;
    var reason = aiResult.reason;

    if (!blockedNode) {
      return res.json({ message: "No actionable threat detected.", rerouted: false, aiResult: aiResult });
    }

    // Step 2: Update currentRoute to match the frontend's selected source→dest before recalculating
    var data = readData();
    if (fromNode && toNode) {
      /* Temporarily set route endpoints to match what the user has selected */
      var existingPath = (data.currentRoute.path || []).map(normalizeToCode);
      var existingStart = existingPath[0];
      var existingEnd   = existingPath[existingPath.length - 1];
      if (existingStart !== fromNode || existingEnd !== toNode) {
        /* Reset currentRoute to a direct 2-node path so recalculate uses correct endpoints */
        data.currentRoute = { path: [fromNode, toNode], status: 'active' };
      }
    }

    var routeResult = recalculateRoute(blockedNode, data, fromNode, toNode);

    if (routeResult.rerouted) {
      writeData(data);
      console.log("[Route] Rerouted:", routeResult.newPath.join(" -> "));

      // Step 3: Emit Socket.io event
      io.emit("route_updated", {
        blockedNode: blockedNode,
        reason: reason,
        originalPath: routeResult.originalPath,
        newPath: routeResult.newPath,
        status: "rerouted",
        timestamp: new Date().toISOString()
      });

      // Emit full state so all dashboards can hydrate at once
      io.emit("state_updated", readData());
    }

    return res.json({
      aiResult: aiResult,
      routeResult: routeResult
    });
  });

  // GET road geometry — OSRM proxy (avoids browser CORS issues)
  // Usage: /api/roads?fromLng=77.5946&fromLat=12.9716&toLng=76.2673&toLat=9.9312
  app.get("/api/roads", async function (req, res) {
    var q = req.query;
    if (!q.fromLng || !q.fromLat || !q.toLng || !q.toLat) {
      return res.status(400).json({ error: "Missing fromLng, fromLat, toLng, toLat params" });
    }
    var coords = await fetchOSRMGeometry(
      parseFloat(q.fromLng), parseFloat(q.fromLat),
      parseFloat(q.toLng),   parseFloat(q.toLat)
    );
    if (!coords) {
      return res.status(502).json({ error: "OSRM fetch failed" });
    }
    res.json({ coords: coords });
  });

  // GET all pre-warmed road geometry in one go
  app.get("/api/roads/bulk", function (req, res) {
    res.json({ 
      cache: ROAD_GEOMETRY_CACHE,
      ready: Object.keys(ROAD_GEOMETRY_CACHE).length >= 40 
    });
  });

  // GET /api/route-analysis — multi-path delay probability engine
  // Uses data.edges (short codes: BLR, COK, CBE, TVM, MAA, MDU, IXE, MYS, SLM, HBL, HYD, CCJ)
  app.get('/api/route-analysis', async function (req, res) {
    var from = req.query.from;
    var to   = req.query.to;
    if (!from || !to) { return res.status(400).json({ error: 'from and to are required' }); }
    if (from === to)  { return res.status(400).json({ error: 'from and to must be different' }); }
    var data = readData();

    /* Use data.edges which uses consistent short codes throughout */
    var paths = findAllRoutePaths(from, to, data.edges);
    if (paths.length === 0) {
      console.log('[route-analysis] No paths found from', from, 'to', to);
      return res.json({ routes: [], from: from, to: to });
    }

    /* Build edge weight lookup from data.edges */
    var edgeWt = {};
    data.edges.forEach(function (e) {
      var w = e.distance_km || e.weight || 150;
      edgeWt[e.from + '-' + e.to] = w;
      edgeWt[e.to + '-' + e.from] = w;
    });

    var nodeSet = new Set();
    paths.forEach(function (p) { p.path.forEach(function (n) { nodeSet.add(n); }); });

    var weatherMap = {};
    await Promise.all(Array.from(nodeSet).map(async function (node) {
      weatherMap[node] = await fetchWeatherScore(node);
    }));

    var LABELS = ['A', 'B', 'C', 'D', 'E'];
    var routes = paths.map(function (p, idx) {
      var path = p.path; var totalKm = p.cost;
      var segments = []; var totalDelayScore = 0; var totalWeight = 0;
      for (var i = 0; i < path.length - 1; i++) {
        var fn = path[i]; var tn = path[i + 1];
        var km = edgeWt[fn + '-' + tn] || 150;
        var w  = weatherMap[tn] || { score: 0.05, desc: 'Clear', icon: '\u2600' };
        var tr = getTrafficScore(tn);
        var seg = w.score * 0.6 + tr * 0.4;
        totalDelayScore += seg * km; totalWeight += km;
        segments.push({ from: fn, to: tn, distanceKm: km,
          weatherScore: Math.round(w.score * 100), trafficScore: Math.round(tr * 100),
          weather: w.desc, weatherIcon: w.icon, delayProb: Math.round(seg * 100) });
      }
      var delayProbability = totalWeight > 0 ? Math.round((totalDelayScore / totalWeight) * 100) : 0;
      var estimatedHrs = Math.round((totalKm / 65) * (1 + delayProbability / 100) * 10) / 10;
      return { id: 'ROUTE_' + LABELS[idx], label: 'Route ' + LABELS[idx],
        path: path, distanceKm: totalKm, estimatedHrs: estimatedHrs,
        delayProbability: delayProbability, segments: segments, isOptimal: false };
    });

    routes.sort(function (a, b) { return a.delayProbability - b.delayProbability; });
    routes[0].isOptimal = true;
    routes.forEach(function (r, i) { r.label = 'Route ' + LABELS[i]; r.id = 'ROUTE_' + LABELS[i]; });
    console.log('[route-analysis]', from, '->', to, '|', routes.length, 'routes found');
    return res.json({ routes: routes, from: from, to: to });
  });

  // POST optimize — Node AI Optimizer endpoint
  app.post("/api/optimize", async function (req, res) {
    var body = req.body;
    if (!body || !body.inventory || !body.shipments) {
      return res.status(400).json({ error: "Body must include inventory and shipments arrays." });
    }

    try {
      console.log("[POST /api/optimize] Generating dispatch AI steps...");
      var steps = await generateDispatchOptimization(body.inventory, body.shipments);
      res.json({ steps: steps });
    } catch (err) {
      console.error("[Optimize API Error]", err);
      res.status(500).json({ error: "Failed to generate optimization." });
    }
  });

  // Socket.io connection log
  io.on("connection", function (socket) {
    console.log("[Socket.io] Connected:", socket.id);
    // Send current route on connect
    var data = readData();
    socket.emit("route_init", data.currentRoute);
    socket.on("disconnect", function () {
      console.log("[Socket.io] Disconnected:", socket.id);
    });
  });

  httpServer.listen(PORT, function () {
    console.log("──────────────────────────────────────────────");
    console.log("  ACM NEXUS 26 — Self-Healing Supply Chain");
    console.log("  Backend: http://localhost:" + PORT);
    console.log("  Groq Threat AI:    " + (process.env.GEMINI_API_KEY_THREAT ? "CONNECTED" : "NOT SET"));
    console.log("  Groq Dispatch AI:  " + (process.env.GROQ_API_KEY         ? "CONNECTED" : "NOT SET"));
    console.log("──────────────────────────────────────────────");
  });
}

startServer();

/* Pre-warm OSRM geometry cache after a short delay to let the server settle */
setTimeout(prewarmGeometryCache, 2000);
