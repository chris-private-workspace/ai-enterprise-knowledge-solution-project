// ekp-shell.jsx — Unified <AppShell> per ADR-0024.
// Top bar: [Logo→/dashboard] [GlobalSearch Cmd+K]  [🌐][🌓][user]
// Sidebar: 5 flat modules (Dash / Chat / KBs / Eval / Traces).
// Focus mode toggle (Chat) hides the sidebar — ChatGPT / Claude.ai pattern.

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ── Top bar ─────────────────────────────────────────────────────────────────
function TopBar({ breadcrumbs, theme, onToggleTheme, onOpenPalette, sidebarCollapsed, onToggleSidebar, onNavigate }) {
  const [openMenu, setOpenMenu] = useState(null); // "notif" | "user" | "lang" | null

  // Close menu on outside click
  useEffect(() => {
    if (!openMenu) return;
    const close = (e) => {
      if (!e.target.closest?.(".topbar-popmenu") && !e.target.closest?.("[data-popmenu-trigger]")) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [openMenu]);

  return (
    <header className="topbar" style={{ position: "relative" }}>
      <button className="btn btn-ghost btn-icon btn-sm" aria-label="Toggle sidebar" onClick={onToggleSidebar} title="Toggle sidebar (hides left navigation)">
        <IcSidebar size={15} />
      </button>
      <div className="breadcrumbs">
        {breadcrumbs.map((b, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep"><IcChevRight size={12} /></span>}
            {i === breadcrumbs.length - 1 ? <b>{b}</b> : <span>{b}</span>}
          </React.Fragment>
        ))}
      </div>

      <button className="topbar-search" onClick={onOpenPalette} title="Search KBs, traces, settings (⌘K)">
        <IcSearch size={14} />
        <span style={{ flex: 1, textAlign: "left" }}>Search KBs, traces, settings…</span>
        <span className="kbd">⌘ K</span>
      </button>

      <div className="topbar-actions">
        {/* Language */}
        <button className="btn btn-ghost btn-icon btn-sm" title="Language"
                data-popmenu-trigger
                onClick={() => setOpenMenu(openMenu === "lang" ? null : "lang")}>
          <IcGlobe size={15} />
        </button>

        {/* Theme */}
        <button className="btn btn-ghost btn-icon btn-sm" title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={onToggleTheme}>
          {theme === "dark" ? <IcSparkles size={15} /> : <IcLayers size={15} />}
        </button>

        {/* Notifications */}
        <button className="btn btn-ghost btn-icon btn-sm" title="Notifications"
                data-popmenu-trigger
                onClick={() => setOpenMenu(openMenu === "notif" ? null : "notif")}
                style={{ position: "relative" }}>
          <IcBell size={15} />
          <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", background: "oklch(var(--accent))", border: "1.5px solid oklch(var(--background))" }} />
        </button>

        <div className="topbar-divider" />

        {/* Account */}
        <button className="btn btn-ghost btn-sm" title="Account"
                data-popmenu-trigger
                onClick={() => setOpenMenu(openMenu === "user" ? null : "user")}
                style={{ paddingLeft: 4, paddingRight: 8, gap: 8 }}>
          <span className="avatar avatar-sm">CL</span>
          <span style={{ fontSize: 13 }}>chris.lai</span>
          <IcChevDown size={13} />
        </button>
      </div>

      {openMenu === "lang"  && <LanguageMenu onClose={() => setOpenMenu(null)} onNavigate={onNavigate} />}
      {openMenu === "notif" && <NotificationsMenu onClose={() => setOpenMenu(null)} onNavigate={onNavigate} />}
      {openMenu === "user"  && <UserMenu onClose={() => setOpenMenu(null)} onNavigate={onNavigate} />}
    </header>
  );
}

function PopMenu({ children, width = 320, right = 20 }) {
  return (
    <div className="topbar-popmenu" style={{
      position: "absolute",
      top: "calc(var(--topbar-h) - 4px)",
      right: right,
      width: width,
      background: "oklch(var(--popover))",
      border: "1px solid oklch(var(--border))",
      borderRadius: "var(--radius-md)",
      boxShadow: "var(--shadow-lg)",
      zIndex: 50,
      overflow: "hidden",
      animation: "pop-in 0.14s var(--ease)",
    }}>{children}</div>
  );
}

function LanguageMenu({ onClose, onNavigate }) {
  return (
    <PopMenu width={260} right={138}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid oklch(var(--border))" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>Display language</div>
        <div className="text-xs muted">Per ADR-0024 · JP/ZH disabled in Tier 1</div>
      </div>
      <div style={{ padding: 6 }}>
        {[
          { code: "en", label: "English",     enabled: true,  active: true },
          { code: "ja", label: "日本語",       enabled: false },
          { code: "zh", label: "简体中文",     enabled: false },
        ].map((l) => (
          <div key={l.code} className="nav-item"
               style={{ opacity: l.enabled ? 1 : 0.5, padding: "7px 10px" }}
               onClick={() => l.enabled && onClose()}>
            <span className="mono text-xs" style={{ width: 26 }}>{l.code}</span>
            <span style={{ flex: 1 }}>{l.label}</span>
            {l.active && <IcCheck size={13} style={{ color: "oklch(var(--accent))" }} />}
            {!l.enabled && <span className="badge badge-muted">Tier 2</span>}
          </div>
        ))}
      </div>
      <div style={{ padding: "8px 14px", borderTop: "1px solid oklch(var(--border))", background: "oklch(var(--muted) / 0.3)" }}>
        <button className="btn btn-ghost btn-xs" onClick={() => { onClose(); onNavigate("labs-languages"); }}>
          Preview JP / ZH support (Labs) →
        </button>
      </div>
    </PopMenu>
  );
}

function NotificationsMenu({ onClose, onNavigate }) {
  const notifs = [
    { id: 1, kind: "indexing-complete", title: "Customer Service SOP indexing finished", body: "62% → 100% in 14 min · 87 docs · 2,104 chunks", at: "2 min ago", unread: true, action: () => onNavigate("kb-detail", { kbId: "customer-service-sop" }) },
    { id: 2, kind: "eval-pass",         title: "Nightly eval pass · R@5 +2.4pp",          body: "Drive Manuals · 184-q eval set · all 4 metrics above target", at: "1h ago", unread: true, action: () => onNavigate("eval") },
    { id: 3, kind: "crag-spike",        title: "CRAG trigger rate climbed to 28%",        body: "Last 60 min · approaching 30% alert threshold", at: "3h ago", unread: false, action: () => onNavigate("traces") },
    { id: 4, kind: "indexing-failed",   title: "2 documents failed to parse",             body: "Advanced Reporting (PPTX) + Legacy Vendor Contracts (scanned PDF)", at: "Today 08:22", unread: false, action: () => onNavigate("kb-detail", { kbId: "drive-manuals" }) },
    { id: 5, kind: "shootout",          title: "Reranker shootout completed",             body: "Cohere v4.0-pro retained · v3.5 Δ faith −11.76pp", at: "Yesterday", unread: false, action: () => onNavigate("eval") },
  ];
  const iconFor = (k) =>
    k === "indexing-complete" ? <IcCheck size={13} style={{ color: "oklch(var(--success))" }} /> :
    k === "eval-pass"         ? <IcZap size={13} style={{ color: "oklch(var(--accent))" }} /> :
    k === "crag-spike"        ? <IcAlert size={13} style={{ color: "oklch(var(--warning))" }} /> :
    k === "indexing-failed"   ? <IcX size={13} style={{ color: "oklch(var(--destructive))" }} /> :
                                <IcActivity size={13} className="muted" />;

  return (
    <PopMenu width={380} right={66}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid oklch(var(--border))", display: "flex", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Notifications</div>
          <div className="text-xs muted">2 unread</div>
        </div>
        <div className="spacer" />
        <button className="btn btn-ghost btn-xs">Mark all read</button>
      </div>
      <div style={{ maxHeight: 420, overflowY: "auto" }}>
        {notifs.map((n) => (
          <div key={n.id} onClick={() => { n.action(); onClose(); }}
               style={{
                 display: "flex", gap: 10, padding: "10px 14px",
                 borderBottom: "1px solid oklch(var(--border))",
                 background: n.unread ? "oklch(var(--accent) / 0.04)" : "transparent",
                 cursor: "default",
               }}>
            <div style={{ width: 26, height: 26, borderRadius: "var(--radius-sm)", background: "oklch(var(--muted))", display: "grid", placeItems: "center", flexShrink: 0 }}>
              {iconFor(n.kind)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, flex: 1, minWidth: 0, lineHeight: 1.35 }}>{n.title}</span>
                {n.unread && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "oklch(var(--accent))", flexShrink: 0 }} />}
              </div>
              <div className="text-xs muted" style={{ marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>
              <div className="text-xs muted mono" style={{ marginTop: 4 }}>{n.at}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: "8px 14px", borderTop: "1px solid oklch(var(--border))", background: "oklch(var(--muted) / 0.3)", display: "flex" }}>
        <span className="text-xs muted">Alert rules in Dashboard → System health</span>
        <div className="spacer" />
        <button className="btn btn-ghost btn-xs" onClick={() => { onClose(); onNavigate("settings"); }}>Notification settings →</button>
      </div>
    </PopMenu>
  );
}

function UserMenu({ onClose, onNavigate }) {
  const items = [
    { icon: IcUsers,    label: "Profile",          go: () => onNavigate("settings") },
    { icon: IcSettings, label: "Settings",         go: () => onNavigate("settings") },
    { icon: IcKey,      label: "API keys & quotas", go: () => onNavigate("settings") },
    { icon: IcShield,   label: "Identity & Auth",  go: () => onNavigate("settings") },
  ];
  return (
    <PopMenu width={260} right={20}>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid oklch(var(--border))", display: "flex", gap: 10, alignItems: "center" }}>
        <div className="avatar avatar-lg">CL</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Chris Lai</div>
          <div className="text-xs muted" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>chris.lai@ricoh.com</div>
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            <span className="badge badge-accent">Workspace Admin</span>
          </div>
        </div>
      </div>
      <div style={{ padding: 6 }}>
        {items.map((it) => {
          const Ic = it.icon;
          return (
            <div key={it.label} className="nav-item" style={{ padding: "7px 10px" }} onClick={() => { it.go(); onClose(); }}>
              <Ic className="icon" size={14} />
              <span>{it.label}</span>
            </div>
          );
        })}
        <div className="hr" />
        <div className="nav-item" style={{ padding: "7px 10px", color: "oklch(var(--destructive))" }} onClick={() => { onClose(); onNavigate("login"); }}>
          <IcX size={14} />
          <span>Sign out</span>
        </div>
      </div>
      <div style={{ padding: "8px 14px", borderTop: "1px solid oklch(var(--border))", background: "oklch(var(--muted) / 0.3)" }}>
        <div className="text-xs muted mono">MSAL · httpOnly cookie · 7d TTL</div>
      </div>
    </PopMenu>
  );
}

// ── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ route, onNavigate, collapsed }) {
  const iconMap = { IcHome, IcChat, IcDatabase, IcActivity, IcLayers };
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">EKP</div>
        {!collapsed && (
          <>
            <div className="brand-name">Knowledge Platform</div>
            <span className="brand-tag">BETA</span>
          </>
        )}
      </div>

      {!collapsed && (
        <div className="workspace-switcher">
          <div className="ws-avatar">R</div>
          <div className="ws-info">
            <b>Ricoh · RAPO</b>
            <span>ekp-beta.ricoh.com</span>
          </div>
          <IcChevDown size={13} className="muted" />
        </div>
      )}

      <nav className="nav">
        {!collapsed && <div className="nav-section-label">Workspace</div>}
        {window.NAV_ITEMS.map((item) => {
          const Ico = iconMap[item.icon];
          const isActive = route === item.route || (item.route === "kb" && route.startsWith("kb"));
          return (
            <div
              key={item.route}
              className="nav-item"
              data-active={isActive ? "true" : "false"}
              onClick={() => onNavigate(item.route)}
              title={collapsed ? item.label : undefined}
            >
              <Ico className="icon" size={16} />
              {!collapsed && (
                <>
                  <span>{item.label}</span>
                  {item.tail && <span className="nav-tail">{item.tail}</span>}
                </>
              )}
            </div>
          );
        })}

        {!collapsed && (
          <>
            <div className="nav-section-label">Tools</div>
            <div className="nav-item" onClick={() => onNavigate("settings")}>
              <IcSettings className="icon" size={16} />
              <span>Settings</span>
            </div>
            <div className="nav-item" onClick={() => onNavigate("users")}>
              <IcUsers className="icon" size={16} />
              <span>Users & access</span>
            </div>
            <div className="nav-item muted" style={{ opacity: 0.5 }} title="Tier 2 — multi-tenancy">
              <IcShield className="icon" size={16} />
              <span>Audit Log</span>
              <span className="nav-tail">Soon</span>
            </div>

            <div className="nav-section-label" style={{ color: "oklch(var(--accent))" }}>Labs · Tier 2</div>
            {[
              { route: "labs-graph-rag",        label: "GraphRAG",         icon: IcLayers },
              { route: "labs-agents",           label: "Multi-Agent",      icon: IcCpu },
              { route: "labs-languages",        label: "Multi-Language",   icon: IcGlobe },
              { route: "labs-voice",            label: "Voice I/O",        icon: IcSend },
              { route: "labs-finetune",         label: "Fine-Tune",        icon: IcSparkles },
              { route: "labs-workflows",        label: "Workflow Builder", icon: IcZap },
              { route: "labs-personalization",  label: "Personalization",  icon: IcStar },
              { route: "labs-tenancy",          label: "Multi-Tenancy",    icon: IcShield },
            ].map((item) => {
              const Ico = item.icon;
              return (
                <div key={item.route}
                     className="nav-item"
                     data-active={route === item.route ? "true" : "false"}
                     onClick={() => onNavigate(item.route)}>
                  <Ico className="icon" size={16} />
                  <span>{item.label}</span>
                  <span className="nav-tail" style={{ color: "oklch(var(--accent))" }}>T2</span>
                </div>
              );
            })}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        {!collapsed ? (
          <>
            <div className="user-chip">
              <div className="avatar"><span>CL</span></div>
              <div className="user-chip-info">
                <b>Chris Lai</b>
                <span>Workspace Admin</span>
              </div>
            </div>
            <button className="btn btn-ghost btn-icon btn-sm" title="Sign out">
              <IcMore size={14} />
            </button>
          </>
        ) : (
          <div className="avatar" title="Chris Lai"><span>CL</span></div>
        )}
      </div>
    </aside>
  );
}

// ── Cmd+K command palette (GlobalSearch per ADR-0024 W18 NEW) ──────────────
function CommandPalette({ open, onClose, onNavigate }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const pages = [
    { label: "Dashboard",  hint: "Overview · cost · system health",  go: () => onNavigate("dashboard"), icon: IcHome },
    { label: "Chat",       hint: "Ask the knowledge base",            go: () => onNavigate("chat"),      icon: IcChat },
    { label: "Knowledge",  hint: "All KBs",                           go: () => onNavigate("kb"),        icon: IcDatabase },
    { label: "Eval",       hint: "RAGAs metrics · reranker shootout", go: () => onNavigate("eval"),      icon: IcActivity },
    { label: "Traces",     hint: "9-stage Langfuse debug view",       go: () => onNavigate("traces"),    icon: IcLayers },
    { label: "Settings",   hint: "Profile · theme · sign out",        go: () => onNavigate("settings"),  icon: IcSettings },
  ];
  const kbs = window.MOCK_KBS.map((kb) => ({
    label: kb.name, hint: `KB · ${kb.total_documents} docs · ${kb.index_name}`,
    go: () => onNavigate("kb-detail", { kbId: kb.kb_id }), icon: IcDatabase,
  }));
  const askInChat = q.trim() ? [{
    label: `Ask in chat: "${q.trim()}"`, hint: "→ /chat?q=…", go: () => onNavigate("chat"), icon: IcSend,
  }] : [];

  const filt = (xs) => xs.filter((x) => x.label.toLowerCase().includes(q.toLowerCase()));
  const sections = [
    { title: "Quick action", items: askInChat },
    { title: "Pages",       items: filt(pages) },
    { title: "Knowledge bases", items: filt(kbs) },
  ].filter((s) => s.items.length);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: "flex-start", paddingTop: "12vh" }}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{ overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid oklch(var(--border))" }}>
          <IcSearch size={16} className="muted" />
          <input
            ref={inputRef}
            placeholder="Search pages, KBs, traces, or ask in chat…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: 1, border: 0, outline: "none", background: "transparent", fontSize: 14, color: "inherit", fontFamily: "var(--font-sans)" }}
          />
          <span className="kbd">ESC</span>
        </div>
        <div style={{ maxHeight: "50vh", overflowY: "auto", padding: 6 }}>
          {sections.map((sec) => (
            <div key={sec.title}>
              <div className="nav-section-label" style={{ padding: "10px 12px 4px" }}>{sec.title}</div>
              {sec.items.map((it, i) => {
                const Ico = it.icon;
                return (
                  <div key={i} className="nav-item" style={{ padding: "8px 12px" }} onClick={() => { it.go(); onClose(); }}>
                    <Ico className="icon" size={15} />
                    <span style={{ fontWeight: 500 }}>{it.label}</span>
                    <span className="nav-tail" style={{ fontWeight: 400 }}>{it.hint}</span>
                  </div>
                );
              })}
            </div>
          ))}
          {sections.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "oklch(var(--muted-foreground))", fontSize: 13 }}>
              No matches for "{q}"
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, padding: "8px 14px", borderTop: "1px solid oklch(var(--border))", fontSize: 11, color: "oklch(var(--muted-foreground))", fontFamily: "var(--font-mono)" }}>
          <span><span className="kbd">↑↓</span> navigate</span>
          <span><span className="kbd">↵</span> open</span>
          <span><span className="kbd">ESC</span> close</span>
          <span style={{ marginLeft: "auto" }}>Cmd+K palette · ADR-0024</span>
        </div>
      </div>
    </div>
  );
}

// ── AppShell ────────────────────────────────────────────────────────────────
function AppShell({ children, route, onNavigate, breadcrumbs, theme, onToggleTheme, focusMode = false }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Cmd+K / Ctrl+K palette
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="app" data-sidebar={(sidebarCollapsed || focusMode) ? "collapsed" : "expanded"}
         style={focusMode ? { gridTemplateColumns: "0 1fr" } : undefined}>
      {!focusMode && <Sidebar route={route} onNavigate={onNavigate} collapsed={sidebarCollapsed} />}
      <div className="main">
        <TopBar
          breadcrumbs={breadcrumbs}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onOpenPalette={() => setPaletteOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          onNavigate={onNavigate}
        />
        {children}
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={onNavigate} />
    </div>
  );
}

window.TopBar = TopBar;
window.Sidebar = Sidebar;
window.CommandPalette = CommandPalette;
window.AppShell = AppShell;
