import { useEffect, useMemo, useState } from "react";
import defaultCsv from "./data/default-org-data.csv?raw";
import teamDisplayLabels from "./data/team-display-labels.json";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const STATUS_CONFIG = {
  Active: {
    label: "Active user",
    color: "#20b15a",
    badge: "Green",
  },
  Inactive: {
    label: "Created account but inactive",
    color: "#f08b2d",
    badge: "Orange",
  },
  "To Invite": {
    label: "Whitespace",
    color: "#2d6df6",
    badge: "Blue",
  },
};

const STATUS_ORDER = ["Active", "Inactive", "To Invite"];
const STATUS_CLASS = {
  Active: "active",
  Inactive: "inactive",
  "To Invite": "invite",
};

/** Slug-style team keys from `team-display-labels.json` → labels in the UI */
const TEAM_DISPLAY_LABELS = Object.freeze(teamDisplayLabels);

function normalizeTeamSlug(rawTeam) {
  let value = String(rawTeam || "")
    .trim()
    .toLowerCase();
  if (!value) {
    return "";
  }

  if (value.startsWith("user.team.")) {
    value = value.slice("user.team.".length);
  } else if (value.startsWith("user.team_")) {
    value = value.slice("user.team_".length);
  } else if (value.startsWith("user_team_")) {
    value = value.slice("user_team_".length);
  }

  return value.replace(/\./g, "_");
}

function mapTeamDisplayName(rawTeam) {
  const raw = String(rawTeam || "").trim();
  if (!raw) {
    return "";
  }

  const slug = normalizeTeamSlug(raw);
  if (slug && TEAM_DISPLAY_LABELS[slug]) {
    return TEAM_DISPLAY_LABELS[slug];
  }

  return raw;
}

function normalizeStatus(rawStatus) {
  const value = String(rawStatus || "")
    .trim()
    .toLowerCase();

  if (value === "active") {
    return "Active";
  }

  if (
    value === "inactive" ||
    value === "created account but inactive" ||
    value === "created_account_but_inactive"
  ) {
    return "Inactive";
  }

  if (value === "to invite" || value === "to_invite" || value === "invite") {
    return "To Invite";
  }

  if (
    value === "not relevant" ||
    value === "not_relevant" ||
    value === "irrelevant" ||
    value === "grey"
  ) {
    return "Inactive";
  }

  return "Inactive";
}

function getStatusClass(status) {
  return STATUS_CLASS[status] || "inactive";
}

function getDepartmentBadgeClass(ratio) {
  if (ratio >= 0.7) {
    return "good";
  }

  if (ratio >= 0.4) {
    return "mid";
  }

  return "low";
}

function isLeadershipCandidate(person) {
  const title = String(person.role || "")
    .trim()
    .toLowerCase();
  const team = normalizeTeamSlug(person.team);

  if (team === "general_management" || team === "executive") {
    return true;
  }

  // Do not treat Spendesk-style access_role "manager"/"admin" alone as org-chart
  // leadership — it misclassifies platform managers with no job title as top-bar leaders.

  return /(ceo|chief|founder|co-founder|president|vp|head|director|directeur|directrice|lead|manager|general counsel|cfo|coo|cto|dsi)/i.test(
    title,
  );
}

function isTeamAdmin(person) {
  return (
    String(person.accessRole || "")
      .trim()
      .toLowerCase() === "admin"
  );
}

function isTeamManager(person) {
  return (
    String(person.accessRole || "")
      .trim()
      .toLowerCase() === "manager"
  );
}

