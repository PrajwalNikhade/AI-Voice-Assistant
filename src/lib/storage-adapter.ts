import { openDB, DBSchema } from "idb";
import { CallRecord } from "@/types";

interface VoiceBotDB extends DBSchema {
  calls: {
    key: string;
    value: CallRecord;
    indexes: { "by-created": string; "by-status": string };
  };
  recordings: {
    key: string;
    value: { id: string; blob: Blob; mimeType: string };
  };
}

const DB_NAME = "VoicePilotSalesDB";
const DB_VERSION = 1;

async function getDB() {
  if (typeof window === "undefined") return null;
  return openDB<VoiceBotDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("calls")) {
        const store = db.createObjectStore("calls", { keyPath: "id" });
        store.createIndex("by-created", "createdAt");
        store.createIndex("by-status", "salesStatus");
      }
      if (!db.objectStoreNames.contains("recordings")) {
        db.createObjectStore("recordings", { keyPath: "id" });
      }
    },
  });
}

/**
 * Checks whether the server has Supabase configured
 */
export async function checkServerStorageStatus(): Promise<{
  supabaseConfigured: boolean;
  geminiKeyConfigured: boolean;
}> {
  try {
    const res = await fetch("/api/status");
    if (!res.ok) throw new Error("Status endpoint failed");
    const data = await res.json();
    return {
      supabaseConfigured: Boolean(data.hasSupabase),
      geminiKeyConfigured: Boolean(data.hasGeminiKey),
    };
  } catch {
    return { supabaseConfigured: false, geminiKeyConfigured: false };
  }
}

/**
 * Saves a call record and optional audio recording.
 * Tries server Supabase persistence first; falls back seamlessly to IndexedDB.
 */
export async function persistCall(
  callData: Omit<CallRecord, "storageProvider">,
  audioBlob?: Blob | null
): Promise<CallRecord> {
  const { supabaseConfigured } = await checkServerStorageStatus();

  if (supabaseConfigured) {
    try {
      const formData = new FormData();
      formData.append("callData", JSON.stringify(callData));
      if (audioBlob) {
        formData.append("audio", audioBlob, `recording_${callData.id}.webm`);
      }

      const res = await fetch("/api/calls", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const saved: CallRecord = await res.json();
        // Also cache recording in local IndexedDB as resilient backup
        if (audioBlob) {
          const db = await getDB();
          if (db) {
            await db.put("recordings", {
              id: callData.id,
              blob: audioBlob,
              mimeType: callData.recordingMimeType || audioBlob.type || "audio/webm",
            });
            if (!saved.recordingUrl) {
              saved.recordingUrl = URL.createObjectURL(audioBlob);
            }
          }
        }
        return saved;
      }
      console.warn("[StorageAdapter] Server call persistence returned error, falling back to local DB");
    } catch (err) {
      console.warn("[StorageAdapter] Server call persistence failed, using local IndexedDB:", err);
    }
  }

  // Local IndexedDB persistence
  const db = await getDB();
  const localRecord: CallRecord = {
    ...callData,
    storageProvider: "indexeddb",
  };

  if (audioBlob && db) {
    await db.put("recordings", {
      id: callData.id,
      blob: audioBlob,
      mimeType: callData.recordingMimeType || audioBlob.type || "audio/webm",
    });
    // Create local object URL for playback
    localRecord.recordingUrl = URL.createObjectURL(audioBlob);
  }

  if (db) {
    await db.put("calls", localRecord);
  }

  return localRecord;
}

/**
 * Retrieves all call records.
 * If server has Supabase configured, fetches from /api/calls.
 * Also merges or falls back to local IndexedDB.
 */
export async function fetchAllCalls(): Promise<CallRecord[]> {
  let serverCalls: CallRecord[] = [];
  const { supabaseConfigured } = await checkServerStorageStatus();

  if (supabaseConfigured) {
    try {
      const res = await fetch("/api/calls");
      if (res.ok) {
        serverCalls = await res.json();
      }
    } catch (err) {
      console.warn("Failed fetching calls from server API:", err);
    }
  }

  // Also fetch local IndexedDB calls
  let localCalls: CallRecord[] = [];
  const db = await getDB();
  if (db) {
    try {
      const items = await db.getAllFromIndex("calls", "by-created");
      // Hydrate audio URLs from local blob store
      for (const item of items) {
        if (!item.recordingUrl) {
          const rec = await db.get("recordings", item.id);
          if (rec?.blob) {
            item.recordingUrl = URL.createObjectURL(rec.blob);
          }
        }
      }
      localCalls = items.reverse(); // latest first
    } catch (e) {
      console.warn("IndexedDB read error:", e);
    }
  }

  // Merge and deduplicate by id (server wins if present)
  const map = new Map<string, CallRecord>();
  for (const c of localCalls) map.set(c.id, c);
  for (const c of serverCalls) map.set(c.id, c);

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Retrieves a single call by ID
 */
export async function fetchCallById(id: string): Promise<CallRecord | null> {
  // Check server
  try {
    const res = await fetch(`/api/calls/${id}`);
    if (res.ok) {
      const call = await res.json();
      return call;
    }
  } catch {
    // continue to local
  }

  const db = await getDB();
  if (!db) return null;

  const item = await db.get("calls", id);
  if (!item) return null;

  if (!item.recordingUrl) {
    const rec = await db.get("recordings", id);
    if (rec?.blob) {
      item.recordingUrl = URL.createObjectURL(rec.blob);
    }
  }
  return item;
}

/**
 * Deletes a call record
 */
export async function deleteCallRecord(id: string): Promise<boolean> {
  const db = await getDB();
  if (db) {
    await db.delete("calls", id);
    await db.delete("recordings", id);
  }

  try {
    await fetch(`/api/calls/${id}`, { method: "DELETE" });
  } catch {
    // Ignore server error on local delete
  }

  return true;
}
