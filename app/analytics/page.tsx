"use client";
import { useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import { useAuth } from "../../lib/auth-context";
import { apiGetCampusStats, type CampusStats } from "../../lib/api";

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<CampusStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiGetCampusStats(token)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [token]);

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
        Analytics &amp; Ranks
      </h1>

      {loading && (
        <p style={{ color: "var(--color-on-surface-variant)", fontFamily: "var(--font-jakarta)", fontSize: 14 }}>
          Loading campus stats…
        </p>
      )}

      {!loading && stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
          {[
            { label: "Total Doubts", value: stats.totalDoubts, icon: "help_center" },
            { label: "Doubts Solved", value: stats.solvedDoubts, icon: "check_circle" },
            { label: "Active Tutors", value: stats.activeTutors, icon: "school" },
          ].map((s) => (
            <div key={s.label} className="card" style={{ textAlign: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: "var(--color-primary-container)", display: "block", marginBottom: 8 }}>
                {s.icon}
              </span>
              <div style={{ fontFamily: "var(--font-newsreader)", fontSize: 36, fontWeight: 500, color: "var(--color-primary)" }}>
                {s.value}
              </div>
              <div style={{ fontFamily: "var(--font-jakarta)", fontSize: 12, color: "var(--color-on-surface-variant)", marginTop: 4 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !stats && (
        <div className="card" style={{ textAlign: "center", color: "var(--color-on-surface-variant)", padding: "3rem" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 36, display: "block", marginBottom: 8 }}>insights</span>
          Analytics data is being compiled. Check back soon.
        </div>
      )}
    </PageShell>
  );
}
