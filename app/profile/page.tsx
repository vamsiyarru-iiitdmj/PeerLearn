"use client";

import { useState, useEffect } from "react";
import PageShell from "../components/PageShell";
import { useAuth } from "../../lib/auth-context";
import {
  apiGetDetailedProfile,
  apiUpdateTarget,
  apiGetTutorProSkills,
  apiSetTutorProSkills,
  apiGetSkills,
  type DetailedProfileResponse,
  type Skill,
} from "../../lib/api";

export default function ProfilePage() {
  const { student, token, refreshProfile } = useAuth();
  const [profileData, setProfileData] = useState<DetailedProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [targetInput, setTargetInput] = useState("");
  const [isUpdatingTarget, setIsUpdatingTarget] = useState(false);
  const [targetSuccess, setTargetSuccess] = useState(false);

  // Pro Skills modal
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [myProSkills, setMyProSkills] = useState<Skill[]>([]);
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [isSavingSkills, setIsSavingSkills] = useState(false);

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [data, skills, proSkills] = await Promise.all([
        apiGetDetailedProfile(token),
        apiGetSkills().catch(() => []),
        apiGetTutorProSkills(token).catch(() => []),
      ]);
      setProfileData(data);
      if (data.student?.target_cgpa) {
        setTargetInput(data.student.target_cgpa.toString());
      }
      setAllSkills(skills);
      setMyProSkills(proSkills);
      setSelectedSkillIds(proSkills.map((s) => s.id));
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleUpdateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(targetInput);
    if (isNaN(val) || val < 0 || val > 10 || !token) {
      alert("Please enter a valid target CGPA between 0.0 and 10.0");
      return;
    }
    setIsUpdatingTarget(true);
    setTargetSuccess(false);
    try {
      const updated = await apiUpdateTarget(val, token);
      setProfileData(updated);
      setTargetSuccess(true);
      if (refreshProfile) refreshProfile();
      setTimeout(() => setTargetSuccess(false), 2500);
    } catch (err: any) {
      alert("Failed to update target: " + err.message);
    } finally {
      setIsUpdatingTarget(false);
    }
  };

  const handleSaveSkills = async () => {
    if (!token) return;
    setIsSavingSkills(true);
    try {
      const updated = await apiSetTutorProSkills(selectedSkillIds, token);
      setMyProSkills(updated);
      setShowSkillsModal(false);
      loadData();
    } catch (err: any) {
      alert("Failed to save skills: " + err.message);
    } finally {
      setIsSavingSkills(false);
    }
  };

  const currentStudent = profileData?.student || student;
  const academics = profileData?.academics;

  return (
    <PageShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
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
            Academic Record &amp; Profile
          </h1>
          <p
            style={{
              fontFamily: "var(--font-jakarta)",
              fontSize: 13,
              color: "var(--color-on-surface-variant)",
              marginTop: 4,
            }}
          >
            Official IIITDMJ credentials, goal calibration, and tutor endorsements.
          </p>
        </div>
      </div>

      {loading && !currentStudent ? (
        <div className="p-8 text-center text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
          Loading profile details…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Profile Info Card */}
          <div className="lg:col-span-1 space-y-4">
            <div
              className="card p-6 rounded-2xl border"
              style={{
                backgroundColor: "var(--color-surface-container-low)",
                borderColor: "var(--color-outline-variant)",
              }}
            >
              <div className="flex items-center gap-4 mb-6">
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    backgroundColor: "var(--color-primary-container)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    fontWeight: 700,
                    color: "var(--color-on-primary)",
                    fontFamily: "var(--font-newsreader)",
                    flexShrink: 0,
                  }}
                >
                  {currentStudent?.full_name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "PL"}
                </div>
                <div>
                  <h2
                    style={{
                      fontFamily: "var(--font-newsreader)",
                      fontSize: 22,
                      fontWeight: 600,
                      color: "var(--color-primary)",
                      margin: 0,
                    }}
                  >
                    {currentStudent?.full_name}
                  </h2>
                  <div
                    style={{
                      fontFamily: "var(--font-jakarta)",
                      fontSize: 12,
                      color: "var(--color-on-surface-variant)",
                      marginTop: 2,
                    }}
                  >
                    {currentStudent?.roll_number} · {currentStudent?.department}
                  </div>
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-3 border-t pt-4" style={{ borderColor: "var(--color-outline-variant)" }}>
                {[
                  { label: "Institute Email", value: currentStudent?.institute_email, icon: "mail" },
                  { label: "Roll Number", value: currentStudent?.roll_number, icon: "badge" },
                  { label: "Programme", value: currentStudent?.programme || "B.Tech", icon: "school" },
                  { label: "Department", value: currentStudent?.department, icon: "business" },
                  {
                    label: "Active Standing",
                    value: academics ? `Semester ${academics.completedSemesters}` : `Semester ${currentStudent?.current_semester || 2}`,
                    icon: "calendar_today",
                  },
                ].map((field) => (
                  <div key={field.label} className="flex items-center gap-3 py-1">
                    <span className="material-symbols-outlined text-[18px]" style={{ color: "var(--color-primary-container)" }}>
                      {field.icon}
                    </span>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>
                        {field.label}
                      </div>
                      <div className="text-sm font-medium" style={{ color: "var(--color-on-surface)" }}>
                        {field.value || "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 mt-4 border-t" style={{ borderColor: "var(--color-outline-variant)" }}>
                <span className="chip-resolved flex items-center gap-1.5 w-fit">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  IIITDMJ Verified Student Record
                </span>
              </div>
            </div>

            {/* Pro Skills Badge */}
            <div
              className="card p-5 rounded-2xl border"
              style={{
                backgroundColor: "var(--color-surface-container-low)",
                borderColor: "var(--color-outline-variant)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 style={{ fontFamily: "var(--font-newsreader)", fontSize: 18, fontWeight: 600, color: "var(--color-primary)", margin: 0 }}>
                  Tutor Pro Skills
                </h4>
                <button
                  onClick={() => setShowSkillsModal(true)}
                  className="text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  style={{ color: "var(--color-primary-container)", background: "none", border: "none" }}
                >
                  <span className="material-symbols-outlined text-[15px]">edit</span>
                  Edit
                </button>
              </div>

              {myProSkills.length === 0 ? (
                <p className="text-xs italic" style={{ color: "var(--color-on-surface-variant)" }}>
                  No tutor pro skills chosen. Add skills to match with peers in Tutor Mode!
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {myProSkills.map((sk) => (
                    <span
                      key={sk.id}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: "var(--color-surface-container-highest)",
                        color: "var(--color-primary)",
                        border: "1px solid var(--color-outline-variant)",
                      }}
                    >
                      {sk.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Academic CPI & Target Goal Calibration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Target CGPA Card */}
            <div
              className="p-6 rounded-2xl border shadow-sm"
              style={{
                backgroundColor: "var(--color-surface-container-low)",
                borderColor: "var(--color-outline-variant)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-primary-container)" }}>
                    Academic Goal Calibration
                  </span>
                  <h3 style={{ fontFamily: "var(--font-newsreader)", fontSize: 22, fontWeight: 600, color: "var(--color-primary)", margin: "2px 0 0" }}>
                    Target CPI / CGPA Tracker
                  </h3>
                </div>
                {targetSuccess && (
                  <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check</span> Updated!
                  </span>
                )}
              </div>

              <form onSubmit={handleUpdateTarget} className="flex items-center gap-3 mb-6">
                <div className="flex-1 max-w-xs">
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-on-surface-variant)" }}>
                    Set Graduation Target CGPA (0.0 - 10.0)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm font-semibold bg-white"
                    placeholder="e.g. 9.20"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isUpdatingTarget || !targetInput}
                  className="px-4 py-2 mt-5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-primary-container)", color: "var(--color-on-primary)", border: "none" }}
                >
                  {isUpdatingTarget ? "Calculating…" : "Update Target"}
                </button>
              </form>

              {/* Real Academic Metrics Display */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border bg-white" style={{ borderColor: "var(--color-outline-variant)" }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>
                    Current CPI
                  </div>
                  <div className="text-2xl font-bold mt-1" style={{ color: "var(--color-primary)", fontFamily: "var(--font-newsreader)" }}>
                    {academics?.currentCpi?.toFixed(2) ?? currentStudent?.current_cpi?.toFixed(2) ?? "—"}
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-white" style={{ borderColor: "var(--color-outline-variant)" }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>
                    Current CGPA
                  </div>
                  <div className="text-2xl font-bold mt-1" style={{ color: "var(--color-primary)", fontFamily: "var(--font-newsreader)" }}>
                    {academics?.currentCgpa?.toFixed(2) ?? currentStudent?.current_cgpa?.toFixed(2) ?? "—"}
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-white" style={{ borderColor: "var(--color-outline-variant)" }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>
                    Target CGPA
                  </div>
                  <div className="text-2xl font-bold mt-1" style={{ color: "var(--color-secondary)", fontFamily: "var(--font-newsreader)" }}>
                    {academics?.targetCgpa ? Number(academics.targetCgpa).toFixed(2) : "Not Set"}
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-white" style={{ borderColor: "var(--color-outline-variant)" }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>
                    Required Avg CPI
                  </div>
                  <div className="text-2xl font-bold mt-1" style={{ color: "#ba1a1a", fontFamily: "var(--font-newsreader)" }}>
                    {academics?.requiredAverageCpi !== undefined && academics.requiredAverageCpi !== null
                      ? academics.requiredAverageCpi.toFixed(2)
                      : "—"}
                  </div>
                </div>
              </div>

              {academics?.requiredAverageCpi !== undefined && academics.requiredAverageCpi !== null && (
                <p className="text-xs mt-4 leading-relaxed" style={{ color: "var(--color-on-surface-variant)" }}>
                  💡 To hit your target CGPA of <strong>{Number(academics.targetCgpa).toFixed(2)}</strong> across your remaining{" "}
                  <strong>{academics.remainingSemesters}</strong> semesters, you must maintain an average of{" "}
                  <strong className="text-red-700">{academics.requiredAverageCpi.toFixed(2)} CPI</strong> per upcoming semester.
                </p>
              )}
            </div>

            {/* Semester Grades History Table */}
            <div
              className="p-6 rounded-2xl border shadow-sm"
              style={{
                backgroundColor: "var(--color-surface-container-low)",
                borderColor: "var(--color-outline-variant)",
              }}
            >
              <h3 style={{ fontFamily: "var(--font-newsreader)", fontSize: 20, fontWeight: 600, color: "var(--color-primary)", margin: "0 0 1rem 0" }}>
                Official Institute Semester Records
              </h3>

              {academics?.semesterRecords && academics.semesterRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs" style={{ borderCollapse: "collapse" }}>
                    <thead>
                      <tr className="border-b" style={{ borderColor: "var(--color-outline-variant)", color: "var(--color-on-surface-variant)" }}>
                        <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Semester</th>
                        <th className="py-2.5 px-3 font-bold uppercase tracking-wider">SGPA</th>
                        <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Cumulative CPI</th>
                        <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Credits Earned</th>
                        <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Standing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {academics.semesterRecords.map((rec: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-black/5" style={{ borderColor: "var(--color-outline-variant)" }}>
                          <td className="py-3 px-3 font-semibold">Semester {rec.semester}</td>
                          <td className="py-3 px-3">{rec.sgpa?.toFixed(2) || rec.cpi?.toFixed(2)}</td>
                          <td className="py-3 px-3 font-bold" style={{ color: "var(--color-primary)" }}>
                            {rec.cpi?.toFixed(2)}
                          </td>
                          <td className="py-3 px-3">{rec.credits_earned || 20}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ backgroundColor: "#e8f5e9", color: "#2e7d32" }}>
                              Clear
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
                  Verified semester results for roll number {currentStudent?.roll_number} are recorded in the central database.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SKILLS MODAL */}
      {showSkillsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowSkillsModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: "var(--color-surface-container-lowest, #ffffff)", border: "1px solid var(--color-outline-variant)" }}
          >
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <h3 style={{ fontFamily: "var(--font-newsreader)", fontSize: 20, fontWeight: 600, color: "var(--color-primary)" }}>
                  Select Mastered Tutor Skills
                </h3>
                <p className="text-xs text-gray-500">
                  Select the subjects you are ready to help peers solve in 1-on-1 sessions.
                </p>
              </div>
              <button onClick={() => setShowSkillsModal(false)} className="p-1 text-gray-500 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 py-2">
              {allSkills.map((sk) => {
                const isSelected = selectedSkillIds.includes(sk.id);
                return (
                  <div
                    key={sk.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedSkillIds(selectedSkillIds.filter((id) => id !== sk.id));
                      } else {
                        setSelectedSkillIds([...selectedSkillIds, sk.id]);
                      }
                    }}
                    className="p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-colors"
                    style={{
                      backgroundColor: isSelected ? "var(--color-surface-container-highest)" : "transparent",
                      borderColor: isSelected ? "var(--color-primary-container)" : "var(--color-outline-variant)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]" style={{ color: isSelected ? "var(--color-primary-container)" : "var(--color-outline)" }}>
                        {isSelected ? "check_circle" : "radio_button_unchecked"}
                      </span>
                      <span className="font-semibold" style={{ color: "var(--color-on-surface)" }}>
                        {sk.name}
                      </span>
                    </div>
                    {sk.category && (
                      <span className="text-[10px] uppercase font-bold text-gray-400">
                        {sk.category}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowSkillsModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: "var(--color-surface-container)", color: "var(--color-on-surface-variant)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingSkills}
                onClick={handleSaveSkills}
                className="px-5 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: "var(--color-primary-container)", color: "var(--color-on-primary)" }}
              >
                {isSavingSkills ? "Saving…" : "Save Pro Skills"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
