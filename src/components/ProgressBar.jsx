export function ProgressBar({ value, max = 100, qualityClass = "" }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const rounded = Math.round(pct);

  return (
    <div
      className="progress-bar"
      role="progressbar"
      aria-valuenow={rounded}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${rounded} percent`}
    >
      <div
        className={["progress-bar__fill", qualityClass]
          .filter(Boolean)
          .join(" ")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
