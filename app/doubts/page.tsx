"use client";

import { useEffect, useState, useCallback } from "react";
import PageShell from "../components/PageShell";
import { useAuth } from "../../lib/auth-context";
import {
  apiGetMyDoubts,
  apiPostDoubt,
  apiWithdrawDoubt,
  apiGetSkills,
  type Doubt,
  type Skill,
} from "../../lib/api";

export default function DoubtsPage() {
  const { token, student } = useAuth();
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "unsolved" | "solved">("all");
  const [showAskModal, setShowAskModal] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);

  // Ask doubt form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadDoubts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiGetMyDoubts(token);
      setDoubts(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load doubts");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDoubts();
    apiGetSkills().then(setSkills).catch(() => {});
  }, [loadDoubts]);

  const handleAskDoubt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (selectedSkillIds.length === 0) {
      alert("Please select at least one skill tag for your doubt!");
      return;
    }

    setSubmitting(true);
    try {
      await apiPostDoubt(
        {
          title: title.trim(),
          description: description.trim(),
          expectedOutcome: expectedOutcome.trim(),
          skillIds: selectedSkillIds,
          expiresInHours: Number(expiresInHours),
        },
        token,
      );

      setShowAskModal(false);
      setTitle("");
      setDescription("");
      setExpectedOutcome("");
      setSelectedSkillIds([]);
      setToastMsg("Doubt submitted successfully! Peer tutors are being notified.");
      loadDoubts();
      setTimeout(() => setToastMsg(null), 5000);
    } catch (err: any) {
      alert("Failed to post doubt: " + (err.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (doubtId: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to withdraw this doubt?")) return;
    try {
      await apiWithdrawDoubt(doubtId, token);
      setToastMsg("Doubt withdrawn successfully.");
      loadDoubts();
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: any) {
      alert("Withdrawal failed: " + err.message);
    }
  };

  const filteredDoubts = doubts.filter((d) => {
    if (tab === "unsolved") return ["OPEN", "BOOKED"].includes(d.status);
    if (tab === "solved") return d.status === "SOLVED";
    return true;
  });

  return (
    <PageShell>
      {/* Toast */}
      {toastMsg && (
        <div
          className="p-4 mb-4 rounded-xl flex items-center justify-between"
          style={{
            backgroundColor: "var(--color-primary-fixed)",
            color: "var(--color-on-primary-fixed)",
            border: "1px solid var(--color-primary)",
          }}
        >
          <span className="font-semibold text-sm">{toastMsg}</span>
          <button
            onClick={() => setToastMsg(null)}
            className="text-xs font-bold px-2 py-1 cursor-pointer"
            style={{ background: "none", border: "none" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            style={{
              fontFamily: "var(--font-newsreader)",
              fontSize: 28,
              fontWeight: 500,
              color: "var(--color-primary)",
              margin: "0 0 4px 0",
            }}
          >
            Academic Doubts &amp; Mentorship
          </h1>
          <p
            style={{
              fontFamily: "var(--font-jakarta)",
              fontSize: 13,
              color: "var(--color-on-surface-variant)",
              margin: 0,
            }}
          >
            Post questions with verified course skill tags to connect with high-scoring peer tutors.
          </p>
        </div>

        <button
          id="ask-new-doubt-btn"
          onClick={() => setShowAskModal(true)}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm cursor-pointer self-start sm:self-auto"
          style={{
            backgroundColor: "var(--color-primary-container)",
            color: "var(--color-on-primary)",
            border: "none",
          }}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Ask a New Doubt
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-3">
        {(["all", "unsolved", "solved"] as const).map((t) => (
          <button
            key={t}
            id={`tab-doubts-${t}`}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all cursor-pointer"
            style={{
              backgroundColor: tab === t ? "var(--color-primary-container)" : "var(--color-surface-container)",
              color: tab === t ? "var(--color-on-primary)" : "var(--color-on-surface-variant)",
              border: "none",
            }}
          >
            {t} ({doubts.filter((d) => (t === "all" ? true : t === "unsolved" ? ["OPEN", "BOOKED"].includes(d.status) : d.status === "SOLVED")).length})
          </button>
        ))}
      </div>

      {/* Doubts List */}
      <div className="flex flex-col gap-4 max-w-4xl">
        {loading && (
          <div className="text-center py-12 text-sm text-gray-500">
            <span className="material-symbols-outlined text-3xl mb-2 block text-gray-400">hourglass_top</span>
            Loading your doubts catalog…
          </div>
        )}

        {!loading && filteredDoubts.length === 0 && (
          <div
            className="card text-center py-12"
            style={{ borderRadius: 16, backgroundColor: "var(--color-surface-container-low)" }}
          >
            <span className="material-symbols-outlined text-4xl mb-3 block" style={{ color: "var(--color-outline)" }}>
              help_outline
            </span>
            <h3 className="text-base font-semibold text-gray-800 mb-1">No doubts in this view</h3>
            <p className="text-xs text-gray-500 mb-4">
              Need assistance with assignments or exam concepts? Submit your doubt to match with a tutor.
            </p>
            <button
              onClick={() => setShowAskModal(true)}
              className="btn-secondary px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
            >
              Ask Doubt Now
            </button>
          </div>
        )}

        {!loading &&
          filteredDoubts.map((d) => (
            <div
              key={d.id}
              className="card p-5 rounded-2xl border transition-all"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-outline-variant)",
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-[280px]">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor:
                          d.status === "OPEN"
                            ? "var(--color-secondary-fixed)"
                            : d.status === "SOLVED"
                              ? "var(--color-tertiary-fixed-dim)"
                              : "var(--color-primary-fixed)",
                        color:
                          d.status === "OPEN"
                            ? "var(--color-on-secondary-fixed)"
                            : "var(--color-primary)",
                      }}
                    >
                      {d.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      Created: {new Date(d.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontFamily: "var(--font-jakarta)",
                      fontSize: 16,
                      fontWeight: 600,
                      color: "var(--color-on-surface)",
                      margin: "0 0 6px 0",
                    }}
                  >
                    {d.title || d.description.slice(0, 60)}
                  </h3>

                  <p
                    style={{
                      fontFamily: "var(--font-jakarta)",
                      fontSize: 13,
                      color: "var(--color-on-surface-variant)",
                      margin: "0 0 10px 0",
                      lineHeight: "1.5",
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
                      <strong>Target Outcome:</strong> {d.expected_outcome}
                    </p>
                  )}

                  {/* Skill tags */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {d.tags?.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: "var(--color-surface-container-high)",
                          color: "var(--color-on-surface-variant)",
                        }}
                      >
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right actions */}
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs text-gray-400">
                    Expires: {new Date(d.expires_at).toLocaleString()}
                  </span>

                  {d.status === "OPEN" && (
                    <button
                      id={`withdraw-btn-${d.id}`}
                      onClick={() => handleWithdraw(d.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 border border-red-200 cursor-pointer"
                    >
                      Withdraw Doubt
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* ── Ask Doubt Modal ───────────────────────────────────────── */}
      {showAskModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6"
            style={{
              backgroundColor: "var(--color-surface)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
              <h2
                style={{
                  fontFamily: "var(--font-newsreader)",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "var(--color-primary)",
                  margin: 0,
                }}
              >
                Ask a Course Doubt
              </h2>
              <button
                onClick={() => setShowAskModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer text-lg font-bold"
                style={{ background: "none", border: "none" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAskDoubt} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Topic / Summary Title
                </label>
                <input
                  id="doubt-form-title"
                  type="text"
                  placeholder="e.g. Red-Black Tree Rotation in DSA"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border text-sm"
                  style={{ borderColor: "var(--color-outline-variant)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Problem Description
                </label>
                <textarea
                  id="doubt-form-description"
                  rows={4}
                  placeholder="Explain what concept or problem statement you are stuck on..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border text-sm"
                  style={{ borderColor: "var(--color-outline-variant)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Expected Outcome
                </label>
                <input
                  id="doubt-form-expected"
                  type="text"
                  placeholder="e.g. Understand case 2 and case 3 deletion proofs"
                  value={expectedOutcome}
                  onChange={(e) => setExpectedOutcome(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border text-sm"
                  style={{ borderColor: "var(--color-outline-variant)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Skill Tags (Select at least one)
                </label>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 rounded-lg border" style={{ borderColor: "var(--color-outline-variant)" }}>
                  {skills.map((sk) => {
                    const isSelected = selectedSkillIds.includes(sk.id);
                    return (
                      <button
                        type="button"
                        key={sk.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSkillIds((prev) => prev.filter((id) => id !== sk.id));
                          } else {
                            setSelectedSkillIds((prev) => [...prev, sk.id]);
                          }
                        }}
                        className="px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors"
                        style={{
                          backgroundColor: isSelected
                            ? "var(--color-primary-container)"
                            : "var(--color-surface-container)",
                          color: isSelected ? "var(--color-on-primary)" : "var(--color-on-surface-variant)",
                          border: "none",
                        }}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {sk.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Doubt Auto-Expiry
                </label>
                <select
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border text-sm bg-white"
                  style={{ borderColor: "var(--color-outline-variant)" }}
                >
                  <option value={12}>12 Hours (Urgent)</option>
                  <option value={24}>24 Hours (Standard)</option>
                  <option value={48}>48 Hours</option>
                  <option value={72}>72 Hours</option>
                  <option value={168}>1 Week</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAskModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer border"
                  style={{ background: "none" }}
                >
                  Cancel
                </button>
                <button
                  id="submit-doubt-btn"
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-5 py-2 rounded-xl text-sm font-bold cursor-pointer"
                  style={{
                    backgroundColor: "var(--color-primary-container)",
                    color: "var(--color-on-primary)",
                    border: "none",
                  }}
                >
                  {submitting ? "Publishing…" : "Publish Doubt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
