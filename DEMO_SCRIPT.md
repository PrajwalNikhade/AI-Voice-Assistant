# VoicePilot AI — 2-Minute Video Demonstration Script

**Product Demonstrated:** VoicePilot AI (Selling *ResumePilot AI*)  
**Demonstration Time:** ~2 Minutes  
**Recommended Browser:** Google Chrome (Desktop)

---

## Video Timeline & Spoken Script

### 0:00 – 0:20: Dashboard & Campaign Overview
* **Action on Screen:**
  - Open the deployed VoicePilot AI application at `/`.
  - Point out the clean SaaS layout, the active product banner (*Selling: ResumePilot AI*), and the calculated pipeline metrics (*Total Calls, Converted, Conversion %, Interested, Follow-up, Demo Requests*).
  - Note the system connectivity badges in the left sidebar (*Gemini Live AI: Configured*, *Storage Engine: Supabase Cloud / Local IndexedDB*).
* **Presenter Spoken Voiceover:**
  > *"Welcome to VoicePilot AI! In this demonstration, we are testing a real-time, browser-based AI voice sales assistant. Today, our AI agent Alex is conducting live sales conversations to pitch ResumePilot AI—an ATS resume builder with a free trial and a ₹199 monthly Pro plan. Let’s start a live voice call."*

---

### 0:20 – 0:45: Pre-Call Consent & Call Initialization
* **Action on Screen:**
  - Click the **"Start New Voice Call"** button.
  - The **Consent Dialog** appears. Highlight the disclosures:
    - Microphone permission
    - Google Gemini Live audio processing
    - Affirmative checkbox: Check the **"Save audio recording for demonstration & playback"** box.
  - Select language: Choose **English** (or switch to **Hindi / Marathi** to show multilingual capabilities).
  - Click **"Connect & Start Voice Call"**.
* **Presenter Spoken Voiceover:**
  > *"Before any audio is captured, the user is presented with a clear consent dialog explaining microphone usage and Gemini Live processing. We affirmatively check the recording consent box so both sides of our conversation are recorded into Web Audio. Let's start the call."*

---

### 0:45 – 1:20: Real-Time Bidirectional Conversation & Live Transcript
* **Action on Screen:**
  - The live connection connects to Gemini Live API via an ephemeral token.
  - Observe the **Live Audio Visualizer**:
    - When Alex speaks the opening greeting, the visualizer pulses with energetic indigo/violet waves and status badge indicates **"Speaking"**.
    - When customer speaks, status switches to **"Listening"** and visualizer ripples with emerald/cyan waves.
  - **Speaker Utterance 1 (Customer):**
    > *"Hi Alex, I'm a fresh college graduate applying for software developer jobs, but my resume is getting rejected by ATS scanners."*
  - **AI Spoken Audio Response:**
    Alex responds verbally through the speakers explaining how ResumePilot AI solves ATS rejections and tailors resumes in 1 click.
  - Point to the **Right Panel**: Show live transcript bubbles with timestamps and speaker tags (`Alex (Sales Rep)` and `Customer (You)`).
  - **Speaker Utterance 2 (Customer):**
    > *"How much does it cost, and do you have a free plan?"*
  - **AI Spoken Audio Response:**
    Alex explains the Free Plan (₹0 for 1 complete resume, zero credit card) and the Pro tier (₹199/month).
* **Presenter Spoken Voiceover:**
  > *"Notice how the Gemini Live API conducts continuous, low-latency audio turn-taking. The visualizer responds to genuine audio energy levels. Live transcript messages arrive chronologically with speaker labels."*

---

### 1:20 – 1:40: Free Trial Signup Flow (Demo Conversion)
* **Action on Screen:**
  - Click the **"Complete Demo Signup"** button.
  - Enter Customer Name (*"Priya Sharma"*) and Email (*"priya@example.com"*).
  - Click **"Confirm Demo Signup"**.
  - Confetti explodes on screen, and the button updates to **"Trial Activated (Converted)"**.
  - Say to Alex: *"I've just signed up for the free trial, thank you!"*
  - Alex warmly congratulates the customer and closes the conversation politely.
  - Click the red **"End Call & Generate Summary"** button.
* **Presenter Spoken Voiceover:**
  > *"When the customer agrees to try the free plan, we complete the in-app demo signup flow. This confirms the trial and qualifies the call for Converted status. Now, let’s end the call."*

---

### 1:40 – 2:05: Post-Call AI Summary, Sales Status & Recording Playback
* **Action on Screen:**
  - Immediately upon ending the call, the post-call summary panel appears:
    - **Sales Status Badge:** Shows `Converted` (Emerald).
    - **Reasoning:** Shows explainable rationale from Gemini.
    - **AI Summary:** Displays the 2-3 sentence overview of requirements (ATS scoring for fresh graduate).
  - Embedded **Audio Player**:
    - Click **Play**: Hear the recorded dual-channel conversation (both microphone and Alex's voice).
    - Show the progress bar and download button.
* **Presenter Spoken Voiceover:**
  > *"Within seconds, Gemini generates an automated post-call summary, extracts customer requirements and objections, and assigns the exact sales status based on strict precedence rules. Notice our audio player: it captured a complete two-sided recording with consent."*

---

### 2:05 – 2:20: Persistent Call History & Dashboard Verification
* **Action on Screen:**
  - Click **"Call History"** in the sidebar.
  - Show the newly recorded call in the history table.
  - Filter by **"Converted"**; search for *"Priya"*.
  - Click **"View Details"**: The comprehensive modal opens with full transcript, playback, and structured findings.
  - Return to **"Dashboard"**: Verify that the KPI cards (*Total Calls, Converted, Conversion Rate*) updated dynamically from the saved record!
* **Presenter Spoken Voiceover:**
  > *"All calls persist automatically into Supabase PostgreSQL and Storage, with local IndexedDB fallback. That concludes our 2-minute demonstration of VoicePilot AI!"*
