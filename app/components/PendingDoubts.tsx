"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth-context";
import { apiGetMyDoubts, type Doubt } from "../../lib/api";

function timeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (d >= 1) return `${d}d left`;
  return `${h}h left`;
}

function isUrgent(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() - Date.now() < 24 * 3_600_000;
}

function statusLabel(doubt: Doubt): string {
  switch (doubt.status) {
    case "OPEN": return "Awaiting matching tutor";
    case "BOOKED": return doubt.tutor_id ? "Matched — session booked" : "Booked";
    case "SESSION_COMPLETED_PENDING_CONFIRMATION": return "Session done — awaiting confirmation";
    case "SOLVED": return "Solved";
    case "EXPIRED": return "Expired";
    case "WITHDRAWN": return "Withdrawn";
    default: return doubt.status;
  }
}

export default function PendingDoubts() {
  const { token } = useAuth();
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiGetMyDoubts(token)
      .then((data) => {
        // Show only active doubts on dashboard
        setDoubts(data.filter((d: Doubt) => ["OPEN", "BOOKED", "SESSION_COMPLETED_PENDING_CONFIRMATION"].includes(d.status)));
      })
      .catch((e) => setError(e.message ?? "Failed to load doubts"))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <section className="card space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ color: "var(--color-secondary)" }}
          >
            help_center
          </span>
          <h2
            style={{
              color: "var(--color-primary)",
              fontFamily: "var(--font-newsreader)",
              fontSize: 20,
              fontWeight: 500,
              margin: 0,
            }}
          >
            Pending Doubts
          </h2>
        </div>
        <Link
          href="/doubts"
          className="btn-primary self-start sm:self-auto"
          style={{ textDecoration: "none" }}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Ask a new doubt
        </Link>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ padding: "1.5rem 0", textAlign: "center", color: "var(--color-on-surface-variant)", fontFamily: "var(--font-jakarta)", fontSize: 13 }}>
          <span className="material-symbols-outlined text-[18px]" style={{ display: "block", margin: "0 auto 8px" }}>progress_activity</span>
          Loading your doubts…
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius)", backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)", fontFamily: "var(--font-jakarta)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && doubts.length === 0 && (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--color-surface-container-low)",
          }}
        >
          <span className="material-symbols-outlined text-[32px]" style={{ color: "var(--color-outline)", display: "block", margin: "0 auto 8px" }}>help_outline</span>
          <p style={{ color: "var(--color-on-surface-variant)", fontFamily: "var(--font-jakarta)", fontSize: 13, margin: "0 0 12px 0" }}>
            No active doubts right now. Ask your first doubt to match with a peer tutor!
          </p>
          <Link href="/doubts" className="btn-secondary" style={{ display: "inline-flex", textDecoration: "none" }}>
            <span className="material-symbols-outlined text-[16px]">add</span>
            Ask Doubt
          </Link>
        </div>
      )}

      {/* Doubts list */}
      {!loading && doubts.length > 0 && (
        <div className="flex flex-col gap-3">
          {doubts.map((d) => {
            const tags =
              d.tags
                ?.map((t: any) =>
                  typeof t === "string" ? t : t.name || t.skill?.name || ""
                )
                .filter(Boolean) ?? [];
            const urgent = isUrgent(d.expires_at);
            const left = timeLeft(d.expires_at);
            const isBooked =
              d.status === "BOOKED" ||
              d.status === "SESSION_COMPLETED_PENDING_CONFIRMATION";
            return (
              <div
                key={d.id}
                className="rounded-xl p-4 flex flex-col gap-3 transition-colors"
                style={{ backgroundColor: "var(--color-surface-container-low)" }}
                onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.backgroundColor =
                  "var(--color-surface-container)")
                }
                onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.backgroundColor =
                  "var(--color-surface-container-low)")
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    {/* Tags + time */}
                    <div className="flex flex-wrap items-center gap-2">
                      {tags.map((tag) => (
                        <span key={tag} className="chip-subject">
                          #{tag}
                        </span>
                      ))}
                      {urgent ? (
                        <span className="chip-urgent">
                          <span className="material-symbols-outlined text-[13px]">
                            schedule
                          </span>
                          {left}
                        </span>
                      ) : (
                        <span className="chip-neutral">
                          <span
                            className="material-symbols-outlined text-[13px]"
                            style={{ marginRight: 2 }}
                          >
                            event_available
                          </span>
                          {left}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3
                      style={{
                        color: "var(--color-on-surface)",
                        fontFamily: "var(--font-jakarta)",
                        fontSize: 15,
                        fontWeight: 600,
                        margin: 0,
                      }}
                    >
                      {d.title}
                    </h3>

                    {/* Status */}
                    <p
                      className="flex items-center gap-1.5"
                      style={{
                        color: "var(--color-on-surface-variant)",
                        margin: 0,
                        fontSize: 13,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: isBooked
                            ? "var(--color-primary-container)"
                            : "var(--color-secondary)",
                        }}
                      />
                      Status:{" "}
                      <span
                        style={{
                          color: isBooked
                            ? "var(--color-primary-container)"
                            : "var(--color-on-surface)",
                          fontWeight: 600,
                          fontFamily: "var(--font-jakarta)",
                        }}
                      >
                        {statusLabel(d)}
                      </span>
                    </p>
                  </div>

                  {/* Right actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {isBooked ? (
                      <>
                        <Link
                          href="/doubts"
                          className="btn-teal"
                          style={{ textDecoration: "none" }}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            forum
                          </span>
                          Open session
                        </Link>
                        <span
                          style={{
                            color: "var(--color-on-surface-variant)",
                            fontSize: 11,
                          }}
                        >
                          Active
                        </span>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/doubts"
                          style={{
                            color: "var(--color-secondary)",
                            fontSize: 13,
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          View details
                          <span className="material-symbols-outlined text-[16px]">
                            chevron_right
                          </span>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info note */}
      <div
        className="p-3 rounded-lg flex items-center gap-3"
        style={{ backgroundColor: "var(--color-surface-container)" }}
      >
        <span className="material-symbols-outlined text-[18px] flex-shrink-0" style={{ color: "var(--color-outline)" }}>
          info
        </span>
        <p style={{ color: "var(--color-on-surface-variant)", fontSize: 12, margin: 0, fontFamily: "var(--font-jakarta)" }}>
          Doubts automatically expire if unbooked to keep queues active and fresh.
        </p>
      </div>
    </section>
  );
}
