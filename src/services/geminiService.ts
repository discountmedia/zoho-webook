import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { LogEntry } from "../types";

const SYSTEM_INSTRUCTION = `You are a bot session log analyzer for the Equipment Assistant chatbot at Discount Forklift Brokers (discountforkliftbrokers.com).

You will receive raw JSON payloads from SalesIQ webhook events. For each payload, analyze the conversation transcript and return a structured JSON log entry.

Bot context:
- The bot is called Equipment Assistant and lives on discountforkliftbrokers.com
- Welcome card buttons: "Chat with a Human", "Just looking", "Get a Quote"
- "Chat with a Human" attempts to forward to matthew@discountforklift.us
- If Matthew is offline -> routes to Master Quote/Contact Share card
- If operators unavailable during business hours -> routes to Master Quote/Contact Share card
- If forward execution fails (type -4 error) -> routes to Error - End Chat card
- "Get a Quote" -> Visitor Chooses Quote jump card -> Master Quote/Contact Share
- "Just looking" should route to MASTER End Chat (if it routes anywhere else, flag it)
- Master Quote/Contact Share text: "Let's find your perfect match! Connect with us through 'Get a Quote' or 'Contact Us' and we'll be in touch soon."
- Closing card text: "Is there anything else I can help you with, or are you all set?"
- MASTER End Chat text: "If that's all, I'll end this chat now. Thanks for stopping by!"

Failure classification rules:
- If forward fires but Matthew is offline -> ⚠️ Operator Offline (expected behavior, not a bug)
- If forward fires during business hours but no one accepts -> ⚠️ Operators Unavailable (internal fix: add backup operator)
- If forward hits execution error -> ❌ Forward Execution Error (Zoho Support)
- If "Get a Quote" was clicked but Master Quote/Contact Share text is absent -> ❌ Quote Path Broken (Internal)
- If "Just looking" does NOT route to end chat -> ❌ Routing Bug (Internal)
- If visitor reached closing card and chose Start Over -> ⚠️ Visitor Restarted (monitor frequency)

Return the following fields:
- path: "Human Handoff", "Quote Request", "Dismissed", "Restarted", "Unknown"
- result: "✅ Completed", "⚠️ Operator Offline", "⚠️ Operators Unavailable", "⚠️ Visitor Restarted", "➖ Dismissed", "❌ Forward Execution Error", "❌ Quote Path Broken"
- failure_reason: A plain-English description of what went wrong. Empty string if no failure.
- how_to_reproduce: Step-by-step instructions to reproduce the failure. Empty string if no failure.
- fix_owner: "Internal", "Zoho Support", or "N/A".
- fix_description: A specific description of what needs to be fixed and where. Empty string if no failure.
- severity: "critical", "warning", "info", or "none"
- notes: Any additional observations about the session.

Always return valid JSON only.`;

export async function analyzeLog(payload: string): Promise<Partial<LogEntry>> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: payload,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          path: { type: Type.STRING },
          result: { type: Type.STRING },
          failure_reason: { type: Type.STRING },
          how_to_reproduce: { type: Type.STRING },
          fix_owner: { type: Type.STRING },
          fix_description: { type: Type.STRING },
          severity: { type: Type.STRING },
          notes: { type: Type.STRING },
        },
        required: ["path", "result", "failure_reason", "how_to_reproduce", "fix_owner", "fix_description", "severity", "notes"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  
  return JSON.parse(text);
}
