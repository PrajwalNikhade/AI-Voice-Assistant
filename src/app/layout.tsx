import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "VoicePilot AI — Real-time AI Voice Sales Assistant",
  description:
    "Interactive real-time voice sales agent powered by Google Gemini Live API selling ResumePilot AI with live transcription, dual-channel recording, and automatic sales classification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex antialiased">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
