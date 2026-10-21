"use client";
import PageShell from "../components/PageShell";
import TodaysPlans from "../components/TodaysPlans";

export default function PlannerPage() {
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
        Planner &amp; To-Do
      </h1>
      <div style={{ maxWidth: 800 }}>
        <TodaysPlans />
      </div>
    </PageShell>
  );
}
