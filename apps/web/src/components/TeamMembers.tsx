import { OrgNode } from "./OrgNode";
import type { Person, Status } from "../types";

interface TeamMembersProps {
  members: Person[];
  highlightStatus: Status | null;
  onSelect: (person: Person | null) => void;
}

export function TeamMembers({
  members,
  highlightStatus,
  onSelect,
}: TeamMembersProps) {
  const visibleMembers = members.slice(0, 5);
  const overflowMembers = members.slice(5);

  return (
    <>
      <div className="dept-members">
        {visibleMembers.map((person) => (
          <OrgNode
            key={person.id}
            person={person}
            highlightStatus={highlightStatus}
            onSelect={onSelect}
          />
        ))}
      </div>

      {overflowMembers.length ? (
        <details className="dept-overflow">
          <summary className="dept-overflow__summary">
            Show {overflowMembers.length} more
          </summary>
          <div className="dept-members dept-members--overflow">
            {overflowMembers.map((person) => (
              <OrgNode
                key={person.id}
                person={person}
                highlightStatus={highlightStatus}
                onSelect={onSelect}
              />
            ))}
          </div>
        </details>
      ) : null}
    </>
  );
}
