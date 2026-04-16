import { STATUS_CONFIG } from "../constants.js";
import { isTeamAdmin, isTeamManager } from "../utils/org.js";

export function OrgTooltip({ person }) {
  if (!person) {
    return null;
  }

  const nameAccentClass = isTeamAdmin(person)
    ? " org-tooltip__accent--admin"
    : isTeamManager(person)
      ? " org-tooltip__accent"
      : "";

  return (
    <aside className="org-tooltip">
      <div className="org-tooltip__header">
        <div>
          <div className={`org-tooltip__name${nameAccentClass}`.trim()}>
            {person.name}
          </div>
          <div className="org-tooltip__role">{person.role || "No role"}</div>
        </div>
      </div>
      <div className="org-tooltip__row">
        Team: <span>{person.team || "No team"}</span>
      </div>
      <div className="org-tooltip__row">
        Status:{" "}
        <span>{STATUS_CONFIG[person.status]?.label || person.status}</span>
      </div>
      <div className="org-tooltip__row">
        Last connected: <span>{person.lastConnectedAt || "—"}</span>
      </div>
      <div className="org-tooltip__row">
        Email: <span>{person.email || "No email"}</span>
      </div>
    </aside>
  );
}
