import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import LiveQueueBadge from "./components/LiveQueueBadge";
import PendingDoubts from "./components/PendingDoubts";
import TodaysPlans from "./components/TodaysPlans";
import ResourcesCard from "./components/ResourcesCard";

export default function DashboardPage() {
  return (
    <div style={{ backgroundColor: "var(--color-surface)", minHeight: "100vh" }}>
      {/* Sticky top nav */}
      <Header />

      {/* Left sidebar (fixed) */}
      <Sidebar />

      {/* Main content area — offset by sidebar on large screens (256px) and header (64px) */}
      <div className="lg:pl-64">
        <main
          style={{
            paddingTop: 64,
            minHeight: "100vh",
            backgroundColor: "var(--color-surface)",
          }}
        >
          <div
            style={{
              maxWidth: 1240,
              width: "100%",
              margin: "0 auto",
              padding: "2.25rem 1.75rem",
            }}
          >
            {/* ── Greeting row ─────────────────────────────────────── */}
            <div
              className="animate-in"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
                marginBottom: "2.25rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  gap: "1rem",
                }}
              >
                {/* Left: greeting text */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {/* Eyebrow */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--color-on-surface-variant)",
                      fontFamily: "var(--font-jakarta)",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "var(--color-secondary)",
                        display: "inline-block",
                      }}
                    />
                    Semester VI · Computer Science &amp; Engineering
                  </div>

                  {/* Main heading */}
                  <h1
                    style={{
                      fontFamily: "var(--font-newsreader)",
                      fontSize: 32,
                      fontWeight: 500,
                      lineHeight: "40px",
                      color: "var(--color-primary)",
                      margin: 0,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Good evening, Vamsi
                  </h1>

                  {/* Sub-line */}
                  <p
                    style={{
                      fontFamily: "var(--font-jakarta)",
                      fontSize: 14,
                      color: "var(--color-on-surface-variant)",
                      margin: 0,
                    }}
                  >
                    2 pending doubts need attention · 3 study plans scheduled for today
                  </p>
                </div>

                {/* Right: live queue badge */}
                <LiveQueueBadge />
              </div>
            </div>

            {/* ── Card stack ─────────────────────────────────────────── */}
            <div
              style={{
                maxWidth: 800,
                margin: "0 auto",
                display: "flex",
                flexDirection: "column",
                gap: "2.25rem",
              }}
            >
              <div className="animate-in" style={{ animationDelay: "60ms" }}>
                <PendingDoubts />
              </div>

              <div className="animate-in" style={{ animationDelay: "120ms" }}>
                <TodaysPlans />
              </div>

              <div className="animate-in" style={{ animationDelay: "180ms" }}>
                <ResourcesCard />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
