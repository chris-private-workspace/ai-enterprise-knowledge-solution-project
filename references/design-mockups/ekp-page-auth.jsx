// ekp-page-auth.jsx — /login + /register per architecture.md §5.10 §5.11
// ADR-0022 hybrid auth: Entra ID SSO + self-register fallback (httpOnly cookie + CSRF + /auth/refresh)
// ADR-0014: Forgot password is **disabled** with title="Tier 2 (post-Beta)"

function PageLogin({ onNavigate, onToggleTheme, theme }) {
  return (
    <AuthFrame title="Sign in to EKP" onToggleTheme={onToggleTheme} theme={theme}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", margin: 0, marginBottom: 6 }}>Welcome back</h1>
        <p style={{ fontSize: 14, color: "oklch(var(--muted-foreground))", margin: 0 }}>
          Sign in with your Ricoh corporate account or with email.
        </p>
      </div>

      {/* Primary: Entra ID SSO */}
      <button className="btn btn-primary btn-lg" style={{ width: "100%", marginBottom: 14, justifyContent: "center", gap: 10 }}>
        <MicrosoftIcon />
        Sign in with Microsoft
      </button>

      <Divider label="OR continue with email" />

      <div className="field">
        <label className="label">Work email</label>
        <input className="input" type="email" placeholder="you@ricoh.com" defaultValue="chris.lai@ricoh.com" />
      </div>

      <div className="field">
        <div style={{ display: "flex", alignItems: "center" }}>
          <label className="label" style={{ flex: 1, marginBottom: 0 }}>Password</label>
          <button className="btn btn-ghost btn-xs btn-ghost-muted"
                  disabled title="Tier 2 — post-Beta">
            Forgot password? <span className="badge badge-muted" style={{ marginLeft: 4, fontSize: 9.5 }}>Tier 2</span>
          </button>
        </div>
        <input className="input" type="password" placeholder="••••••••" defaultValue="•••••••••••" style={{ marginTop: 6 }} />
      </div>

      <button className="btn btn-accent btn-lg" style={{ width: "100%", marginTop: 8 }} onClick={() => onNavigate("dashboard")}>
        Sign in →
      </button>

      <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "oklch(var(--muted-foreground))" }}>
        Don't have an account? <a onClick={() => onNavigate("register")} style={{ color: "oklch(var(--accent))", cursor: "default", fontWeight: 500 }}>Create one</a>
      </div>

      {/* Auth state notice */}
      <div style={{
        marginTop: 24,
        padding: "10px 12px",
        border: "1px dashed oklch(var(--border-strong))",
        borderRadius: "var(--radius-sm)",
        fontSize: 11.5,
        color: "oklch(var(--muted-foreground))",
        lineHeight: 1.6,
        fontFamily: "var(--font-mono)",
      }}>
        <b style={{ color: "oklch(var(--foreground))" }}>Auth modes (Tier 1)</b><br />
        · Hybrid: Entra ID SSO primary + email self-register fallback (ADR-0022)<br />
        · httpOnly cookie + CSRF double-submit + /auth/refresh<br />
        · Mock-auth default in dev (Track A IT cred populate W16+)
      </div>
    </AuthFrame>
  );
}

