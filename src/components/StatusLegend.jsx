import { STATUS_CONFIG, STATUS_ORDER } from "../constants.js";

export function StatusLegend({ activeStatus, onToggle }) {
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
