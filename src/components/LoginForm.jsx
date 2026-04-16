import { useMemo, useState } from "react";
import { API_BASE } from "../constants.js";
import { initialsFromUsername } from "../utils/helpers.js";

export function LoginForm({ onSuccess }) {
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