// ── /register per §5.11 + ADR-0014 + C13 Email Verification Service ────────
function PageRegister({ onNavigate, onToggleTheme, theme }) {
  const [step, setStep] = useState(0); // 0 form, 1 verify-email
  const [email, setEmail] = useState("");

  if (step === 1) {
    return (
      <AuthFrame title="Verify your email" onToggleTheme={onToggleTheme} theme={theme}>
        <div style={{ textAlign: "center", padding: "12px 0 24px" }}>
          <div style={{
            width: 56, height: 56,
            borderRadius: "50%",
            background: "oklch(var(--accent) / 0.12)",
            color: "oklch(var(--accent))",
            display: "grid", placeItems: "center",
            margin: "0 auto 16px",
          }}>
            <IcInbox size={26} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.018em", margin: 0, marginBottom: 8 }}>Check your inbox</h1>
          <p style={{ fontSize: 14, color: "oklch(var(--muted-foreground))", lineHeight: 1.55, margin: 0, maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
            We sent a verification link to <b style={{ color: "oklch(var(--foreground))" }}>{email || "chris.lai@ricoh.com"}</b>.
            Click the link to activate your account.
          </p>
        </div>

        <div style={{
          padding: "12px 14px",
          background: "oklch(var(--muted) / 0.4)",
          border: "1px solid oklch(var(--border))",
          borderRadius: "var(--radius-sm)",
          marginBottom: 16,
        }}>
          <div className="text-xs muted mono" style={{ marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            What happens next
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.7, color: "oklch(var(--foreground))" }}>
            <li>Click the link in the email (expires in 24h)</li>
            <li>You'll be auto-signed in and routed to <span className="mono">/dashboard</span></li>
            <li>Your workspace is <b>Ricoh · RAPO</b> (Beta cohort)</li>
          </ol>
        </div>

        <button className="btn btn-secondary" style={{ width: "100%", marginBottom: 8 }}>
          <IcRefresh size={13} /> Resend verification email
        </button>
        <button className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "center" }} onClick={() => setStep(0)}>
          ← Change email
        </button>

        <div style={{
          marginTop: 18,
          padding: "10px 12px",
          border: "1px dashed oklch(var(--border-strong))",
          borderRadius: "var(--radius-sm)",
          fontSize: 11,
          color: "oklch(var(--muted-foreground))",
          lineHeight: 1.55,
          fontFamily: "var(--font-mono)",
        }}>
          Powered by <b style={{ color: "oklch(var(--foreground))" }}>Azure Communication Services</b> (C13 Email Verification Service · architecture.md v6 §3.7). Dev mode falls back to <span className="mono">ConsoleEmailProvider</span>.
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Create account" onToggleTheme={onToggleTheme} theme={theme}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", margin: 0, marginBottom: 6 }}>Create your account</h1>
        <p style={{ fontSize: 14, color: "oklch(var(--muted-foreground))", margin: 0 }}>
          Self-register with email · SSO via <span style={{ color: "oklch(var(--foreground))", fontWeight: 500 }}>Sign in</span> if you have Entra ID.
        </p>
      </div>

      <div className="field">
        <label className="label">Full name</label>
        <input className="input" type="text" placeholder="Chris Lai" defaultValue="Chris Lai" />
      </div>

      <div className="field">
        <label className="label">Work email</label>
        <input className="input" type="email" placeholder="you@ricoh.com" value={email} onChange={(e) => setEmail(e.target.value)} defaultValue="chris.lai@ricoh.com" />
        <div className="hint">We'll send a verification link · Beta cohort restricted to <span className="mono">@ricoh.com</span></div>
      </div>

      <div className="field">
        <label className="label">Password</label>
        <input className="input" type="password" placeholder="At least 12 characters" />
        <div className="hint">Scrypt-hashed via ADR-0022 ·  ≥ 12 chars, ≥ 1 number, ≥ 1 symbol</div>
      </div>

      <div className="row" style={{ marginBottom: 16, alignItems: "flex-start", gap: 8 }}>
        <input type="checkbox" defaultChecked style={{ marginTop: 3 }} />
        <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "oklch(var(--muted-foreground))" }}>
          I agree to the <a style={{ color: "oklch(var(--accent))" }}>Terms of Use</a> and <a style={{ color: "oklch(var(--accent))" }}>Privacy Policy</a> · I understand my queries are logged for evaluation (Langfuse) and visible only to me.
        </span>
      </div>

      <button className="btn btn-accent btn-lg" style={{ width: "100%" }} onClick={() => setStep(1)}>
        Create account →
      </button>

      <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "oklch(var(--muted-foreground))" }}>
        Already have an account? <a onClick={() => onNavigate("login")} style={{ color: "oklch(var(--accent))", cursor: "default", fontWeight: 500 }}>Sign in</a>
      </div>
    </AuthFrame>
  );
}

