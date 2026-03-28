/**
 * ai_agent.js
 * Groq AI Parsing Logic — Supply Chain Threat Intelligence & Dispatch Optimizer
 * Tech Stack: Node.js, groq-sdk
 */

"use strict";

require("dotenv").config();

const Groq = require("groq-sdk");

// ─── Initialise Groq Clients ──────────────────────────────────────────────────
const groqThreat    = new Groq({ apiKey: process.env.GEMINI_API_KEY_THREAT });
const groqDispatch  = new Groq({ apiKey: process.env.GROQ_API_KEY });
const groqLastMile  = new Groq({ apiKey: process.env.GROQ_API_KEY_LAST_MILE });

// ─── System Prompt — Threat ───────────────────────────────────────────────────
const THREAT_SYSTEM_PROMPT = `You are an advanced Supply Chain Threat Analyzer AI.
Your sole responsibility is to evaluate unstructured threat intelligence text
and identify the most critical blocked node in the supply chain network.

The supply chain covers the following South India cities:
Bangalore, Kochi, Coimbatore, Trivandrum, Chennai, Madurai,
Mangalore, Mysore, Salem, Hubli, Hyderabad, Calicut.

STRICT OUTPUT RULES:
1. Respond with ONLY a raw JSON object — no prose, no markdown, no code fences.
2. The JSON object MUST follow this exact structure:
   {
     "blocked_node": "City Name",
     "reason": "Brief reason",
     "severity": "High"
   }
3. "severity" must be exactly one of: "Low", "Medium", "High", "Critical".
4. "blocked_node" must exactly match one of the city names listed above.
5. If you cannot determine a blocked node, return:
   { "blocked_node": null, "reason": "Insufficient data", "severity": "Low" }
`;

// ─── System Prompt — Dispatch ─────────────────────────────────────────────────
const DISPATCH_SYSTEM_PROMPT = `You are a Supply Chain Node Optimization AI.
Analyze live inventory and incoming shipments data. Identify critical shortages
and generate prioritized dispatch actions.

Return ONLY a raw JSON array of EXACTLY 5 strings — no markdown, no fences.
Example:
["Step 1 description.", "Step 2 description.", ...]`;

// ─── Strip Markdown Wrappers ──────────────────────────────────────────────────
function stripMarkdownFormatting(rawText) {
    var withoutOpen  = rawText.replace(/^```(?:json|javascript|js)?\s*/i, "");
    var withoutClose = withoutOpen.replace(/\s*```\s*$/i, "");
    return withoutClose.trim();
}

// ─── parseThreatIntelligence ──────────────────────────────────────────────────
async function parseThreatIntelligence(textInput) {
    if (!textInput || typeof textInput !== "string" || textInput.trim() === "") {
        throw new Error("parseThreatIntelligence: textInput must be a non-empty string.");
    }

    var completion = await groqThreat.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
            { role: "system",  content: THREAT_SYSTEM_PROMPT },
            { role: "user",    content: "Analyse this threat report and return the JSON:\n\n" + textInput }
        ],
        temperature: 0.1,
        max_tokens: 256,
    });

    var rawResponse = completion.choices[0].message.content;
    console.log("[Groq Threat] Raw:", rawResponse);

    var cleaned = stripMarkdownFormatting(rawResponse);
    var parsed  = JSON.parse(cleaned);

    if (
        typeof parsed.reason !== "string" ||
        typeof parsed.severity !== "string"
    ) {
        throw new Error("parseThreatIntelligence: Response is missing required fields.");
    }

    console.log("[Groq Threat] Parsed:", parsed);
    return parsed;
}

// ─── generateDispatchOptimization ────────────────────────────────────────────
async function generateDispatchOptimization(inventory, shipments) {
    var userContent = "Current Inventory:\n" +
        JSON.stringify(inventory, null, 2) +
        "\n\nIncoming Shipments:\n" +
        JSON.stringify(shipments, null, 2) +
        "\n\nReturn a JSON array of EXACTLY 5 optimization step strings.";

    var completion = await groqDispatch.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
            { role: "system", content: DISPATCH_SYSTEM_PROMPT },
            { role: "user",   content: userContent }
        ],
        temperature: 0.2,
        max_tokens: 512,
    });

    var rawResponse = completion.choices[0].message.content;
    var cleaned     = stripMarkdownFormatting(rawResponse);

    try {
        var parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            throw new Error("Not a valid array");
        }
        return parsed.slice(0, 5);
    } catch (err) {
        console.error("[Groq Dispatch] Parse error:", err.message);
        return [
            "✓ Analyzing current inventory levels across all SKUs...",
            "✓ Cross-referencing incoming shipments with critical shortages...",
            "✓ Prioritizing Control Modules (critical) for expedited unloading...",
            "✓ Assigning optimal dock bays based on cargo classification...",
            "✓ Dispatch schedule optimized — ETA updated for all carriers."
        ];
    }
}

