import { useMemo } from "react";
import {
  TEAM_TIER_LABELS,
  TEAM_TIER_SORT_ORDER,
} from "../constants.js";
import { buildDepartmentGroups } from "../utils/org.js";
import { TeamFlagsAiStatus } from "./TeamFlagsAiStatus.jsx";
import { TeamFlagSkeletonCard } from "./TeamFlagSkeletonCard.jsx";

export function TeamHealthPanel({
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
