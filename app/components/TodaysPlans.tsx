"use client";

import { useState } from "react";

type Priority = "High" | "Hard" | "Medium";

interface TodoItem {
  id: string;
  title: string;
  priority: Priority;
  dueLabel: string;
  completed: boolean;
  hasSuggestion?: boolean;
}

const initialItems: TodoItem[] = [
  {
    id: "1",
    title: "OS assignment 3 - Thread synchronization",
    priority: "High",
    dueLabel: "Done · Thu",
    completed: true,
  },
  {
    id: "2",
    title: "DBMS unit 3 revision - Normal forms (3NF)",
    priority: "Hard",
    dueLabel: "Due Fri",
    completed: false,
    hasSuggestion: true,
  },
  {
    id: "3",
    title: "Mock test preparation - Data structures",
    priority: "Medium",
    dueLabel: "Due Sat",
    completed: false,
  },
];

const priorityStyles: Record<Priority, { bg: string; color: string }> = {
  High:   { bg: "var(--color-surface-container-highest)", color: "var(--color-on-surface-variant)" },
  Hard:   { bg: "var(--color-secondary-fixed)",            color: "var(--color-on-secondary-fixed)" },
  Medium: { bg: "var(--color-surface-container-highest)", color: "var(--color-on-surface-variant)" },
};

export default function TodaysPlans() {
  const [items, setItems] = useState(initialItems);

  const completed = items.filter((i) => i.completed).length;
  const total = items.length;
  const pct = Math.round((completed / total) * 100);

  const toggle = (id: string) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i))
    );

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
            className="font-headline-sm"
            style={{ color: "var(--color-primary)", fontFamily: "var(--font-newsreader)", fontSize: 20, fontWeight: 500 }}
          >
            Today&apos;s Plans &amp; To-Dos
          </h2>
        </div>
        <span
          className="font-label-eyebrow uppercase tracking-wider"
          style={{ color: "var(--color-on-surface-variant)", fontSize: 11 }}
        >
          {total} Scheduled
        </span>
      </div>

      {/* Weekly progress bar */}
      <div
        className="p-4 rounded-xl space-y-2"
        style={{ backgroundColor: "var(--color-surface-container-low)" }}
      >
        <div className="flex justify-between items-center">
          <span
            className="font-title-sm"
            style={{ color: "var(--color-on-surface)", fontSize: 13, fontWeight: 600 }}
          >
            Weekly Goal Completion
          </span>
          <span
            className="font-title-sm font-semibold"
            style={{ color: "var(--color-primary-container)", fontSize: 13 }}
          >
            {completed} of {total} completed this week
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
                onChange={() => toggle(item.id)}
                className="w-4 h-4 mt-0.5 rounded cursor-pointer flex-shrink-0"
                style={{ accentColor: "var(--color-primary-container)" }}
                aria-label={`Mark "${item.title}" as ${item.completed ? "incomplete" : "complete"}`}
              />
              <div className="space-y-1 min-w-0">
                <p
                  className="font-body-md truncate"
                  style={{
                    color: item.completed
                      ? "var(--color-on-surface-variant)"
                      : "var(--color-on-surface)",
                    textDecoration: item.completed ? "line-through" : "none",
                    fontSize: 14,
                    fontWeight: item.completed ? 400 : 600,
                  }}
                >
                  {item.title}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className="px-1.5 py-0.5 rounded font-label-sm text-[10px]"
                    style={priorityStyles[item.priority]}
                  >
                    {item.priority}
                  </span>
                  <span
                    className="font-body-sm text-[11px]"
                    style={{
                      color: item.completed
                        ? "var(--color-on-surface-variant)"
                        : item.priority === "Hard"
                        ? "var(--color-secondary)"
                        : "var(--color-on-surface-variant)",
                      fontWeight: item.priority === "Hard" && !item.completed ? 500 : 400,
                    }}
                  >
                    {item.dueLabel}
                  </span>
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
            ) : item.hasSuggestion ? (
              <button className="btn-teal self-start sm:self-auto flex-shrink-0">
                <span className="material-symbols-outlined text-[16px]">psychology</span>
                Ask Suggestion
              </button>
            ) : (
              <button
                className="flex-shrink-0"
                style={{ color: "var(--color-outline)" }}
                aria-label="More options"
              >
                <span className="material-symbols-outlined text-[18px]">more_vert</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
