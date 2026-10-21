"use client";

import { useState } from "react";

interface Doubt {
  id: string;
  subject: string;
  title: string;
  status: "awaiting" | "matched";
  statusLabel: string;
  matchedWith?: string;
  timeLeft: string;
  urgent: boolean;
}

const initialDoubts: Doubt[] = [
  {
    id: "1",
    subject: "#C++",
    title: "Pointers in C vs Reference types",
    status: "awaiting",
    statusLabel: "Awaiting matching tutor",
    timeLeft: "18h left",
    urgent: true,
  },
  {
    id: "2",
    subject: "#Maths",
    title: "Eigenvalues intuition & transformation matrix",
    status: "matched",
    statusLabel: "Matched with Dev (Year 3)",
    matchedWith: "Dev (Year 3)",
    timeLeft: "2d left",
    urgent: false,
  },
];

export default function PendingDoubts() {
  const [doubts] = useState(initialDoubts);

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
            className="font-headline-sm"
            style={{ color: "var(--color-primary)", fontFamily: "var(--font-newsreader)", fontSize: 20, fontWeight: 500 }}
          >
            Pending Doubts
          </h2>
        </div>
        <button className="btn-primary self-start sm:self-auto">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Ask a new doubt
        </button>
      </div>

      {/* Doubts list */}
      <div className="flex flex-col gap-3">
        {doubts.map((d) => (
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
                {/* Tags row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip-subject">{d.subject}</span>
                  {d.urgent ? (
                    <span className="chip-urgent">
                      <span className="material-symbols-outlined text-[13px]">schedule</span>
                      {d.timeLeft}
                    </span>
                  ) : (
                    <span className="chip-neutral">
                      <span className="material-symbols-outlined text-[13px]" style={{ marginRight: 2 }}>event_available</span>
                      {d.timeLeft}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3
                  className="font-title-md pt-0.5"
                  style={{ color: "var(--color-on-surface)", fontFamily: "var(--font-jakarta)", fontSize: 15, fontWeight: 600 }}
                >
                  {d.title}
                </h3>

                {/* Status */}
                <p className="font-body-sm flex items-center gap-1.5" style={{ color: "var(--color-on-surface-variant)" }}>
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor:
                        d.status === "matched"
                          ? "var(--color-primary-container)"
                          : "var(--color-secondary)",
                    }}
                  />
                  Status:{" "}
                  <span
                    className="font-title-sm"
                    style={{
                      color:
                        d.status === "matched"
                          ? "var(--color-primary-container)"
                          : "var(--color-on-surface)",
                      fontWeight: 600,
                    }}
                  >
                    {d.statusLabel}
                  </span>
                </p>
              </div>

              {/* Right actions */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {d.status === "matched" ? (
                  <>
                    <button className="btn-teal">
                      <span className="material-symbols-outlined text-[16px]">forum</span>
                      Open session
                    </button>
                    <span
                      className="font-label-sm"
                      style={{ color: "var(--color-on-surface-variant)", fontSize: 11 }}
                    >
                      Scheduled today
                    </span>
                  </>
                ) : (
                  <>
                    <button
                      className="font-title-sm flex items-center gap-0.5 transition-colors"
                      style={{ color: "var(--color-secondary)", fontSize: 13, fontWeight: 600 }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.color =
                          "var(--color-on-secondary-fixed-variant)")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.color =
                          "var(--color-secondary)")
                      }
                    >
                      View status
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                    <button
                      className="font-body-sm transition-colors"
                      style={{ color: "var(--color-on-surface-variant)", fontSize: 11 }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.color =
                          "var(--color-on-surface)")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.color =
                          "var(--color-on-surface-variant)")
                      }
                    >
                      Edit expiry
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info note */}
      <div
        className="p-3 rounded-lg flex items-center gap-3"
        style={{ backgroundColor: "var(--color-surface-container)" }}
      >
        <span
          className="material-symbols-outlined text-[18px] flex-shrink-0"
          style={{ color: "var(--color-outline)" }}
        >
          info
        </span>
        <p className="font-body-sm" style={{ color: "var(--color-on-surface-variant)", fontSize: 12 }}>
          Doubts automatically expire if unbooked to keep queues active and fresh.
        </p>
      </div>
    </section>
  );
}
