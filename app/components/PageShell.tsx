"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { useAuth } from "../../lib/auth-context";

interface PageShellProps {
  children: ReactNode;
}

/** Wraps all protected pages with header, sidebar, and auth guard */
export default function PageShell({ children }: PageShellProps) {
  const { token, loading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && !token) {
      setRedirecting(true);
      router.replace("/login");
    }
  }, [loading, token, router]);

  if (loading || redirecting) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "var(--color-surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 32, color: "var(--color-outline)", animation: "spin 1s linear infinite" }}
        >
          progress_activity
        </span>
        <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "var(--color-surface)", minHeight: "100vh" }}>
      <Header />
      <Sidebar />
      <div className="lg:pl-64">
        <main style={{ paddingTop: 64, minHeight: "100vh" }}>
          <div className="max-w-[1240px] mx-auto px-3.5 sm:px-6 md:px-8 py-5 sm:py-7">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
