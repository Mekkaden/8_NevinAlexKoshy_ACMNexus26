/**
 * ACM NEXUS 26 – Hackathon V1 Server
 * Tech Stack: Node.js, Express, Socket.io, native 'fs' module
 * No database. Uses data.json for in-memory graph storage.
 */

var express = require("express");
var http = require("http");
var socketIo = require("socket.io");
var fs = require("fs");
var path = require("path");

var DATA_FILE = path.join(__dirname, "data.json");
var PORT = process.env.PORT || 3001;

// ─────────────────────────────────────────────
// Helper: Read data.json from disk
// ─────────────────────────────────────────────
function readData() {
  var raw = fs.readFileSync(DATA_FILE, "utf8");
  return JSON.parse(raw);
}

// ─────────────────────────────────────────────
// Helper: Write updated data back to data.json
// ─────────────────────────────────────────────
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

// ─────────────────────────────────────────────
// Placeholder: Simulate AI threat analysis
// Returns the flagged city name (or null if safe)
// ─────────────────────────────────────────────
function analyzeThreatWithAI(text) {
  // PLACEHOLDER – In production this will call an AI/ML endpoint.
  // For the demo we do simple keyword detection.
  var lowerText = text.toLowerCase();
  if (lowerText.indexOf("kochi") !== -1) {
    return "Kochi";
  }
  return null;
}

// ─────────────────────────────────────────────
// Core: Recalculate route based on blocked city
// Hardcoded demo logic:
//   BLR -> Kochi -> TVM  becomes  BLR -> Coimbatore -> TVM
// ─────────────────────────────────────────────
function recalculateRoute(blockedCity, data) {
  var original = data.currentRoute.path;

  if (blockedCity === "Kochi" && original.indexOf("Kochi") !== -1) {
    data.currentRoute.path = ["BLR", "Coimbatore", "TVM"];
    data.currentRoute.status = "rerouted";

    // Log the threat in the threats array
    data.threats.push({
      city: blockedCity,
      timestamp: new Date().toISOString(),
      action: "rerouted via Coimbatore"
    });

    return {
      rerouted: true,
      originalPath: original,
      newPath: data.currentRoute.path,
      blockedCity: blockedCity,
      reason: "Kochi flagged as blocked by threat analysis"
    };
  }

  // No change needed
  return {
    rerouted: false,
    currentPath: original,
    blockedCity: blockedCity,
    reason: "Current route does not pass through the flagged city"
  };
}

// ─────────────────────────────────────────────
// Main: Boot the server
// ─────────────────────────────────────────────
function startServer() {
  var app = express();
  var httpServer = http.createServer(app);

  // ── Socket.io with CORS ──────────────────────
  var io = socketIo(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // ── Express middleware ───────────────────────
  app.use(express.json());

  // Allow cross-origin requests on all routes
  app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // ── Health check ─────────────────────────────
  app.get("/", function (req, res) {
    res.json({ status: "ok", message: "ACM NEXUS 26 – Supply Chain Threat Server running." });
  });

  // ── GET /api/route – Return current route ────
  app.get("/api/route", function (req, res) {
    var data = readData();
    res.json(data.currentRoute);
  });

  // ── POST /api/threat ─────────────────────────
  // Body: { "text": "<threat description string>" }
  // 1. Run (placeholder) AI analysis on the text
  // 2. If a city is flagged, recalculate route
  // 3. Emit Socket.io event 'route_updated' with new route
  app.post("/api/threat", function (req, res) {
    var body = req.body;

    if (!body || typeof body.text !== "string" || body.text.trim() === "") {
      return res.status(400).json({ error: "Request body must contain a non-empty 'text' field." });
    }

    var threatText = body.text.trim();
    console.log("[POST /api/threat] Received threat text:", threatText);

    // ── Step 1: AI analysis (placeholder) ───────
    var flaggedCity = analyzeThreatWithAI(threatText);
    console.log("[AI] Flagged city:", flaggedCity || "none");

    if (!flaggedCity) {
      return res.json({
        message: "No actionable threat detected. Route unchanged.",
        rerouted: false
      });
    }

    // ── Step 2: Recalculate route ────────────────
    var data = readData();
    var result = recalculateRoute(flaggedCity, data);

    if (result.rerouted) {
      // ── Step 3: Persist updated route ───────────
      writeData(data);
      console.log("[Route] Updated:", result.newPath.join(" -> "));

      // ── Step 4: Emit Socket.io event ─────────────
      io.emit("route_updated", {
        flaggedCity: flaggedCity,
        originalPath: result.originalPath,
        newPath: result.newPath,
        status: "rerouted",
        reason: result.reason,
        timestamp: new Date().toISOString()
      });
    }

    return res.json(result);
  });

  // ── Socket.io connection log ─────────────────
  io.on("connection", function (socket) {
    console.log("[Socket.io] Client connected:", socket.id);

    socket.on("disconnect", function () {
      console.log("[Socket.io] Client disconnected:", socket.id);
    });
  });

  // ── Start listening ──────────────────────────
  httpServer.listen(PORT, function () {
    console.log("──────────────────────────────────────────");
    console.log("  ACM NEXUS 26 – Threat Server");
    console.log("  Listening on http://localhost:" + PORT);
    console.log("  Socket.io ready for real-time events");
    console.log("──────────────────────────────────────────");
  });
}

startServer();
