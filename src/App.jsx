import { useEffect, useMemo, useState } from "react";
import defaultCsv from "./data/default-org-data.csv?raw";
import { API_BASE } from "./constants.js";
import { CompanyCoverage } from "./components/CompanyCoverage.jsx";
import { LoginForm } from "./components/LoginForm.jsx";
import { SimpleOrgChart } from "./components/SimpleOrgChart.jsx";
import { StatusLegend } from "./components/StatusLegend.jsx";
import { TeamHealthPanel } from "./components/TeamHealthPanel.jsx";
import { generateTeamFlags } from "./utils/api.js";
import { parseCsv } from "./utils/csv.js";
import { initialsFromUsername } from "./utils/helpers.js";

function OroScopeLogo() {
  return (
    <div className="oroscope-logo" aria-hidden="true">
      <div className="oroscope-logo__badge">
        <span className="oroscope-logo__live-dot" />
        <span>Live now</span>
      </div>

      <div className="oroscope-logo__content">
        <div className="oroscope-logo__mark">
          <svg viewBox="0 0 160 140" role="presentation">
            <ellipse
              cx="80"
              cy="70"
              rx="34"
              ry="20"
              fill="none"
              stroke="#4ade80"
              strokeWidth="1.5"
              opacity="0.35"
            />
            <ellipse
              cx="80"
              cy="70"
              rx="56"
              ry="32"
              fill="none"
              stroke="#4ade80"
              strokeWidth="1.5"
              opacity="0.22"
            />
            <ellipse
              cx="80"
              cy="70"
              rx="76"
              ry="44"
              fill="none"
              stroke="#4ade80"
              strokeWidth="1.5"
              opacity="0.13"
            />
            <g transform="translate(80,70)">
              <circle className="oroscope-logo__satellite oroscope-logo__satellite--1" r="6" fill="#4ade80" />
            </g>
            <g transform="translate(80,70)">
              <circle className="oroscope-logo__satellite oroscope-logo__satellite--2" r="5" fill="#4ade80" opacity="0.8" />
            </g>
            <g transform="translate(80,70)">
              <circle className="oroscope-logo__satellite oroscope-logo__satellite--3" r="4" fill="white" opacity="0.4" />
            </g>
            <g className="oroscope-logo__sun-group">
              <circle cx="80" cy="70" r="19" fill="#4ade80" />
              <circle cx="80" cy="70" r="11" fill="#060d0a" />
              <circle cx="80" cy="70" r="4" fill="#4ade80" />
            </g>
          </svg>
        </div>

        <div className="oroscope-logo__wordmark">
          <div className="oroscope-logo__name">
            <span>Oro</span>
            <span className="oroscope-logo__name--accent">Scope</span>
          </div>
          <div className="oroscope-logo__tagline">
            Spot the gap. Close the deal.
          </div>
        </div>
      </div>
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
  }, [teamFlagsNonce]);

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
          <OroScopeLogo />
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
