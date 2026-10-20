import { GoogleGenAI } from "@google/genai";
import { AISummary, TranscriptMessage, Language, SalesStatus } from "@/types";
import { PRODUCT_CONFIG } from "@/config/product-config";

import dns from "dns";

try {
  if (typeof dns.setDefaultResultOrder === "function") {
    dns.setDefaultResultOrder("ipv4first");
  }
} catch {
  // browser or non-node runtime
}

export function getGeminiApiKey(): string | null {
  return process.env.GEMINI_API_KEY || null;
}

export function getGeminiLiveModel(): string {
  return process.env.GEMINI_LIVE_MODEL || "gemini-2.5-flash-native-audio-preview-12-2025";
}

export function getGeminiTextModel(): string {
  return process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash-lite";
}

/**
 * Creates an ephemeral token for direct client-to-Gemini WebSocket connection.
 * Ephemeral tokens are short-lived, single-use, and expire quickly.
 */
export async function createLiveToken(): Promise<{
  token: string;
  expireTime: string;
  model: string;
  voiceName: string;
}> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured on the server. Please add it to your .env.local file."
    );
  }

  const model = getGeminiLiveModel();
  const expireTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();

  // Try creating token via official @google/genai SDK
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });

    const tokenRes = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
      },
    });

    const tokenName = tokenRes?.name || (tokenRes as unknown as { token?: string })?.token;
    if (tokenName) {
      return {
        token: tokenName,
        expireTime,
        model,
        voiceName: "Puck",
      };
    }
  } catch (sdkError: unknown) {
    console.warn("SDK authTokens.create error, falling back to direct REST API:", (sdkError as Error).message);
  }

  // Fallback direct REST API call for v1alpha authTokens
  try {
    const url = `https://generativelanguage.googleapis.com/v1alpha/authTokens?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uses: 1,
        expireTime,
        newSessionExpireTime,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to create ephemeral token (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const token = data.name || data.token;
    if (!token) {
      throw new Error("No token returned by Gemini ephemeral token service.");
    }

    return {
      token,
      expireTime,
      model,
      voiceName: "Puck",
    };
  } catch (restError: unknown) {
    throw new Error(
      `Unable to issue live token: ${(restError as Error).message || "Unknown error"}`
    );
  }
}

/**
 * Analyzes call transcript using Gemini text generation to extract:
 * summary, customer requirements, pain points, objections, next steps,
 * and exact sales status with explainable reason.
 */
export async function analyzeCallTranscript(
  transcript: TranscriptMessage[],
  trialSignupCompleted: boolean = false,
  language: Language = "en"
): Promise<AISummary> {
  const apiKey = getGeminiApiKey();
  const textModel = getGeminiTextModel();

  // 1. If customer independently completed demo signup, prioritize Converted
  if (trialSignupCompleted) {
    return {
      summary:
        "The customer evaluated ResumePilot AI with Alex and successfully completed the free-trial demo signup.",
      customerRequirements: ["ATS-optimized resume creation and job application assistance"],
      painPoints: ["Improving interview callback rates with ATS scoring"],
      objections: [],
      interestLevel: "high",
      questionsAsked: [],
      nextSteps: ["Send free-trial activation guide and recruiter resume templates."],
      demoRequested: false,
      trialSignupCompleted: true,
      salesStatus: "Converted",
      statusReason:
        "Customer independently completed and confirmed the free-trial demo signup during the session.",
    };
  }

  // 2. Filter customer verbal interactions
  const customerUtterances = transcript.filter((t) => t.speaker === "customer");
  const totalCustomerWords = customerUtterances.reduce(
    (acc, cur) => acc + cur.text.trim().split(/\s+/).filter(Boolean).length,
    0
  );

  if (customerUtterances.length === 0 || totalCustomerWords < 2) {
    return {
      summary:
        "The call ended without meaningful verbal interaction from the customer.",
      customerRequirements: [],
      painPoints: [],
      objections: [],
      interestLevel: "unknown",
      questionsAsked: [],
      nextSteps: ["Reach out via alternative channel or re-attempt call."],
      demoRequested: false,
      trialSignupCompleted: false,
      salesStatus: "No Response",
      statusReason:
        "Customer provided no usable verbal response during the call.",
    };
  }

  // Format transcript for prompt
  const formattedTranscript = transcript
    .map(
      (m) =>
        `[${m.timestamp || "00:00"}] ${m.speaker === "ai" ? "Alex (AI Sales)" : "Customer"}: ${m.text}`
    )
    .join("\n");

  const prompt = `
You are an expert sales analyst for "${PRODUCT_CONFIG.name}" (${PRODUCT_CONFIG.tagline}).
Analyze the following completed sales conversation transcript between our AI sales agent and a prospective customer.

PRODUCT CONTEXT:
- Name: ${PRODUCT_CONFIG.name}
- Features: ${PRODUCT_CONFIG.features.join(", ")}
- Free Plan: ₹0 (1 resume, basic suggestions, try core features)
- Pro Plan: ₹199/month (unlimited resumes, ATS keyword optimization, job tailoring, cover letters)

TRANSCRIPT:
${formattedTranscript}

ADDITIONAL CONTEXT:
- In-app demo signup confirmed: ${trialSignupCompleted ? "YES, customer completed the demo signup form" : "NO"}
- Conversation language: ${language}

REQUIRED OUTPUT FORMAT (VALID JSON ONLY):
{
  "summary": "Short 2-3 sentence summary of the conversation.",
  "customerRequirements": ["Requirement 1", "Requirement 2"],
  "painPoints": ["Pain point 1", "Pain point 2"],
  "objections": ["Objection 1"],
  "interestLevel": "high" | "medium" | "low" | "unknown",
  "questionsAsked": ["Question asked by customer"],
  "nextSteps": ["Specific next step proposed or agreed upon"],
  "demoRequested": true | false,
  "trialSignupCompleted": ${trialSignupCompleted ? "true" : "false"},
  "salesStatus": "Converted" | "Interested" | "Follow-up Required" | "Not Interested" | "Demo Requested" | "No Response",
  "statusReason": "Explainable reason detailing why this specific sales status was assigned."
}

SALES STATUS CLASSIFICATION RULES:
1. "No Response": Customer provided no usable response during the call.
2. "Converted": STRICT RULE: Assign ONLY IF customer completed the free-trial demo signup (${trialSignupCompleted ? "YES" : "NO"}). Never assign Converted just for interest without signup completion.
3. "Demo Requested": Customer explicitly requested a demo/walkthrough of the product and did not complete signup.
4. "Not Interested": Customer explicitly declined, stated they do not need it, or refused the product.
5. "Follow-up Required": Customer requested a later conversation, needs to discuss with someone else, or requested more info before deciding.
6. "Interested": Customer showed genuine interest, asked positive questions, or engaged constructively, but did not complete signup or schedule a demo.

PRECEDENCE ORDER:
No Response > Converted (if demo signup completed) > Demo Requested > Not Interested > Follow-up Required > Interested.

Return ONLY the raw JSON object. Do not wrap in markdown or backticks.
`;

  if (!apiKey) {
    // If no API key is available, return a smart deterministic heuristic
    return generateDeterministicSummary(transcript, trialSignupCompleted);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: textModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text?.trim() || "";
    // Clean any markdown formatting if present
    const cleanedJson = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed: AISummary = JSON.parse(cleanedJson);

    // Validate sales status
    const validStatuses: SalesStatus[] = [
      "Converted",
      "Interested",
      "Follow-up Required",
      "Not Interested",
      "Demo Requested",
      "No Response",
    ];

    if (!validStatuses.includes(parsed.salesStatus)) {
      parsed.salesStatus = trialSignupCompleted ? "Converted" : "Interested";
    }

    if (trialSignupCompleted) {
      parsed.salesStatus = "Converted";
      parsed.trialSignupCompleted = true;
    }

    return parsed;
  } catch (error: unknown) {
    console.error("Gemini text analysis failed, using robust fallback:", error);
    return generateDeterministicSummary(transcript, trialSignupCompleted);
  }
}

/**
 * Deterministic fallback analysis when Gemini API is unavailable or offline.
 * Analyzes the transcript keywords safely.
 */
function generateDeterministicSummary(
  transcript: TranscriptMessage[],
  trialSignupCompleted: boolean
): AISummary {
  const customerTexts = transcript
    .filter((t) => t.speaker === "customer")
    .map((t) => t.text.toLowerCase())
    .join(" ");

  let salesStatus: SalesStatus = "Interested";
  let statusReason = "Customer engaged constructively in discussion about ResumePilot AI.";
  const customerRequirements: string[] = [];
  const painPoints: string[] = [];
  const objections: string[] = [];
  const questionsAsked: string[] = [];
  let interestLevel: "high" | "medium" | "low" | "unknown" = "medium";
  let demoRequested = false;

  if (trialSignupCompleted) {
    salesStatus = "Converted";
    statusReason = "Customer agreed to try the product and completed the free trial demo signup.";
    interestLevel = "high";
  } else if (
    customerTexts.includes("not interested") ||
    customerTexts.includes("no thanks") ||
    customerTexts.includes("don't want") ||
    customerTexts.includes("nahi chahiye")
  ) {
    salesStatus = "Not Interested";
    statusReason = "Customer explicitly declined the product or indicated no current interest.";
    interestLevel = "low";
  } else if (
    customerTexts.includes("demo") ||
    customerTexts.includes("show me") ||
    customerTexts.includes("walkthrough")
  ) {
    salesStatus = "Demo Requested";
    statusReason = "Customer requested a live product walkthrough or demonstration.";
    demoRequested = true;
    interestLevel = "high";
  } else if (
    customerTexts.includes("later") ||
    customerTexts.includes("call back") ||
    customerTexts.includes("busy") ||
    customerTexts.includes("think about it") ||
    customerTexts.includes("baad me")
  ) {
    salesStatus = "Follow-up Required";
    statusReason = "Customer requested to be contacted later or needed time to consider.";
    interestLevel = "medium";
  }

  if (customerTexts.includes("ats") || customerTexts.includes("score")) {
    customerRequirements.push("ATS score optimization and recruiter screening clearance");
  }
  if (customerTexts.includes("fresher") || customerTexts.includes("college") || customerTexts.includes("student")) {
    customerRequirements.push("Entry-level/fresher resume formatting and placement assistance");
  }
  if (customerTexts.includes("price") || customerTexts.includes("cost") || customerTexts.includes("free")) {
    objections.push("Inquired about pricing structure and free plan availability");
    questionsAsked.push("What are the pricing plans and is there a free option?");
  }
  if (customerTexts.includes("reject") || customerTexts.includes("no reply")) {
    painPoints.push("Not receiving interview callbacks on job applications");
  }

  return {
    summary: `Customer discussed career and resume needs with AI sales rep Alex. Key focus was on ${
      customerRequirements.length > 0 ? customerRequirements[0] : "evaluating ResumePilot AI features"
    }.`,
    customerRequirements:
      customerRequirements.length > 0
        ? customerRequirements
        : ["Resume creation and job application assistance"],
    painPoints:
      painPoints.length > 0
        ? painPoints
        : ["Improving resume visibility and passing applicant tracking systems"],
    objections,
    interestLevel,
    questionsAsked,
    nextSteps:
      salesStatus === "Converted"
        ? ["Follow up with onboarding materials and resume template guide."]
        : salesStatus === "Demo Requested"
        ? ["Schedule interactive product demonstration."]
        : ["Send information email with free plan link."],
    demoRequested,
    trialSignupCompleted,
    salesStatus,
    statusReason,
  };
}
