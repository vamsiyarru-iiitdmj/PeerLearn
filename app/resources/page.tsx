"use client";
import PageShell from "../components/PageShell";
import ResourcesCard from "../components/ResourcesCard";

export default function ResourcesPage() {
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
        Academic Resources
      </h1>
      <div style={{ maxWidth: 800 }}>
        <ResourcesCard />
      </div>
    </PageShell>
  );
}
