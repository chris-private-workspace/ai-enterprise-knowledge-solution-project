// ekp-page-dashboard.jsx — /dashboard, per §5.3 + ADR-0024 W18 NEW.
// 5 cards: KB summary / Recent queries / Latest eval / System health / Quick actions

function PageDashboard({ onNavigate }) {
  const kbs = window.MOCK_KBS;
  const recent = window.MOCK_RECENT_QUERIES;
  const evalReport = window.MOCK_EVAL_REPORT;
  const cost = window.MOCK_COST_SUMMARY;

  const totalDocs = kbs.reduce((s, k) => s + k.total_documents, 0);
  const totalChunks = kbs.reduce((s, k) => s + k.total_chunks, 0);
  const totalStorageMb = kbs.reduce((s, k) => s + k.storage_size_mb, 0);
  const indexingKbs = kbs.filter((k) => k.status === "indexing");

  return (
    <div className="content">
      <div className="content-wide">
        <div className="page-header">
          <div>
            <h1 className="page-title">Welcome back, Chris</h1>
            <p className="page-subtitle">
              <span className="status-dot ready" /> EKP Beta · <span className="mono">ekp-beta.ricoh.com</span> · System healthy · Last eval pass <b>14:17 today</b>
            </p>
          </div>
          <div className="page-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate("eval")}>
              <IcActivity size={14} /> View latest eval
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => onNavigate("chat")}>
              <IcChat size={14} /> Ask the knowledge base
            </button>
          </div>
        </div>

        {/* Stat strip */}
        <div className="stat-grid">
          <div className="stat">
            <div className="stat-label"><IcDatabase size={13} /> Knowledge bases</div>
            <div className="stat-value">{kbs.length}<span className="stat-unit"> active</span></div>
            <div className="stat-meta">
              {indexingKbs.length > 0 && <><span className="status-dot indexing" /> {indexingKbs.length} indexing</>}
              {indexingKbs.length === 0 && <><span className="status-dot ready" /> All ready</>}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label"><IcFile size={13} /> Documents</div>
            <div className="stat-value">{totalDocs.toLocaleString()}</div>
            <div className="stat-meta">
              <span>{totalChunks.toLocaleString()} chunks · {totalStorageMb.toFixed(0)} MB</span>
            </div>
          </div>
          <div className="stat">
            <div className="stat-label"><IcZap size={13} /> Recall @ 5</div>
            <div className="stat-value">{(evalReport.recall_at_5 * 100).toFixed(1)}<span className="stat-unit">%</span></div>
            <div className="stat-meta">
              <span className="trend-up">▲ 2.4pp</span> <span>vs prev week · 184 q eval set</span>
            </div>
          </div>
          <div className="stat">
            <div className="stat-label"><IcActivity size={13} /> Today's spend</div>
            <div className="stat-value">${cost.realtime_total_usd.toFixed(2)}</div>
            <div className="stat-meta">
              <span>Projected ${cost.total_projected_monthly_usd.toFixed(0)}/mo · cap $30/day</span>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
          {/* Left col */}
          <div className="col" style={{ gap: 16 }}>
            <KbSummaryCard kbs={kbs} onNavigate={onNavigate} />
            <RecentQueriesCard recent={recent} onNavigate={onNavigate} />
          </div>

          {/* Right col */}
          <div className="col" style={{ gap: 16 }}>
            <LatestEvalCard evalReport={evalReport} onNavigate={onNavigate} />
            <SystemHealthCard cost={cost} />
            <QuickActionsCard onNavigate={onNavigate} />
          </div>
        </div>
      </div>
    </div>
  );
}

