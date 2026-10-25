"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth-context";
import { apiGetTasks, apiToggleTask, type Task } from "../../lib/api";

const priorityStyles: Record<string, { bg: string; color: string }> = {
  High:   { bg: "var(--color-surface-container-highest)", color: "var(--color-on-surface-variant)" },
  Hard:   { bg: "var(--color-secondary-fixed)",            color: "var(--color-on-secondary-fixed)" },
  Medium: { bg: "var(--color-surface-container-highest)", color: "var(--color-on-surface-variant)" },
  Low:    { bg: "var(--color-surface-container-highest)", color: "var(--color-on-surface-variant)" },
};

export default function TodaysPlans() {
  const { token } = useAuth();
  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiGetTasks(token)
      .then(setItems)
      .catch((e) => setError(e.message ?? "Failed to load tasks"))
      .finally(() => setLoading(false));
  }, [token]);

  const completed = items.filter((i) => i.completed).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const toggle = async (id: string, current: boolean) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, completed: !current } : i))
    );
    try {
      if (token) await apiToggleTask(id, token);
    } catch {
      // Revert on error
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, completed: current } : i))
      );
    }
  };

  return (
    <section className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ color: "var(--color-primary-container)" }}
          >
            checklist
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
            Today&apos;s Plans &amp; To-Dos
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {!loading && (
            <span style={{ color: "var(--color-on-surface-variant)", fontSize: 11, fontFamily: "var(--font-jakarta)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {total} Scheduled
            </span>
          )}
          <Link
            href="/planner"
            style={{
              color: "var(--color-secondary)",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "var(--font-jakarta)",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            Planner <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ padding: "1rem 0", textAlign: "center", color: "var(--color-on-surface-variant)", fontFamily: "var(--font-jakarta)", fontSize: 13 }}>
          Loading tasks…
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius)", backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)", fontFamily: "var(--font-jakarta)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <div style={{ padding: "2rem", textAlign: "center", borderRadius: "var(--radius-md)", backgroundColor: "var(--color-surface-container-low)" }}>
          <span className="material-symbols-outlined text-[32px]" style={{ color: "var(--color-outline)", display: "block", margin: "0 auto 8px" }}>task_alt</span>
          <p style={{ color: "var(--color-on-surface-variant)", fontFamily: "var(--font-jakarta)", fontSize: 13, margin: "0 0 12px 0" }}>
            No tasks scheduled. Organize your day with the planner!
          </p>
          <Link href="/planner" className="btn-secondary" style={{ display: "inline-flex", textDecoration: "none" }}>
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add First Task
          </Link>
        </div>
      )}

      {!loading && items.length > 0 && (
        <>
          {/* Progress bar */}
          <div
            className="p-4 rounded-xl space-y-2"
            style={{ backgroundColor: "var(--color-surface-container-low)" }}
          >
            <div className="flex justify-between items-center">
              <span style={{ color: "var(--color-on-surface)", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-jakarta)" }}>
                Weekly Goal Completion
              </span>
              <span style={{ color: "var(--color-primary-container)", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-jakarta)" }}>
                {completed} of {total} completed
              </span>
            </div>
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ backgroundColor: "var(--color-surface-container-highest)", height: 8 }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: "var(--color-primary-container)" }}
              />
            </div>
          </div>

          {/* To-Do items */}
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
                style={{
                  backgroundColor: item.completed
                    ? "rgba(240,238,233,0.6)"
                    : "var(--color-surface-container-low)",
                }}
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => toggle(item.id, item.completed)}
                    className="w-4 h-4 mt-0.5 rounded cursor-pointer flex-shrink-0"
                    style={{ accentColor: "var(--color-primary-container)" }}
                    aria-label={`Mark "${item.title}" as ${item.completed ? "incomplete" : "complete"}`}
                  />
                  <div className="space-y-1 min-w-0">
                    <p
                      className="font-body-md truncate"
                      style={{
                        color: item.completed ? "var(--color-on-surface-variant)" : "var(--color-on-surface)",
                        textDecoration: item.completed ? "line-through" : "none",
                        fontSize: 14,
                        fontWeight: item.completed ? 400 : 600,
                        fontFamily: "var(--font-jakarta)",
                        margin: 0,
                      }}
                    >
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px]"
                        style={priorityStyles[item.is_tough ? "Hard" : item.priority] ?? priorityStyles.Medium}
                      >
                        {item.is_tough ? "Hard" : item.priority}
                      </span>
                      {item.due_date && (
                        <span style={{ color: "var(--color-on-surface-variant)", fontSize: 11, fontFamily: "var(--font-jakarta)" }}>
                          Due {new Date(item.due_date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side */}
                {item.completed ? (
                  <span
                    className="material-symbols-outlined text-[18px] flex-shrink-0"
                    style={{ color: "var(--color-tertiary-container)" }}
                  >
                    check_circle
                  </span>
                ) : item.is_tough ? (
                  <Link
                    href="/planner"
                    className="btn-teal self-start sm:self-auto flex-shrink-0 flex items-center gap-1.5"
                    style={{ textDecoration: "none" }}
                  >
                    <span className="material-symbols-outlined text-[16px]">psychology</span>
                    Ask Suggestion
                  </Link>
                ) : (
                  <Link
                    href="/planner"
                    className="flex-shrink-0 p-1 rounded hover:bg-black/5"
                    style={{ color: "var(--color-outline)", textDecoration: "none" }}
                    aria-label="Manage in planner"
                    title="Manage in planner"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
