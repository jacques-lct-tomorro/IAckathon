import {
  getStatusClass,
  isTeamAdmin,
  isTeamManager,
} from "../utils/org.js";

export function OrgNode({ person, highlightStatus, onSelect }) {
  const isBlurred = Boolean(
    highlightStatus && person.status !== highlightStatus,
  );
  const statusClass = getStatusClass(person.status);
  const nameExtra = isTeamAdmin(person)
    ? "mini-node__name--admin"
    : isTeamManager(person)
      ? "mini-node__name--manager"
      : "";
  const nameClass = ["mini-node__name", nameExtra].filter(Boolean).join(" ");

  return (
    <div
      className={`mini-node${isBlurred ? " is-blurred" : ""}`}
      onMouseEnter={() => onSelect(person)}
      onMouseLeave={() => onSelect(null)}
    >
      <div className={`mini-node__avatar ${statusClass}`}>
        {person.initials}
        {person.budgetHolder ? (
          <span className="mini-node__budget-badge">€</span>
        ) : null}
        <span className="mini-node__status-dot" />
      </div>
      <div className={nameClass}>{person.name}</div>
      <div className="mini-node__role">
        {person.role || person.team || "User"}
      </div>
    </div>
  );
}