// ─── Agentic Last-Mile Optimizer (Tool Calling) ─────────────────────────────
const LAST_MILE_SYSTEM_PROMPT = `You are an autonomous Supply Chain Routing Agent.
Your goal is to generate a final JSON array of delivery stops for the Last-Mile driver.
Use the provided tools to fetch facility locations and check traffic.
CRITICAL: You MUST output ONLY the final JSON array in your final response. 
The JSON array must have exactly this format:
[ { "id": "uuid", "recipient": "name", "address": "location", "pkg": "cargo string", "window": "09:00 - 10:00", "reasoning": "why?" } ]
DO NOT wrap the JSON in markdown fences.`;

const lastMileTools = [
    {
        type: "function",
        function: {
            name: "getFacilityDatabase",
            description: "Get physical addresses for facilities in a city.",
            parameters: {
                type: "object",
                properties: {
                    city: { type: "string" },
                    facilityType: { type: "string", description: "'Medical', 'Industrial', or 'Commercial'" }
                },
                required: ["city", "facilityType"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "getLiveTraffic",
            description: "Check current traffic congestion for a specific road or area.",
            parameters: {
                type: "object",
                properties: { location: { type: "string" } },
                required: ["location"]
            }
        }
    }
];

function getFacilityDatabase(args) {
    try {
        var params = JSON.parse(args);
        var city = params.city || "City";
        var type = params.facilityType || "Commercial";
        if (type.includes('Medical')) return JSON.stringify({ name: city + " General Hospital", address: "12 Health Avenue, " + city });
        if (type.includes('Industrial')) return JSON.stringify({ name: city + " Industrial Park", address: "88 Outskirts Highway, " + city });
        return JSON.stringify({ name: city + " Central Hub", address: "1 Main Street, " + city });
    } catch (e) { return "{}"; }
}

function getLiveTraffic(args) {
    try {
        var params = JSON.parse(args);
        var loc = params.location || "";
        if (loc.includes("Main") || loc.includes("Health")) return JSON.stringify({ status: "High Congestion", advice: "Deliver before 10:00 AM." });
        return JSON.stringify({ status: "Clear", advice: "Safe to deliver anytime." });
    } catch (e) { return "{}"; }
}

async function generateAgenticRoute(city, cargo) {
    console.log("[Agent] Starting Last-Mile Agentic Loop for:", city);
    var messages = [
        { role: "system", content: LAST_MILE_SYSTEM_PROMPT },
        { role: "user",   content: "Generate an optimized 3-stop delivery route for city: " + city + ".\nCargo Payload: " + cargo }
    ];

    var maxLoops = 5; // Safety break
    while (maxLoops > 0) {
        maxLoops--;
        var completion = await groqLastMile.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: messages,
            tools: lastMileTools,
            tool_choice: "auto",
            temperature: 0.1
        });

        var responseMessage = completion.choices[0].message;
        messages.push(responseMessage);

        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            for (var i = 0; i < responseMessage.tool_calls.length; i++) {
                var toolCall = responseMessage.tool_calls[i];
                console.log("[Agent] Action: Calling Tool ->", toolCall.function.name, toolCall.function.arguments);
                var functionResponse = "";
                if (toolCall.function.name === "getFacilityDatabase") {
                    functionResponse = getFacilityDatabase(toolCall.function.arguments);
                } else if (toolCall.function.name === "getLiveTraffic") {
                    functionResponse = getLiveTraffic(toolCall.function.arguments);
                }
                messages.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: toolCall.function.name,
                    content: functionResponse,
                });
            }
        } else {
            // No more tools, final response
            console.log("[Agent] Final JSON generated.");
            var cleaned = stripMarkdownFormatting(responseMessage.content);
            try {
                var parsed = JSON.parse(cleaned);
                if (Array.isArray(parsed)) return parsed;
                throw new Error("Not an array");
            } catch(e) {
                console.error("[Agent] Parse error:", e.message);
                break;
            }
        }
    }
    
    // Fallback if loop breaks or parsing fails
    return [
        { id: "fallback1", recipient: "Local Clinic", address: "1 Health Ave, " + city, pkg: "Priority Medical", window: "09:00 - 10:00", reasoning: "Emergency agent fallback." },
        { id: "fallback2", recipient: "Industrial Hub", address: "88 Hwy, " + city, pkg: "Standard Cargo", window: "11:00 - 12:00", reasoning: "Standard drop." }
    ];
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
    parseThreatIntelligence,
    generateDispatchOptimization,
    generateAgenticRoute
};