// ── Shared auth frame: brand panel + form pane, no AppShell ────────────────
function AuthFrame({ children, onToggleTheme, theme }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      height: "100vh",
      background: "oklch(var(--background))",
    }}>
      {/* Brand panel (left) */}
      <div style={{
        background: "oklch(var(--primary))",
        color: "oklch(var(--primary-foreground))",
        padding: "40px 48px",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative accent dots */}
        <svg viewBox="0 0 400 400" style={{ position: "absolute", inset: 0, opacity: 0.15 }}>
          <defs>
            <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="oklch(var(--primary-foreground))" />
            </pattern>
          </defs>
          <rect width="400" height="400" fill="url(#dots)" />
        </svg>

        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36,
            borderRadius: "var(--radius-sm)",
            background: "oklch(var(--accent))",
            color: "oklch(var(--accent-foreground))",
            display: "grid", placeItems: "center",
            fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 14,
          }}>EKP</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Enterprise Knowledge Platform</div>
            <div style={{ fontSize: 12, opacity: 0.7, fontFamily: "var(--font-mono)" }}>ekp-beta.ricoh.com</div>
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 1, marginTop: "auto", marginBottom: "auto" }}>
          <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.25, letterSpacing: "-0.022em", marginBottom: 14, textWrap: "balance" }}>
            Knowledge retrieval, grounded in your real documents.
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.8, maxWidth: 380 }}>
            Hybrid retrieval · Cohere v4.0-pro rerank · CRAG self-correction · 9-stage trace · Image-grounded citations.
          </div>

          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10, fontSize: 12.5 }}>
            {[
              ["R@5 = 97.2%",        "Drive Manuals · D365 F&O ERP corpus"],
              ["P95 latency 4.2s",   "9-stage Langfuse trace per query"],
              ["100% oklch tokens",  "Light + dark, no Dify dependency"],
            ].map(([metric, sub]) => (
              <div key={metric} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{
                  fontFamily: "var(--font-mono)", fontWeight: 600,
                  width: 130,
                  background: "oklch(var(--accent) / 0.2)",
                  border: "1px solid oklch(var(--accent) / 0.4)",
                  color: "oklch(var(--accent))",
                  padding: "3px 8px",
                  borderRadius: 3,
                  textAlign: "center",
                }}>{metric}</span>
                <span style={{ opacity: 0.75 }}>{sub}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 1, fontSize: 11.5, opacity: 0.6, fontFamily: "var(--font-mono)" }}>
          © Ricoh · RAPO · v0.18.0-beta · Build 2026-05-15
        </div>
      </div>

      {/* Form panel (right) */}
      <div style={{
        padding: "40px 48px",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="spacer" />
          <button className="btn btn-ghost btn-icon btn-sm" title="Toggle theme" onClick={onToggleTheme}>
            {theme === "dark" ? <IcSparkles size={14} /> : <IcLayers size={14} />}
          </button>
          <button className="btn btn-ghost btn-icon btn-sm" title="Language (Tier 2)" disabled>
            <IcGlobe size={14} />
          </button>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 380 }}>
            {children}
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 11.5, color: "oklch(var(--muted-foreground))", fontFamily: "var(--font-mono)" }}>
          MSAL session · httpOnly cookie · scrypt password · CSRF protected
        </div>
      </div>
    </div>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0", color: "oklch(var(--muted-foreground))", fontSize: 11.5 }}>
      <div style={{ flex: 1, height: 1, background: "oklch(var(--border))" }} />
      <span>{label}</span>
      <div style={{ flex: 1, height: 1, background: "oklch(var(--border))" }} />
    </div>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <rect x="2"  y="2"  width="9.5" height="9.5" fill="#F25022" />
      <rect x="12.5" y="2"  width="9.5" height="9.5" fill="#7FBA00" />
      <rect x="2"  y="12.5" width="9.5" height="9.5" fill="#00A4EF" />
      <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" />
    </svg>
  );
}

window.PageLogin = PageLogin;
window.PageRegister = PageRegister;
