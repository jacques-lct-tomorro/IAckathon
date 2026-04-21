import { useEffect, useMemo, useState } from "react";
import defaultCsv from "./data/default-org-data.csv?raw";
import { API_BASE } from "./constants";
import { CompanyCoverage } from "./components/CompanyCoverage";
import { LoginForm } from "./components/LoginForm";
import { SimpleOrgChart } from "./components/SimpleOrgChart";
import { StatusLegend } from "./components/StatusLegend";
import { TeamHealthPanel } from "./components/TeamHealthPanel";
import { OroScopeLogo } from "./components/OroScopeLogo";
import { generateTeamFlags } from "./utils/api";
import { parseCsv } from "./utils/csv";
import { initialsFromName } from "./utils/helpers";
import type { AuthUser, Person, Status, TeamFlag } from "./types";

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [records, setRecords] = useState<Person[]>(() => parseCsv(defaultCsv));
  const [selectedCompany, setSelectedCompany] = useState("");
  const [highlightStatus, setHighlightStatus] = useState<Status | null>(null);
  const [teamFlags, setTeamFlags] = useState<TeamFlag[] | null>(null);
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
          const data = (await response.json()) as { user: AuthUser };
          setUser(data.user);
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
      [...new Set(records.map((record) => record.company))].sort((left, right) =>
        left.localeCompare(right),
      ),
    [records],
  );

  useEffect(() => {
    if (!companies.length) {
      setSelectedCompany("");
      return;
    }

    if (!companies.includes(selectedCompany)) {
      setSelectedCompany(companies[0] ?? "");
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
              setTeamFlags((prev) => [...(prev ?? []), team]);
            }
          },
        );

        if (!controller.signal.aborted) {
          setTeamFlags(teams);
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setTeamFlags(null);
          setTeamFlagsError(
            error instanceof Error
              ? error.message
              : "Unable to generate team insights.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsTeamFlagsLoading(false);
        }
      }
    }

    void runTeamFlags();

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
          <OroScopeLogo />
        </div>
        <div className="hero__actions">
          <div className="user-session" role="status">
            <div className="user-session__avatar" aria-hidden="true">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt=""
                  className="user-session__avatar-image"
                  referrerPolicy="no-referrer"
                />
              ) : (
                initialsFromName(user.name || user.email)
              )}
            </div>
            <div className="user-session__meta">
              <span className="user-session__label">Signed in</span>
              <span className="user-session__name">{user.name || user.email}</span>
              <span className="user-session__email">{user.email}</span>
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
