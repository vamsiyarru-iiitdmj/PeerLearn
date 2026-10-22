"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../lib/auth-context";

const navItems = [
  { label: "Home",               icon: "home",           href: "/",                  badge: null },
  { label: "Doubts",             icon: "help_center",    href: "/doubts",            badge: null },
  { label: "Planner & To-Do",   icon: "checklist",      href: "/planner",           badge: null },
  { label: "Resources",          icon: "folder_open",    href: "/resources",         badge: null },
  { label: "Analytics & Ranks", icon: "insights",        href: "/analytics",         badge: null },
  { label: "My Profile",         icon: "account_circle", href: "/profile",           badge: null },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { student, logout, mode } = useAuth();

  return (
    <aside
      className="fixed left-0 top-16 bottom-0 w-64 z-40 hidden lg:flex flex-col justify-between py-4"
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
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor:
                  mode === "tutor" ? "var(--color-tertiary)" : "var(--color-secondary)",
              }}
            />
          </div>

          {/* Nav links */}
          <nav className="flex flex-col gap-0.5" aria-label="Main navigation">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
          <span
            className="material-symbols-outlined text-[18px]"
            style={{ color: "var(--color-primary-container)" }}
          >
            verified
          </span>
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
  );
}