function KbSummaryCard({ kbs, onNavigate }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Knowledge bases</h3>
          <div className="card-desc">Per-KB index <span className="mono">ekp-kb-{'{kb_id}'}-v1</span> · ADR-0018 namespace</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => onNavigate("kb")}>
          View all <IcChevRight size={13} />
        </button>
      </div>
      <div className="card-body card-body-tight">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th className="col-num">Docs</th>
              <th className="col-num">Chunks</th>
              <th className="col-num">R@5</th>
              <th className="col-num">Last indexed</th>
            </tr>
          </thead>
          <tbody>
            {kbs.map((kb) => (
              <tr key={kb.kb_id} onClick={() => onNavigate("kb-detail", { kbId: kb.kb_id })} style={{ cursor: "default" }}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="kb-icon" style={{ width: 26, height: 26 }}>
                      <IcDatabase size={13} />
                    </div>
                    <div>
                      <div className="table-row-link">{kb.name}</div>
                      <div className="text-xs muted mono">{kb.index_name}</div>
                    </div>
                  </div>
                </td>
                <td>
                  {kb.status === "ready" ? (
                    <span className="badge badge-success"><span className="badge-dot" /> READY</span>
                  ) : (
                    <span className="badge badge-info">
                      <span className="badge-dot" /> INDEXING {Math.round(kb.indexing_progress * 100)}%
                    </span>
                  )}
                </td>
                <td className="col-num">{kb.total_documents}</td>
                <td className="col-num">{kb.total_chunks.toLocaleString()}</td>
                <td className="col-num">{(kb.recall_at_5 * 100).toFixed(1)}%</td>
                <td className="col-num text-xs">{formatRelative(kb.last_indexed_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecentQueriesCard({ recent, onNavigate }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Recent queries</h3>
          <div className="card-desc">Last 24h · CRAG-triggered queries marked with <span className="badge badge-accent" style={{ marginLeft: 2 }}><span className="badge-dot" /> CRAG</span></div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => onNavigate("traces")}>
          All traces <IcChevRight size={13} />
        </button>
      </div>
      <div className="card-body card-body-tight">
        {recent.map((q) => (
          <div key={q.id} className="activity"
               style={{ padding: "12px 18px", borderBottom: "1px solid oklch(var(--border))" }}
               onClick={() => onNavigate("trace-detail", { traceId: q.trace_id })}>
            <div className="activity-icon"><IcChat size={14} /></div>
            <div className="activity-body">
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="mono text-xs muted">{q.user}</span>
                <span className="text-xs muted">on</span>
                <span className="badge badge-muted">{q.kb}</span>
                {q.crag && <span className="badge badge-accent"><span className="badge-dot" /> CRAG</span>}
              </div>
              <div style={{ marginTop: 4, fontSize: 13.5, lineHeight: 1.45 }}>{q.q}</div>
              <div className="text-xs muted mono" style={{ marginTop: 4 }}>
                {q.latency_ms}ms · ${q.cost.toFixed(4)} · trace <span style={{ color: "oklch(var(--accent))" }}>{q.trace_id.slice(-12)}</span>
              </div>
            </div>
            <div className="activity-time">{q.at}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LatestEvalCard({ evalReport, onNavigate }) {
  const metrics = [
    { label: "Recall@5", value: evalReport.recall_at_5, delta: +0.024 },
    { label: "Faithfulness", value: evalReport.faithfulness, delta: +0.008 },
    { label: "Ans Relevancy", value: evalReport.answer_relevancy, delta: -0.012 },
    { label: "Ctx Precision", value: evalReport.context_precision, delta: +0.018 },
  ];
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Latest eval</h3>
          <div className="card-desc">RAGAs · <span className="mono">{evalReport.eval_set_id}</span> · {evalReport.eval_set_size} q</div>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onNavigate("eval")}>
          <IcChevRight size={13} />
        </button>
      </div>
      <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {metrics.map((m) => (
          <div key={m.label} style={{ padding: "10px 12px", border: "1px solid oklch(var(--border))", borderRadius: "var(--radius-sm)" }}>
            <div className="text-xs muted" style={{ marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
              {(m.value * 100).toFixed(1)}<span className="stat-unit" style={{ fontSize: 11 }}>%</span>
            </div>
            <div className="text-xs mono" style={{ marginTop: 2, color: m.delta > 0 ? "oklch(var(--success))" : "oklch(var(--destructive))" }}>
              {m.delta > 0 ? "▲" : "▼"} {Math.abs(m.delta * 100).toFixed(1)}pp
            </div>
          </div>
        ))}
      </div>
      <div className="card-footer">
        <div className="text-xs muted mono">Reranker locked · <b style={{ color: "oklch(var(--foreground))" }}>cohere-v4.0-pro</b> · ADR-0012</div>
        <button className="btn btn-ghost btn-xs" onClick={() => onNavigate("eval")}>Shootout →</button>
      </div>
    </div>
  );
}

function SystemHealthCard({ cost }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">System health</h3>
          <div className="card-desc">Realtime · Langfuse {cost.realtime_status} · {cost.realtime_window_hours}h window</div>
        </div>
        <span className="badge badge-success"><span className="badge-dot" /> ALL OK</span>
      </div>
      <div className="card-body card-body-tight">
        {cost.alerts.map((a) => (
          <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderBottom: "1px solid oklch(var(--border))" }}>
            <span className="status-dot ready" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</div>
              <div className="text-xs muted mono">{a.condition}</div>
            </div>
            <div className="mono" style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{a.current}</div>
            <span className="badge badge-muted">{a.severity.toUpperCase()}</span>
          </div>
        ))}
      </div>
      <div className="card-footer">
        <div className="text-xs muted">Daily ${cost.total_projected_daily_usd.toFixed(2)} · monthly ${cost.total_projected_monthly_usd.toFixed(0)}</div>
        <button className="btn btn-ghost btn-xs">Cost breakdown <IcChevRight size={11} /></button>
      </div>
    </div>
  );
}

function QuickActionsCard({ onNavigate }) {
  const actions = [
    { icon: IcUpload, label: "Upload documents", hint: "3-step pipeline wizard", go: () => onNavigate("kb-upload", { kbId: "drive-manuals" }) },
    { icon: IcSearch, label: "Retrieval testing", hint: "Compare BM25 / Vector / Hybrid", go: () => onNavigate("kb-detail", { kbId: "drive-manuals", tab: "retrieval-test" }) },
    { icon: IcPlus,   label: "New knowledge base", hint: "Per-KB index", go: () => onNavigate("kb") },
    { icon: IcKey,    label: "API access",   hint: "Tier 2 — disabled",  disabled: true },
  ];
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Quick actions</h3>
      </div>
      <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {actions.map((a, i) => {
          const Ic = a.icon;
          return (
            <button key={i} className="btn btn-secondary"
                    style={{ height: "auto", padding: "12px 12px", justifyContent: "flex-start", textAlign: "left", flexDirection: "column", alignItems: "flex-start", gap: 4 }}
                    disabled={a.disabled} onClick={a.go}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Ic size={15} className={a.disabled ? "muted" : ""} />
                <span style={{ fontWeight: 500 }}>{a.label}</span>
              </div>
              <div className="text-xs muted" style={{ fontWeight: 400 }}>{a.hint}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// helpers
function formatRelative(iso) {
  const d = new Date(iso);
  const now = new Date("2026-05-15T23:00:00Z");
  const mins = Math.floor((now - d) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 60 / 24)}d ago`;
}

window.PageDashboard = PageDashboard;
window.formatRelative = formatRelative;
