export default function LiveQueueBadge() {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
      style={{
        backgroundColor: "var(--color-surface-container-low)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Pulsing dot */}
      <span className="relative flex h-2.5 w-2.5">
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ backgroundColor: "var(--color-tertiary-fixed-dim)" }}
        />
        <span
          className="relative inline-flex rounded-full h-2.5 w-2.5"
          style={{ backgroundColor: "var(--color-primary-container)" }}
        />
      </span>
      <span
        className="font-body-sm"
        style={{ color: "var(--color-on-surface-variant)", fontSize: 12 }}
      >
        Live Peer Match Queue:{" "}
        <strong
          style={{
            color: "var(--color-on-surface)",
            fontWeight: 600,
            fontFamily: "var(--font-jakarta)",
          }}
        >
          Active &amp; Calibrated
        </strong>
      </span>
    </div>
  );
}
