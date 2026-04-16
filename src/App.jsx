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
                    <div className={`dept-badge ${getDepartmentBadgeClass(department.ratio)}`}>
                      {Math.round(department.ratio * 100)}%
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

function renderInlineMarkdown(text) {
  const parts = String(text || "").split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={`${part}-${index}`}>{part.slice(1, -1)}</em>;
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>;
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function MarkdownBlock({ content }) {
  const lines = String(content || "").split("\n");
  const blocks = [];
  let bulletItems = [];
  let numberedItems = [];

  const flushBullets = () => {
    if (bulletItems.length) {
      blocks.push(
        <ul key={`bullets-${blocks.length}`} className="markdown-list">
          {bulletItems.map((item, index) => (
            <li key={`${item}-${index}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>,
      );
      bulletItems = [];
    }
  };

  const flushNumbered = () => {
    if (numberedItems.length) {
      blocks.push(
        <ol key={`numbers-${blocks.length}`} className="markdown-list">
          {numberedItems.map((item, index) => (
            <li key={`${item}-${index}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>,
      );
      numberedItems = [];
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushBullets();
      flushNumbered();
      return;
    }

    if (trimmed.startsWith("### ")) {
      flushBullets();
      flushNumbered();
      blocks.push(<h4 key={`h4-${blocks.length}`}>{renderInlineMarkdown(trimmed.slice(4))}</h4>);
      return;
    }

    if (trimmed.startsWith("## ")) {
      flushBullets();
      flushNumbered();
      blocks.push(<h3 key={`h3-${blocks.length}`}>{renderInlineMarkdown(trimmed.slice(3))}</h3>);
      return;
    }

    if (trimmed.startsWith("# ")) {
      flushBullets();
      flushNumbered();
      blocks.push(<h2 key={`h2-${blocks.length}`}>{renderInlineMarkdown(trimmed.slice(2))}</h2>);
      return;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushNumbered();
      bulletItems.push(trimmed.replace(/^[-*]\s+/, ""));
      return;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      flushBullets();
      numberedItems.push(trimmed.replace(/^\d+\.\s+/, ""));
      return;
    }

    flushBullets();
    flushNumbered();
    blocks.push(
      <p key={`p-${blocks.length}`}>{renderInlineMarkdown(trimmed)}</p>,
    );
  });

  flushBullets();
  flushNumbered();

  return <div className="summary-content">{blocks}</div>;
}

function buildSummaryPrompt(company, records) {
  const coverage = computeCoverage(records);
  const counts = collectStatusCounts(records);
  const teamBreakdown = [...new Set(records.map((person) => person.team).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right))
    .map((team) => {
      const teamRecords = records.filter((person) => person.team === team);
      const activeCount = teamRecords.filter((person) => person.status === "Active").length;
      const inactiveCount = teamRecords.filter((person) => person.status === "Inactive").length;
      const inviteCount = teamRecords.filter((person) => person.status === "To Invite").length;
      const avgConnections = teamRecords.length
        ? (
            teamRecords.reduce(
              (sum, person) => sum + person.connectionsLastMonth,
              0,
            ) / teamRecords.length
          ).toFixed(1)
        : "0.0";

      return `- ${team}: ${teamRecords.length} users, ${activeCount} active, ${inactiveCount} inactive, ${inviteCount} to invite, average ${avgConnections} connections last month`;
    })
    .join("\n");

  const lowEngagementUsers = [...records]
    .filter((person) => person.status !== "Not Relevant")
    .sort((left, right) => left.connectionsLastMonth - right.connectionsLastMonth)
    .slice(0, 5)
    .map(
      (person) =>
        `- ${person.name} | ${person.role || "No role"} | ${person.team || "No team"} | ${person.status} | ${person.connectionsLastMonth} connections`,
    )
    .join("\n");

  return `
You are an enterprise adoption strategist.
Analyze company adoption data and recommend the most important actions to convert more people into active users.

Company: ${company}
Coverage: ${coverage.ratio.toFixed(0)}%
Covered users: ${coverage.coveredUsers}
Relevant users: ${coverage.relevantUsers}
Status counts:
- Active: ${counts.Active}
- Inactive: ${counts.Inactive}
- To Invite: ${counts["To Invite"]}
- Not Relevant: ${counts["Not Relevant"]}

Team breakdown:
${teamBreakdown || "- No teams available"}

Lowest-engagement relevant users:
${lowEngagementUsers || "- No users available"}

Return markdown with exactly:
# Executive Summary
One sentence.

## Recommended Actions
- Three short action bullets prioritized by impact

## Focus Team
One short line naming the team with the best short-term activation potential.

Keep the answer under 120 words, concrete, and business-oriented.
`.trim();
}

async function generateCompanySummary(company, records, signal) {
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
      max_tokens: 220,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: buildSummaryPrompt(company, records),
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
  return payload.content?.map((item) => item.text).join("\n").trim() || "No summary returned.";
}

function AiSummaryPanel({
  company,
  summary,
  isLoading,
  error,
  onRefresh,
}) {
  return (
    <section className="ai-summary">
      <div className="ai-summary__header">
        <div>
          <p className="eyebrow">AI Summary</p>
          <h2>Recommended actions for {company}</h2>
        </div>
      {ANTHROPIC_API_KEY ? (
          <button type="button" className="action-button" onClick={onRefresh} disabled={isLoading}>
            {isLoading ? "Generating..." : summary ? "Refresh summary" : "Generate summary"}
          </button>
        ) : null}
      </div>

      {!ANTHROPIC_API_KEY ? (
        <p className="summary-placeholder">
          Add `VITE_ANTHROPIC_API_KEY=your_key_here` to `.env`, then restart `npm run dev`.
        </p>
      ) : null}

      {ANTHROPIC_API_KEY && isLoading ? (
        <p className="summary-placeholder">Claude is analyzing adoption gaps and activation opportunities.</p>
      ) : null}

      {ANTHROPIC_API_KEY && error ? <p className="error-message">{error}</p> : null}

      {ANTHROPIC_API_KEY && !isLoading && !error && summary ? (
        <MarkdownBlock content={summary} />
      ) : null}

      {ANTHROPIC_API_KEY && !isLoading && !error && !summary ? (
        <p className="summary-placeholder">
          Click <strong>Generate summary</strong> to get AI-recommended actions for this company.
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

  return (
    <section className="coverage-panel">
      <div>
        <p className="eyebrow">Global Coverage</p>
        <h2>{coverage.ratio.toFixed(0)}%</h2>
        <p className="coverage-copy">
          {coverage.coveredUsers} covered users out of {coverage.relevantUsers} relevant users.
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
  const [aiSummary, setAiSummary] = useState("");
  const [aiError, setAiError] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [summaryNonce, setSummaryNonce] = useState(0);

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
    setAiSummary("");
    setAiError("");
    setIsAiLoading(false);
  }, [selectedCompany, records]);

  useEffect(() => {
    if (!summaryNonce || !ANTHROPIC_API_KEY || !selectedCompany || !companyRecords.length) {
      return;
    }

    const controller = new AbortController();

    async function runSummary() {
      setIsAiLoading(true);
      setAiError("");

      try {
        const summary = await generateCompanySummary(selectedCompany, companyRecords, controller.signal);

        if (!controller.signal.aborted) {
          setAiSummary(summary);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setAiSummary("");
          setAiError(error.message || "Unable to generate AI summary.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsAiLoading(false);
        }
      }
    }

    runSummary();

    return () => controller.abort();
  }, [summaryNonce, selectedCompany, companyRecords]);

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
        <CsvUploader onLoad={setRecords} />
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

      {selectedCompany ? (
        <AiSummaryPanel
          company={selectedCompany}
          summary={aiSummary}
          isLoading={isAiLoading}
          error={aiError}
          onRefresh={() => setSummaryNonce((value) => value + 1)}
        />
      ) : null}

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
    </main>
  );
}