function buildDepartmentGroups(records) {
  const managerNames = new Set(records.map((person) => person.name));
  const hasManagerData = records.some(
    (person) =>
      person.managerName &&
      managerNames.has(person.managerName) &&
      person.managerName !== person.name,
  );

  let leaders;

  if (hasManagerData) {
    leaders = records.filter(
      (person) =>
        (!person.managerName ||
          !managerNames.has(person.managerName) ||
          person.managerName === person.name) &&
        isLeadershipCandidate(person),
    );
  } else {
    const execTeamLeaders = records.filter(
      (person) =>
        ["general_management", "executive"].includes(
          normalizeTeamSlug(person.team),
        ) && isLeadershipCandidate(person),
    );

    const inferredLeaders = execTeamLeaders.length
      ? execTeamLeaders
      : records.filter(isLeadershipCandidate);

    leaders = inferredLeaders.length ? inferredLeaders : records.slice(0, 1);
  }

  const leadersInTopBar = leaders.filter((person) => {
    const hasTeam = Boolean(String(person.team || "").trim());

    if (hasTeam && (isTeamAdmin(person) || isTeamManager(person))) {
      return false;
    }

    return true;
  });

  const topBarLeaderIds = new Set(leadersInTopBar.map((person) => person.id));
  const teamMap = new Map();

  records
    .filter((person) => !topBarLeaderIds.has(person.id))
    .forEach((person) => {
      const teamName = person.team || "No team";

      if (!teamMap.has(teamName)) {
        teamMap.set(teamName, []);
      }

      teamMap.get(teamName).push(person);
    });

  const departments = [...teamMap.entries()]
    .map(([team, everyone]) => {
      const admins = everyone
        .filter(isTeamAdmin)
        .sort((left, right) => left.name.localeCompare(right.name));
      const managers = everyone
        .filter((person) => isTeamManager(person) && !isTeamAdmin(person))
        .sort((left, right) => left.name.localeCompare(right.name));
      const users = everyone
        .filter((person) => !isTeamAdmin(person) && !isTeamManager(person))
        .sort((left, right) => left.name.localeCompare(right.name));
      const relevantMembers = everyone;
      const coveredMembers = relevantMembers.filter(
        (person) => person.status === "Active" || person.status === "Inactive",
      );
      const ratio = relevantMembers.length
        ? coveredMembers.length / relevantMembers.length
        : 0;

      return {
        team,
        admins,
        managers,
        users,
        ratio,
      };
    })
    .sort((left, right) => left.team.localeCompare(right.team));

  return {
    leaders: leadersInTopBar.sort((left, right) =>
      left.name.localeCompare(right.name),
    ),
    departments,
  };
}

