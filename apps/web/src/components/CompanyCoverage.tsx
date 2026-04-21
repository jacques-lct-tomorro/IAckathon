import { STATUS_CONFIG, STATUS_ORDER } from "../constants";
import {
  collectStatusCounts,
  computeCoverage,
  getDepartmentBadgeClass,
} from "../utils/org";
import { ProgressBar } from "./ProgressBar";
import type { Person } from "../types";

interface CompanyCoverageProps {
  records: Person[];
}

export function CompanyCoverage({ records }: CompanyCoverageProps) {
  const coverage = computeCoverage(records);
  const counts = collectStatusCounts(records);
  const coverageQuality = getDepartmentBadgeClass(coverage.ratio / 100);

  return (
    <section className="coverage-panel">
      <div>
        <p className="eyebrow">Global Coverage</p>
        <div className="coverage-progress">
          <ProgressBar
            value={coverage.ratio}
            qualityClass={`progress-bar__fill--${coverageQuality}`}
          />
        </div>
        <p className="coverage-progress__meta">
          <span className="coverage-progress__fraction">
            {coverage.coveredUsers} / {coverage.relevantUsers}
          </span>
          <span className="coverage-progress__hint">
            {" "}
            relevant users covered (Active + Inactive)
          </span>
        </p>
        <p className="coverage-copy">
          Coverage is the share of teammates who are Active or Inactive.
          Whitespace (invited, not yet on board) counts toward the total but not
          toward covered until they connect.
        </p>
      </div>
      <div className="coverage-grid">
        {STATUS_ORDER.map((status) => (
          <div key={status} className="coverage-stat">
            <span
              className="coverage-stat__swatch"
              style={{ backgroundColor: STATUS_CONFIG[status].color }}
            />
            <strong>{counts[status]}</strong>
            <span>{STATUS_CONFIG[status]?.label || status}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
