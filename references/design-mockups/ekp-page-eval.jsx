// ekp-page-eval.jsx — /eval per §5.6 + ADR-0012
// 4 metric card + W4 Reranker Shootout table + recommendation card

function PageEval({ onNavigate, tweaks }) {
  const ev = window.MOCK_EVAL_REPORT;
  const shootout = window.MOCK_SHOOTOUT;
  const failed = window.MOCK_FAILED_QUERIES;

  return (
    <div className="content">
      <div className="content-wide">
        <div className="page-header">
          <div>
            <h1 className="page-title">Eval Console</h1>
            <p className="page-subtitle">
              RAGAs 4-metric evaluation against a curated <span className="mono">{ev.eval_set_id}</span> ({ev.eval_set_size} queries). Last run finished {window.formatRelative(ev.finished_at)}.
            </p>
          </div>
          <div className="page-actions">
            <button className="btn btn-secondary btn-sm"><IcRefresh size={13} /> Run eval suite</button>
            <button className="btn btn-secondary btn-sm"><IcDownload size={13} /> Export report</button>
            <button className="btn btn-primary btn-sm"><IcZap size={13} /> Reranker shootout</button>
          </div>
        </div>

        {/* Metric cards */}
        <div className="stat-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <MetricCard label="Recall@5"     value={ev.recall_at_5}     delta={+0.024} target={0.95} description="Top-5 contains correct chunk" />
          <MetricCard label="Faithfulness" value={ev.faithfulness}    delta={+0.008} target={0.92} description="Answer grounded in citations" />
          <MetricCard label="Ans Relevancy" value={ev.answer_relevancy} delta={-0.012} target={0.90} description="Answer addresses the question" />
          <MetricCard label="Ctx Precision" value={ev.context_precision} delta={+0.018} target={0.85} description="Retrieved context is relevant" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
          <div className="col" style={{ gap: 16 }}>
            <RerankerShootoutCard shootout={shootout} />
            <FailedQueriesCard failed={failed} ev={ev} />
          </div>
          <div className="col" style={{ gap: 16 }}>
            <RecommendationCard shootout={shootout} />
            <OpsMetricsCard ev={ev} />
            <CragInsightCard ev={ev} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, delta, target, description }) {
  const pct = value * 100;
  const hitTarget = value >= target;
  return (
    <div className="stat">
      <div className="stat-label">
        <IcZap size={13} /> {label}
      </div>
      <div className="stat-value">
        {pct.toFixed(1)}<span className="stat-unit">%</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <div className="progress accent" style={{ flex: 1 }}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs mono muted">{(target * 100).toFixed(0)}%</span>
      </div>
      <div className="stat-meta">
        <span className={delta > 0 ? "trend-up" : "trend-down"}>{delta > 0 ? "▲" : "▼"} {Math.abs(delta * 100).toFixed(1)}pp</span>
        <span>·</span>
        <span style={{ color: hitTarget ? "oklch(var(--success))" : "oklch(var(--warning))" }}>
          {hitTarget ? "Above target" : "Below target"}
        </span>
      </div>
    </div>
  );
}

