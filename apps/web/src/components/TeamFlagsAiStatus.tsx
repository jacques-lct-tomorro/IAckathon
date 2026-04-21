interface TeamFlagsAiStatusProps {
  receivedCount: number;
  expectedCount: number;
}

export function TeamFlagsAiStatus({
  receivedCount,
  expectedCount,
}: TeamFlagsAiStatusProps) {
  const indeterminate = receivedCount === 0;
  const pct =
    expectedCount > 0
      ? Math.min(100, Math.round((receivedCount / expectedCount) * 100))
      : 0;

  return (
    <div className="team-flags-ai-status" role="status" aria-live="polite">
      <div className="team-flags-ai-status__pulse" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="team-flags-ai-status__copy">
        <strong>Claude is generating your team signals</strong>
        <span className="team-flags-ai-status__sub">
          {receivedCount > 0
            ? `Received ${receivedCount} of ${expectedCount} team cards — more arriving momentarily.`
            : `Reading ${expectedCount} teams from your org data and drafting green flags, red flags, and actions.`}
        </span>
      </div>
      <div
        className={`team-flags-ai-status__bar${
          indeterminate ? " team-flags-ai-status__bar--indeterminate" : ""
        }`}
      >
        <div
          className="team-flags-ai-status__bar-fill"
          style={indeterminate ? undefined : { width: `${pct}%` }}
        />
      </div>
      <div className="team-flags-ai-status__spark" aria-hidden="true" />
    </div>
  );
}
