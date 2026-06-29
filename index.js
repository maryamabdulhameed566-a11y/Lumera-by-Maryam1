// ============================================================
// CLOUD FUNCTION: chatWithAI
// Keeps your Anthropic API key on the server. The browser never
// sees it — it only ever talks to this function.
//
// Handles two request shapes from the front end:
//   1) { messages: [{role, content}, ...] }       -> customer chat
//   2) { mode: "product_copy", name, category }   -> admin AI copy
// ============================================================

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const STORE_SYSTEM_PROMPT = `You are the friendly customer-service assistant for "Luméra by Maryam," a small
beauty, skincare, and self-care affiliate shop. You help visitors choose between products, answer general
skincare/beauty questions, and explain that all purchases happen on Amazon via the shop's affiliate links —
you cannot place orders, check order status, or process payments or refunds yourself; for those, point people
to Amazon's own order history and customer service. Keep replies short (2-4 sentences), warm, and genuine,
never pushy. You are not a medical professional — for skin conditions, allergies, or anything medical,
suggest seeing a dermatologist or doctor rather than diagnosing.`;

function setCors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

async function callAnthropic(apiKey, system, messages, maxTokens = 400) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Anthropic API error ${resp.status}: ${text}`);
  }
  const data = await resp.json();
  const textBlock = (data.content || []).find(b => b.type === "text");
  return textBlock ? textBlock.text : "";
}

exports.chatWithAI = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: false, region: "us-central1" },
  async (req, res) => {
    setCors(res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Use POST" }); return; }

    const apiKey = ANTHROPIC_API_KEY.value();
    const body = req.body || {};

    try {
      if (body.mode === "product_copy") {
        const { name, category } = body;
        if (!name) { res.status(400).json({ error: "Missing product name" }); return; }
        const VALID = ["Beauty", "Skincare", "Self-Care", "Electronics", "Home", "Fashion", "Other"];
        const prompt = `A shop owner is adding a product to her affiliate store. Her store's categories are:
Beauty, Skincare, Self-Care, Electronics, Home, Fashion, Other (use Other only if nothing else fits).
She typed this product name (it may be a brand name, an informal name, or a full title): "${name}"${category ? ` She tentatively picked "${category}" as the category, but feel free to correct it if the name clearly belongs elsewhere.` : ""}

Reply ONLY with valid JSON, no markdown fences, in this exact shape:
{"category": "one of: ${VALID.join(", ")}", "description": "a detailed, warm product description, 3-5 sentences (roughly 400-600 characters): what it is, the key benefit or standout ingredient/feature, who it's especially good for, and a genuine personal-touch reason she'd recommend it — written like a small shop owner, not generic ad copy", "altText": "a plain, literal description of the product photo for screen readers, under 120 characters"}`;
        const raw = await callAnthropic(apiKey, "You classify products and write detailed, genuine product copy. You reply with strict JSON only, never markdown.", [
          { role: "user", content: prompt },
        ], 500);
        let parsed;
        try {
          parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        } catch {
          parsed = { category: category || "Other", description: raw.slice(0, 600), altText: `${name} product photo` };
        }
        if (!VALID.includes(parsed.category)) parsed.category = category || "Other";
        res.json(parsed);
        return;
      }

      // Default: customer-facing chat
      const messages = Array.isArray(body.messages) ? body.messages : [];
      if (messages.length === 0) { res.status(400).json({ error: "Missing messages" }); return; }
      const trimmed = messages.slice(-12); // keep request small
      const reply = await callAnthropic(apiKey, STORE_SYSTEM_PROMPT, trimmed, 350);
      res.json({ reply });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "AI request failed" });
    }
  }
);
