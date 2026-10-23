"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../lib/auth-context";

const studentNavItems = [
  { label: "Home", icon: "home", href: "/", badge: null },
  { label: "Doubts", icon: "help_center", href: "/doubts", badge: null },
  { label: "Planner & To-Do", icon: "checklist", href: "/planner", badge: null },
  { label: "Resources", icon: "folder_open", href: "/resources", badge: null },
  { label: "Analytics & Ranks", icon: "insights", href: "/analytics", badge: null },
  { label: "My Profile", icon: "account_circle", href: "/profile?view=student", badge: null },
];

const tutorNavItems = [
  { label: "Tutor Home", icon: "home", href: "/", badge: null },
  { label: "Matched Inbox", icon: "inbox", href: "/doubts?tab=matched", badge: "3 ready" },
  { label: "Booked Sessions", icon: "calendar_month", href: "/sessions", badge: null },
  { label: "Leaderboard", icon: "military_tech", href: "/analytics?tab=leaderboard", badge: "#7" },
  { label: "Campus Analytics", icon: "insights", href: "/analytics", badge: null },
  { label: "Tutor Profile", icon: "account_circle", href: "/profile?view=tutor", badge: null },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { student, logout, mode, sidebarOpen, closeSidebar } = useAuth();
  const navItems = mode === "tutor" ? tutorNavItems : studentNavItems;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 top-16 bg-black/40 backdrop-blur-xs z-30 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed left-0 top-16 bottom-0 w-64 z-40 flex flex-col justify-between py-4 transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          backgroundColor: "var(--color-surface-container-low)",
          boxShadow: "1px 0 8px rgba(0,0,0,0.02)",
        }}
      >
        {/* Nav section */}
        <div className="overflow-y-auto px-4 flex-1">
          <div className="mb-6">
            {/* Mode eyebrow */}
            <div className="px-2 py-1 mb-2 flex items-center justify-between">
              <span
                className="font-label-eyebrow uppercase tracking-wider text-xs font-bold"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                {mode === "tutor" ? "Tutor Mode" : "Student Mode"}
              </span>
              <div className="flex items-center gap-2">
                {mode === "tutor" ? (
                  <span
                    className="inline-flex items-center gap-1 font-label-sm text-[11px] font-bold"
                    style={{ color: "var(--color-secondary)" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-secondary)" }} />
                    Rank #7
                  </span>
                ) : (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: "var(--color-secondary)" }}
                  />
                )}
                {/* Mobile close button */}
                <button
                  type="button"
                  id="sidebar-close-btn"
                  onClick={closeSidebar}
                  className="lg:hidden p-1 rounded-md text-gray-500 hover:text-gray-800 cursor-pointer flex items-center justify-center"
                  aria-label="Close navigation menu"
                  title="Close Menu"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            {/* Nav links */}
            <nav className="flex flex-col gap-0.5" aria-label="Main navigation">
              {navItems.map((item) => {
                const baseHref = item.href.split("?")[0];
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : baseHref === "/"
                      ? pathname === "/"
                      : pathname.startsWith(baseHref);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={closeSidebar}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-[10px] transition-all text-left"
                  style={{
                    backgroundColor: isActive
                      ? "var(--color-surface-container-highest)"
                      : "transparent",
                    color: isActive
                      ? "var(--color-on-surface)"
                      : "var(--color-on-surface-variant)",
                    fontWeight: isActive ? 600 : 400,
                    boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.03)" : "none",
                    fontFamily: "var(--font-jakarta)",
                    fontSize: 14,
                    textDecoration: "none",
                  }}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[18px]">
                      {item.icon}
                    </span>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      className="px-2 py-0.5 rounded-full font-label-sm text-[11px] font-semibold"
                      style={{
                        backgroundColor: isActive
                          ? "var(--color-secondary-fixed)"
                          : "var(--color-surface-container-highest)",
                        color: isActive
                          ? "var(--color-on-secondary-fixed)"
                          : "var(--color-on-surface-variant)",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom section */}
      <div className="px-4 pt-2 flex flex-col gap-2">
        {/* Verified badge */}
        <div
          className="p-3 rounded-[10px] flex items-center gap-3"
          style={{ backgroundColor: "var(--color-surface-container)" }}
        >
          {student?.photo_url ? (
            <img
              src={student.photo_url}
              alt={student.full_name || "Profile"}
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ color: "var(--color-primary-container)" }}
            >
              verified
            </span>
          )}
          <div className="flex flex-col min-w-0">
            <span
              className="font-title-sm text-[13px] leading-snug truncate"
              style={{ color: "var(--color-on-surface)" }}
            >
              {student?.full_name ?? "Verified Student"}
            </span>
            <span
              className="font-body-sm text-[10px]"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              {student?.roll_number ?? ""} · {student?.department ?? "CSE"}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => logout()}
          className="flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors w-full"
          style={{
            color: "var(--color-on-surface-variant)",
            fontFamily: "var(--font-jakarta)",
            fontSize: 12,
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.color =
              "var(--color-error)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.color =
              "var(--color-on-surface-variant)")
          }
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Sign Out
          </span>
        </button>
      </div>
    </aside>
    </>
  );
}
