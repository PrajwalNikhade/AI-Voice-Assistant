# VoicePilot AI — Real-Time Voice Sales Bot

**VoicePilot AI** is an interactive, browser-based voice sales workspace that conducts real-time bidirectional AI voice conversations with prospective customers. The bot acts as **"Alex"**, a professional AI sales advisor pitching **ResumePilot AI** (an ATS resume builder SaaS featuring a Free Plan and a ₹199/month Pro tier).

Built with **Next.js App Router**, **TypeScript**, **Tailwind CSS**, the **official Google GenAI SDK (`@google/genai`)**, **Web Audio API mixing**, and **Supabase PostgreSQL & Storage** (with automatic zero-config **IndexedDB** local fallback).

---

## Key Features

- **Genuine Bidirectional AI Voice Streaming:** Powered by Google Gemini Live API via short-lived ephemeral authentication tokens (`POST /api/live-token`). Server API keys are **never** exposed to the browser.
- **Multilingual Support:** English (default), Hindi (हिन्दी / Hinglish), and Marathi (मराठी) with conversational turn-taking.
- **Real-Time Visualizer:** Live canvas-driven frequency and audio energy wave animations driven by actual microphone and AI speech amplitude.
- **Affirmative Recording Consent & Two-Channel Audio:** Captures both sides of the conversation (customer mic + Gemini speech) mixed via Web Audio `MediaStreamDestination` into playable `.webm` audio.
- **AI Post-Call Summary & Sales Classification:** Analyzes transcript using Gemini text models into structured JSON with 6 exact sales statuses (`Converted`, `Interested`, `Follow-up Required`, `Not Interested`, `Demo Requested`, `No Response`) following strict precedence and explainable reasoning.
- **Free-Trial Demo Signup Flow:** In-app conversion modal with confirmation and confetti that updates status to `Converted`.
- **Persistent Call History & Dashboard:** Real calculated metrics, search and status filter tabs, full transcripts with timestamps, and audio playback.
- **Dual Storage Engine:** Automatically saves to Supabase PostgreSQL & Storage when configured, or browser IndexedDB when running locally without cloud credentials.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling & Icons** | Tailwind CSS, Lucide React, Glassmorphism design tokens |
| **Live Voice AI** | Google Gemini Live API (`gemini-2.5-flash-native-audio-preview-12-2025` / `gemini-3.8-live`) |
| **Post-Call Analysis** | Google Gemini Text Generation (`gemini-2.5-flash` / `gemini-3.5-flash-lite`) |
| **SDK** | Official `@google/genai` (v2.30+) |
| **Audio Pipeline** | Web Audio API (`AudioContext`, `MediaStreamAudioDestinationNode`, `MediaRecorder`, `AnalyserNode`) |
| **Cloud Database & Storage** | Supabase PostgreSQL + Private Storage Bucket (`call-recordings`) |
| **Local Fallback Storage** | Browser IndexedDB (`idb`) |
| **Deployment** | Vercel (Edge/Serverless Node.js) |

---

## Step-by-Step Setup Guide

Follow these 10 steps to run VoicePilot AI locally or deploy it to Vercel.

### Step 1: Install Dependencies and Run Locally

Clone or open the project folder in your terminal:

```bash
cd "d:/AI Assistant"
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in **Google Chrome**.  
*Note:* The app is fully runnable out of the box. Even without Supabase, the app will store calls and audio recordings in local **IndexedDB**!

---

### Step 2: Obtain a Gemini API Key

1. Visit Google AI Studio: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click **"Create API key"** and select a project.
4. Copy the generated API key.
   > **Note on Free Tier:** Google AI Studio offers a free tier for developers with generous rate limits, subject to account eligibility and model availability.

---

### Step 3: Add Gemini Key to `.env.local`

Create or edit `.env.local` in the project root:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_LIVE_MODEL=gemini-2.5-flash-native-audio-preview-12-2025
GEMINI_TEXT_MODEL=gemini-2.5-flash
```

---

### Step 4: Create a Free Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and sign in or create a free account.
2. Click **"New project"**.
3. Enter a project name (e.g., `voicepilot-sales`), choose a database password, and select your nearest region.
4. Click **"Create new project"** and wait about 1-2 minutes for provisioning.

---

### Step 5: Retrieve Supabase URL and Keys

1. In your Supabase project dashboard, navigate to **Project Settings** (gear icon) > **API**.
2. Find:
   - **Project URL:** Copy the URL (e.g. `https://xyzcompany.supabase.co`).
   - **Project API Keys (`anon` / public):** Copy the `anon` `public` key.
   - **Project API Keys (`service_role` / secret):** Copy the `service_role` key (keep this server-side only).
3. Add these to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

---

### Step 6: Run Database SQL Setup Script

