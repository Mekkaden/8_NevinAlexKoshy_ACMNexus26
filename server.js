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
var { GoogleGenerativeAI } = require("@google/generative-ai");

var DATA_FILE = path.join(__dirname, "data.json");
var PORT = process.env.PORT || 3001;
var genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
// AI Agent: Call Gemini to parse threat text
// Returns { blocked_node, reason } or null
// ─────────────────────────────────────────────
async function analyzeThreatWithGemini(text) {
  try {
    var model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    var prompt =
      "You are a supply chain threat analyst AI. " +
      "Given a threat report, identify which supply chain node is blocked. " +
      "The known nodes are: BLR, Kochi, Coimbatore, TVM. " +
      "Respond ONLY with a valid JSON object in this exact format: " +
      '{ "blocked_node": "<NODE_NAME>", "reason": "<short reason>" } ' +
      "If no known node is threatened, respond with: " +
      '{ "blocked_node": null, "reason": "No known node affected" } ' +
      "Threat report: " +
      text;

    var result = await model.generateContent(prompt);
    var responseText = result.response.text().trim();

    // Strip markdown code fences if Gemini wraps in ```json ... ```
    responseText = responseText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    var parsed = JSON.parse(responseText);
    console.log("[Gemini] Response:", parsed);
    return parsed;
  } catch (err) {
    console.error("[Gemini] Error:", err.message);
    // Fallback: keyword detection
    return fallbackAnalyze(text);
  }
}

// ─────────────────────────────────────────────
// Fallback: simple keyword detection
// ─────────────────────────────────────────────
function fallbackAnalyze(text) {
  var lower = text.toLowerCase();
  if (lower.indexOf("kochi") !== -1) {
    return { blocked_node: "Kochi", reason: "Keyword match: Kochi" };
  }
  if (lower.indexOf("coimbatore") !== -1) {
    return { blocked_node: "Coimbatore", reason: "Keyword match: Coimbatore" };
  }
  return { blocked_node: null, reason: "No known node affected" };
}

// ─────────────────────────────────────────────
// Route recalculation (deterministic hardcode)
// ─────────────────────────────────────────────
function recalculateRoute(blockedNode, data) {
  var original = data.currentRoute.path.slice();

  if (blockedNode === "Kochi" && original.indexOf("Kochi") !== -1) {
    data.currentRoute.path = ["BLR", "Coimbatore", "TVM"];
    data.currentRoute.status = "rerouted";
    data.threats.push({
      city: blockedNode,
      timestamp: new Date().toISOString(),
      action: "Rerouted via Coimbatore"
    });
    return {
      rerouted: true,
      originalPath: original,
      newPath: data.currentRoute.path,
      blockedNode: blockedNode
    };
  }

  return {
    rerouted: false,
    currentPath: original,
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

  // Reset route (useful for demo reset)
  app.post("/api/reset", function (req, res) {
    var data = readData();
    data.currentRoute = { path: ["BLR", "Kochi", "TVM"], status: "active" };
    data.threats = [];
    writeData(data);
    io.emit("route_reset", { path: ["BLR", "Kochi", "TVM"], status: "active" });
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
    }

    return res.json({
      aiResult: aiResult,
      routeResult: routeResult
    });
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