function RerankerShootoutCard({ shootout }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Reranker shootout</h3>
          <div className="card-desc">
            W4 4-way → 2-way (per Karpathy §1.2) · W6 D1 LIVE Azure reaffirm · <span className="mono">cohere-v4.0-pro</span> locked by ADR-0012
          </div>
        </div>
        <span className="badge badge-success"><span className="badge-dot" /> WINNER · {shootout.winner}</span>
      </div>
      <div className="card-body card-body-tight">
        <table className="table">
          <thead>
            <tr>
              <th>Reranker</th>
              <th className="col-num">Recall@5</th>
              <th className="col-num">Faith</th>
              <th className="col-num">Relevancy</th>
              <th className="col-num">P95 latency</th>
              <th className="col-num">$/query</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shootout.rerankers.map((r) => {
              if (r.skipped) {
                return (
                  <tr key={r.reranker} style={{ opacity: 0.55 }}>
                    <td>
                      <div className="row">
                        <span className="mono" style={{ fontWeight: 500 }}>{r.reranker}</span>
                        <span className="badge badge-muted">DROPPED</span>
                      </div>
                      <div className="text-xs muted" style={{ marginTop: 2 }}>{r.skip_reason}</div>
                    </td>
                    <td colSpan={6} className="text-xs muted">—</td>
                  </tr>
                );
              }
              const isWinner = r.reranker === shootout.winner;
              return (
                <tr key={r.reranker} style={isWinner ? { background: "oklch(var(--accent) / 0.05)" } : undefined}>
                  <td>
                    <div className="row">
                      <span className="mono" style={{ fontWeight: 500 }}>{r.reranker}</span>
                      {r.locked && <span className="badge badge-accent"><span className="badge-dot" /> LOCKED</span>}
                      {r.baseline && <span className="badge badge-muted">BASELINE</span>}
                    </div>
                    {r.locked_reason && <div className="text-xs muted" style={{ marginTop: 2 }}>{r.locked_reason}</div>}
                  </td>
                  <td className="col-num">
                    <DeltaCell value={r.recall_at_5} delta={r.delta?.recall} winner={isWinner} />
                  </td>
                  <td className="col-num">
                    <DeltaCell value={r.faithfulness} delta={r.delta?.faith} winner={isWinner} />
                  </td>
                  <td className="col-num">
                    <DeltaCell value={r.answer_relevancy} delta={r.delta?.relevancy} winner={isWinner} />
                  </td>
                  <td className="col-num">{r.p95_latency_ms}ms</td>
                  <td className="col-num">${r.avg_cost_per_query_usd.toFixed(4)}</td>
                  <td className="col-shrink">
                    {isWinner ? <IcCheck size={14} style={{ color: "oklch(var(--success))" }} /> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="card-footer">
        <div className="text-xs muted">
          Started {new Date(shootout.started_at).toLocaleTimeString()} · Finished {new Date(shootout.finished_at).toLocaleTimeString()} · Eval set <span className="mono">{shootout.eval_set_id}</span>
        </div>
        <button className="btn btn-ghost btn-xs">Full report →</button>
      </div>
    </div>
  );
}

function DeltaCell({ value, delta, winner }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      <span className="mono" style={{ fontWeight: winner ? 600 : 500 }}>{(value * 100).toFixed(2)}%</span>
      {delta != null && (
        <span className="text-xs mono" style={{ color: delta > 0 ? "oklch(var(--success))" : "oklch(var(--destructive))" }}>
          {delta > 0 ? "+" : ""}{delta.toFixed(2)}pp
        </span>
      )}
    </div>
  );
}

function RecommendationCard({ shootout }) {
  return (
    <div className="card" style={{ borderColor: "oklch(var(--accent) / 0.3)" }}>
      <div className="card-header" style={{ background: "oklch(var(--accent) / 0.05)" }}>
        <div>
          <h3 className="card-title" style={{ color: "oklch(var(--accent))" }}>Recommendation</h3>
          <div className="card-desc">Per ADR-0012 production lock</div>
        </div>
        <IcSparkles size={16} style={{ color: "oklch(var(--accent))" }} />
      </div>
      <div className="card-body">
        <p style={{ fontSize: 14, lineHeight: 1.55, margin: 0, marginBottom: 12 }}>
          <b>Keep <span className="mono" style={{ color: "oklch(var(--accent))" }}>cohere-v4.0-pro</span>.</b> Swapping to v3.5 produces faithfulness Δ −11.76pp (W6 D1 LIVE Azure reaffirm); swapping to off drops recall 19.6pp from baseline.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", background: "oklch(var(--muted) / 0.4)", borderRadius: "var(--radius-sm)" }}>
          {[
            ["vs v3.5 baseline",     "+4.81pp recall · +11.76pp faith"],
            ["vs Azure built-in",    "+10.08pp recall · +13.00pp faith"],
            ["vs no rerank",         "+15.96pp recall · +15.76pp faith"],
            ["Cost delta",            "+$0.0014/q (acceptable)"],
            ["Latency delta",         "+108ms p95 (within SLO)"],
          ].map(([k, v]) => (
            <div key={k} className="text-xs" style={{ display: "flex", gap: 8 }}>
              <span className="muted mono" style={{ width: 130, flexShrink: 0 }}>{k}</span>
              <span style={{ fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FailedQueriesCard({ failed, ev }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Failed queries</h3>
          <div className="card-desc">{failed.length} of {ev.eval_set_size} queries · {((failed.length / ev.eval_set_size) * 100).toFixed(1)}% failure rate</div>
        </div>
        <div className="row">
          <select className="select"><option>All metrics</option><option>faithfulness</option><option>recall_at_5</option></select>
          <button className="btn btn-ghost btn-icon btn-sm"><IcMore size={14} /></button>
        </div>
      </div>
      <div className="card-body card-body-tight">
        {failed.map((q) => (
          <div key={q.query_id} style={{ padding: "14px 18px", borderBottom: "1px solid oklch(var(--border))" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span className="mono text-xs muted">{q.query_id}</span>
              {q.metric_failed.map((m) => <span key={m} className="badge badge-error"><span className="badge-dot" /> {m}</span>)}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{q.query}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12.5 }}>
              <div>
                <div className="text-xs muted mono" style={{ marginBottom: 3 }}>Expected</div>
                <div style={{ padding: "6px 9px", background: "oklch(var(--success) / 0.08)", border: "1px solid oklch(var(--success) / 0.2)", borderRadius: "var(--radius-sm)", lineHeight: 1.5 }}>{q.expected}</div>
              </div>
              <div>
                <div className="text-xs muted mono" style={{ marginBottom: 3 }}>Got</div>
                <div style={{ padding: "6px 9px", background: "oklch(var(--destructive) / 0.06)", border: "1px solid oklch(var(--destructive) / 0.2)", borderRadius: "var(--radius-sm)", lineHeight: 1.5 }}>{q.got}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OpsMetricsCard({ ev }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Ops metrics</h3>
      </div>
      <div className="card-body card-body-tight">
        {[
          { k: "P95 latency",      v: `${ev.p95_latency_ms}ms`,            tag: "Within SLO 5s", ok: true },
          { k: "Avg cost / query", v: `$${ev.avg_cost_per_query_usd.toFixed(4)}`, tag: "Under cap",       ok: true },
          { k: "Context recall",   v: `${(ev.context_recall * 100).toFixed(1)}%`,  tag: "All metric",      ok: true },
        ].map((m, i) => (
          <div key={m.k} style={{ display: "flex", alignItems: "center", padding: "12px 18px", borderBottom: i < 2 ? "1px solid oklch(var(--border))" : "none" }}>
            <div style={{ flex: 1 }}>
              <div className="text-xs muted">{m.k}</div>
              <div className="mono" style={{ fontSize: 15, fontWeight: 600, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{m.v}</div>
            </div>
            <span className={`badge ${m.ok ? "badge-success" : "badge-warning"}`}>
              <span className="badge-dot" /> {m.tag}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CragInsightCard({ ev }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">CRAG insights</h3>
      </div>
      <div className="card-body">
        <div className="text-xs muted" style={{ marginBottom: 4 }}>Trigger rate · last 184 queries</div>
        <div style={{ fontSize: 26, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
          {(ev.crag_trigger_rate * 100).toFixed(0)}%
        </div>
        <div style={{ marginTop: 10, marginBottom: 14 }}>
          <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", border: "1px solid oklch(var(--border))" }}>
            <div style={{ width: `${ev.crag_trigger_rate * 100}%`, background: "oklch(var(--accent))" }} />
            <div style={{ width: `${(1 - ev.crag_trigger_rate) * 100}%`, background: "oklch(var(--muted))" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "oklch(var(--muted-foreground))", fontFamily: "var(--font-mono)" }}>
            <span>33 RE_RETRIEVE</span>
            <span>151 confident</span>
          </div>
        </div>
        <div className="text-xs muted">
          Confidence Judge threshold <b style={{ color: "oklch(var(--foreground))" }}>0.70 NON-STICKY</b> per W5 D4.
          Trigger rate above 30% suggests retrieval tuning needed.
        </div>
      </div>
    </div>
  );
}

window.PageEval = PageEval;