function OrgNode({ person, highlightStatus, onSelect }) {
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

function formatAccessRoleForTooltip(person) {
  if (isTeamAdmin(person)) {
    return "Admin";
  }

  if (isTeamManager(person)) {
    return "Manager";
  }

  const raw = String(person.accessRole || "").trim();
  return raw || null;
}

function OrgTooltip({ person }) {
  if (!person) {
    return null;
  }

  const accessLabel = formatAccessRoleForTooltip(person);
  const nameAccentClass = isTeamAdmin(person)
    ? " org-tooltip__accent--admin"
    : isTeamManager(person)
      ? " org-tooltip__accent"
      : "";
  const accessAccentClass = isTeamAdmin(person)
    ? "org-tooltip__accent--admin"
    : isTeamManager(person)
      ? "org-tooltip__accent"
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

function TeamMembers({ members, highlightStatus, onSelect }) {
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

function SimpleOrgChart({ records, highlightStatus }) {
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

function toSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
}

function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === "," && !insideQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseLastConnectedAt(rawValue) {
  const value = String(rawValue || "").trim();

  if (!value) {
    return null;
  }

  const directDate = new Date(value);

  if (!Number.isNaN(directDate.getTime())) {
    return directDate;
  }

  const normalized = value
    .replace(/^janvier/i, "January")
    .replace(/^fevrier/i, "February")
    .replace(/^février/i, "February")
    .replace(/^mars/i, "March")
    .replace(/^avril/i, "April")
    .replace(/^mai/i, "May")
    .replace(/^juin/i, "June")
    .replace(/^juillet/i, "July")
    .replace(/^aout/i, "August")
    .replace(/^août/i, "August")
    .replace(/^septembre/i, "September")
    .replace(/^octobre/i, "October")
    .replace(/^novembre/i, "November")
    .replace(/^decembre/i, "December")
    .replace(/^décembre/i, "December");

  const normalizedDate = new Date(normalized);
  return Number.isNaN(normalizedDate.getTime()) ? null : normalizedDate;
}

function alignRowValues(headers, values) {
  if (values.length === headers.length) {
    return values;
  }

  if (
    values.length === headers.length - 1 &&
    String(values[0] || "").includes("@")
  ) {
    return ["", ...values];
  }

  if (values.length > headers.length) {
    const overflow = values.length - headers.length;
    const mergedFirstColumn = values.slice(0, overflow + 1).join(", ");
    return [mergedFirstColumn, ...values.slice(overflow + 1)];
  }

  return [
    ...values,
    ...Array.from({ length: headers.length - values.length }, () => ""),
  ];
}

function deriveStatus(rawRecord, lastConnectedAt) {
  const explicitStatus = rawRecord.status || rawRecord.statue;

  if (explicitStatus) {
    return normalizeStatus(explicitStatus);
  }

  const role = String(
    rawRecord.dim_user_user_role ||
      rawRecord.access_role ||
      rawRecord.user_role ||
      rawRecord.role ||
      "",
  )
    .trim()
    .toLowerCase();

  if (!role) {
    return "To Invite";
  }

  if (!lastConnectedAt) {
    return "Inactive";
  }

  const now = new Date();
  const daysSinceLastConnection =
    (now.getTime() - lastConnectedAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceLastConnection <= 30) {
    return "Active";
  }

  return "Inactive";
}

function parseCsv(text) {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((header) => toSlug(header));

  return lines.slice(1).map((line, rowIndex) => {
    const values = alignRowValues(headers, splitCsvLine(line));
    const rawRecord = headers.reduce((record, header, columnIndex) => {
      record[header] = values[columnIndex] || "";
      return record;
    }, {});

    const lastConnectedAt = parseLastConnectedAt(
      rawRecord.last_connected_at || rawRecord.last_connection_at,
    );
    const status = deriveStatus(rawRecord, lastConnectedAt);
    const displayName =
      rawRecord.dim_user_user_full_name ||
      rawRecord.full_name ||
      rawRecord.name ||
      rawRecord.dim_user_user_email ||
      rawRecord.email ||
      "Unknown user";
    const email = rawRecord.dim_user_user_email || rawRecord.email || "";
    const role =
      rawRecord.dim_user_user_job_title ||
      rawRecord.job_title ||
      rawRecord.role ||
      rawRecord.title ||
      "";
    const rawTeam =
      rawRecord.dim_user_user_team ||
      rawRecord.team ||
      rawRecord.department ||
      "";
    const team = mapTeamDisplayName(rawTeam);
    const company =
      rawRecord.dim_user_user_organization_name ||
      rawRecord.organization_name ||
      rawRecord.organization ||
      rawRecord.company ||
      "Unknown Company";
    const accessRole =
      rawRecord.dim_user_user_role ||
      rawRecord.access_role ||
      rawRecord.user_role ||
      rawRecord.role ||
      "";

    return {
      id: `${toSlug(company)}-${toSlug(email || displayName)}-${rowIndex}`,
      company,
      name: displayName,
      initials:
        rawRecord.initials ||
        displayName
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      email,
      role,
      team,
      accessRole,
      managerName: rawRecord.manager_name || rawRecord.manager || "",
      status,
      budgetHolder: ["true", "yes", "y", "1", "budget holder"].includes(
        String(
          rawRecord.budget_holder ||
            rawRecord.budgetholder ||
            rawRecord.is_budget_holder ||
            "",
        )
          .trim()
          .toLowerCase(),
      ),
      connectionsLastMonth:
        Number.parseInt(
          rawRecord.number_of_connexion_last_month ||
            rawRecord.number_of_connections_last_month ||
            rawRecord.connections_last_month ||
            rawRecord.number_in_connexion_in_last_month ||
            (status === "Active" ? "1" : "0"),
          10,
        ) || 0,
      lastConnectedAt: rawRecord.last_connected_at || "",
    };
  });
}

function buildTree(records) {
  const nodesByName = new Map();

  records.forEach((person) => {
    nodesByName.set(person.name, {
      ...person,
      children: [],
    });
  });

  const roots = [];

  records.forEach((person) => {
    const node = nodesByName.get(person.name);
    const manager = nodesByName.get(person.managerName);

    if (manager && manager.name !== person.name) {
      manager.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortTree = (node) => {
    node.children.sort((left, right) => left.name.localeCompare(right.name));
    node.children.forEach(sortTree);
  };

  roots.sort((left, right) => left.name.localeCompare(right.name));
  roots.forEach(sortTree);

  return roots;
}

function collectStatusCounts(records) {
  return STATUS_ORDER.reduce((counts, status) => {
    counts[status] = records.filter(
      (person) => person.status === status,
    ).length;
    return counts;
  }, {});
}

function computeCoverage(records) {
  const relevantUsers = records;
  const coveredUsers = relevantUsers.filter(
    (person) => person.status === "Active" || person.status === "Inactive",
  );

  const ratio = relevantUsers.length
    ? (coveredUsers.length / relevantUsers.length) * 100
    : 0;

  return {
    ratio,
    coveredUsers: coveredUsers.length,
    relevantUsers: relevantUsers.length,
  };
}

function ProgressBar({ value, max = 100, qualityClass = "" }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const rounded = Math.round(pct);

  return (
    <div
      className="progress-bar"
      role="progressbar"
      aria-valuenow={rounded}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${rounded} percent`}
    >
      <div
        className={["progress-bar__fill", qualityClass]
          .filter(Boolean)
          .join(" ")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function buildTeamMetricsPayload(company, records) {
  const structure = buildDepartmentGroups(records);

  return structure.departments.map((department) => {
    const members = [
      ...(department.admins || []),
      ...(department.managers || []),
      ...(department.users || []),
    ];
    const counts = collectStatusCounts(members);
    const relevantMembers = members;
    const activeMembers = members.filter(
      (person) => person.status === "Active",
    );
    const inactiveBudgetHolders = members.filter(
      (person) => person.budgetHolder && person.status === "Inactive",
    );
    const avgConnections = members.length
      ? (
          members.reduce(
            (sum, person) => sum + person.connectionsLastMonth,
            0,
          ) / members.length
        ).toFixed(1)
      : "0.0";

    const memberLines = [...members]
      .sort(
        (left, right) => left.connectionsLastMonth - right.connectionsLastMonth,
      )
      .slice(0, 12)
      .map(
        (person) =>
          `- ${person.name} | ${person.role || "No role"} | ${person.status} | connections_last_month=${person.connectionsLastMonth} | budget_holder=${person.budgetHolder ? "yes" : "no"}`,
      )
      .join("\n");

    return {
      company,
      team: department.team,
      headcount: members.length,
      adoption_ratio_among_relevant: Math.round(department.ratio * 100),
      status_counts: counts,
      active_count: activeMembers.length,
      relevant_count: relevantMembers.length,
      avg_connections_last_month: avgConnections,
      inactive_budget_holders: inactiveBudgetHolders.map(
        (person) => person.name,
      ),
      member_sample_lowest_engagement_first: memberLines || "- none",
    };
  });
}

async function generateTeamFlags(
  company,
  records,
  signal,
  onUnauthorized,
  onTeam,
) {
  const structure = buildDepartmentGroups(records);

  if (!structure.departments.length) {
    throw new Error("No teams found under leadership in this dataset.");
  }

  const teams = buildTeamMetricsPayload(company, records);
  const response = await fetch(`${API_BASE}/api/team-flags`, {
    method: "POST",
    signal,
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ company, teams }),
  });

  if (response.status === 401) {
    onUnauthorized?.();
    throw new Error("Please sign in again.");
  }

  if (!response.ok) {
    const err = await response.json().catch(() => null);
    const rawMessage = err?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(", ")
      : rawMessage;
    throw new Error(message || `Backend error ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Unable to read team insights stream.");
  }

  const reader = response.body.getReader();
  const onAbort = () => {
    reader.cancel().catch(() => {});
  };
  if (signal) {
    if (signal.aborted) {
      reader.cancel().catch(() => {});
      throw new DOMException("Aborted", "AbortError");
    }
    signal.addEventListener("abort", onAbort);
  }

  const decoder = new TextDecoder();
  let carry = "";
  const collected = [];
  let sawDone = false;

  function parseSseEventBlock(block) {
    const lines = block.split("\n").map((l) => l.replace(/\r$/, ""));
    for (const line of lines) {
      if (!line.startsWith("data:")) {
        continue;
      }
      const jsonStr = line.replace(/^data:\s?/, "").trim();
      if (!jsonStr) {
        continue;
      }
      let evt;
      try {
        evt = JSON.parse(jsonStr);
      } catch {
        continue;
      }
      if (evt.type === "team" && evt.data) {
        collected.push(evt.data);
        onTeam?.(evt.data);
      } else if (evt.type === "error") {
        throw new Error(evt.message || "Stream error");
      } else if (evt.type === "done") {
        sawDone = true;
      }
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      carry += decoder.decode(value || new Uint8Array(), { stream: !done });

      const events = carry.split("\n\n");
      carry = events.pop() ?? "";

      for (const rawEvent of events) {
        parseSseEventBlock(rawEvent);
      }

      if (done) {
        break;
      }
    }

    if (carry.trim()) {
      parseSseEventBlock(carry);
    }
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }

  if (!sawDone && collected.length === 0) {
    throw new Error(
      "Connection closed before any team insights were received.",
    );
  }

  return collected;
}

const TEAM_TIER_LABELS = {
  strong: "Strong",
  medium: "Medium",
  risk: "At risk",
  watchlist: "Watchlist",
};

const TEAM_TIER_SORT_ORDER = {
  risk: 0,
  watchlist: 1,
  medium: 2,
  strong: 3,
};

function TeamFlagsAiStatus({ receivedCount, expectedCount }) {
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

function TeamFlagSkeletonCard() {
  return (
    <article
      className="team-flag-card team-flag-card--skeleton"
      aria-hidden="true"
    >
      <header className="team-flag-card__header">
        <div className="team-flag-card__titles">
          <div className="team-flag-skel team-flag-skel--title" />
          <div className="team-flag-skel team-flag-skel--muted" />
        </div>
        <div className="team-flag-skel team-flag-skel--badge" />
      </header>
      <div className="team-flag-skel team-flag-skel--subtitle" />
      <div className="team-flag-card__body">
        <div className="team-flag-card__column team-flag-card__column--green">
          <div className="team-flag-skel team-flag-skel--line" />
          <div className="team-flag-skel team-flag-skel--line" />
          <div className="team-flag-skel team-flag-skel--line team-flag-skel--short" />
        </div>
        <div className="team-flag-card__column team-flag-card__column--red">
          <div className="team-flag-skel team-flag-skel--line" />
          <div className="team-flag-skel team-flag-skel--line" />
          <div className="team-flag-skel team-flag-skel--line team-flag-skel--short" />
        </div>
      </div>
      <div className="team-flag-skel team-flag-skel--action" />
    </article>
  );
}

function TeamHealthPanel({
  company,
  records,
  teams,
  isLoading,
  error,
  onGenerate,
}) {
  const structure = useMemo(() => buildDepartmentGroups(records), [records]);
  const hasTeams = structure.departments.length > 0;
  const expectedTeamCount = structure.departments.length;
  const receivedCount = teams?.length ?? 0;
  const skeletonSlots =
    isLoading && hasTeams
      ? Math.max(0, expectedTeamCount - receivedCount)
      : 0;
  const orderedTeams = useMemo(
    () =>
      [...(teams ?? [])].sort((left, right) => {
        const leftRank = TEAM_TIER_SORT_ORDER[left.health_tier] ?? 99;
        const rightRank = TEAM_TIER_SORT_ORDER[right.health_tier] ?? 99;

        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        return left.team.localeCompare(right.team);
      }),
    [teams],
  );
  const showTeamGrid =
    !error && hasTeams && (isLoading || (teams?.length ?? 0) > 0);

  return (
    <section className="team-flags">
      <div className="team-flags__header">
        <div>
          <h2>Team signals</h2>
        </div>
        <button
          type="button"
          className="action-button"
          onClick={onGenerate}
          disabled={isLoading || !hasTeams}
        >
          {isLoading
            ? "Generating..."
            : teams?.length
              ? "Regenerate"
              : "Generate team insights"}
        </button>
      </div>

      {!hasTeams ? (
        <p className="summary-placeholder">
          Load a CSV where non-leader users have a team or department column to
          enable per-team analysis.
        </p>
      ) : null}

      {isLoading && hasTeams ? (
        <TeamFlagsAiStatus
          receivedCount={receivedCount}
          expectedCount={expectedTeamCount}
        />
      ) : null}

      {error ? <p className="error-message">{error}</p> : null}

      {showTeamGrid ? (
        <div className="team-flags__grid">
          {orderedTeams.map((team) => (
            <article key={team.team} className="team-flag-card">
              <header className="team-flag-card__header">
                <div className="team-flag-card__titles">
                  <h3>{team.team}</h3>
                  <p className="team-flag-card__team">{team.card_title}</p>
                </div>
                <span
                  className={`team-flag-card__badge team-flag-card__badge--${team.health_tier}`}
                >
                  {TEAM_TIER_LABELS[team.health_tier] || team.health_tier}
                </span>
              </header>
              {team.subtitle ? (
                <p className="team-flag-card__subtitle">{team.subtitle}</p>
              ) : null}

              <div className="team-flag-card__body">
                <div className="team-flag-card__column team-flag-card__column--green">
                  <div className="team-flag-card__column-head">
                    <span className="team-flag-card__dot team-flag-card__dot--green" />
                    <span>Green flags</span>
                  </div>
                  <ul>
                    {team.green_flags.length ? (
                      team.green_flags.map((item, index) => (
                        <li key={`${team.team}-green-${index}`}>{item}</li>
                      ))
                    ) : (
                      <li className="team-flag-card__empty">
                        No green flags returned.
                      </li>
                    )}
                  </ul>
                </div>

                <div className="team-flag-card__column team-flag-card__column--red">
                  <div className="team-flag-card__column-head">
                    <span className="team-flag-card__dot team-flag-card__dot--red" />
                    <span>Red flags</span>
                  </div>
                  <ul>
                    {team.red_flags.length ? (
                      team.red_flags.map((item, index) => (
                        <li key={`${team.team}-red-${index}`}>{item}</li>
                      ))
                    ) : (
                      <li className="team-flag-card__empty">
                        No red flags returned.
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <button type="button" className="team-flag-card__action">
                <span>{team.action_label}</span>
                <span className="team-flag-card__action-icon" aria-hidden>
                  ↗
                </span>
              </button>
            </article>
          ))}
          {Array.from({ length: skeletonSlots }, (_, index) => (
            <TeamFlagSkeletonCard key={`team-flag-skeleton-${index}`} />
          ))}
        </div>
      ) : null}

      {hasTeams && !isLoading && !error && !teams?.length ? (
        <p className="summary-placeholder">
          Click <strong>Generate team insights</strong> to produce green flags,
          red flags, and a suggested action for each team in{" "}
          <strong>{company}</strong>.
        </p>
      ) : null}
    </section>
  );
}

function StatusLegend({ activeStatus, onToggle }) {
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

function PersonCard({ person, highlightStatus }) {
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

function CompanyCoverage({ records }) {
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

function initialsFromUsername(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "—";
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    const first = parts[0][0] || "";
    const second = parts[1][0] || "";
    const pair = `${first}${second}`.toUpperCase();
    return pair || trimmed.slice(0, 2).toUpperCase();
  }

  return trimmed.slice(0, 1).toUpperCase();
}

function LoginForm({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const previewInitials = useMemo(
    () => initialsFromUsername(username),
    [username],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const rawMessage = body?.message;
        const message = Array.isArray(rawMessage)
          ? rawMessage.join(", ")
          : rawMessage;
        setError(message || "Sign in failed.");
        return;
      }

      const data = await response.json();
      onSuccess({ username: data.username });
    } catch (submitError) {
      setError(submitError.message || "Unable to reach the server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="app-shell app-shell--auth">
      <div className="auth-page">
        <aside className="auth-brand" aria-hidden="true">
          <div className="auth-brand__mark">
            <span className="auth-brand__orbit" />
            <span className="auth-brand__core">OS</span>
          </div>
          <p className="auth-brand__title">OroScope</p>
          <p className="auth-brand__tagline">
            Map org adoption, spot team risk, and generate Claude-backed signals
            from your CSV data.
          </p>
        </aside>

        <section className="auth-panel">
          <div className="auth-panel__accent" aria-hidden="true" />

          <header className="auth-panel__header">
            <div className="auth-panel__intro">
              <p className="eyebrow eyebrow--auth-brand">Sign in</p>
              <h1 className="auth-panel__title">Welcome back</h1>
              <p className="auth-panel__lede">
                Use your assigned name and the shared access password to open
                the workspace.
              </p>
            </div>
            <div className="auth-panel__avatar-wrap">
              <div
                className="auth-avatar"
                title="How you will appear in the app"
              >
                <span className="auth-avatar__ring" />
                <span className="auth-avatar__initials">{previewInitials}</span>
              </div>
              <span className="auth-panel__avatar-caption">Preview</span>
            </div>
          </header>

          <form className="auth-panel__form" onSubmit={handleSubmit}>
            <label className="field field--auth">
              <span>Username</span>
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="e.g. alice"
                required
              />
            </label>
            <label className="field field--auth">
              <span>Password</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Shared team password"
                required
              />
            </label>
            {error ? (
              <div className="auth-panel__error" role="alert">
                <p className="error-message error-message--auth">{error}</p>
              </div>
            ) : null}
            <div className="auth-panel__actions">
              <button
                type="submit"
                className="action-button action-button--auth-submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span
                      className="action-button__spinner"
                      aria-hidden="true"
                    />
                    Signing in…
                  </>
                ) : (
                  "Enter workspace"
                )}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function CsvUploader({ onLoad }) {
  const [error, setError] = useState("");

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCsv(text);

      if (!parsed.length) {
        throw new Error("CSV file is empty.");
      }

      onLoad(parsed);
      setError("");
    } catch (uploadError) {
      setError(uploadError.message || "Unable to read this CSV file.");
    }
  };

  return (
    <div className="uploader">
      <label htmlFor="csv-file">Update CSV input</label>
      <input
        id="csv-file"
        type="file"
        accept=".csv"
        onChange={handleFileChange}
      />
      {error ? <p className="error-message">{error}</p> : null}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [records, setRecords] = useState(() => parseCsv(defaultCsv));
  const [selectedCompany, setSelectedCompany] = useState("");
  const [highlightStatus, setHighlightStatus] = useState(null);
  const [teamFlags, setTeamFlags] = useState(null);
  const [teamFlagsError, setTeamFlagsError] = useState("");
  const [isTeamFlagsLoading, setIsTeamFlagsLoading] = useState(false);
  const [teamFlagsNonce, setTeamFlagsNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          credentials: "include",
        });
        if (cancelled) {
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setUser({ username: data.username });
        } else {
          setUser(null);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Still clear local session state if the request fails.
    } finally {
      setUser(null);
    }
  };

  const companies = useMemo(
    () =>
      [...new Set(records.map((record) => record.company))].sort(
        (left, right) => left.localeCompare(right),
      ),
    [records],
  );

  useEffect(() => {
    if (!companies.length) {
      setSelectedCompany("");
      return;
    }

    if (!companies.includes(selectedCompany)) {
      setSelectedCompany(companies[0]);
    }
  }, [companies, selectedCompany]);

  const companyRecords = useMemo(
    () => records.filter((record) => record.company === selectedCompany),
    [records, selectedCompany],
  );

  useEffect(() => {
    setTeamFlags(null);
    setTeamFlagsError("");
    setIsTeamFlagsLoading(false);
    setTeamFlagsNonce(0);
  }, [selectedCompany, records]);

  useEffect(() => {
    if (!teamFlagsNonce || !selectedCompany || !companyRecords.length) {
      return;
    }

    const controller = new AbortController();

    async function runTeamFlags() {
      setIsTeamFlagsLoading(true);
      setTeamFlagsError("");
      setTeamFlags([]);

      try {
        const teams = await generateTeamFlags(
          selectedCompany,
          companyRecords,
          controller.signal,
          () => setUser(null),
          (team) => {
            if (!controller.signal.aborted) {
              setTeamFlags((prev) => [...prev, team]);
            }
          },
        );

        if (!controller.signal.aborted) {
          setTeamFlags(teams);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setTeamFlags(null);
          setTeamFlagsError(
            error.message || "Unable to generate team insights.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsTeamFlagsLoading(false);
        }
      }
    }

    runTeamFlags();

    return () => controller.abort();
  }, [teamFlagsNonce, selectedCompany, companyRecords]);

  if (authLoading) {
    return (
      <main className="app-shell app-shell--auth">
        <div
          className="auth-skeleton"
          aria-busy="true"
          aria-label="Checking session"
        >
          <div className="auth-skeleton__accent" />
          <div className="auth-skeleton__row auth-skeleton__row--wide" />
          <div className="auth-skeleton__row auth-skeleton__row--mid" />
          <div className="auth-skeleton__row auth-skeleton__row--narrow" />
          <div className="auth-skeleton__blocks">
            <div className="auth-skeleton__block" />
            <div className="auth-skeleton__block" />
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return <LoginForm onSuccess={setUser} />;
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <h1>OroScope</h1>
          <p className="hero-copy">
          The living org chart that turns account knowledge into new revenue.
          </p>
        </div>
        <div className="hero__actions">
          <div className="user-session" role="status">
            <div className="user-session__avatar" aria-hidden="true">
              {initialsFromUsername(user.username)}
            </div>
            <div className="user-session__meta">
              <span className="user-session__label">Signed in</span>
              <span className="user-session__name">{user.username}</span>
            </div>
            <span
              className="user-session__pulse"
              aria-hidden="true"
              title="Session active"
            />
          </div>
          <button
            type="button"
            className="action-button action-button--ghost action-button--compact"
            onClick={() => void handleLogout()}
          >
            Sign out
          </button>
        </div>
      </section>

      <section className="toolbar">
        <label className="field">
          <span>Company</span>
          <select
            value={selectedCompany}
            onChange={(event) => setSelectedCompany(event.target.value)}
          >
            {companies.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
        </label>
      </section>

      {selectedCompany ? <CompanyCoverage records={companyRecords} /> : null}

      <section className="filters">
        <div>
          <p className="eyebrow">Highlight by status</p>
          <StatusLegend
            activeStatus={highlightStatus}
            onToggle={setHighlightStatus}
          />
        </div>
      </section>

      <section className="org-chart-section">
        <div className="org-chart">
          <SimpleOrgChart
            key={`${selectedCompany}-${highlightStatus || "all"}`}
            records={companyRecords}
            highlightStatus={highlightStatus}
          />
        </div>
      </section>

      {selectedCompany ? (
        <TeamHealthPanel
          company={selectedCompany}
          records={companyRecords}
          teams={teamFlags}
          isLoading={isTeamFlagsLoading}
          error={teamFlagsError}
          onGenerate={() => setTeamFlagsNonce((value) => value + 1)}
        />
      ) : null}
    </main>
  );
}
