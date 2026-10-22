"use client";

import { useState, useEffect } from "react";
import PageShell from "../components/PageShell";
import { useAuth } from "../../lib/auth-context";
import {
  apiGetTasks,
  apiCreateTask,
  apiToggleTask,
  apiToggleTaskTough,
  apiDeleteTask,
  apiAskSuggestion,
  type Task,
} from "../../lib/api";

const priorityStyles: Record<string, { bg: string; color: string; border: string }> = {
  High: {
    bg: "rgba(186, 26, 26, 0.08)",
    color: "#ba1a1a",
    border: "rgba(186, 26, 26, 0.2)",
  },
  Hard: {
    bg: "var(--color-secondary-fixed)",
    color: "var(--color-on-secondary-fixed)",
    border: "transparent",
  },
  Medium: {
    bg: "rgba(183, 110, 0, 0.08)",
    color: "#8c5300",
    border: "rgba(183, 110, 0, 0.2)",
  },
  Low: {
    bg: "var(--color-surface-container-highest)",
    color: "var(--color-on-surface-variant)",
    border: "transparent",
  },
};

export default function PlannerPage() {
  const { token, student } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "COMPLETED" | "TOUGH">("ALL");

  // Create Task Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContext, setNewContext] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newPriority, setNewPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [newIsTough, setNewIsTough] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Ask Suggestion Modal state
  const [suggestionTask, setSuggestionTask] = useState<Task | null>(null);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [suggestionTime, setSuggestionTime] = useState("");
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);
  const [suggestionSuccess, setSuggestionSuccess] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiGetTasks(token);
      setTasks(data);
    } catch (e: any) {
      setError(e.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [token]);

  const handleToggleComplete = async (taskId: string, current: boolean) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !current } : t))
    );
    try {
      if (token) await apiToggleTask(taskId, token);
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed: current } : t))
      );
    }
  };

  const handleToggleTough = async (taskId: string, current: boolean) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, is_tough: !current } : t))
    );
    try {
      if (token) await apiToggleTaskTough(taskId, token);
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, is_tough: current } : t))
      );
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      if (token) await apiDeleteTask(taskId, token);
    } catch (err: any) {
      alert("Failed to delete task: " + err.message);
      fetchTasks();
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !token) return;
    setIsSubmittingTask(true);
    try {
      await apiCreateTask(
        {
          title: newTitle.trim(),
          context: newContext.trim() || undefined,
          dueAt: newDueDate ? new Date(newDueDate).toISOString() : undefined,
          priority: newPriority,
          isTough: newIsTough,
        },
        token
      );
      setNewTitle("");
      setNewContext("");
      setNewDueDate("");
      setNewPriority("MEDIUM");
      setNewIsTough(false);
      setShowCreateModal(false);
      await fetchTasks();
    } catch (err: any) {
      alert("Failed to create task: " + err.message);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleAskSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionTask || !suggestionQuery.trim() || !token) return;
    setIsSubmittingSuggestion(true);
    setSuggestionSuccess(null);
    try {
      await apiAskSuggestion(
        suggestionTask.id,
        {
          query: suggestionQuery.trim(),
          timeAvailable: suggestionTime.trim() || undefined,
        },
        token
      );
      setSuggestionSuccess("Study plan suggestion request broadcast to peer tutors!");
      setTimeout(() => {
        setSuggestionTask(null);
        setSuggestionQuery("");
        setSuggestionTime("");
        setSuggestionSuccess(null);
        fetchTasks();
      }, 1500);
    } catch (err: any) {
      alert("Failed to ask suggestion: " + err.message);
    } finally {
      setIsSubmittingSuggestion(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === "PENDING") return !t.completed;
    if (activeTab === "COMPLETED") return t.completed;
    if (activeTab === "TOUGH") return t.is_tough;
    return true;
  });

  const completedCount = tasks.filter((t) => t.completed).length;
  const toughCount = tasks.filter((t) => t.is_tough).length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <PageShell>
      {/* Page Title & Add Button */}
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
            Academic Planner &amp; Study Schedule
          </h1>
          <p
            style={{
              fontFamily: "var(--font-jakarta)",
              fontSize: 13,
              color: "var(--color-on-surface-variant)",
              marginTop: 4,
            }}
          >
            Manage syllabus milestones, track tough concepts, and request peer study plans.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          style={{
            backgroundColor: "var(--color-primary-container)",
            color: "var(--color-on-primary)",
            padding: "0.6rem 1.25rem",
            borderRadius: "var(--radius-md)",
            border: "none",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <span className="material-symbols-outlined text-[18px]">add_task</span>
          Create New Task
        </button>
      </div>

      {/* Progress & Overview Card */}
      <div
        className="p-5 rounded-2xl mb-6 shadow-sm border"
        style={{
          backgroundColor: "var(--color-surface-container-low)",
          borderColor: "var(--color-outline-variant)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
          <div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--color-primary-container)",
                fontFamily: "var(--font-jakarta)",
              }}
            >
              Weekly Milestone Completion
            </span>
            <h3
              style={{
                fontFamily: "var(--font-newsreader)",
                fontSize: 22,
                fontWeight: 500,
                color: "var(--color-on-surface)",
                margin: "2px 0 0",
              }}
            >
              {completedCount} of {tasks.length} Tasks Finished ({progressPct}%)
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold" style={{ fontFamily: "var(--font-jakarta)" }}>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ backgroundColor: "var(--color-surface-container-highest)" }}>
              <span className="material-symbols-outlined text-[14px]" style={{ color: "#ba1a1a" }}>psychology</span>
              <span>{toughCount} Marked Tough</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ backgroundColor: "var(--color-surface-container-highest)" }}>
              <span className="material-symbols-outlined text-[14px]" style={{ color: "#2e7d63" }}>check_circle</span>
              <span>{completedCount} Completed</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--color-surface-container-highest)", height: 8 }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, backgroundColor: "var(--color-primary-container)" }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-4 border-b pb-2" style={{ borderColor: "var(--color-outline-variant)" }}>
        {(["ALL", "PENDING", "COMPLETED", "TOUGH"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            style={{
              backgroundColor: activeTab === tab ? "var(--color-primary-container)" : "transparent",
              color: activeTab === tab ? "var(--color-on-primary)" : "var(--color-on-surface-variant)",
              border: "none",
              fontFamily: "var(--font-jakarta)",
            }}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()} Tasks
            {tab === "ALL" && ` (${tasks.length})`}
            {tab === "PENDING" && ` (${tasks.length - completedCount})`}
            {tab === "COMPLETED" && ` (${completedCount})`}
            {tab === "TOUGH" && ` (${toughCount})`}
          </button>
        ))}
      </div>

      {/* Task List */}
      {loading && (
        <div className="p-8 text-center text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
          Loading your planner tasks…
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl text-sm mb-4" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
          {error}
        </div>
      )}

      {!loading && filteredTasks.length === 0 && (
        <div
          className="p-12 text-center rounded-2xl border"
          style={{
            backgroundColor: "var(--color-surface-container-low)",
            borderColor: "var(--color-outline-variant)",
          }}
        >
          <span className="material-symbols-outlined text-[42px] block mb-2" style={{ color: "var(--color-outline)" }}>
            playlist_add_check
          </span>
          <h4 style={{ fontFamily: "var(--font-newsreader)", fontSize: 18, color: "var(--color-on-surface)", margin: "0 0 6px" }}>
            No tasks found in this view
          </h4>
          <p style={{ color: "var(--color-on-surface-variant)", fontSize: 13, margin: "0 0 16px" }}>
            Add new milestones or study tasks to keep your semester on schedule.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-secondary inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Create Task
          </button>
        </div>
      )}

      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className="p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
            style={{
              backgroundColor: task.completed ? "rgba(240, 238, 233, 0.5)" : "var(--color-surface-container-low)",
              borderColor: task.is_tough ? "rgba(186, 26, 26, 0.3)" : "var(--color-outline-variant)",
            }}
          >
            {/* Left Section: Checkbox + Title + Metadata */}
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggleComplete(task.id, task.completed)}
                className="w-4 h-4 mt-1 rounded cursor-pointer flex-shrink-0"
                style={{ accentColor: "var(--color-primary-container)" }}
                aria-label={`Mark "${task.title}" as complete`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    style={{
                      fontFamily: "var(--font-jakarta)",
                      fontSize: 15,
                      fontWeight: task.completed ? 400 : 600,
                      color: task.completed ? "var(--color-on-surface-variant)" : "var(--color-on-surface)",
                      textDecoration: task.completed ? "line-through" : "none",
                    }}
                  >
                    {task.title}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: priorityStyles[task.priority as string]?.bg || "var(--color-surface-container)",
                      color: priorityStyles[task.priority as string]?.color || "var(--color-on-surface-variant)",
                      border: `1px solid ${priorityStyles[task.priority as string]?.border || "transparent"}`,
                    }}
                  >
                    {task.priority}
                  </span>
                  {task.is_tough && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                      style={{
                        backgroundColor: "rgba(186, 26, 26, 0.1)",
                        color: "#ba1a1a",
                        border: "1px solid rgba(186, 26, 26, 0.25)",
                      }}
                    >
                      <span className="material-symbols-outlined text-[11px]">psychology</span>
                      Tough Task
                    </span>
                  )}
                </div>

                {task.context && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--color-on-surface-variant)", fontFamily: "var(--font-jakarta)" }}
                  >
                    {task.context}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-1.5 text-[11px]" style={{ color: "var(--color-on-surface-variant)" }}>
                  {task.due_date && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                      Due {new Date(task.due_date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                  )}
                  {task.task_subtasks && task.task_subtasks.length > 0 && (
                    <span className="flex items-center gap-1 font-semibold" style={{ color: "var(--color-primary-container)" }}>
                      <span className="material-symbols-outlined text-[13px]">checklist</span>
                      {task.task_subtasks.filter((st) => st.is_completed).length} / {task.task_subtasks.length} steps done
                    </span>
                  )}
                </div>

                {/* Render subtasks breakdown if any */}
                {task.task_subtasks && task.task_subtasks.length > 0 && (
                  <div className="mt-2.5 space-y-1 pl-2 border-l-2" style={{ borderColor: "var(--color-primary-container)" }}>
                    {task.task_subtasks.map((st) => (
                      <div key={st.id} className="text-xs flex items-center gap-1.5" style={{ color: "var(--color-on-surface)" }}>
                        <span className="material-symbols-outlined text-[12px]" style={{ color: st.is_completed ? "#2e7d63" : "var(--color-outline)" }}>
                          {st.is_completed ? "check_circle" : "radio_button_unchecked"}
                        </span>
                        <span style={{ textDecoration: st.is_completed ? "line-through" : "none" }}>{st.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Section: Action Buttons */}
            <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
              {/* Ask Suggestion button */}
              <button
                onClick={() => setSuggestionTask(task)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                style={{
                  backgroundColor: "var(--color-surface-container-highest)",
                  color: "var(--color-primary)",
                  border: "1px solid var(--color-outline-variant)",
                }}
                title="Ask peer tutors for a study plan recommendation"
              >
                <span className="material-symbols-outlined text-[14px]">psychology</span>
                Ask Suggestion
              </button>

              {/* Toggle Tough button */}
              <button
                onClick={() => handleToggleTough(task.id, task.is_tough)}
                className="p-1.5 rounded-lg text-xs font-semibold flex items-center cursor-pointer transition-colors"
                style={{
                  backgroundColor: task.is_tough ? "rgba(186, 26, 26, 0.12)" : "transparent",
                  color: task.is_tough ? "#ba1a1a" : "var(--color-outline)",
                  border: "1px solid var(--color-outline-variant)",
                }}
                title={task.is_tough ? "Remove Tough flag" : "Flag as Tough topic"}
              >
                <span className="material-symbols-outlined text-[16px]">priority_high</span>
              </button>

              {/* Delete button */}
              <button
                onClick={() => handleDeleteTask(task.id)}
                className="p-1.5 rounded-lg text-xs font-semibold flex items-center cursor-pointer hover:bg-red-50 transition-colors"
                style={{
                  color: "var(--color-outline)",
                  border: "none",
                  background: "none",
                }}
                title="Delete task"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE TASK MODAL */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowCreateModal(false)}
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
              <h3 style={{ fontFamily: "var(--font-newsreader)", fontSize: 20, fontWeight: 600, color: "var(--color-primary)" }}>
                Add New Study Milestone
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-500 hover:text-gray-800 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-on-surface-variant)" }}>
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Dynamic Programming knapsack variants"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: "var(--color-outline-variant)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-on-surface-variant)" }}>
                  Context / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Chapter 6 textbook exercises, CLRS problem set 2"
                  value={newContext}
                  onChange={(e) => setNewContext(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: "var(--color-outline-variant)" }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-on-surface-variant)" }}>
                    Due Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "var(--color-outline-variant)" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-on-surface-variant)" }}>
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border text-sm bg-white"
                    style={{ borderColor: "var(--color-outline-variant)" }}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="newIsTough"
                  checked={newIsTough}
                  onChange={(e) => setNewIsTough(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                  style={{ accentColor: "#ba1a1a" }}
                />
                <label htmlFor="newIsTough" className="text-xs font-semibold cursor-pointer" style={{ color: "var(--color-on-surface)" }}>
                  Mark as Tough Task (requests peer tutor workflows)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{ backgroundColor: "var(--color-surface-container)", color: "var(--color-on-surface-variant)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask || !newTitle.trim()}
                  className="px-5 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-primary-container)", color: "var(--color-on-primary)" }}
                >
                  {isSubmittingTask ? "Saving…" : "Save Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASK SUGGESTION MODAL */}
      {suggestionTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setSuggestionTask(null)}
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
                <h3 style={{ fontFamily: "var(--font-newsreader)", fontSize: 20, fontWeight: 600, color: "var(--color-primary)" }}>
                  Ask Peer Tutors for Study Workflow
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Task: &quot;{suggestionTask.title}&quot;
                </p>
              </div>
              <button
                onClick={() => setSuggestionTask(null)}
                className="p-1 text-gray-500 hover:text-gray-800 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {suggestionSuccess ? (
              <div className="p-4 rounded-xl text-center font-semibold text-sm" style={{ backgroundColor: "#e8f5e9", color: "#2e7d32" }}>
                <span className="material-symbols-outlined block text-[32px] mb-1">done_all</span>
                {suggestionSuccess}
              </div>
            ) : (
              <form onSubmit={handleAskSuggestion} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-on-surface-variant)" }}>
                    What specific part is blocking you? *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Stuck on how to define the state transitions for 2D matrix DP and space optimization."
                    value={suggestionQuery}
                    onChange={(e) => setSuggestionQuery(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "var(--color-outline-variant)" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-on-surface-variant)" }}>
                    Time Available for Study Plan
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2 hours this evening, 4 hours on Saturday"
                    value={suggestionTime}
                    onChange={(e) => setSuggestionTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "var(--color-outline-variant)" }}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setSuggestionTask(null)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                    style={{ backgroundColor: "var(--color-surface-container)", color: "var(--color-on-surface-variant)" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSuggestion || !suggestionQuery.trim()}
                    className="px-5 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: "var(--color-primary-container)", color: "var(--color-on-primary)" }}
                  >
                    {isSubmittingSuggestion ? "Broadcasting…" : "Broadcast to Tutors"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}
