"use client";
import PageShell from "../components/PageShell";
import { useAuth } from "../../lib/auth-context";

export default function ProfilePage() {
  const { student } = useAuth();

  return (
    <PageShell>
      <h1
        style={{
          fontFamily: "var(--font-newsreader)",
          fontSize: 28,
          fontWeight: 500,
          color: "var(--color-primary)",
          margin: "0 0 1.5rem 0",
        }}
      >
        My Profile
      </h1>

      {student && (
        <div className="card" style={{ maxWidth: 520 }}>
          {/* Avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginBottom: "1.5rem" }}>
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
              {student.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-newsreader)", fontSize: 22, fontWeight: 500, color: "var(--color-primary)" }}>
                {student.full_name}
              </div>
              <div style={{ fontFamily: "var(--font-jakarta)", fontSize: 12, color: "var(--color-on-surface-variant)", marginTop: 2 }}>
                {student.roll_number} · {student.department} · Semester {student.current_semester}
              </div>
            </div>
          </div>

          {/* Fields */}
          {[
            { label: "Email", value: student.institute_email || student.personal_email, icon: "mail" },
            { label: "CPI", value: student.current_cpi?.toFixed(2) ?? "Not available", icon: "grade" },
            { label: "Department", value: student.department, icon: "business" },
            { label: "Semester", value: `Semester ${student.current_semester}`, icon: "calendar_today" },
          ].map((f) => (
            <div
              key={f.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "0.75rem 0",
                borderBottom: "1px solid var(--color-outline-variant)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--color-primary-container)", flexShrink: 0 }}>
                {f.icon}
              </span>
              <div>
                <div style={{ fontFamily: "var(--font-jakarta)", fontSize: 10, fontWeight: 700, color: "var(--color-on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {f.label}
                </div>
                <div style={{ fontFamily: "var(--font-jakarta)", fontSize: 14, color: "var(--color-on-surface)", fontWeight: 500, marginTop: 1 }}>
                  {f.value}
                </div>
              </div>
            </div>
          ))}

          <div style={{ marginTop: "1rem" }}>
            <span className="chip-resolved">
              <span className="material-symbols-outlined" style={{ fontSize: 13, marginRight: 4 }}>verified</span>
              IIITDMJ Verified Student
            </span>
          </div>
        </div>
      )}
    </PageShell>
  );
}
