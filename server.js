/**
 * ACM NEXUS 26 – Self-Healing Supply Chain – Backend Server
 * Stack: Node.js, Express, Socket.io, Gemini AI, native 'fs'
 * No database. data.json is the in-memory graph store.
 */

require("dotenv").config();

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

// ─────────────────────────────────────────────
// Fallback: simple keyword detection
// ─────────────────────────────────────────────
function fallbackAnalyze(text) {
  var lower = text.toLowerCase();
  if (lower.indexOf('kochi') !== -1)      return { blocked_node: 'Kochi',      reason: 'Keyword match: Kochi' };
  if (lower.indexOf('coimbatore') !== -1) return { blocked_node: 'Coimbatore', reason: 'Keyword match: Coimbatore' };
  if (lower.indexOf('chennai') !== -1)    return { blocked_node: 'Chennai',    reason: 'Keyword match: Chennai' };
  if (lower.indexOf('madurai') !== -1)    return { blocked_node: 'Madurai',    reason: 'Keyword match: Madurai' };
  if (lower.indexOf('mangalore') !== -1)  return { blocked_node: 'Mangalore',  reason: 'Keyword match: Mangalore' };
  if (lower.indexOf('mysore') !== -1)     return { blocked_node: 'Mysore',     reason: 'Keyword match: Mysore' };
  if (lower.indexOf('salem') !== -1)      return { blocked_node: 'Salem',      reason: 'Keyword match: Salem' };
  if (lower.indexOf('hubli') !== -1)      return { blocked_node: 'Hubli',      reason: 'Keyword match: Hubli' };
  if (lower.indexOf('hyderabad') !== -1)  return { blocked_node: 'Hyderabad',  reason: 'Keyword match: Hyderabad' };
  if (lower.indexOf('calicut') !== -1)    return { blocked_node: 'Calicut',    reason: 'Keyword match: Calicut' };
  return { blocked_node: null, reason: 'No known node affected' };
}

// ─────────────────────────────────────────────
// Dynamic Pathfinding Algorithm
// Finds shortest path from BLR to TVM avoiding blockedNode
// ─────────────────────────────────────────────
function recalculateRoute(blockedNode, data) {
  var original = data.currentRoute.path.slice();
  
  // Only recalculate if the current route is blocked
  if (original.indexOf(blockedNode) === -1) {
    return { rerouted: false, currentPath: original, blockedNode: blockedNode };
  }

  // 1. Build adjacency list from data.graph.edges
  var adj = {};
  data.graph.nodes.forEach(n => adj[n] = []);
  data.graph.edges.forEach(e => {
    adj[e.from].push({ to: e.to, weight: e.weight });
    adj[e.to].push({ to: e.from, weight: e.weight }); // undirected
  });

  // 2. Simple DFS to find all paths from start to end, skipping blockedNode
  var start = original[0];
  var end = original[original.length - 1];
  var paths = [];

  function dfs(curr, target, visited, currentPath, currentCost) {
    if (curr === target) {
      paths.push({ path: [...currentPath], cost: currentCost });
      return;
    }
    adj[curr].forEach(neighbor => {
      if (!visited.has(neighbor.to) && neighbor.to !== blockedNode) {
        visited.add(neighbor.to);
        currentPath.push(neighbor.to);
        dfs(neighbor.to, target, visited, currentPath, currentCost + neighbor.weight);
        currentPath.pop();
        visited.delete(neighbor.to);
      }
    });
  }

  dfs(start, end, new Set([start]), [start], 0);

  if (paths.length === 0) {
    // No path exists
    return { rerouted: false, currentPath: original, blockedNode: blockedNode, error: "No safe route" };
  }

  // 3. Pick shortest path
  paths.sort((a, b) => a.cost - b.cost);
  var optimalPath = paths[0].path;

  // 4. Update state variables dynamically
  data.currentRoute.path = optimalPath;
  data.currentRoute.status = "rerouted";
  data.threats.push({
    city: blockedNode,
    timestamp: new Date().toISOString(),
    action: "Dynamically rerouted via " + optimalPath.filter(x => x !== start && x !== end).join(', ')
  });

  // 5. Instantly redirect active shipments logically in the DB
  if (data.active_shipments) {
    data.active_shipments.forEach(shp => {
       if (shp.next_node === blockedNode || shp.next_node === "COK") {
         shp.rerouted = true;
         // Assign the first intermediate node of the new path as the next node
         shp.next_node = optimalPath[1] || end; 
       }
    });
  }

  return {
    rerouted: true,
    originalPath: original,
    newPath: optimalPath,
    blockedNode: blockedNode
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
    data.currentRoute = { path: ["BLR", "Kochi", "TVM"], status: "active" };
    data.threats = [];
    // Reset shipment reroute flags
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
    io.emit("route_reset", { path: ["BLR", "Kochi", "TVM"], status: "active" });
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
    console.log("[POST /api/threat]", threatText);

    // Step 1: Gemini analysis
    var aiResult = await analyzeThreatWithGemini(threatText);
    var blockedNode = aiResult.blocked_node;
    var reason = aiResult.reason;

    if (!blockedNode) {
      return res.json({ message: "No actionable threat detected.", rerouted: false, aiResult: aiResult });
    }

    // Step 2: Recalculate
    var data = readData();
    var routeResult = recalculateRoute(blockedNode, data);

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
    console.log("  Gemini AI: " + (process.env.GEMINI_API_KEY ? "CONNECTED" : "NOT SET"));
    console.log("──────────────────────────────────────────────");
  });
}

startServer();
