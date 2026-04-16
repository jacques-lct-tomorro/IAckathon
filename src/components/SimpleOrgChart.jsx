import { useEffect, useMemo, useState } from "react";
import {
  buildDepartmentGroups,
  getDepartmentBadgeClass,
} from "../utils/org.js";
import { OrgNode } from "./OrgNode.jsx";
import { OrgTooltip } from "./OrgTooltip.jsx";
import { ProgressBar } from "./ProgressBar.jsx";
import { TeamMembers } from "./TeamMembers.jsx";

export function SimpleOrgChart({ records, highlightStatus }) {
  const [selectedPerson, setSelectedPerson] = useState(null);
  const structure = useMemo(() => buildDepartmentGroups(records), [records]);

  useEffect(() => {
    setSelectedPerson(null);
  }, [records, highlightStatus]);

  if (!records.length) {
    return <div className="empty-state">No users found for this company.</div>;
  }

  return (
    <>
      <div className="simple-org">
        <div className="simple-org__level simple-org__level--leaders">
          {structure.leaders.map((person) => (
            <OrgNode
              key={person.id}
              person={person}
              highlightStatus={highlightStatus}
              onSelect={setSelectedPerson}
            />
          ))}
        </div>

        {structure.departments.length ? (
          <>
            <div className="simple-org__connector">
              <div className="simple-org__vline" />
            </div>

            <div className="simple-org__departments-strip">
              <div className="simple-org__departments">
                {structure.departments.map((department) => (
                  <div key={department.team} className="dept-column">
                    <section className="dept-block">
                      <div className="dept-block__header">
                        <div className="dept-label">{department.team}</div>
                        <div className="dept-progress">
                          <ProgressBar
                            value={department.ratio * 100}
                            qualityClass={`progress-bar__fill--${getDepartmentBadgeClass(department.ratio)}`}
                          />
                        </div>
                      </div>

                      <div className="dept-block__tiers">
                        {department.admins.length ? (
                          <div className="dept-tier">
                            <div
                              className="dept-tier__bar"
                              aria-hidden="true"
                            />
                            <TeamMembers
                              members={department.admins}
                              highlightStatus={highlightStatus}
                              onSelect={setSelectedPerson}
                            />
                          </div>
                        ) : null}

                        {department.managers.length ? (
                          <div className="dept-tier">
                            <div
                              className="dept-tier__bar"
                              aria-hidden="true"
                            />
                            <TeamMembers
                              members={department.managers}
                              highlightStatus={highlightStatus}
                              onSelect={setSelectedPerson}
                            />
                          </div>
                        ) : null}

                        {department.users.length ? (
                          <div className="dept-tier">
                            <div
                              className="dept-tier__bar"
                              aria-hidden="true"
                            />
                            <TeamMembers
                              members={department.users}
                              highlightStatus={highlightStatus}
                              onSelect={setSelectedPerson}
                            />
                          </div>
                        ) : null}
                      </div>
                    </section>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>

      <OrgTooltip person={selectedPerson} />
    </>
  );
}
