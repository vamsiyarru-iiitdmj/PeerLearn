"use client";

import Link from "next/link";

export default function ResourcesCard() {
  return (
    <section className="card space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="space-y-1">
          <div
            className="flex items-center gap-2 font-label-eyebrow uppercase tracking-wider"
            style={{ color: "var(--color-on-surface-variant)", fontSize: 11 }}
          >
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ color: "var(--color-primary-container)" }}
            >
              folder_special
            </span>
            Archival Access
          </div>
          <h2
            className="font-headline-sm"
            style={{ color: "var(--color-primary)", fontFamily: "var(--font-newsreader)", fontSize: 20, fontWeight: 500 }}
          >
            Manage your resources
          </h2>
        </div>
      </div>

      {/* Description */}
      <div
        className="p-4 rounded-xl"
        style={{ backgroundColor: "var(--color-surface-container-low)" }}
      >
        <p
          className="font-body-md leading-relaxed"
          style={{ color: "var(--color-on-surface-variant)", fontSize: 14, lineHeight: "1.65" }}
        >
          Organize your private study materials into auto-sorted buckets (PDFs, links, and lecture
          notes) with instant personal access, or contribute files directly to the shared batch
          repository where department peers vote to verify past papers, solutions, and semester
          course guides.
        </p>
      </div>

      {/* Quick-stat chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { icon: "picture_as_pdf", label: "12 PDFs",        color: "var(--color-secondary)" },
          { icon: "link",           label: "8 Links",         color: "var(--color-primary-container)" },
          { icon: "sticky_note_2",  label: "5 Notes",         color: "var(--color-tertiary-container)" },
          { icon: "verified",       label: "3 Batch-verified", color: "#2e7d63" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: "var(--color-surface-container)",
              border: "1px solid var(--color-outline-variant)",
              fontSize: 12,
              fontFamily: "var(--font-jakarta)",
              fontWeight: 500,
              color: "var(--color-on-surface-variant)",
            }}
          >
            <span className="material-symbols-outlined text-[14px]" style={{ color: stat.color }}>
              {stat.icon}
            </span>
            {stat.label}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="pt-1">
        <Link
          href="/resources"
          className="w-full py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors font-title-sm"
          style={{
            backgroundColor: "var(--color-primary-container)",
            color: "var(--color-on-primary)",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "var(--font-jakarta)",
            textDecoration: "none",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor =
              "var(--color-on-primary-fixed-variant)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor =
              "var(--color-primary-container)")
          }
        >
          Open Resources &amp; Buckets
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>
    </section>
  );
}
