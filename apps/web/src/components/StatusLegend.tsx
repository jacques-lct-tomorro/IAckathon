import { STATUS_CONFIG, STATUS_ORDER } from "../constants";
import type { Status } from "../types";

interface StatusLegendProps {
  activeStatus: Status | null;
  onToggle: (status: Status | null) => void;
}

export function StatusLegend({ activeStatus, onToggle }: StatusLegendProps) {
  return (
    <div className="legend">
      {STATUS_ORDER.map((status) => {
        const config = STATUS_CONFIG[status];
        const isActive = activeStatus === status;

        return (
          <button
            key={status}
            type="button"
            className={`legend-chip${isActive ? " is-selected" : ""}`}
            onClick={() => onToggle(isActive ? null : status)}
          >
            <span
              className="legend-dot"
              style={{ backgroundColor: config.color }}
            />
            {config.label}
          </button>
        );
      })}
    </div>
  );
}
