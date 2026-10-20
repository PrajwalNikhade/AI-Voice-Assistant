import { NextRequest, NextResponse } from "next/server";
import { analyzeCallTranscript } from "@/lib/gemini";
import { TranscriptMessage, Language } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const transcript: TranscriptMessage[] = body.transcript || [];
    const trialSignupCompleted: boolean = Boolean(body.trialSignupCompleted);
    const language: Language = body.language || "en";

    const summary = await analyzeCallTranscript(
      transcript,
      trialSignupCompleted,
      language
    );

    return NextResponse.json(summary);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Call analysis error:", err);
    return NextResponse.json(
      {
        error: "Failed to analyze call",
        details: err.message,
      },
      { status: 500 }
    );
  }
}
