import { NextResponse } from "next/server";
import { getGeminiApiKey, getGeminiLiveModel, getGeminiTextModel } from "@/lib/gemini";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function GET() {
  const hasGeminiKey = Boolean(getGeminiApiKey());
  const hasSupabase = isSupabaseConfigured();
  const geminiLiveModel = getGeminiLiveModel();
  const geminiTextModel = getGeminiTextModel();

  return NextResponse.json({
    hasGeminiKey,
    hasSupabase,
    geminiLiveModel,
    geminiTextModel,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
  });
}
