import { useEffect, useMemo, useState } from "react";
import defaultCsv from "./data/default-org-data.csv?raw";

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = import.meta.env.VITE_ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

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
    label: "To invite",
    color: "#2d6df6",
    badge: "Blue",
  },
  "Not Relevant": {
    label: "Not relevant",
    color: "#95a1b2",
    badge: "Grey",
  },
};

const STATUS_ORDER = ["Active", "Inactive", "To Invite", "Not Relevant"];
const STATUS_CLASS = {
  Active: "active",
  Inactive: "inactive",
  "To Invite": "invite",
  "Not Relevant": "irrelevant",
};

function normalizeStatus(rawStatus) {
  const value = String(rawStatus || "").trim().toLowerCase();

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

  if (
    value === "to invite" ||
    value === "to_invite" ||
    value === "invite"
  ) {
    return "To Invite";
  }

  if (
    value === "not relevant" ||
    value === "not_relevant" ||
    value === "irrelevant" ||
    value === "grey"
  ) {
    return "Not Relevant";
  }

  return "Not Relevant";
}

function getStatusClass(status) {
  return STATUS_CLASS[status] || "irrelevant";
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

function buildDepartmentGroups(records) {
  const managerNames = new Set(records.map((person) => person.name));
  const leaders = records.filter(
    (person) => !person.managerName || !managerNames.has(person.managerName) || person.managerName === person.name,
  );

  const leaderIds = new Set(leaders.map((person) => person.id));
  const teamMap = new Map();

  records
    .filter((person) => !leaderIds.has(person.id))
    .forEach((person) => {
      const teamName = person.team || "No team";

      if (!teamMap.has(teamName)) {
        teamMap.set(teamName, []);
      }

      teamMap.get(teamName).push(person);
    });

  const departments = [...teamMap.entries()]
    .map(([team, members]) => {
      const relevantMembers = members.filter((person) => person.status !== "Not Relevant");
      const coveredMembers = relevantMembers.filter(
        (person) => person.status === "Active" || person.status === "Inactive",
      );
      const ratio = relevantMembers.length ? coveredMembers.length / relevantMembers.length : 0;

      return {
        team,
        members: members.sort((left, right) => left.name.localeCompare(right.name)),
        ratio,
      };
    })
    .sort((left, right) => left.team.localeCompare(right.team));

  return {
    leaders: leaders.sort((left, right) => left.name.localeCompare(right.name)),
    departments,
  };
}

function OrgNode({ person, highlightStatus, onSelect }) {
  const isBlurred = Boolean(highlightStatus && person.status !== highlightStatus);
  const statusClass = getStatusClass(person.status);

  return (
    <div
      className={`mini-node${isBlurred ? " is-blurred" : ""}`}
      onMouseEnter={() => onSelect(person)}
      onMouseLeave={() => onSelect(null)}
    >
      <div className={`mini-node__avatar ${statusClass}`}>
        {person.initials}
        {person.budgetHolder ? <span className="mini-node__budget-badge">€</span> : null}
        <span className="mini-node__status-dot" />
      </div>
      <div className="mini-node__name">{person.name}</div>
      <div className="mini-node__role">{person.role || person.team || "User"}</div>
    </div>
  );
}

function OrgTooltip({ person }) {
  if (!person) {
    return null;
  }

  return (
    <aside className="org-tooltip">
      <div className="org-tooltip__header">
        <div>
          <div className="org-tooltip__name">{person.name}</div>
          <div className="org-tooltip__role">{person.role || "No role"}</div>
        </div>
      </div>
        <div className="org-tooltip__row">Team: <span>{person.team || "No team"}</span></div>
        <div className="org-tooltip__row">Manager: <span>{person.managerName || "Top level"}</span></div>
        <div className="org-tooltip__row">Status: <span>{STATUS_CONFIG[person.status].label}</span></div>
        <div className="org-tooltip__row">Connections last month: <span>{person.connectionsLastMonth}</span></div>
        <div className="org-tooltip__row">Email: <span>{person.email || "No email"}</span></div>
    </aside>
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

            <div className="simple-org__departments">
              {structure.departments.map((department) => (
                <section key={department.team} className="dept-block">
                  <div className="dept-block__header">
                    <div className="dept-label">{department.team}</div>
                    <div className="dept-progress">
                      <ProgressBar
                        value={department.ratio * 100}
                        qualityClass={`progress-bar__fill--${getDepartmentBadgeClass(department.ratio)}`}
                      />
                    </div>
                  </div>

                  <div className="dept-members">
                    {department.members.map((person) => (
                      <OrgNode
                        key={person.id}
                        person={person}
                        highlightStatus={highlightStatus}
                        onSelect={setSelectedPerson}
                      />
                    ))}
                  </div>
                </section>
              ))}
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
    const values = splitCsvLine(line);
    const rawRecord = headers.reduce((record, header, columnIndex) => {
      record[header] = values[columnIndex] || "";
      return record;
    }, {});

    return {
      id: `${toSlug(rawRecord.company)}-${toSlug(rawRecord.email || rawRecord.name)}-${rowIndex}`,
      company: rawRecord.company || "Unknown Company",
      name: rawRecord.name || "Unknown user",
      initials: rawRecord.initials || (rawRecord.name || "?").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
      email: rawRecord.email || "",
      role: rawRecord.role || rawRecord.title || "",
      team: rawRecord.team || rawRecord.department || "",
      managerName: rawRecord.manager_name || rawRecord.manager || "",
      status: normalizeStatus(rawRecord.status || rawRecord.statue),
      budgetHolder:
        ["true", "yes", "y", "1", "budget holder"].includes(
          String(
            rawRecord.budget_holder ||
              rawRecord.budgetholder ||
              rawRecord.is_budget_holder ||
              "",
          )
            .trim()
            .toLowerCase(),
        ),
      connectionsLastMonth: Number.parseInt(
        rawRecord.number_of_connexion_last_month ||
          rawRecord.number_of_connections_last_month ||
          rawRecord.connections_last_month ||
          rawRecord.number_in_connexion_in_last_month ||
          "0",
        10,
      ) || 0,
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
    counts[status] = records.filter((person) => person.status === status).length;
    return counts;
  }, {});
}

function computeCoverage(records) {
  const relevantUsers = records.filter((person) => person.status !== "Not Relevant");
  const coveredUsers = relevantUsers.filter(
    (person) => person.status === "Active" || person.status === "Inactive",
  );

  const ratio = relevantUsers.length ? (coveredUsers.length / relevantUsers.length) * 100 : 0;

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
        className={["progress-bar__fill", qualityClass].filter(Boolean).join(" ")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function buildTeamMetricsPayload(company, records) {
  const structure = buildDepartmentGroups(records);

  return structure.departments.map((department) => {
    const members = department.members;
    const counts = collectStatusCounts(members);
    const relevantMembers = members.filter((person) => person.status !== "Not Relevant");
    const activeMembers = members.filter((person) => person.status === "Active");
    const inactiveBudgetHolders = members.filter(
      (person) => person.budgetHolder && person.status === "Inactive",
    );
    const avgConnections = members.length
      ? (members.reduce((sum, person) => sum + person.connectionsLastMonth, 0) / members.length).toFixed(1)
      : "0.0";

    const memberLines = [...members]
      .sort((left, right) => left.connectionsLastMonth - right.connectionsLastMonth)
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
      inactive_budget_holders: inactiveBudgetHolders.map((person) => person.name),
      member_sample_lowest_engagement_first: memberLines || "- none",
    };
  });
}

function buildTeamFlagsPrompt(company, records) {
  const teams = buildTeamMetricsPayload(company, records);

  return `
You are a B2B SaaS adoption analyst. You receive per-team facts derived from an org CSV (status, connections, budget holders). Your job is to turn facts into concise executive signals.

Company: ${company}

Teams JSON (ground truth — do not invent people or numbers not implied here):
${JSON.stringify(teams, null, 2)}

Return ONLY valid JSON (no markdown fences, no commentary) with this exact shape:
{
  "teams": [
    {
      "team": "<must exactly match a team string from the input>",
      "card_title": "<short title, e.g. Champion pocket / Adoption risk / Momentum team>",
      "health_tier": "<one of: strong | medium | risk | watchlist>",
      "subtitle": "<one line: reference coverage % and a concrete fact from the data>",
      "green_flags": ["<2-4 short bullets: real strengths tied to the metrics>"],
      "red_flags": ["<2-4 short bullets: credible risks tied to the metrics>"],
      "action_label": "<imperative next step a CSM could take this week, <= 8 words>"
    }
  ]
}

Rules:
- Emit one object per team in the input, same teams, no extras.
- Write flags as sharp, specific observations; avoid generic platitudes.
- If red_flags would be empty, still include 1 mild watch-item grounded in the data.
- health_tier must reflect adoption_ratio_among_relevant and engagement patterns: strong (~>=70 and healthy engagement), medium (~40-69 or mixed), risk (<40 or multiple inactive budget holders), watchlist (tiny team or mostly Not Relevant skew—explain in subtitle).
- action_label must logically follow the red_flags / green_flags balance.
`.trim();
}

function extractJsonObject(text) {
  const trimmed = String(text || "").trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response did not contain a JSON object.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

function normalizeTeamFlagsPayload(payload, expectedTeams) {
  const teams = Array.isArray(payload?.teams) ? payload.teams : [];
  const byName = new Map(teams.map((entry) => [String(entry.team || "").trim(), entry]));

  return expectedTeams.map((teamName) => {
    const match = byName.get(teamName) || byName.get(teamName.trim());

    if (!match) {
      return {
        team: teamName,
        card_title: teamName,
        health_tier: "watchlist",
        subtitle: "No AI row matched this team name.",
        green_flags: [],
        red_flags: ["Regenerate insights — the model omitted structured data for this team."],
        action_label: "Regenerate team insights",
      };
    }

    const tier = ["strong", "medium", "risk", "watchlist"].includes(match.health_tier)
      ? match.health_tier
      : "medium";

    return {
      team: teamName,
      card_title: String(match.card_title || teamName).trim(),
      health_tier: tier,
      subtitle: String(match.subtitle || "").trim(),
      green_flags: (Array.isArray(match.green_flags) ? match.green_flags : [])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 5),
      red_flags: (Array.isArray(match.red_flags) ? match.red_flags : [])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 5),
      action_label: String(match.action_label || "Follow up with team sponsor").trim(),
    };
  });
}

async function generateTeamFlags(company, records, signal) {
  const structure = buildDepartmentGroups(records);

  if (!structure.departments.length) {
    throw new Error("No teams found under leadership in this dataset.");
  }

  const response = await fetch("/api/anthropic/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2600,
      temperature: 0.25,
      messages: [
        {
          role: "user",
          content: buildTeamFlagsPrompt(company, records),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    const apiMessage = errorPayload?.error?.message || `Anthropic API error ${response.status}`;
    throw new Error(apiMessage);
  }

  const payload = await response.json();
  const text = payload.content?.map((item) => item.text).join("\n").trim() || "";
  const parsed = extractJsonObject(text);
  const expectedTeams = structure.departments.map((dept) => dept.team);

  return normalizeTeamFlagsPayload(parsed, expectedTeams);
}

const TEAM_TIER_LABELS = {
  strong: "Strong",
  medium: "Medium",
  risk: "At risk",
  watchlist: "Watchlist",
};

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

  return (
    <section className="team-flags">
      <div className="team-flags__header">
        <div>
          <p className="eyebrow">Team signals</p>
          <h2>Green and red flags by team</h2>
          <p className="team-flags__lede">
            Claude reads the same adoption metrics as the org chart and returns actionable signals per department.
          </p>
        </div>
        {ANTHROPIC_API_KEY ? (
          <button
            type="button"
            className="action-button"
            onClick={onGenerate}
            disabled={isLoading || !hasTeams}
          >
            {isLoading ? "Generating..." : teams?.length ? "Regenerate" : "Generate team insights"}
          </button>
        ) : null}
      </div>

      {!ANTHROPIC_API_KEY ? (
        <p className="summary-placeholder">
          Add `VITE_ANTHROPIC_API_KEY=your_key_here` to `.env`, then restart `npm run dev`.
        </p>
      ) : null}

      {!hasTeams ? (
        <p className="summary-placeholder">
          Load a CSV where non-leader users have a team or department column to enable per-team analysis.
        </p>
      ) : null}

      {ANTHROPIC_API_KEY && isLoading ? (
        <p className="summary-placeholder">Mapping adoption patterns to green flags, red flags, and next actions.</p>
      ) : null}

      {ANTHROPIC_API_KEY && error ? <p className="error-message">{error}</p> : null}

      {ANTHROPIC_API_KEY && !isLoading && !error && teams?.length ? (
        <div className="team-flags__grid">
          {teams.map((team) => (
            <article key={team.team} className="team-flag-card">
              <header className="team-flag-card__header">
                <div className="team-flag-card__titles">
                  <h3>{team.card_title}</h3>
                  <p className="team-flag-card__team">{team.team}</p>
                </div>
                <span className={`team-flag-card__badge team-flag-card__badge--${team.health_tier}`}>
                  {TEAM_TIER_LABELS[team.health_tier] || team.health_tier}
                </span>
              </header>
              {team.subtitle ? <p className="team-flag-card__subtitle">{team.subtitle}</p> : null}

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
                      <li className="team-flag-card__empty">No green flags returned.</li>
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
                      <li className="team-flag-card__empty">No red flags returned.</li>
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
        </div>
      ) : null}

      {ANTHROPIC_API_KEY && hasTeams && !isLoading && !error && !teams?.length ? (
        <p className="summary-placeholder">
          Click <strong>Generate team insights</strong> to produce green flags, red flags, and a suggested action for
          each team in <strong>{company}</strong>.
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
            <span className="legend-dot" style={{ backgroundColor: config.color }} />
            {config.label}
          </button>
        );
      })}
    </div>
  );
}

function PersonCard({ person, highlightStatus }) {
  const config = STATUS_CONFIG[person.status];
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
            {person.budgetHolder ? <span className="budget-pill">Budget Holder</span> : null}
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
          <dd>{STATUS_CONFIG[person.status].label}</dd>
        </div>
        <div>
          <dt>Manager</dt>
          <dd>{person.managerName || "Top level"}</dd>
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
          <ProgressBar value={coverage.ratio} qualityClass={`progress-bar__fill--${coverageQuality}`} />
        </div>
        <p className="coverage-progress__meta">
          <span className="coverage-progress__fraction">
            {coverage.coveredUsers} / {coverage.relevantUsers}
          </span>
          <span className="coverage-progress__hint"> relevant users covered (Active + Inactive)</span>
        </p>
        <p className="coverage-copy">
          Coverage counts Active and Created Account but inactive users, and excludes Not relevant users.
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
            <span>{STATUS_CONFIG[status].label}</span>
          </div>
        ))}
      </div>
    </section>
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
      <input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
      {error ? <p className="error-message">{error}</p> : null}
    </div>
  );
}

