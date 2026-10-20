import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { CallRecord } from "@/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 404 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase client unavailable" }, { status: 500 });
  }

  try {
    const { data: row, error } = await supabase
      .from("calls")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !row) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    let recordingUrl = "";
    if (row.recording_path) {
      const { data: signedData } = await supabase.storage
        .from("call-recordings")
        .createSignedUrl(row.recording_path, 3600);
      if (signedData?.signedUrl) {
        recordingUrl = signedData.signedUrl;
      }
    }

    const call: CallRecord = {
      id: row.id,
      createdAt: row.created_at,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      durationSeconds: row.duration_seconds || 0,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      language: row.language,
      salesStatus: row.sales_status,
      statusReason: row.status_reason || "",
      summary: row.summary || "",
      customerRequirements: row.customer_requirements || [],
      painPoints: row.pain_points || [],
      objections: row.objections || [],
      questionsAsked: row.questions_asked || [],
      nextSteps: row.next_steps || [],
      demoRequested: Boolean(row.demo_requested),
      trialSignupCompleted: Boolean(row.trial_signup_completed),
      transcript: row.transcript || [],
      recordingPath: row.recording_path,
      recordingUrl,
      recordingMimeType: row.recording_mime_type,
      recordingConsent: Boolean(row.recording_consent),
      recordingConsentAt: row.recording_consent_at,
      storageProvider: "supabase",
    };

    return NextResponse.json(call);
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true, message: "Local delete handled by client" });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase unavailable" }, { status: 500 });
  }

  try {
    // Delete recording file from storage if present
    const { data: row } = await supabase.from("calls").select("recording_path").eq("id", id).single();
    if (row?.recording_path) {
      await supabase.storage.from("call-recordings").remove([row.recording_path]);
    }

    const { error } = await supabase.from("calls").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
