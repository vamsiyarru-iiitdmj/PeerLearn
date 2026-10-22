"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PageShell from "../components/PageShell";
import { useAuth } from "../../lib/auth-context";
import {
  apiGetDetailedProfile,
  apiUpdateTarget,
  apiUpdateProfile,
  apiGetTutorProSkills,
  apiSetTutorProSkills,
  apiGetSkills,
  apiGetTutorProfile,
  formatDate,
  type DetailedProfileResponse,
  type Skill,
  type TutorProfileData,
} from "../../lib/api";

function ProfileContent() {
  const searchParams = useSearchParams();
  const { student, token, refreshProfile, mode } = useAuth();

  // Active view: "student" or "tutor"
  const initialView = searchParams.get("view") === "tutor" ? "tutor" : (mode === "tutor" ? "tutor" : "student");
  const [activeView, setActiveView] = useState<"student" | "tutor">(initialView);

  const [profileData, setProfileData] = useState<DetailedProfileResponse | null>(null);
  const [tutorData, setTutorData] = useState<TutorProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile fields: photo & phone
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  // Target CGPA
  const [targetInput, setTargetInput] = useState("8.80");
  const [isUpdatingTarget, setIsUpdatingTarget] = useState(false);
  const [targetSuccess, setTargetSuccess] = useState(false);
  const [showTargetEditor, setShowTargetEditor] = useState(false);

  // Student Interests
  const [interests, setInterests] = useState<string[]>([
    "Python",
    "DBMS",
    "Computer Networks",
    "Machine Learning Basics",
  ]);
  const [newInterestInput, setNewInterestInput] = useState("");

  // Pro Skills modal
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [myProSkills, setMyProSkills] = useState<Skill[]>([]);
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [isSavingSkills, setIsSavingSkills] = useState(false);

  // Tutor Availability toggle
  const [tutorAvailable, setTutorAvailable] = useState(true);

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [data, skills, proSkills, tutorProf] = await Promise.all([
        apiGetDetailedProfile(token),
        apiGetSkills().catch(() => []),
        apiGetTutorProSkills(token).catch(() => []),
        apiGetTutorProfile(token).catch(() => null),
      ]);
      setProfileData(data);
      if (data.student?.target_cgpa) {
        setTargetInput(Number(data.student.target_cgpa).toFixed(2));
      }
      if (data.student?.photo_url) {
        setPhotoUrlInput(data.student.photo_url);
      }
      if (data.student?.phone) {
        setPhoneInput(data.student.phone);
      }
      setAllSkills(skills);
      setMyProSkills(proSkills);
      setSelectedSkillIds(proSkills.map((s) => s.id));
      if (tutorProf) {
        setTutorData(tutorProf);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Sync view if searchParams change
  useEffect(() => {
    const viewParam = searchParams.get("view");
    if (viewParam === "tutor" || viewParam === "student") {
      setActiveView(viewParam);
    }
  }, [searchParams]);

  // Handle saving Phone & Photo URL
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSavingContact(true);
    setContactSuccess(false);
    try {
      await apiUpdateProfile(
        {
          phone: phoneInput.trim(),
          photoUrl: photoUrlInput.trim(),
        },
        token,
      );
      setContactSuccess(true);
      if (refreshProfile) await refreshProfile();
      await loadData();
      setTimeout(() => {
        setContactSuccess(false);
        setShowEditContactModal(false);
      }, 1200);
    } catch (err: any) {
      alert("Failed to save profile details: " + err.message);
    } finally {
      setIsSavingContact(false);
    }
  };

  // Handle updating Target CGPA
  const handleUpdateTarget = async (newVal?: number) => {
    const val = newVal !== undefined ? newVal : parseFloat(targetInput);
    if (isNaN(val) || val < 0 || val > 10 || !token) {
      alert("Please enter a valid target CGPA between 0.0 and 10.0");
      return;
    }
    setIsUpdatingTarget(true);
    setTargetSuccess(false);
    try {
      const updated = await apiUpdateTarget(val, token);
      setProfileData(updated);
      setTargetInput(val.toFixed(2));
      setTargetSuccess(true);
      if (refreshProfile) refreshProfile();
      setTimeout(() => setTargetSuccess(false), 2000);
    } catch (err: any) {
      alert("Failed to update target: " + err.message);
    } finally {
      setIsUpdatingTarget(false);
    }
  };

  // Handle saving Pro Skills
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

  // Add an area of interest
  const handleAddInterest = () => {
    const val = newInterestInput.trim();
    if (!val || interests.includes(val)) return;
    setInterests([...interests, val]);
    setNewInterestInput("");
  };

  const handleRemoveInterest = (item: string) => {
    setInterests(interests.filter((i) => i !== item));
  };

  const currentStudent = profileData?.student || student;
  const academics = profileData?.academics;

  // Real-time Target CGPA calculation
  const targetVal = parseFloat(targetInput) || 8.80;
  const completedSemesters = academics?.completedSemesters ?? 6;
  const totalSemesters = academics?.totalSemesters ?? 8;
  const remainingSemesters = Math.max(1, totalSemesters - completedSemesters);
  const currentCgpa = academics?.currentCgpa ?? currentStudent?.current_cgpa ?? 8.40;
  const completedSum = currentCgpa * completedSemesters;
  const requiredSum = targetVal * totalSemesters - completedSum;
  const requiredAvg = Math.max(0, requiredSum / remainingSemesters);

  const initials = currentStudent?.full_name
    ? currentStudent.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "PL";

  return (
    <PageShell>
      {/* ── Top View Switcher Header ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor:
                  activeView === "tutor" ? "var(--color-secondary)" : "var(--color-primary-container)",
              }}
            />
            <span
              className="font-label-eyebrow uppercase tracking-widest text-[11px] font-bold"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              {activeView === "tutor"
                ? "ACCREDITED TUTOR PROFILE • IIIT PEER NETWORK"
                : "STUDENT RECORD & DEGREE PROGRESS • IIIT CSE"}
            </span>
          </div>
          <h1
            style={{
              fontFamily: "var(--font-newsreader)",
              fontSize: 30,
              fontWeight: 500,
              color: "var(--color-primary)",
              margin: 0,
            }}
          >
            {activeView === "tutor"
              ? "Tutor Accreditation & Campus Standing"
              : "A profile with a target built in"}
          </h1>
          <p
            style={{
              fontFamily: "var(--font-jakarta)",
              fontSize: 13,
              color: "var(--color-on-surface-variant)",
              marginTop: 4,
            }}
          >
            {activeView === "tutor"
              ? "Your peer tutoring credentials, verified subject masteries, and reputation score across campus."
              : "Academic grades load directly from the verified institute registry. Your detailed semester records stay strictly private."}
          </p>
        </div>

        {/* Dual Profile Switcher Segmented Control */}
        <div
          className="p-1.5 rounded-full flex items-center gap-1 self-start md:self-auto"
          style={{
            backgroundColor: "var(--color-surface-container)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <button
            type="button"
            id="view-toggle-student"
            onClick={() => setActiveView("student")}
            className="px-5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
            style={{
              backgroundColor:
                activeView === "student" ? "var(--color-primary-container)" : "transparent",
              color:
                activeView === "student" ? "var(--color-on-primary)" : "var(--color-on-surface-variant)",
              border: "none",
            }}
          >
            <span className="material-symbols-outlined text-[16px]">school</span>
            Student Profile
          </button>

          <button
            type="button"
            id="view-toggle-tutor"
            onClick={() => setActiveView("tutor")}
            className="px-5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
            style={{
              backgroundColor:
                activeView === "tutor" ? "var(--color-primary-container)" : "transparent",
              color:
                activeView === "tutor" ? "var(--color-on-primary)" : "var(--color-on-surface-variant)",
              border: "none",
            }}
          >
            <span className="material-symbols-outlined text-[16px]">military_tech</span>
            Tutor Profile
          </button>
        </div>
      </div>

      {loading && !currentStudent ? (
        <div className="p-12 text-center text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
          Loading profile credentials…
        </div>
      ) : (
        <div className="space-y-6">
          {/* ═════════════════════════════════════════════════════════════════
              IDENTITY CARD: Shared identity with photo & phone editor
          ══════════════════════════════════════════════════════════════════ */}
          <section
            className="p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between"
            style={{
              backgroundColor: "var(--color-surface-container-low)",
              borderColor: "var(--color-outline-variant)",
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Scholar Portrait with Edit Overlay */}
              <div className="relative w-20 h-20 rounded-full overflow-hidden bg-surface-container flex-shrink-0 shadow-sm border border-gray-200">
                {currentStudent?.photo_url ? (
                  <img
                    id="profile-avatar-img"
                    src={currentStudent.photo_url}
                    alt={currentStudent.full_name || "Scholar"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-2xl font-bold"
                    style={{
                      backgroundColor: "var(--color-primary-container)",
                      color: "var(--color-on-primary)",
                      fontFamily: "var(--font-jakarta)",
                    }}
                  >
                    {initials}
                  </div>
                )}
              </div>

              {/* Identity Details */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2
                    id="profile-full-name"
                    style={{
                      fontFamily: "var(--font-newsreader)",
                      fontSize: 24,
                      fontWeight: 600,
                      color: "var(--color-primary)",
                      margin: 0,
                    }}
                  >
                    {currentStudent?.full_name}
                  </h2>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide"
                    style={{
                      backgroundColor: "var(--color-primary-container)",
                      color: "var(--color-on-primary)",
                    }}
                  >
                    {currentStudent?.roll_number}
                  </span>
                </div>

                <p
                  className="text-xs font-medium"
                  style={{ color: "var(--color-on-surface-variant)", margin: 0 }}
                >
                  Year {Math.ceil((currentStudent?.current_semester || 2) / 2)} · {currentStudent?.programme || "B.Tech"}{" "}
                  {currentStudent?.department || "Computer Science & Engineering"}
                </p>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container text-primary-container text-xs font-semibold mt-1">
                  <span
                    className="material-symbols-outlined text-[16px] text-green-700"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                  <span>Institute Email &amp; Roll ID Verified</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600">Batch 2025</span>
                </div>
              </div>
            </div>

            {/* Direct Coordinates & Edit Details Button */}
            <div
              className="w-full md:w-auto p-4 rounded-xl space-y-2 min-w-[300px] border"
              style={{
                backgroundColor: "var(--color-surface-container-lowest, #ffffff)",
                borderColor: "var(--color-outline-variant)",
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="font-label-eyebrow text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Coordinates &amp; Private Contact
                </span>
                <button
                  type="button"
                  id="open-edit-contact-btn"
                  onClick={() => setShowEditContactModal(true)}
                  className="text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  style={{ color: "var(--color-secondary)", background: "none", border: "none" }}
                >
                  <span className="material-symbols-outlined text-[15px]">edit</span>
                  Edit Photo &amp; Phone
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono" style={{ color: "var(--color-on-surface)" }}>
                <span className="material-symbols-outlined text-[16px] text-gray-500">mail</span>
                <span className="truncate">{currentStudent?.institute_email}</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono" style={{ color: "var(--color-on-surface)" }}>
                <span className="material-symbols-outlined text-[16px] text-gray-500">call</span>
                <span id="display-student-phone" className="font-semibold">
                  {currentStudent?.phone || "No phone number added"}
                </span>
                <span className="text-[10px] text-gray-400 italic font-sans">(Private to peer tutors)</span>
              </div>
            </div>
          </section>

          {/* ═════════════════════════════════════════════════════════════════
              VIEW 1: STUDENT PROFILE PERSPECTIVE
          ══════════════════════════════════════════════════════════════════ */}
          {activeView === "student" && (
            <>
              {/* Semester CPI & Target Calibration */}
              <section
                className="p-6 rounded-2xl border shadow-sm space-y-6"
                style={{
                  backgroundColor: "var(--color-surface-container-low)",
                  borderColor: "var(--color-outline-variant)",
                }}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-gray-200/60">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[20px]">insights</span>
                      <h3
                        style={{
                          fontFamily: "var(--font-newsreader)",
                          fontSize: 22,
                          fontWeight: 600,
                          color: "var(--color-primary)",
                          margin: 0,
                        }}
                      >
                        Academic Trajectory · Private View
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Only you can see semester CPI and CGPA. Tutors and peers never see individual exam scores or grade point trends.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 bg-surface-container px-4 py-2 rounded-xl">
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-gray-500">Cumulative Score</div>
                      <div
                        className="text-lg font-bold"
                        style={{ color: "var(--color-primary)", fontFamily: "var(--font-newsreader)" }}
                      >
                        {currentCgpa.toFixed(2)} CGPA
                      </div>
                    </div>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs"
                      style={{
                        backgroundColor: "var(--color-primary-container)",
                        color: "var(--color-on-primary)",
                      }}
                    >
                      S{completedSemesters}
                    </div>
                  </div>
                </div>

                {/* CPI Bar Graph Grid (Matching Stitch Screen 9efca46a068742119e58a7df26256862) */}
                <div className="p-5 rounded-xl border bg-white space-y-3" style={{ borderColor: "var(--color-outline-variant)" }}>
                  <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <span>Semester-by-Semester CPI Recorded</span>
                    <span>Grading Scale Max: 10.0</span>
                  </div>

                  <div className="grid grid-cols-6 gap-3 pt-6 pb-2 items-end h-48">
                    {[
                      { sem: "S1", cpi: 7.8, label: "Monsoon '22", height: "78%" },
                      { sem: "S2", cpi: 8.1, label: "Spring '23", height: "81%" },
                      { sem: "S3", cpi: 8.4, label: "Monsoon '23", height: "84%" },
                      { sem: "S4", cpi: 8.2, label: "Spring '24", height: "82%" },
                      { sem: "S5", cpi: 8.7, label: "Monsoon '24", height: "87%" },
                      { sem: "S6 (Now)", cpi: 8.9, label: "Spring '25", height: "89%", isCurrent: true },
                    ].map((item) => (
                      <div key={item.sem} className="flex flex-col items-center h-full justify-end group">
                        <span
                          className={`text-xs font-bold mb-1 transition-transform group-hover:-translate-y-1 ${
                            item.isCurrent ? "text-amber-800" : "text-gray-600"
                          }`}
                        >
                          {item.cpi.toFixed(2)}
                        </span>
                        <div
                          className={`w-full max-w-[42px] rounded-t-md transition-all shadow-sm ${
                            item.isCurrent
                              ? "bg-amber-600 group-hover:bg-amber-700"
                              : "bg-teal-800/80 group-hover:bg-teal-900"
                          }`}
                          style={{ height: item.height }}
                        />
                        <div className="mt-2 text-center">
                          <span
                            className={`text-xs block font-bold ${
                              item.isCurrent ? "text-amber-800" : "text-gray-800"
                            }`}
                          >
                            {item.sem}
                          </span>
                          <span className="text-[10px] text-gray-400 uppercase hidden sm:block">
                            {item.label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Degree Graduation Target Calculator */}
                <div
                  className="p-5 rounded-xl border bg-white flex flex-col md:flex-row items-stretch justify-between gap-6"
                  style={{ borderColor: "var(--color-outline-variant)" }}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700">
                        DEGREE GRADUATION TARGET
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                        Active Goal
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2 pt-1">
                      <span
                        id="display-target-val"
                        className="text-3xl font-bold"
                        style={{ color: "var(--color-primary)", fontFamily: "var(--font-newsreader)" }}
                      >
                        {targetVal.toFixed(2)}
                      </span>
                      <span className="text-sm font-semibold text-gray-500">CGPA Final Goal</span>
                    </div>

                    <p className="text-xs text-gray-700 leading-relaxed pt-1">
                      Keep an average CPI of{" "}
                      <strong className="text-amber-800 font-bold" id="required-cpi-val">
                        {requiredAvg.toFixed(2)}
                      </strong>{" "}
                      across your remaining {remainingSemesters} semesters to graduate with{" "}
                      <strong>{targetVal.toFixed(2)} CGPA</strong>.
                    </p>

                    {requiredAvg > 10.0 ? (
                      <p className="text-xs font-semibold text-red-600">
                        ⚠️ Mathematically unfeasible across {remainingSemesters} semesters (Cap is 10.0). Consider adjusting your target.
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Target requires steady focus in core 3rd &amp; 4th year electives and capstone project.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col justify-center items-start md:items-end gap-2 border-t md:border-t-0 md:border-l pl-0 md:pl-6 pt-3 md:pt-0">
                    <button
                      type="button"
                      id="toggle-target-editor-btn"
                      onClick={() => setShowTargetEditor((prev) => !prev)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      style={{
                        backgroundColor: "var(--color-primary-container)",
                        color: "var(--color-on-primary)",
                        border: "none",
                      }}
                    >
                      <span className="material-symbols-outlined text-[16px]">tune</span>
                      {showTargetEditor ? "Close Slider" : "Adjust Target"}
                    </button>
                    {targetSuccess && (
                      <span className="text-[11px] font-bold text-green-700">✓ Target Saved</span>
                    )}
                  </div>
                </div>

                {/* Collapsible Target Range Adjuster */}
                {showTargetEditor && (
                  <div
                    className="p-4 rounded-xl border bg-gray-50 space-y-2"
                    style={{ borderColor: "var(--color-outline-variant)" }}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <label htmlFor="input-target-val" className="text-gray-800">
                        Adjust Target CGPA Slider:
                      </label>
                      <span className="text-gray-500">Range: 7.50 – 9.80</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-400">7.50</span>
                      <input
                        id="input-target-val"
                        name="targetCgpaSlider"
                        type="range"
                        min="7.50"
                        max="9.80"
                        step="0.05"
                        value={targetVal}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setTargetInput(val.toFixed(2));
                        }}
                        onMouseUp={() => handleUpdateTarget(parseFloat(targetInput))}
                        onTouchEnd={() => handleUpdateTarget(parseFloat(targetInput))}
                        className="w-full accent-teal-800 cursor-pointer"
                      />
                      <span className="text-xs text-gray-400">9.80</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-gray-500">Current selection: {targetVal.toFixed(2)}</span>
                      <button
                        type="button"
                        id="save-target-btn"
                        disabled={isUpdatingTarget}
                        onClick={() => handleUpdateTarget(parseFloat(targetInput))}
                        className="px-3 py-1 rounded text-xs font-bold cursor-pointer"
                        style={{
                          backgroundColor: "var(--color-secondary)",
                          color: "#ffffff",
                          border: "none",
                        }}
                      >
                        {isUpdatingTarget ? "Saving…" : "Save Target"}
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Areas of Interest & Learning Focus (Slide 09 & 10) */}
              <section
                className="p-6 rounded-2xl border shadow-sm space-y-4"
                style={{
                  backgroundColor: "var(--color-surface-container-low)",
                  borderColor: "var(--color-outline-variant)",
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3
                      style={{
                        fontFamily: "var(--font-newsreader)",
                        fontSize: 20,
                        fontWeight: 600,
                        color: "var(--color-primary)",
                        margin: 0,
                      }}
                    >
                      Areas of Interest &amp; Learning Focus
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      These are student profile tags. Tutor matching relies strictly on tutor Pro-Skills, not student interests.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Profile Context Only
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2" id="interest-chips-container">
                  {interests.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-gray-200 shadow-2xs"
                    >
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveInterest(item)}
                        aria-label={`Remove interest ${item}`}
                        className="text-gray-400 hover:text-red-600 cursor-pointer"
                        style={{ background: "none", border: "none", padding: 0 }}
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 max-w-md pt-1">
                  <label htmlFor="new-interest-input" className="sr-only">
                    Add new interest
                  </label>
                  <input
                    id="new-interest-input"
                    name="newInterestTag"
                    type="text"
                    placeholder="Add subject (e.g. Distributed Systems, Compilers)"
                    value={newInterestInput}
                    onChange={(e) => setNewInterestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddInterest();
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-lg border text-xs bg-white"
                    style={{ borderColor: "var(--color-outline-variant)" }}
                  />
                  <button
                    type="button"
                    id="add-interest-btn"
                    onClick={handleAddInterest}
                    className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                    style={{
                      backgroundColor: "var(--color-primary-container)",
                      color: "var(--color-on-primary)",
                      border: "none",
                    }}
                  >
                    + Add
                  </button>
                </div>
              </section>

              {/* Official Semester Records Table */}
              <section
                className="p-6 rounded-2xl border shadow-sm"
                style={{
                  backgroundColor: "var(--color-surface-container-low)",
                  borderColor: "var(--color-outline-variant)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-newsreader)",
                    fontSize: 20,
                    fontWeight: 600,
                    color: "var(--color-primary)",
                    margin: "0 0 1rem 0",
                  }}
                >
                  Official Institute Semester Records
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs" style={{ borderCollapse: "collapse" }}>
                    <thead>
                      <tr
                        className="border-b"
                        style={{
                          borderColor: "var(--color-outline-variant)",
                          color: "var(--color-on-surface-variant)",
                        }}
                      >
                        <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Semester</th>
                        <th className="py-2.5 px-3 font-bold uppercase tracking-wider">SGPA</th>
                        <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Cumulative CPI</th>
                        <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Credits Earned</th>
                        <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Standing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(academics?.semesterRecords && academics.semesterRecords.length > 0
                        ? academics.semesterRecords
                        : [
                            { semester: 1, cpi: 7.8, spi: 7.8, credits_earned: 22 },
                            { semester: 2, cpi: 8.1, spi: 8.4, credits_earned: 22 },
                            { semester: 3, cpi: 8.4, spi: 8.6, credits_earned: 24 },
                            { semester: 4, cpi: 8.2, spi: 8.0, credits_earned: 24 },
                            { semester: 5, cpi: 8.7, spi: 9.1, credits_earned: 22 },
                            { semester: 6, cpi: 8.9, spi: 9.2, credits_earned: 20 },
                          ]
                      ).map((rec: any, idx: number) => (
                        <tr
                          key={idx}
                          className="border-b hover:bg-black/5"
                          style={{ borderColor: "var(--color-outline-variant)" }}
                        >
                          <td className="py-3 px-3 font-semibold">Semester {rec.semester}</td>
                          <td className="py-3 px-3">{(rec.spi || rec.sgpa || rec.cpi)?.toFixed(2)}</td>
                          <td className="py-3 px-3 font-bold" style={{ color: "var(--color-primary)" }}>
                            {rec.cpi?.toFixed(2)}
                          </td>
                          <td className="py-3 px-3">{rec.credits_earned || 22}</td>
                          <td className="py-3 px-3">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                              style={{ backgroundColor: "#e8f5e9", color: "#2e7d32" }}
                            >
                              Clear
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              VIEW 2: TUTOR ACCREDITATION PERSPECTIVE
          ══════════════════════════════════════════════════════════════════ */}
          {activeView === "tutor" && (
            <div className="space-y-6">
              {/* Top Tutor Accreditation Hero */}
              <div
                className="p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                style={{
                  backgroundColor: "var(--color-surface-container-low)",
                  borderColor: "var(--color-outline-variant)",
                }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900">
                      TUTOR ACCREDITATION LEVEL II
                    </span>
                    <span className="text-gray-400">·</span>
                    <span className="text-xs text-gray-500 font-semibold">Faculty Coordinated</span>
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-newsreader)",
                      fontSize: 22,
                      fontWeight: 600,
                      color: "var(--color-primary)",
                      margin: 0,
                    }}
                  >
                    Verified Tutor Identity &amp; Mastered Pro Skills
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Only accredited skills are used to match you with peers in the matched doubts inbox.
                  </p>
                </div>

                {/* Availability Toggle */}
                <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-gray-200">
                  <span className="text-xs font-semibold text-gray-700">Accepting Peer Requests</span>
                  <button
                    type="button"
                    id="tutor-availability-toggle"
                    onClick={() => setTutorAvailable((prev) => !prev)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                      tutorAvailable ? "bg-teal-800" : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        tutorAvailable ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Mastered Pro Skills Section */}
              <section
                className="p-6 rounded-2xl border shadow-sm space-y-4"
                style={{
                  backgroundColor: "var(--color-surface-container-low)",
                  borderColor: "var(--color-outline-variant)",
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-900/10 flex items-center justify-center text-teal-900">
                      <span className="material-symbols-outlined text-[22px]">badge</span>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Academic Accreditations
                      </div>
                      <h4
                        style={{
                          fontFamily: "var(--font-newsreader)",
                          fontSize: 20,
                          fontWeight: 600,
                          color: "var(--color-primary)",
                          margin: 0,
                        }}
                      >
                        Mastered Pro Skills
                      </h4>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="open-skills-modal-btn"
                    onClick={() => setShowSkillsModal(true)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                    style={{
                      backgroundColor: "var(--color-primary-container)",
                      color: "var(--color-on-primary)",
                      border: "none",
                    }}
                  >
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                    + Add pro skill qualification
                  </button>
                </div>

                <div className="space-y-2">
                  <span className="text-xs text-gray-600 block">
                    Verified competency tags recognized across campus peer tutoring sessions:
                  </span>
                  {myProSkills.length === 0 ? (
                    <p className="text-xs italic text-gray-500">
                      No tutor pro skills selected yet. Click "+ Add pro skill qualification" to unlock doubt matching!
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {myProSkills.map((sk) => (
                        <span
                          key={sk.id}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                          style={{
                            backgroundColor: "var(--color-primary-container)",
                            color: "var(--color-on-primary)",
                          }}
                        >
                          <span className="material-symbols-outlined text-[14px]">check</span>
                          {sk.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center gap-2 text-xs text-gray-500">
                  <span className="material-symbols-outlined text-green-700 text-[18px]">verified</span>
                  <span>Skills validated against prerequisite course grades &amp; semester transcripts.</span>
                </div>
              </section>

              {/* Reputation & Leaderboard Dual Card Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Reputation & Standing */}
                <div
                  className="p-6 rounded-2xl border shadow-sm space-y-4"
                  style={{
                    backgroundColor: "var(--color-surface-container-low)",
                    borderColor: "var(--color-outline-variant)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-label-eyebrow uppercase text-[10px] font-bold text-gray-500 tracking-wider">
                      Reputation &amp; Standing
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-900">
                      Top 10%
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 pt-2">
                    <span
                      className="text-5xl font-bold"
                      style={{ color: "var(--color-primary)", fontFamily: "var(--font-newsreader)" }}
                    >
                      {tutorData?.proficiencyScore || 78}
                    </span>
                    <span className="text-xl font-normal text-gray-400">/ 100</span>
                    <span className="text-xs text-amber-800 font-semibold ml-2">Updated weekly</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-gray-200 flex items-start gap-2 text-xs text-gray-600">
                    <span className="material-symbols-outlined text-gray-400 text-[18px] shrink-0 mt-0.5">
                      visibility_off
                    </span>
                    <p className="m-0 leading-relaxed">
                      Individual student ratings stay hidden to keep reviews honest and prevent academic retaliation.
                    </p>
                  </div>
                </div>

                {/* Campus Leaderboard Position */}
                <div
                  className="p-6 rounded-2xl border shadow-sm space-y-4"
                  style={{
                    backgroundColor: "var(--color-surface-container-low)",
                    borderColor: "var(--color-outline-variant)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-amber-700 text-[20px]">military_tech</span>
                      <h4
                        style={{
                          fontFamily: "var(--font-newsreader)",
                          fontSize: 18,
                          fontWeight: 600,
                          color: "var(--color-primary)",
                          margin: 0,
                        }}
                      >
                        Campus Standing
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-amber-800">Batch 2025</span>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="text-2xl font-bold text-amber-800"
                        style={{ fontFamily: "var(--font-newsreader)" }}
                      >
                        #7
                      </span>
                      <div>
                        <div className="text-xs font-bold text-gray-800">You ({currentStudent?.full_name})</div>
                        <div className="text-[11px] text-gray-500">Year 2 · 24 solved doubts</div>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-amber-900">78 pts</span>
                  </div>

                  <div className="text-xs text-gray-500 flex items-center justify-between pt-1">
                    <span>Rank calculated from solved questions, promptness &amp; ratings.</span>
                    <a
                      href="/analytics?tab=leaderboard"
                      className="font-semibold text-teal-800 hover:underline"
                    >
                      View Leaderboard →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          MODAL: EDIT PHOTO URL & PHONE NUMBER
      ══════════════════════════════════════════════════════════════════════ */}
      {showEditContactModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowEditContactModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--color-surface-container-lowest, #ffffff)",
              border: "1px solid var(--color-outline-variant)",
            }}
          >
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <h3
                  style={{
                    fontFamily: "var(--font-newsreader)",
                    fontSize: 20,
                    fontWeight: 600,
                    color: "var(--color-primary)",
                    margin: 0,
                  }}
                >
                  Edit Profile Photo &amp; Phone
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Update your publicly displayed scholar photo and private contact number.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditContactModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                style={{ background: "none", border: "none" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-4">
              {/* Photo Preview */}
              <div className="flex items-center gap-4 py-2">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border border-gray-300 flex-shrink-0">
                  {photoUrlInput ? (
                    <img
                      src={photoUrlInput}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-lg">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  <div className="font-semibold text-gray-700 mb-1">Scholar Photo Preview</div>
                  Enter an image URL below (e.g. from Unsplash or campus cloud directory).
                </div>
              </div>

              <div>
                <label htmlFor="input-photo-url" className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Profile Photo URL
                </label>
                <input
                  id="input-photo-url"
                  name="photoUrl"
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={photoUrlInput}
                  onChange={(e) => setPhotoUrlInput(e.target.value)}
                  className="w-full p-2.5 rounded-lg border text-sm"
                  style={{ borderColor: "var(--color-outline-variant)" }}
                />
              </div>

              <div>
                <label htmlFor="input-phone-number" className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Phone Number (Private)
                </label>
                <input
                  id="input-phone-number"
                  name="phoneNumber"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full p-2.5 rounded-lg border text-sm"
                  style={{ borderColor: "var(--color-outline-variant)" }}
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Used exclusively for calendar coordinates during 1-on-1 tutoring sessions.
                </span>
              </div>

              {contactSuccess && (
                <div className="p-2.5 rounded-lg bg-green-50 text-green-700 text-xs font-bold text-center">
                  ✓ Profile coordinates saved successfully!
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditContactModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{
                    backgroundColor: "var(--color-surface-container)",
                    color: "var(--color-on-surface-variant)",
                    border: "none",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="save-contact-btn"
                  disabled={isSavingContact}
                  className="px-5 py-2 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--color-primary-container)",
                    color: "var(--color-on-primary)",
                    border: "none",
                  }}
                >
                  {isSavingContact ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          MODAL: SELECT TUTOR PRO SKILLS
      ══════════════════════════════════════════════════════════════════════ */}
      {showSkillsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowSkillsModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--color-surface-container-lowest, #ffffff)",
              border: "1px solid var(--color-outline-variant)",
            }}
          >
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <h3
                  style={{
                    fontFamily: "var(--font-newsreader)",
                    fontSize: 20,
                    fontWeight: 600,
                    color: "var(--color-primary)",
                    margin: 0,
                  }}
                >
                  Select Mastered Tutor Skills
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select the subjects you are ready to help peers solve in 1-on-1 sessions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSkillsModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                style={{ background: "none", border: "none" }}
              >
                ✕
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
                      backgroundColor: isSelected
                        ? "var(--color-surface-container-highest)"
                        : "transparent",
                      borderColor: isSelected
                        ? "var(--color-primary-container)"
                        : "var(--color-outline-variant)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="material-symbols-outlined text-[16px]"
                        style={{
                          color: isSelected ? "var(--color-primary-container)" : "var(--color-outline)",
                        }}
                      >
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
                style={{
                  backgroundColor: "var(--color-surface-container)",
                  color: "var(--color-on-surface-variant)",
                  border: "none",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                id="save-skills-modal-btn"
                disabled={isSavingSkills}
                onClick={handleSaveSkills}
                className="px-5 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: "var(--color-primary-container)",
                  color: "var(--color-on-primary)",
                  border: "none",
                }}
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

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="p-8 text-center text-sm">Loading profile…</div>
        </PageShell>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
