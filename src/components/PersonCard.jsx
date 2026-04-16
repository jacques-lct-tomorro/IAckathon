import { STATUS_CONFIG } from "../constants.js";

export function PersonCard({ person, highlightStatus }) {
  const config = STATUS_CONFIG[person.status] || {
    label: person.status,
    color: "#95a1b2",
  };
  const isDimmed = highlightStatus && person.status !== highlightStatus;

  return (
    <article
      className={`person-card${isDimmed ? " is-dimmed" : ""}`}
      style={{ "--status-color": config.color }}
    >
      <div className="person-card__header">
        <div className="avatar">{person.initials}</div>
        <div>
          <div className="person-card__title-row">
            <h3>{person.name}</h3>
            {person.budgetHolder ? (
              <span className="budget-pill">Budget Holder</span>
            ) : null}
          </div>
          <p>{person.role || "No role"}</p>
        </div>
      </div>
      <div className="person-card__meta">
        <span>{person.team || "No team"}</span>
        <span>{person.email || "No email"}</span>
      </div>
      <dl className="person-card__stats">
        <div>
          <dt>Status</dt>
          <dd>{STATUS_CONFIG[person.status]?.label || person.status}</dd>
        </div>
        <div>
          <dt>Connections last month</dt>
          <dd>{person.connectionsLastMonth}</dd>
        </div>
      </dl>
    </article>
  );
}
