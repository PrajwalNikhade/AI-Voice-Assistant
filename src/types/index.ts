export type SalesStatus =
  | "Converted"
  | "Interested"
  | "Follow-up Required"
  | "Not Interested"
  | "Demo Requested"
  | "No Response";

export type Language = "en" | "hi" | "mr";

export interface TranscriptMessage {
  id: string;
  speaker: "ai" | "customer";
  text: string;
  timestamp: string; // ISO or HH:MM:SS
  isFinal?: boolean;
}

export interface AISummary {
  summary: string;
  customerRequirements: string[];
  painPoints: string[];
  objections: string[];
  interestLevel: "high" | "medium" | "low" | "unknown";
  questionsAsked: string[];
  nextSteps: string[];
  demoRequested: boolean;
  trialSignupCompleted: boolean;
  salesStatus: SalesStatus;
  statusReason: string;
}

export interface CallRecord {
  id: string;
  createdAt: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  contactName?: string;
  contactEmail?: string;
  language: Language;
  salesStatus: SalesStatus;
  statusReason: string;
  summary: string;
  customerRequirements: string[];
  painPoints: string[];
  objections: string[];
  questionsAsked?: string[];
  nextSteps: string[];
  demoRequested?: boolean;
  trialSignupCompleted?: boolean;
  transcript: TranscriptMessage[];
  recordingPath?: string;
  recordingUrl?: string; // signed url or object URL
  recordingMimeType?: string;
  recordingConsent: boolean;
  recordingConsentAt?: string;
  storageProvider: "supabase" | "indexeddb";
}

export interface EphemeralTokenResponse {
  token: string;
  expireTime: string;
  model: string;
  voiceName: string;
}

export interface SystemStatus {
  hasGeminiKey: boolean;
  hasSupabase: boolean;
  geminiLiveModel: string;
  geminiTextModel: string;
  supabaseUrl?: string;
}
