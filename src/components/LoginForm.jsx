import { useEffect, useRef, useState } from "react";
import { API_BASE, GOOGLE_CLIENT_ID } from "../constants.js";

export function LoginForm({ onSuccess }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const buttonRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    if (!GOOGLE_CLIENT_ID) {
      setError("Google sign-in is not configured.");
      return;
    }

    const setupGoogleButton = () => {
      if (cancelled || initializedRef.current) {
        return true;
      }
      if (!window.google?.accounts?.id || !buttonRef.current) {
        return false;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          if (!response.credential || cancelled) {
            return;
          }

          setError("");
          setSubmitting(true);
          try {
            const backendResponse = await fetch(`${API_BASE}/api/auth/google`, {
              method: "POST",
              credentials: "include",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ credential: response.credential }),
            });

            if (!backendResponse.ok) {
              const body = await backendResponse.json().catch(() => null);
              const rawMessage = body?.message;
              const message = Array.isArray(rawMessage)
                ? rawMessage.join(", ")
                : rawMessage;
              setError(message || "Google sign in failed.");
              return;
            }

            const data = await backendResponse.json();
            onSuccess(data.user);
          } catch (submitError) {
            setError(submitError.message || "Unable to reach the server.");
          } finally {
            if (!cancelled) {
              setSubmitting(false);
            }
          }
        },
      });

      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        width: 320,
      });
      initializedRef.current = true;
      return true;
    };

    if (setupGoogleButton()) {
      return () => {
        cancelled = true;
      };
    }

    const intervalId = window.setInterval(() => {
      if (setupGoogleButton()) {
        window.clearInterval(intervalId);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [onSuccess]);

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
                Use your company Google account to access the workspace.
              </p>
            </div>
          </header>

          <section className="auth-panel__form" aria-label="Google sign in">
            <div
              ref={buttonRef}
              className="auth-google-button"
              aria-live="polite"
              aria-busy={submitting}
            />
            {error ? (
              <div className="auth-panel__error" role="alert">
                <p className="error-message error-message--auth">{error}</p>
              </div>
            ) : null}
            <div className="auth-panel__actions">
              <p className="auth-panel__hint" aria-live="polite">
                {submitting
                  ? "Signing in with Google..."
                  : "Use the Google button above to continue."}
              </p>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
