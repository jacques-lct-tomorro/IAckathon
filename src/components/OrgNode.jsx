import { getStatusClass } from "../utils/org.js";

export function OrgNode({ person, highlightStatus, onSelect }) {
  const isBlurred = Boolean(
    highlightStatus && person.status !== highlightStatus,
  );
  const statusClass = getStatusClass(person.status);

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
      <div className="mini-node__name">{person.name}</div>
      <div className="mini-node__role">
        {person.role || person.team || "User"}
      </div>
    </div>
  );
}