export default function App() {
  const [records, setRecords] = useState(() => parseCsv(defaultCsv));
  const [selectedCompany, setSelectedCompany] = useState("");
  const [highlightStatus, setHighlightStatus] = useState(null);
  const [teamFlags, setTeamFlags] = useState(null);
  const [teamFlagsError, setTeamFlagsError] = useState("");
  const [isTeamFlagsLoading, setIsTeamFlagsLoading] = useState(false);
  const [teamFlagsNonce, setTeamFlagsNonce] = useState(0);

  const companies = useMemo(
    () => [...new Set(records.map((record) => record.company))].sort((left, right) => left.localeCompare(right)),
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
    if (!teamFlagsNonce || !ANTHROPIC_API_KEY || !selectedCompany || !companyRecords.length) {
      return;
    }

    const controller = new AbortController();

    async function runTeamFlags() {
      setIsTeamFlagsLoading(true);
      setTeamFlagsError("");

      try {
        const teams = await generateTeamFlags(selectedCompany, companyRecords, controller.signal);

        if (!controller.signal.aborted) {
          setTeamFlags(teams);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setTeamFlags(null);
          setTeamFlagsError(error.message || "Unable to generate team insights.");
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

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">React Org Chart</p>
          <h1>Company Adoption Coverage</h1>
          <p className="hero-copy">
            Select a company, inspect the org chart, and highlight users by activation status from a CSV source you can update later.
          </p>
        </div>
      </section>

      <section className="toolbar">
        <label className="field">
          <span>Company</span>
          <select value={selectedCompany} onChange={(event) => setSelectedCompany(event.target.value)}>
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
          <StatusLegend activeStatus={highlightStatus} onToggle={setHighlightStatus} />
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
