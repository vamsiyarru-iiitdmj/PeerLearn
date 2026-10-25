"use client";

import { useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import { useAuth } from "../../lib/auth-context";
import {
  apiGetCampusStats,
  apiGetTutorLeaderboard,
  type CampusStats,
} from "../../lib/api";

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<CampusStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        const [statsData, lbData] = await Promise.all([
          apiGetCampusStats(token || undefined),
          token ? apiGetTutorLeaderboard(token).catch(() => ({ leaderboard: [] })) : Promise.resolve({ leaderboard: [] }),
        ]);
        setStats(statsData);
        setLeaderboard(lbData?.leaderboard || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [token]);

  return (
    <PageShell>
      <div className="mb-6">
        <h1
          style={{
            fontFamily: "var(--font-newsreader)",
            fontSize: 28,
            fontWeight: 500,
            color: "var(--color-primary)",
            margin: 0,
          }}
        >
          Campus Analytics &amp; Peer Rankings
        </h1>
        <p
          style={{
            fontFamily: "var(--font-jakarta)",
            fontSize: 13,
            color: "var(--color-on-surface-variant)",
            marginTop: 4,
          }}
        >
          Live statistics computed directly from IIITDMJ peer learning sessions and doubts.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
          Compiling live campus analytics…
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Metrics Grid */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Doubts Raised",
                  value: stats.totalDoubts,
                  icon: "help_center",
                  color: "var(--color-primary-container)",
                },
                {
                  label: "Doubts Resolved",
                  value: stats.solvedDoubts,
                  icon: "check_circle",
                  color: "#2e7d63",
                },
                {
                  label: "Resolution Success Rate",
                  value: `${stats.solvedPercentage ?? 0}%`,
                  icon: "trending_up",
                  color: "var(--color-secondary)",
                },
                {
                  label: "Active Peer Tutors",
                  value: stats.activeTutors,
                  icon: "school",
                  color: "#ba1a1a",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-5 rounded-2xl border shadow-sm text-center"
                  style={{
                    backgroundColor: "var(--color-surface-container-low)",
                    borderColor: "var(--color-outline-variant)",
                  }}
                >
                  <span
                    className="material-symbols-outlined text-[28px] block mx-auto mb-2"
                    style={{ color: s.color }}
                  >
                    {s.icon}
                  </span>
                  <div
                    style={{
                      fontFamily: "var(--font-newsreader)",
                      fontSize: 32,
                      fontWeight: 600,
                      color: "var(--color-primary)",
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-jakarta)",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--color-on-surface-variant)",
                      marginTop: 4,
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Peer Leaderboard Table */}
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
                  Hall of Fame
                </span>
                <h3
                  style={{
                    fontFamily: "var(--font-newsreader)",
                    fontSize: 22,
                    fontWeight: 600,
                    color: "var(--color-primary)",
                    margin: "2px 0 0",
                  }}
                >
                  Top Peer Tutors &amp; Mentors
                </h3>
              </div>
              <span className="chip-resolved flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">military_tech</span>
                Endorsed Tutors
              </span>
            </div>

            {leaderboard.length === 0 ? (
              <div
                className="p-8 text-center text-xs"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                No sessions completed yet. As tutors resolve doubts and students confirm sessions, the leaderboard will populate in real time!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr className="border-b" style={{ borderColor: "var(--color-outline-variant)", color: "var(--color-on-surface-variant)" }}>
                      <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Rank</th>
                      <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Tutor</th>
                      <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Department</th>
                      <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Doubts Solved</th>
                      <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Proficiency Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-black/5" style={{ borderColor: "var(--color-outline-variant)" }}>
                        <td className="py-3 px-3 font-bold">
                          {idx === 0 ? "🥇 #1" : idx === 1 ? "🥈 #2" : idx === 2 ? "🥉 #3" : `#${idx + 1}`}
                        </td>
                        <td className="py-3 px-3 font-semibold" style={{ color: "var(--color-primary)" }}>
                          {item.fullName || item.full_name || "Tutor"}
                        </td>
                        <td className="py-3 px-3">{item.department || "CSE"}</td>
                        <td className="py-3 px-3 font-bold" style={{ color: "#2e7d63" }}>
                          {item.doubtsSolved ?? item.doubts_solved ?? 0}
                        </td>
                        <td className="py-3 px-3 font-semibold">
                          {item.proficiencyScore ?? item.proficiency_score ?? "95"}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}
