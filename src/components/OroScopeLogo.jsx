export function OroScopeLogo() {
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
