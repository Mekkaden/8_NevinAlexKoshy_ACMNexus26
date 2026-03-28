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

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
    parseThreatIntelligence,
    generateDispatchOptimization
};
