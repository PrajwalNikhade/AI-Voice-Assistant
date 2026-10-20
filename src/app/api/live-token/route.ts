import { NextResponse } from "next/server";
import { createLiveToken } from "@/lib/gemini";

export async function POST() {
  try {
    const tokenInfo = await createLiveToken();
    return NextResponse.json(tokenInfo);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Live token generation error:", err.message);
    return NextResponse.json(
      {
        error: "Failed to generate live session token",
        details: err.message,
        suggestion:
          "Ensure GEMINI_API_KEY is configured in .env.local and that your Google AI Studio project has Gemini Live API enabled.",
      },
      { status: 500 }
    );
  }
}
