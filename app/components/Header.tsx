"use client";

import { useState } from "react";
import Link from "next/link";

export default function Header() {
  const [mode, setMode] = useState<"student" | "tutor">("student");

  return (
    <>

      <header
        className="fixed top-0 left-0 right-0 h-16 z-50 flex items-center justify-between px-7"
        style={{
          backgroundColor: "rgba(251,249,244,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
        }}
      >
        {/* ── Left: Logo + breadcrumb ─────────────────────────────── */}
        <div className="flex items-center gap-4 min-w-[260px]">
          <Link href="/" className="flex items-center gap-2">
            {/* Monogram mark */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "var(--color-primary-container)" }}
            >
              <span
                className="font-label-eyebrow text-[13px] font-bold"
                style={{ color: "var(--color-on-primary)", fontFamily: "var(--font-newsreader)", letterSpacing: 0 }}
              >
                PL
              </span>
            </div>
            <span
              className="font-headline-sm tracking-tight"
              style={{ color: "var(--color-primary)", fontFamily: "var(--font-newsreader)", fontSize: 20, fontWeight: 500 }}
            >
              PeerLearn
            </span>
          </Link>

          {/* Breadcrumb — hidden on small screens */}
          <div
            className="hidden xl:flex items-center gap-2 pl-2"
            style={{ color: "var(--color-on-surface-variant)", fontSize: 12, fontFamily: "var(--font-jakarta)" }}
          >
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "var(--color-outline-variant)" }} />
            <span className="truncate max-w-[220px]">IIIT · CSE</span>
          </div>
        </div>

        {/* ── Right: Mode toggle + notifications + avatar ─────────── */}
        <div className="flex items-center gap-4">
          {/* Student / Tutor segmented control */}
          <div
            className="p-1.5 rounded-full flex items-center gap-1"
            style={{ backgroundColor: "var(--color-surface-container)", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
          >
            {(["student", "tutor"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="min-w-[108px] px-5 py-2 rounded-full transition-all text-sm font-semibold capitalize"
                style={{
                  backgroundColor: mode === m ? "var(--color-primary-container)" : "transparent",
                  color: mode === m ? "var(--color-on-primary)" : "var(--color-on-surface-variant)",
                  boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                  fontFamily: "var(--font-jakarta)",
                }}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {/* Notifications bell */}
          <button
            className="relative p-2 rounded-lg transition-colors"
            style={{ color: "var(--color-on-surface-variant)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-container-high)";
              (e.currentTarget as HTMLElement).style.color = "var(--color-on-surface)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--color-on-surface-variant)";
            }}
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {/* Unread dot */}
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ backgroundColor: "var(--color-secondary)" }}
            />
          </button>

          {/* User info + avatar */}
          <div className="flex items-center gap-3 pl-1">
            <div className="hidden sm:flex flex-col text-right">
              <span
                className="font-title-sm leading-tight"
                style={{ color: "var(--color-on-surface)", fontSize: 13, fontFamily: "var(--font-jakarta)", fontWeight: 600 }}
              >
                Vamsi Adithya
              </span>
              <span
                className="font-label-sm"
                style={{ color: "var(--color-on-surface-variant)", fontSize: 11 }}
              >
                25BCS270
              </span>
            </div>
            {/* Avatar placeholder */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{
                backgroundColor: "var(--color-primary-container)",
                color: "var(--color-on-primary)",
                fontFamily: "var(--font-jakarta)",
              }}
            >
              VA
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
