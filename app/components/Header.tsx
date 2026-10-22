"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import {
  apiGetNotifications,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
  type Notification,
} from "../../lib/api";

export default function Header() {
  const router = useRouter();
  const { mode, setMode, student, logout, loading, token } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const initials = student?.full_name
    ? student.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "PL";

  // Load notifications
  const loadNotifs = async () => {
    if (!token) return;
    try {
      const data = await apiGetNotifications(token);
      setNotifications(data || []);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    loadNotifs();
  }, [token]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      await apiMarkAllNotificationsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Ignore
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    if (!token) return;
    try {
      await apiMarkNotificationRead(id, token);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
    } catch {
      // Ignore
    }
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 h-16 z-50 flex items-center justify-between px-7"
      style={{
        backgroundColor: "rgba(251,249,244,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
      }}
    >
      {/* ── Left: Logo ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 min-w-[260px]">
        <Link href="/" className="flex items-center gap-2" style={{ textDecoration: "none" }}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "var(--color-primary-container)" }}
          >
            <span
              style={{
                color: "var(--color-on-primary)",
                fontFamily: "var(--font-newsreader)",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              PL
            </span>
          </div>
          <span
            style={{
              color: "var(--color-primary)",
              fontFamily: "var(--font-newsreader)",
              fontSize: 20,
              fontWeight: 500,
            }}
          >
            PeerLearn
          </span>
        </Link>

        <div
          className="hidden xl:flex items-center gap-2 pl-2"
          style={{ color: "var(--color-on-surface-variant)", fontSize: 12, fontFamily: "var(--font-jakarta)" }}
        >
          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "var(--color-outline-variant)" }} />
          <span className="truncate max-w-[220px]">IIITDMJ · CSE</span>
        </div>
      </div>

      {/* ── Right ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        {/* Student / Tutor segmented control */}
        <div
          className="p-1.5 rounded-full flex items-center gap-1"
          style={{ backgroundColor: "var(--color-surface-container)", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
        >
          {(["student", "tutor"] as const).map((m) => (
            <button
              key={m}
              id={`mode-toggle-${m}`}
              onClick={() => {
                setMode(m);
                router.push("/");
              }}
              aria-pressed={mode === m}
              className="min-w-[108px] px-5 py-2 rounded-full transition-all text-sm font-semibold capitalize cursor-pointer"
              style={{
                backgroundColor: mode === m ? "var(--color-primary-container)" : "transparent",
                color: mode === m ? "var(--color-on-primary)" : "var(--color-on-surface-variant)",
                boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                fontFamily: "var(--font-jakarta)",
                border: "none",
              }}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        {/* Notifications bell */}
        <div className="relative" ref={notifRef}>
          <button
            id="notifications-bell-btn"
            onClick={() => {
              setShowNotifications((prev) => !prev);
              loadNotifs();
            }}
            className="relative p-2 rounded-lg transition-colors cursor-pointer"
            style={{
              color: "var(--color-on-surface-variant)",
              background: showNotifications ? "var(--color-surface-container-high)" : "none",
              border: "none",
            }}
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: "var(--color-secondary)" }}
              />
            )}
          </button>

          {/* Notifications dropdown panel */}
          {showNotifications && (
            <div
              className="absolute right-0 mt-2 w-80 rounded-2xl p-4 shadow-xl z-50 border"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-outline-variant)",
              }}
            >
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-200/60">
                <span className="font-semibold text-sm" style={{ color: "var(--color-primary)" }}>
                  Notifications ({unreadCount} unread)
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs font-semibold cursor-pointer"
                    style={{ color: "var(--color-secondary)", background: "none", border: "none" }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-500">
                  No notifications yet. You're all caught up!
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.is_read && handleMarkSingleRead(n.id)}
                      className="p-2.5 rounded-xl transition-colors cursor-pointer text-left"
                      style={{
                        backgroundColor: n.is_read
                          ? "transparent"
                          : "var(--color-surface-container-high)",
                      }}
                    >
                      <p className="text-xs text-gray-800 m-0 leading-relaxed font-medium">
                        {n.message}
                      </p>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {new Date(n.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User avatar + menu */}
        {!loading && student ? (
          <div className="relative" ref={userMenuRef}>
            <div className="flex items-center gap-3 pl-1">
              <div className="hidden sm:flex flex-col text-right">
                <span
                  style={{
                    color: "var(--color-on-surface)",
                    fontSize: 13,
                    fontFamily: "var(--font-jakarta)",
                    fontWeight: 600,
                  }}
                >
                  {student.full_name}
                </span>
                <span style={{ color: "var(--color-on-surface-variant)", fontSize: 11 }}>
                  {student.roll_number}
                </span>
              </div>
              <button
                id="header-user-avatar-btn"
                onClick={() => setShowUserMenu((prev) => !prev)}
                title="Account Menu"
                className="cursor-pointer"
                style={{ background: "none", border: "none", padding: 0 }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden"
                  style={{
                    backgroundColor: "var(--color-primary-container)",
                    color: "var(--color-on-primary)",
                    fontFamily: "var(--font-jakarta)",
                  }}
                >
                  {student?.photo_url ? (
                    <img
                      src={student.photo_url}
                      alt={student.full_name || "Profile"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
              </button>
            </div>

            {/* Profile Menu Dropdown */}
            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-2xl p-2 shadow-xl z-50 border flex flex-col gap-1"
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-outline-variant)",
                }}
              >
                <Link
                  href="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-gray-100 transition-colors"
                  style={{ color: "var(--color-on-surface)", textDecoration: "none" }}
                >
                  <span className="material-symbols-outlined text-[18px]">account_circle</span>
                  My Profile
                </Link>
                <button
                  id="sign-out-menu-btn"
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-red-50 text-red-700 transition-colors w-full text-left cursor-pointer"
                  style={{ background: "none", border: "none" }}
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="btn-primary"
            style={{ textDecoration: "none", fontSize: 13, padding: "0.4rem 1rem" }}
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
