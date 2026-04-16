export function TeamFlagSkeletonCard() {
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
