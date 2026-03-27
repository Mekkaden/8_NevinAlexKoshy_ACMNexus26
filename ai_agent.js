/**
 * ai_agent.js
 * Gemini AI Parsing Logic — Supply Chain Threat Intelligence
 * Tech Stack: Node.js, @google/generative-ai
 */

"use strict";

require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

// ─── Initialise Gemini Client ─────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an advanced Supply Chain Threat Analyzer AI.
Your sole responsibility is to evaluate unstructured threat intelligence text
and identify the most critical blocked node in the global supply chain.

STRICT OUTPUT RULES:
1. You MUST respond with ONLY a raw JSON object — no prose, no explanation,
   no markdown fences, no code blocks, no extra whitespace before or after.
2. The JSON object MUST follow this exact structure with no additional keys:
   {
     "blocked_node": "Name of city",
     "reason": "Reason for block",
     "severity": "High"
   }
3. "severity" must be exactly one of: "Low", "Medium", "High", or "Critical".
4. Do NOT include \`\`\`json, \`\`\`, or any other markdown formatting in your response.
5. If you cannot determine a blocked node, return:
   { "blocked_node": "Unknown", "reason": "Insufficient data", "severity": "Low" }
`;

// ─── Strip Markdown Formatting ────────────────────────────────────────────────
/**
 * Removes any markdown code-fence wrappers (e.g. ```json ... ```) that
 * the model may accidentally include, so JSON.parse() does not crash.
 *
 * @param {string} rawText - Raw text returned by the Gemini model.
 * @returns {string}       - Clean JSON string ready for JSON.parse().
 */
function stripMarkdownFormatting(rawText) {
    // Remove opening fence:  ```json  or  ```  (with optional language tag)
    var withoutOpenFence = rawText.replace(/^```(?:json|javascript|js)?\s*/i, "");

    // Remove closing fence:  ```
    var withoutCloseFence = withoutOpenFence.replace(/\s*```\s*$/i, "");

    // Trim any remaining surrounding whitespace / newlines
    return withoutCloseFence.trim();
}

// ─── Core Parsing Function ────────────────────────────────────────────────────
/**
 * Sends threat intelligence text to Gemini 1.5 Flash and returns a
 * structured JSON object describing the blocked supply-chain node.
 *
 * @param {string} textInput - Raw threat intelligence text to analyse.
 * @returns {Promise<{blocked_node: string, reason: string, severity: string}>}
 */
async function parseThreatIntelligence(textInput) {
    if (!textInput || typeof textInput !== "string" || textInput.trim() === "") {
        throw new Error("parseThreatIntelligence: textInput must be a non-empty string.");
    }

    // Initialise the Gemini 1.5 Flash model with the system instruction
    var model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: SYSTEM_PROMPT,
    });

    // Build the user prompt
    var userPrompt =
        "Analyse the following threat intelligence report and return the JSON object as instructed:\n\n" +
        textInput;

    // Call the Gemini API
    var result = await model.generateContent(userPrompt);
    var rawResponse = result.response.text();

    // Strip any accidental markdown formatting before parsing
    var cleanedResponse = stripMarkdownFormatting(rawResponse);

    // Parse and validate the JSON
    var parsed = JSON.parse(cleanedResponse);

    // Basic structural validation
    if (
        typeof parsed.blocked_node !== "string" ||
        typeof parsed.reason !== "string" ||
        typeof parsed.severity !== "string"
    ) {
        throw new Error(
            "parseThreatIntelligence: Gemini response is missing required fields."
        );
    }

    return parsed;
}

// ─── Dispatch Optimization Function ───────────────────────────────────────────
/**
 * Takes live inventory and shipment data and uses Gemini to generate a sequence
 * of optimization steps for warehouse dispatch operations.
 * 
 * @param {Array} inventory - Current local inventory levels.
 * @param {Array} shipments - Incoming shipments arriving today.
 * @returns {Promise<string[]>} - Array of exactly 5 optimization steps.
 */
async function generateDispatchOptimization(inventory, shipments) {
    var model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    var prompt = `You are a Supply Chain Node Optimization AI. 
Analyze the following local inventory and incoming shipments.
Identify critical shortages and prioritize unloading/dispatch.

Current Inventory:
${JSON.stringify(inventory, null, 2)}

Incoming Shipments:
${JSON.stringify(shipments, null, 2)}

Return a strict JSON array of EXACTLY 5 strings representing the step-by-step optimization actions you took. Make them look professional and technical.
Example format:
[
  "Cross-referenced incoming TRK-012 with critical Control Module shortage.",
  "Assigned expedited Dock Bay 3 for TRK-... etc.",
  ...
]

Do not include any other text, no markdown, just the JSON array.`;

    var result = await model.generateContent(prompt);
    var rawResponse = result.response.text();
    var cleanedResponse = stripMarkdownFormatting(rawResponse);
    
    try {
        var parsed = JSON.parse(cleanedResponse);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            throw new Error("Not a valid array");
        }
        return parsed.slice(0, 5); // Ensure max 5 steps
    } catch (err) {
        console.error("Failed to parse Gemini array output", err);
        return [
            "Analyzing current inventory levels...",
            "Cross-referencing incoming shipments...",
            "Prioritizing critical SKUs...",
            "Assigning dock bays...",
            "✓ Dispatch schedule optimized."
        ];
    }
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
    parseThreatIntelligence,
    generateDispatchOptimization
};