1. In your Supabase dashboard, click **SQL Editor** from the left navigation.
2. Open the file [`supabase/schema.sql`](file:///d:/AI%20Assistant/supabase/schema.sql) in this repository or paste the following SQL:

```sql
-- 1. Create calls table
CREATE TABLE IF NOT EXISTS public.calls (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  contact_name TEXT,
  contact_email TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  sales_status TEXT NOT NULL CHECK (
    sales_status IN (
      'Converted',
      'Interested',
      'Follow-up Required',
      'Not Interested',
      'Demo Requested',
      'No Response'
    )
  ),
  status_reason TEXT,
  summary TEXT,
  customer_requirements JSONB DEFAULT '[]'::jsonb,
  pain_points JSONB DEFAULT '[]'::jsonb,
  objections JSONB DEFAULT '[]'::jsonb,
  questions_asked JSONB DEFAULT '[]'::jsonb,
  next_steps JSONB DEFAULT '[]'::jsonb,
  demo_requested BOOLEAN DEFAULT false,
  trial_signup_completed BOOLEAN DEFAULT false,
  transcript JSONB DEFAULT '[]'::jsonb,
  recording_path TEXT,
  recording_mime_type TEXT DEFAULT 'audio/webm',
  recording_consent BOOLEAN DEFAULT false,
  recording_consent_at TIMESTAMPTZ
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON public.calls (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_sales_status ON public.calls (sales_status);

-- 3. Row Level Security Policies
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of calls" 
  ON public.calls FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert of calls" 
  ON public.calls FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public update of calls" 
  ON public.calls FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Allow public delete of calls" 
  ON public.calls FOR DELETE TO anon, authenticated USING (true);
```

3. Click **"Run"** to execute the migration.

---

### Step 7: Configure Private Recording-Storage Bucket

In the same Supabase SQL Editor, run the storage bucket creation script:

```sql
-- Create private storage bucket for call audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('call-recordings', 'call-recordings', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Policies for call-recordings bucket
CREATE POLICY "Allow uploads to call-recordings"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'call-recordings');

CREATE POLICY "Allow reads from call-recordings"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'call-recordings');

CREATE POLICY "Allow delete from call-recordings"
  ON storage.objects FOR DELETE TO anon, authenticated
  USING (bucket_id = 'call-recordings');
```

---

### Step 8: Deploy to Vercel

1. Push your repository to GitHub.
2. Go to [https://vercel.com/new](https://vercel.com/new).
3. Import your GitHub repository.
4. Select **Next.js** as the framework preset (automatically detected).

---

### Step 9: Configure Vercel Environment Variables

In the Vercel deployment setup screen under **Environment Variables**, add:

| Variable Name | Description | Example / Value |
|---|---|---|
| `GEMINI_API_KEY` | Server-side Gemini API key (**Do not expose in public!**) | `AIzaSy...` |
| `GEMINI_LIVE_MODEL` | Live audio streaming model | `gemini-2.5-flash-native-audio-preview-12-2025` |
| `GEMINI_TEXT_MODEL` | Text analysis model for summaries | `gemini-2.5-flash` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xyzcompany.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous public key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role secret key | `eyJhbGciOi...` |

Click **Deploy**.

---

### Step 10: Test Deployed Application in Google Chrome

1. Open your Vercel deployment URL (e.g. `https://voicepilot-sales.vercel.app`).
2. Navigate to **"Live Voice Agent"** (`/agent`).
3. Click **"Start Voice Call"**.
4. Review disclosures in the **Consent Dialog** and check **"Save audio recording"**.
5. Allow microphone permissions in Chrome.
6. Alex will greet you warmly in your chosen language.
7. Speak and verify:
   - Voice responses from Alex play clearly through your speakers.
   - Real-time animated waveform reacts to your speech and Alex's voice.
   - Live transcript bubbles appear chronologically with speaker labels.
8. Click **"Complete Demo Signup"** to activate the free trial.
9. Click **"End Call & Generate Summary"**.
10. Verify that the call summary, sales status (`Converted`), and recorded audio playback appear immediately and persist into **Call History** and **Dashboard** metrics!

---

## Sales Status Classification Logic

VoicePilot AI classifies every conversation into one of **six exact statuses**:

| Status | Condition & Precedence |
|---|---|
| **Converted** | Customer agreed to the free trial **and** completed the demo signup form. (Strict: Never assigned on verbal interest alone without signup completion). |
| **Demo Requested** | Customer explicitly requested a live walkthrough or product demo. |
| **Follow-up Required** | Customer asked to be contacted later, needs more time, or wants to consult someone else. |
| **Not Interested** | Customer explicitly declined the product or indicated no current interest. |
| **Interested** | Customer engaged constructively and showed positive buying interest without completing signup or scheduling a demo. |
| **No Response** | Customer provided no usable response or the call ended prematurely. |

---

## Security & Privacy Disclosures

- **Key Isolation:** `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` reside exclusively in server-side API routes and are **never** bundled into client-side JavaScript.
- **Ephemeral Session Tokens:** Direct browser-to-Gemini WebSocket connections utilize temporary, single-use, constrained authentication tokens with short lifespans generated via `POST /api/live-token`.
- **Affirmative Recording Consent:** Audio recording starts **only** when the user affirmatively checks the recording consent box. If consent is declined, no audio is recorded or stored.
- **Demonstration Scope:** This application is built as an assignment demonstration. For production deployment handling sensitive enterprise customer conversations, implement end-user OAuth authentication, role-based access control, and strict data retention policies.

---

## Troubleshooting Guide

| Issue | Cause & Fix |
|---|---|
| **Microphone Permission Denied** | In Google Chrome, click the tune/padlock icon next to the URL bar > **Site settings** > Set **Microphone** to **Allow**. Reload the page. |
| **"Unable to generate live session token"** | Verify that `GEMINI_API_KEY` is present in `.env.local` or Vercel environment variables without extra spaces or quotes. |
| **Gemini Live WebSocket Closes Prematurely** | Ensure your Google AI Studio account has quota available. Check that `GEMINI_LIVE_MODEL` is set to an active model (default: `gemini-2.5-flash-native-audio-preview-12-2025`). |
| **Supabase Not Persisting / Calls in IndexedDB** | If Supabase credentials are missing or invalid, the app gracefully falls back to browser IndexedDB. To enable cloud persistence, complete Steps 4 through 7. |
| **No Audio Heard from AI** | In Chrome, ensure the browser tab is not muted and that the output audio device is properly set in OS settings. |

---

## Video Script

A complete 2-minute video walkthrough script is included in [`DEMO_SCRIPT.md`](file:///d:/AI%20Assistant/DEMO_SCRIPT.md).
