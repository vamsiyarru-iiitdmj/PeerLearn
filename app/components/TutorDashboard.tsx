"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../lib/auth-context";
import {
  apiGetTutorProfile,
  apiGetTutorDoubts,
  apiGetTutorSessions,
  apiBookDoubt,
  apiCompleteSession,
  apiGetSkills,
  apiSetTutorProSkills,
  type TutorProfileData,
  type Doubt,
  type TutorSession,
  type Skill,
} from "../../lib/api";

export default function TutorDashboard() {
  const { token, student } = useAuth();
  const [profile, setProfile] = useState<TutorProfileData | null>(null);
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [sessions, setSessions] = useState<TutorSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingDoubt, setBookingDoubt] = useState<Doubt | null>(null);
  const [manageSkillsModal, setManageSkillsModal] = useState(false);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Booking form state
  const [bookingMode, setBookingMode] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const [meetingUrl, setMeetingUrl] = useState("https://meet.google.com/pl-tutor-session");
  const [venue, setVenue] = useState("Academic Block 1 - Room 204");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");

  const loadTutorData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [profData, doubtsData, sessionsData] = await Promise.all([
        apiGetTutorProfile(token).catch(() => null),
        apiGetTutorDoubts(token).catch(() => []),
        apiGetTutorSessions(token).catch(() => []),
      ]);
      setProfile(profData);
      setDoubts(doubtsData);
      setSessions(sessionsData);
    } catch {
      // Error handled
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadTutorData();
  }, [loadTutorData]);

  // Open Pro Skills modal
  const handleOpenSkillsModal = async () => {
    if (!token) return;
    try {
      const skills = await apiGetSkills();
      setAllSkills(skills);
      setSelectedSkillIds(profile?.masteredSkills.map((s) => s.id) || []);
      setManageSkillsModal(true);
    } catch (e: any) {
      alert("Failed to load skills catalog: " + e.message);
    }
  };

  const handleSaveProSkills = async () => {
    if (!token) return;
    try {
      await apiSetTutorProSkills(selectedSkillIds, token);
      setManageSkillsModal(false);
      setActionMsg("Tutoring pro skills updated successfully!");
      loadTutorData();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (e: any) {
      alert("Failed to update skills: " + e.message);
    }
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !bookingDoubt) return;

    try {
      const start = scheduledStart || new Date(Date.now() + 3600000).toISOString();
      const end = scheduledEnd || new Date(Date.now() + 7200000).toISOString();

      await apiBookDoubt(
        bookingDoubt.id,
        {
          scheduledStart: start,
          scheduledEnd: end,
          mode: bookingMode,
          venue: bookingMode === "OFFLINE" ? venue : undefined,
          meetingUrl: bookingMode === "ONLINE" ? meetingUrl : undefined,
        },
        token,
      );

      setActionMsg(`Successfully booked doubt "${bookingDoubt.title || bookingDoubt.description.slice(0, 30)}"!`);
      setBookingDoubt(null);
      loadTutorData();
      setTimeout(() => setActionMsg(null), 5000);
    } catch (err: any) {
      alert("Booking failed: " + (err.message || "Unknown error"));
    }
  };

  const handleCompleteSession = async (sessionId: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to mark this tutoring session as completed?")) return;
    try {
      await apiCompleteSession(sessionId, token);
      setActionMsg("Session marked as completed! Awaiting student confirmation.");
      loadTutorData();
      setTimeout(() => setActionMsg(null), 5000);
    } catch (e: any) {
      alert("Failed to complete session: " + e.message);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Action toast */}
      {actionMsg && (
        <div
          className="p-4 rounded-xl flex items-center justify-between"
          style={{
            backgroundColor: "var(--color-primary-fixed)",
            color: "var(--color-on-primary-fixed)",
            border: "1px solid var(--color-primary)",
          }}
        >
          <span className="font-semibold text-sm">{actionMsg}</span>
          <button
            onClick={() => setActionMsg(null)}
            className="text-xs font-bold px-2 py-1 rounded cursor-pointer"
            style={{ background: "none", border: "none" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Tutor Stats Card ─────────────────────────────────────── */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(18,62,58,0.04) 0%, rgba(251,249,244,1) 100%)",
          border: "1px solid var(--color-outline-variant)",
          borderRadius: 16,
          padding: "1.75rem",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: "var(--color-secondary)" }}
              />
              <span
                style={{
                  fontFamily: "var(--font-jakarta)",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--color-secondary)",
                }}
              >
                Verified Peer Tutor
              </span>
            </div>
            <h2
              style={{
                fontFamily: "var(--font-newsreader)",
                fontSize: 26,
                fontWeight: 500,
                color: "var(--color-primary)",
                margin: 0,
              }}
            >
              {student?.full_name} · Tutor Hub
            </h2>
            <p
              style={{
                fontFamily: "var(--font-jakarta)",
                fontSize: 13,
                color: "var(--color-on-surface-variant)",
                marginTop: 4,
                marginBottom: 0,
              }}
            >
              Department: {student?.department} · Roll: {student?.roll_number}
            </p>
          </div>

          {/* Quick stats pills */}
          <div className="flex items-center gap-3">
            <div
              className="px-4 py-2 rounded-xl text-center"
              style={{ backgroundColor: "var(--color-surface-container-high)" }}
            >
              <div
                style={{
                  fontFamily: "var(--font-newsreader)",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "var(--color-primary)",
                }}
              >
                {profile?.proficiencyScore ? profile.proficiencyScore.toFixed(1) : "5.0"}★
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--color-on-surface-variant)",
                  fontFamily: "var(--font-jakarta)",
                }}
              >
                Proficiency
              </div>
            </div>

            <div
              className="px-4 py-2 rounded-xl text-center"
              style={{ backgroundColor: "var(--color-surface-container-high)" }}
            >
              <div
                style={{
                  fontFamily: "var(--font-newsreader)",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "var(--color-primary)",
                }}
              >
                {profile?.doubtsSolved ?? 0}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--color-on-surface-variant)",
                  fontFamily: "var(--font-jakarta)",
                }}
              >
                Doubts Solved
              </div>
            </div>

            <button
              onClick={handleOpenSkillsModal}
              className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
              style={{
                backgroundColor: "var(--color-primary-container)",
                color: "var(--color-on-primary)",
                border: "none",
                fontFamily: "var(--font-jakarta)",
              }}
            >
              <span className="material-symbols-outlined text-sm">tune</span>
              Mastered Skills
            </button>
          </div>
        </div>

        {/* Mastered Skills chips */}
        <div className="mt-4 pt-4 border-t border-gray-200/60 flex flex-wrap items-center gap-2">
          <span
            style={{
              fontSize: 12,
              fontFamily: "var(--font-jakarta)",
              color: "var(--color-on-surface-variant)",
              marginRight: 4,
            }}
          >
            Active Tutoring Subjects:
          </span>
          {profile?.masteredSkills && profile.masteredSkills.length > 0 ? (
            profile.masteredSkills.map((sk) => (
              <span
                key={sk.id}
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: "var(--color-secondary-fixed)",
                  color: "var(--color-on-secondary-fixed)",
                }}
              >
                {sk.name}
              </span>
            ))
          ) : (
            <span
              style={{
                fontSize: 12,
                color: "var(--color-outline)",
                fontFamily: "var(--font-jakarta)",
              }}
            >
              No pro skills selected yet. Click "Mastered Skills" to pick subjects you tutor!
            </span>
          )}
        </div>
      </div>

      {/* ── Active Sessions Section ────────────────────────────────── */}
      <div className="card" style={{ padding: "1.75rem", borderRadius: 16 }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-primary)" }}>
              event_available
            </span>
            <h3
              style={{
                fontFamily: "var(--font-newsreader)",
                fontSize: 20,
                fontWeight: 500,
                color: "var(--color-primary)",
                margin: 0,
              }}
            >
              My Tutoring Sessions ({sessions.length})
            </h3>
          </div>
          <button
            onClick={loadTutorData}
            className="text-xs flex items-center gap-1 cursor-pointer font-semibold"
            style={{ color: "var(--color-primary)", background: "none", border: "none" }}
          >
            <span className="material-symbols-outlined text-xs">refresh</span> Refresh
          </button>
        </div>

        {sessions.length === 0 ? (
          <div
            className="text-center py-8"
            style={{ color: "var(--color-on-surface-variant)", fontFamily: "var(--font-jakarta)", fontSize: 13 }}
          >
            <span className="material-symbols-outlined text-3xl mb-2 block" style={{ color: "var(--color-outline)" }}>
              calendar_month
            </span>
            No booked tutoring sessions at the moment. Claim matching doubts below to schedule sessions!
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4"
                style={{
                  backgroundColor: "var(--color-surface-container-low)",
                  borderColor: "var(--color-outline-variant)",
                }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-bold uppercase"
                      style={{
                        backgroundColor:
                          sess.status === "CONFIRMED"
                            ? "var(--color-tertiary-fixed-dim)"
                            : "var(--color-primary-fixed)",
                        color: "var(--color-primary)",
                      }}
                    >
                      {sess.status}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">Mode: {sess.mode}</span>
                  </div>
                  <h4 className="font-semibold text-sm mb-1" style={{ color: "var(--color-on-surface)" }}>
                    Student: {sess.student?.full_name || "Peer Student"} ({sess.student?.roll_number || "IIITDMJ"})
                  </h4>
                  <p className="text-xs text-gray-600 m-0">
                    Scheduled: {new Date(sess.scheduled_start).toLocaleString()}
                    {sess.mode === "ONLINE" && sess.meeting_url && ` · Link: ${sess.meeting_url}`}
                    {sess.mode === "OFFLINE" && sess.venue && ` · Venue: ${sess.venue}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {sess.mode === "ONLINE" && sess.meeting_url && (
                    <a
                      href={sess.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold text-decoration-none"
                    >
                      Join Meeting
                    </a>
                  )}
                  {sess.status !== "CONFIRMED" && sess.status !== "COMPLETED_PENDING_CONFIRMATION" && (
                    <button
                      onClick={() => handleCompleteSession(sess.id)}
                      className="btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                      style={{
                        backgroundColor: "var(--color-primary-container)",
                        color: "var(--color-on-primary)",
                        border: "none",
                      }}
                    >
                      Mark Completed
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Matching Doubts Inbox ─────────────────────────────────── */}
      <div className="card" style={{ padding: "1.75rem", borderRadius: 16 }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-primary)" }}>
              inbox
            </span>
            <h3
              style={{
                fontFamily: "var(--font-newsreader)",
                fontSize: 20,
                fontWeight: 500,
                color: "var(--color-primary)",
                margin: 0,
              }}
            >
              Open Student Doubts Matching Your Skills ({doubts.length})
            </h3>
          </div>
          <button
            onClick={loadTutorData}
            className="text-xs flex items-center gap-1 cursor-pointer font-semibold"
            style={{ color: "var(--color-primary)", background: "none", border: "none" }}
          >
            <span className="material-symbols-outlined text-xs">refresh</span> Check for Doubts
          </button>
        </div>

        {doubts.length === 0 ? (
          <div
            className="text-center py-10"
            style={{ color: "var(--color-on-surface-variant)", fontFamily: "var(--font-jakarta)", fontSize: 13 }}
          >
            <span className="material-symbols-outlined text-3xl mb-2 block" style={{ color: "var(--color-outline)" }}>
              task_alt
            </span>
            No pending doubts currently match your skill tags.
            <br />
            New doubts asked by peers will appear here in real-time.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {doubts.map((d) => (
              <div
                key={d.id}
                className="p-5 rounded-xl border transition-all"
                style={{
                  backgroundColor: "var(--color-surface-container-low)",
                  borderColor: "var(--color-outline-variant)",
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4
                      style={{
                        fontFamily: "var(--font-jakarta)",
                        fontSize: 16,
                        fontWeight: 600,
                        color: "var(--color-on-surface)",
                        margin: "0 0 6px 0",
                      }}
                    >
                      {d.title || d.description.slice(0, 60)}
                    </h4>
                    <p
                      style={{
                        fontFamily: "var(--font-jakarta)",
                        fontSize: 13,
                        color: "var(--color-on-surface-variant)",
                        margin: "0 0 10px 0",
                      }}
                    >
                      {d.description}
                    </p>
                    {d.expected_outcome && (
                      <p
                        style={{
                          fontFamily: "var(--font-jakarta)",
                          fontSize: 12,
                          color: "var(--color-primary)",
                          margin: "0 0 10px 0",
                        }}
                      >
                        <strong>Expected Outcome:</strong> {d.expected_outcome}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {d.tags?.map((t) => (
                        <span
                          key={t.id}
                          className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: "var(--color-secondary-fixed)",
                            color: "var(--color-on-secondary-fixed)",
                          }}
                        >
                          {t.name}
                        </span>
                      ))}
                      <span className="text-xs text-gray-400">
                        Expires: {new Date(d.expires_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setBookingDoubt(d);
                      setScheduledStart(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
                      setScheduledEnd(new Date(Date.now() + 7200000).toISOString().slice(0, 16));
                    }}
                    className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer"
                    style={{
                      backgroundColor: "var(--color-primary-container)",
                      color: "var(--color-on-primary)",
                      border: "none",
                    }}
                  >
                    <span className="material-symbols-outlined text-sm">bookmark_add</span>
                    Claim &amp; Book
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Booking Modal ─────────────────────────────────────────── */}
      {bookingDoubt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6"
            style={{ backgroundColor: "var(--color-surface)", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                style={{
                  fontFamily: "var(--font-newsreader)",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "var(--color-primary)",
                  margin: 0,
                }}
              >
                Claim Doubt &amp; Schedule Session
              </h3>
              <button
                onClick={() => setBookingDoubt(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer text-lg font-bold"
                style={{ background: "none", border: "none" }}
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-4">
              Doubt: <strong>{bookingDoubt.title || bookingDoubt.description.slice(0, 80)}</strong>
            </p>

            <form onSubmit={handleBookSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Session Mode</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="bookingMode"
                      value="ONLINE"
                      checked={bookingMode === "ONLINE"}
                      onChange={() => setBookingMode("ONLINE")}
                    />
                    Online (Video Meet)
                  </label>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="bookingMode"
                      value="OFFLINE"
                      checked={bookingMode === "OFFLINE"}
                      onChange={() => setBookingMode("OFFLINE")}
                    />
                    In-Person (Campus Venue)
                  </label>
                </div>
              </div>

              {bookingMode === "ONLINE" ? (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Meeting Link</label>
                  <input
                    type="url"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg border text-sm"
                    style={{ borderColor: "var(--color-outline-variant)" }}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Campus Venue</label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg border text-sm"
                    style={{ borderColor: "var(--color-outline-variant)" }}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={scheduledStart}
                    onChange={(e) => setScheduledStart(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg border text-sm"
                    style={{ borderColor: "var(--color-outline-variant)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={scheduledEnd}
                    onChange={(e) => setScheduledEnd(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-lg border text-sm"
                    style={{ borderColor: "var(--color-outline-variant)" }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setBookingDoubt(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer border"
                  style={{ background: "none" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-5 py-2 rounded-xl text-sm font-bold cursor-pointer"
                  style={{
                    backgroundColor: "var(--color-primary-container)",
                    color: "var(--color-on-primary)",
                    border: "none",
                  }}
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Manage Pro Skills Modal ───────────────────────────────── */}
      {manageSkillsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6"
            style={{ backgroundColor: "var(--color-surface)", maxHeight: "80vh", overflowY: "auto" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                style={{
                  fontFamily: "var(--font-newsreader)",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "var(--color-primary)",
                  margin: 0,
                }}
              >
                Select Mastered Tutoring Subjects
              </h3>
              <button
                onClick={() => setManageSkillsModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer text-lg font-bold"
                style={{ background: "none", border: "none" }}
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-600 mb-4">
              Select the subjects in which you feel confident mentoring fellow students. Doubts tagged with these skills will appear in your tutor inbox.
            </p>

            <div className="flex flex-col gap-2 mb-6">
              {allSkills.map((sk) => {
                const isChecked = selectedSkillIds.includes(sk.id);
                return (
                  <label
                    key={sk.id}
                    className="p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors"
                    style={{
                      backgroundColor: isChecked ? "var(--color-secondary-fixed)" : "transparent",
                      borderColor: isChecked ? "var(--color-secondary)" : "var(--color-outline-variant)",
                    }}
                  >
                    <div>
                      <div className="font-semibold text-sm">{sk.name}</div>
                      <div className="text-xs text-gray-500">{sk.category}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSkillIds((prev) => [...prev, sk.id]);
                        } else {
                          setSelectedSkillIds((prev) => prev.filter((id) => id !== sk.id));
                        }
                      }}
                      className="w-4 h-4"
                    />
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setManageSkillsModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer border"
                style={{ background: "none" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProSkills}
                className="btn-primary px-5 py-2 rounded-xl text-sm font-bold cursor-pointer"
                style={{
                  backgroundColor: "var(--color-primary-container)",
                  color: "var(--color-on-primary)",
                  border: "none",
                }}
              >
                Save Subjects
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
