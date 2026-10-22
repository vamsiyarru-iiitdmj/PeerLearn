"use client";

import { useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import { useAuth } from "../../lib/auth-context";
import {
  apiGetTutorSessions,
  apiGetStudentSessions,
  apiCompleteSession,
  apiConfirmSession,
  formatDate,
  formatDateTime,
  type TutorSession,
} from "../../lib/api";

export default function BookedSessionsPage() {
  const { token, mode, student } = useAuth();
  const [sessions, setSessions] = useState<TutorSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadSessions = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const data =
        mode === "tutor"
          ? await apiGetTutorSessions(token)
          : await apiGetStudentSessions(token);
      setSessions(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load booked sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [token, mode]);

  const handleComplete = async (sessionId: string) => {
    if (!token) return;
    setActionLoadingId(sessionId);
    setActionMessage(null);
    try {
      await apiCompleteSession(sessionId, token);
      setActionMessage("Session marked as completed! Awaiting student confirmation.");
      await loadSessions();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert("Failed to complete session: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirm = async (sessionId: string) => {
    if (!token) return;
    setActionLoadingId(sessionId);
    setActionMessage(null);
    try {
      await apiConfirmSession(sessionId, token);
      setActionMessage("Session confirmed & doubt marked as solved! Points awarded to tutor.");
      await loadSessions();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert("Failed to confirm session: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <PageShell>
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 mb-6">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary" />
          <span
            className="font-label-eyebrow uppercase text-[11px] font-bold tracking-widest"
            style={{ color: "var(--color-secondary)" }}
          >
            {mode === "tutor"
              ? "TUTOR SCHEDULE & FULFILLMENT • SPRING 2025"
              : "STUDENT SCHEDULE & PEER SESSIONS"}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <h1
              style={{
                fontFamily: "var(--font-newsreader)",
                fontSize: 28,
                fontWeight: 500,
                color: "var(--color-primary)",
                margin: 0,
              }}
            >
              Booked Sessions &amp; Appointments
            </h1>
            <p
              style={{
                fontFamily: "var(--font-jakarta)",
                fontSize: 13,
                color: "var(--color-on-surface-variant)",
                marginTop: 4,
              }}
            >
              {mode === "tutor"
                ? "Confirmed appointments locked to your calendar. Mark sessions completed after meetings to trigger confidential student confirmation."
                : "Your scheduled 1-on-1 peer learning appointments with accredited tutors."}
            </p>
          </div>

          <button
            type="button"
            onClick={loadSessions}
            className="self-start sm:self-auto px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            style={{
              backgroundColor: "var(--color-surface-container)",
              color: "var(--color-on-surface)",
              border: "1px solid var(--color-outline-variant)",
            }}
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 mb-6 rounded-xl bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {actionMessage}
        </div>
      )}

      {error && (
        <div className="p-4 mb-6 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
          {error}
        </div>
      )}

      {/* ── Sessions List ──────────────────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center text-xs text-gray-500">Loading scheduled sessions…</div>
      ) : sessions.length === 0 ? (
        <div
          className="p-10 rounded-2xl border text-center space-y-3"
          style={{
            backgroundColor: "var(--color-surface-container-low)",
            borderColor: "var(--color-outline-variant)",
          }}
        >
          <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-gray-100 text-gray-400">
            <span className="material-symbols-outlined text-[24px]">calendar_today</span>
          </div>
          <h3
            style={{
              fontFamily: "var(--font-newsreader)",
              fontSize: 20,
              fontWeight: 600,
              color: "var(--color-primary)",
              margin: 0,
            }}
          >
            No booked sessions scheduled yet
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {mode === "tutor"
              ? "When you review and book an open doubt from your Matched Inbox, the confirmed meeting will appear here."
              : "When an accredited peer tutor claims your posted doubt, your scheduled appointment will appear right here."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const isCompleted =
              session.status === "COMPLETED" ||
              session.status === "SESSION_COMPLETED_PENDING_CONFIRMATION" ||
              session.status === "SOLVED";
            const isPendingConfirmation =
              session.status === "SESSION_COMPLETED_PENDING_CONFIRMATION";

            return (
              <article
                key={session.id}
                className="p-6 rounded-2xl border shadow-sm space-y-4 relative overflow-hidden bg-white"
                style={{ borderColor: "var(--color-outline-variant)" }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-600" />

                {/* Top Badge & Time */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-bold w-fit">
                    <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                    <span>
                      {formatDate(session.scheduled_start)} •{" "}
                      {new Date(session.scheduled_start).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      (45 mins)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                    <span className="material-symbols-outlined text-[15px]">lock_clock</span>
                    <span>Session #{session.id.slice(0, 8)}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isCompleted ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {session.status}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-8 space-y-2">
                    {/* Student Info */}
                    {session.student && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-800">
                          {session.student.full_name}
                        </span>
                        <span className="text-gray-400 text-xs">•</span>
                        <span className="text-xs text-gray-500 font-mono">
                          {session.student.roll_number}
                        </span>
                        <span className="text-xs text-gray-500">({session.student.department})</span>
                      </div>
                    )}

                    <h3
                      style={{
                        fontFamily: "var(--font-newsreader)",
                        fontSize: 18,
                        fontWeight: 600,
                        color: "var(--color-primary)",
                        margin: "4px 0",
                      }}
                    >
                      {session.doubts?.description || "Peer Tutoring Consultation"}
                    </h3>

                    {session.doubts?.expected_outcome && (
                      <p className="text-xs text-gray-600 leading-relaxed">
                        <strong className="text-gray-800">Expected Outcome:</strong>{" "}
                        {session.doubts.expected_outcome}
                      </p>
                    )}

                    {/* Venue / Meeting Link */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                      {session.mode === "ONLINE" || session.meeting_url ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-800 font-semibold">
                          <span className="material-symbols-outlined text-[16px]">videocam</span>
                          <span>Online Video Call</span>
                          {session.meeting_url && (
                            <a
                              href={session.meeting_url}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-2 underline text-teal-900"
                            >
                              Join Meet →
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-800 font-semibold">
                          <span className="material-symbols-outlined text-[16px]">meeting_room</span>
                          <span>Campus Venue: {session.venue || "Central Library Discussion Room"}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="lg:col-span-4 flex flex-col gap-2 justify-end">
                    {session.meeting_url && (
                      <a
                        href={session.meeting_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl text-xs font-bold text-center text-white flex items-center justify-center gap-2 cursor-pointer"
                        style={{
                          backgroundColor: "var(--color-primary-container)",
                          textDecoration: "none",
                        }}
                      >
                        <span className="material-symbols-outlined text-[16px]">videocam</span>
                        Launch Meeting
                      </a>
                    )}

                    {mode === "tutor" && session.status === "BOOKED" && (
                      <button
                        type="button"
                        id={`complete-session-${session.id}`}
                        disabled={actionLoadingId === session.id}
                        onClick={() => handleComplete(session.id)}
                        className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                        style={{
                          backgroundColor: "var(--color-secondary)",
                          color: "#ffffff",
                          border: "none",
                        }}
                      >
                        {actionLoadingId === session.id
                          ? "Marking Complete…"
                          : "Mark Session as Completed"}
                      </button>
                    )}

                    {mode === "student" && isPendingConfirmation && (
                      <button
                        type="button"
                        id={`confirm-session-${session.id}`}
                        disabled={actionLoadingId === session.id}
                        onClick={() => handleConfirm(session.id)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-green-700 hover:bg-green-800 cursor-pointer"
                        style={{ border: "none" }}
                      >
                        {actionLoadingId === session.id
                          ? "Confirming…"
                          : "Confirm & Award Tutor Points"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Cancellation & Substitution Rule notice */}
                <div className="p-3 rounded-lg bg-gray-50 flex items-center gap-2 text-xs text-gray-500 border border-gray-100">
                  <span className="material-symbols-outlined text-[16px] text-amber-700">gavel</span>
                  <span>
                    <strong>Cancellation Rule:</strong> Sessions locked under atomic reservation cannot be cancelled within 24h without accredited tutor replacement.
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
