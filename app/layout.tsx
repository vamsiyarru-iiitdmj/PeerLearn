import type { Metadata } from "next";
import "./globals.css";
import type { ReactNode } from "react";
import { AuthProvider } from "../lib/auth-context";

export const metadata: Metadata = {
  title: "PeerLearn – Academic Peer Tutoring Network",
  description:
    "A high-trust peer tutoring and knowledge exchange platform for students and tutors at IIIT.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="min-h-screen" style={{ fontFamily: "var(--font-jakarta)" }}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
