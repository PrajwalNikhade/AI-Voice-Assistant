
import { NextRequest, NextResponse } from "next/server";


import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { CallRecord } from "@/types";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ calls: [], message: "Supabase not configured" }, { status: 200 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ calls: [], message: "Supabase client unavailable" }, { status: 200 });
  }

  try {
    const { data, error } = await supabase
      .from("calls")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase select calls error:", error.message);
      return NextResponse.json({ calls: [], error: error.message }, { status: 200 });
    }

    // Map database snake_case columns to camelCase CallRecord and generate signed URLs for recordings
    const calls: CallRecord[] = await Promise.all(
      (data || []).map(async (row) => {
        let recordingUrl = "";
        if (row.recording_path) {
          try {
            const { data: signedData } = await supabase.storage
              .from("call-recordings")
              .createSignedUrl(row.recording_path, 3600); // 1 hour valid
            if (signedData?.signedUrl) {
              recordingUrl = signedData.signedUrl;
            }
          } catch {
            // ignore signed URL failure
          }
        }

        return {
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
      })
    );

    return NextResponse.json(calls);
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured on this server" },
      { status: 503 }
    );
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase client not initialized" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const callDataJson = formData.get("callData") as string;
    if (!callDataJson) {
      return NextResponse.json({ error: "Missing callData field" }, { status: 400 });
    }

    const callData: CallRecord = JSON.parse(callDataJson);
    const audioFile = formData.get("audio") as File | null;

    let recordingPath = "";
    let recordingUrl = "";

    // 1. Only process and upload audio if affirmative consent was granted
    if (callData.recordingConsent && audioFile) {
      const fileName = `${callData.id}.webm`;
      const arrayBuffer = await audioFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("call-recordings")
        .upload(fileName, buffer, {
          contentType: audioFile.type || callData.recordingMimeType || "audio/webm",
          upsert: true,
        });

      if (uploadError) {
        console.warn("[CallsAPI] Storage upload failed:", uploadError.message);
      } else if (uploadData?.path) {
        recordingPath = uploadData.path;
        console.log(`[CallsAPI] Audio uploaded to storage: ${recordingPath}`);
        const { data: signed } = await supabase.storage
          .from("call-recordings")
          .createSignedUrl(recordingPath, 3600);
        if (signed?.signedUrl) {
          recordingUrl = signed.signedUrl;
        }
      }
    }

    // 2. Preserve existing recording_path if this is an update and no new upload occurred
    if (!recordingPath && callData.recordingConsent && callData.recordingPath) {
      recordingPath = callData.recordingPath;
    } else if (!recordingPath && callData.id) {
      const { data: existingRow } = await supabase
        .from("calls")
        .select("recording_path")
        .eq("id", callData.id)
        .maybeSingle();
      if (existingRow?.recording_path) {
        recordingPath = existingRow.recording_path;
      }
    }

    // If recording consent is explicitly false, recording_path must remain empty
    if (!callData.recordingConsent) {
      recordingPath = "";
      recordingUrl = "";
    }

    // Insert or update calls table
    const dbPayload = {
      id: callData.id,
      created_at: callData.createdAt || new Date().toISOString(),
      started_at: callData.startedAt || new Date().toISOString(),
      ended_at: callData.endedAt || new Date().toISOString(),
      duration_seconds: callData.durationSeconds || 0,
      contact_name: callData.contactName || null,
      contact_email: callData.contactEmail || null,
      language: callData.language || "en",
      sales_status: callData.salesStatus,
      status_reason: callData.statusReason || "",
      summary: callData.summary || "",
      customer_requirements: callData.customerRequirements || [],
      pain_points: callData.painPoints || [],
      objections: callData.objections || [],
      questions_asked: callData.questionsAsked || [],
      next_steps: callData.nextSteps || [],
      demo_requested: Boolean(callData.demoRequested),
      trial_signup_completed: Boolean(callData.trialSignupCompleted),
      transcript: callData.transcript || [],
      recording_path: recordingPath || null,
      recording_mime_type: callData.recordingMimeType || "audio/webm",
      recording_consent: Boolean(callData.recordingConsent),
      recording_consent_at: callData.recordingConsent
        ? callData.recordingConsentAt || new Date().toISOString()
        : null,
    };

    const { error: dbError } = await supabase
      .from("calls")
      .upsert(dbPayload, { onConflict: "id" });

    if (dbError) {
      console.error("[CallsAPI] Supabase upsert calls error:", dbError.message);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    const savedRecord: CallRecord = {
      ...callData,
      recordingPath: recordingPath || undefined,
      recordingUrl: recordingUrl || (recordingPath ? callData.recordingUrl : undefined),
      recordingConsent: Boolean(callData.recordingConsent),
      storageProvider: "supabase",
    };

    return NextResponse.json(savedRecord);
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Save call API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
