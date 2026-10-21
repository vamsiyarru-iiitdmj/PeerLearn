"use client";
import PageShell from "../components/PageShell";
import PendingDoubts from "../components/PendingDoubts";

export default function DoubtsPage() {
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
        My Doubts
      </h1>
      <div style={{ maxWidth: 800 }}>
        <PendingDoubts />
      </div>
    </PageShell>
  );
}
