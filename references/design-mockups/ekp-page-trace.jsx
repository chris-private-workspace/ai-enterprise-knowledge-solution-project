// ekp-page-trace.jsx — /traces/[traceId] per §5.7 + ADR-0020 Debug View
// 9-stage Langfuse trace with per-stage duration + cost + details
// 3 viz modes: vertical (default) / waterfall / flame

function PageTrace({ tweaks, onNavigate }) {
  const trace = window.MOCK_TRACE;
  const vizMode = tweaks.traceViz || "vertical"; // vertical | waterfall | flame
  const [expandedStage, setExpandedStage] = useState(4); // 05 CRAG by default since it's the interesting one

  return (
    <div className="content">
      <div className="content-wide">
        <TraceHeader trace={trace} onNavigate={onNavigate} vizMode={vizMode} />

        {/* Stat row */}
        <div className="stat-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", marginBottom: 16 }}>
          <div className="stat">
            <div className="stat-label"><IcClock size={13} /> Total latency</div>
            <div className="stat-value">{(trace.total_latency_ms / 1000).toFixed(2)}<span className="stat-unit">s</span></div>
            <div className="stat-meta"><span className="trend-up">p95 4.21s</span> · within SLO</div>
          </div>
          <div className="stat">
            <div className="stat-label"><IcCpu size={13} /> Tokens</div>
            <div className="stat-value">{(trace.total_input_tokens / 1000).toFixed(1)}<span className="stat-unit">k</span></div>
            <div className="stat-meta">{trace.total_output_tokens} out · {trace.total_input_tokens.toLocaleString()} in</div>
          </div>
          <div className="stat">
            <div className="stat-label"><IcActivity size={13} /> Cost</div>
            <div className="stat-value">${trace.total_cost_usd.toFixed(4)}</div>
            <div className="stat-meta">avg $0.031/q today</div>
          </div>
          <div className="stat">
            <div className="stat-label"><IcRefresh size={13} /> CRAG</div>
            <div className="stat-value" style={{ color: "oklch(var(--accent))" }}>{trace.crag_iterations}×<span className="stat-unit"> loop</span></div>
            <div className="stat-meta">confidence 0.61 → judge RE_RETRIEVE</div>
          </div>
          <div className="stat">
            <div className="stat-label"><IcShield size={13} /> Status</div>
            <div className="stat-value">
              <span className="badge badge-success" style={{ height: 24, fontSize: 12.5 }}>
                <span className="badge-dot" /> OK
              </span>
            </div>
            <div className="stat-meta">all 9 stages passed</div>
          </div>
        </div>

        {/* Viz mode selector */}
        <div className="row" style={{ marginBottom: 12 }}>
          <h3 className="card-title">9-stage pipeline</h3>
          <div className="spacer" />
          <span className="text-xs muted">Visualization →</span>
          <div className="seg">
            <button className="seg-btn" data-active={vizMode === "vertical"} onClick={() => window.__setTweak?.("traceViz", "vertical")}>
              <IcLayers size={12} /> Vertical
            </button>
            <button className="seg-btn" data-active={vizMode === "waterfall"} onClick={() => window.__setTweak?.("traceViz", "waterfall")}>
              <IcActivity size={12} /> Waterfall
            </button>
            <button className="seg-btn" data-active={vizMode === "flame"} onClick={() => window.__setTweak?.("traceViz", "flame")}>
              <IcZap size={12} /> Flame
            </button>
          </div>
          <button className="btn btn-secondary btn-sm">
            <IcLink size={13} /> Open in Langfuse ↗
          </button>
        </div>

        {vizMode === "vertical"  && <TraceVertical  trace={trace} expanded={expandedStage} setExpanded={setExpandedStage} />}
        {vizMode === "waterfall" && <TraceWaterfall trace={trace} expanded={expandedStage} setExpanded={setExpandedStage} />}
        {vizMode === "flame"     && <TraceFlame     trace={trace} expanded={expandedStage} setExpanded={setExpandedStage} />}

        {/* Final response card */}
        <FinalResponseCard trace={trace} />
      </div>
    </div>
  );
}

function TraceHeader({ trace, onNavigate, vizMode }) {
  return (
    <div className="page-header">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <button className="btn btn-ghost btn-xs btn-ghost-muted" onClick={() => onNavigate("traces")}>
            <IcChevLeft size={12} /> Traces
          </button>
          <span className="text-xs muted mono">·</span>
          <span className="text-xs muted mono">{trace.trace_id}</span>
          <button className="btn btn-ghost btn-icon btn-xs"><IcCopy size={11} /></button>
        </div>
        <h1 className="page-title" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.45, fontFamily: "var(--font-sans)" }}>
          "{trace.query}"
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <span className="badge badge-muted">{trace.kb_id}</span>
          <span className="text-xs muted mono">·</span>
          <span className="text-xs muted">by</span>
          <span className="text-xs mono">{trace.user}</span>
          <span className="text-xs muted mono">·</span>
          <span className="text-xs muted">{trace.started_at.slice(11, 19)} UTC</span>
          {trace.crag_triggered && (
            <>
              <span className="text-xs muted mono">·</span>
              <span className="badge badge-accent"><span className="badge-dot" /> CRAG triggered</span>
            </>
          )}
        </div>
      </div>
      <div className="page-actions">
        <button className="btn btn-secondary btn-sm"><IcDownload size={13} /> Export JSON</button>
        <button className="btn btn-secondary btn-sm"><IcChat size={13} /> Replay in chat</button>
      </div>
    </div>
  );
}

// ── Vertical timeline (default per §5.7) ───────────────────────────────────
function TraceVertical({ trace, expanded, setExpanded }) {
  return (
    <div className="card" style={{ overflow: "visible" }}>
      <div className="card-body" style={{ padding: 0 }}>
        {trace.stages.map((s, i) => (
          <StageRow key={i} stage={s} idx={i} isLast={i === trace.stages.length - 1}
                    expanded={expanded === i} onToggle={() => setExpanded(expanded === i ? -1 : i)}
                    totalLatency={trace.total_latency_ms} />
        ))}
      </div>
    </div>
  );
}

function StageRow({ stage, idx, isLast, expanded, onToggle, totalLatency }) {
  const pct = (stage.latency_ms / totalLatency) * 100;
  const isCrag = idx === 4 || idx === 5; // CRAG judge + re-retrieve
  const stageBg = isCrag ? "oklch(var(--accent) / 0.05)" : "transparent";

  return (
    <div style={{ display: "flex", borderBottom: isLast ? "none" : "1px solid oklch(var(--border))", background: stageBg, cursor: "default" }}
         onClick={onToggle}>
      {/* Rail (left) */}
      <div style={{ flexShrink: 0, position: "relative", width: 56, paddingTop: 16, paddingBottom: 16, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: stage.type === "GENERATION" ? "oklch(var(--accent) / 0.1)" : "oklch(var(--muted))",
          color: stage.type === "GENERATION" ? "oklch(var(--accent))" : "oklch(var(--foreground))",
          border: `1px solid ${stage.type === "GENERATION" ? "oklch(var(--accent) / 0.3)" : "oklch(var(--border))"}`,
          display: "grid", placeItems: "center",
          fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 11,
          zIndex: 1,
        }}>
          {String(idx + 1).padStart(2, "0")}
        </div>
        {!isLast && <div style={{ flex: 1, width: 1, background: "oklch(var(--border))", marginTop: -2 }} />}
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: "16px 18px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 500, fontSize: 13.5 }}>{stage.name.replace(/^\d+\s/, "")}</span>
          <span className="badge badge-muted" style={{ fontSize: 10.5 }}>{stage.type}</span>
          {stage.model && <span className="text-xs muted mono">· {stage.model}</span>}
          <div className="spacer" />
          <span className="mono text-xs" style={{ color: "oklch(var(--muted-foreground))" }}>
            {stage.input_tokens || stage.output_tokens ? `${stage.input_tokens}↓ ${stage.output_tokens}↑ tok · ` : ""}${stage.cost_usd.toFixed(4)}
          </span>
          <span className="mono" style={{ fontSize: 13, fontWeight: 600, width: 64, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {stage.latency_ms < 1000 ? `${stage.latency_ms}ms` : `${(stage.latency_ms/1000).toFixed(2)}s`}
          </span>
          <IcChevRight size={14} className="muted" style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
        </div>

        {/* Inline duration bar */}
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 4, background: "oklch(var(--muted))", borderRadius: 999, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${pct}%`,
              background: stage.type === "GENERATION" ? "oklch(var(--accent))" : "oklch(var(--foreground))",
              borderRadius: 999,
            }} />
          </div>
          <span className="text-xs mono muted" style={{ width: 48, textAlign: "right" }}>{pct.toFixed(1)}%</span>
        </div>

        {/* Expanded body */}
        {expanded && stage.details && (
          <div style={{ marginTop: 14, padding: "12px 14px", background: "oklch(var(--muted) / 0.4)", borderRadius: "var(--radius-sm)", border: "1px solid oklch(var(--border))" }}
               onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span className="text-xs mono muted" style={{ fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>Stage details</span>
              <div className="spacer" />
              <button className="btn btn-ghost btn-xs"><IcLink size={11} /> Langfuse ↗</button>
              <button className="btn btn-ghost btn-xs"><IcCopy size={11} /> Copy payload</button>
            </div>
            <table style={{ width: "100%", fontSize: 12, fontFamily: "var(--font-mono)" }}>
              <tbody>
                {Object.entries(stage.details).map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ padding: "4px 12px 4px 0", color: "oklch(var(--muted-foreground))", verticalAlign: "top", whiteSpace: "nowrap", width: "1px" }}>{k}</td>
                    <td style={{ padding: "4px 0", color: "oklch(var(--foreground))", wordBreak: "break-word", lineHeight: 1.5 }}>
                      {renderValue(k, v, stage)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function renderValue(key, v, stage) {
  // Highlight CRAG threshold check
  if (key === "verdict" && v === "RE_RETRIEVE") {
    return <span className="badge badge-warning"><span className="badge-dot" /> RE_RETRIEVE</span>;
  }
  if (key === "confidence") {
    const threshold = stage.details?.threshold ?? 0.70;
    const failed = v < threshold;
    return (
      <span style={{ color: failed ? "oklch(var(--destructive))" : "oklch(var(--success))", fontWeight: 600 }}>
        {v.toFixed(2)} {failed && "< 0.70 NON-STICKY threshold"}
      </span>
    );
  }
  if (Array.isArray(v)) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {v.map((x, i) => <div key={i} style={{ padding: "3px 7px", background: "oklch(var(--card))", border: "1px solid oklch(var(--border))", borderRadius: 3 }}>{String(x)}</div>)}
      </div>
    );
  }
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  return String(v);
}

// ── Waterfall (Chrome devtools style) ──────────────────────────────────────
function TraceWaterfall({ trace, expanded, setExpanded }) {
  let acc = 0;
  const total = trace.total_latency_ms;
  const stages = trace.stages.map((s) => {
    const start = acc;
    acc += s.latency_ms;
    return { ...s, start, end: acc };
  });
  return (
    <div className="card">
      <div className="card-body" style={{ padding: "16px 18px" }}>
        {/* Time axis */}
        <div style={{ display: "flex", marginBottom: 8, paddingLeft: 280, fontFamily: "var(--font-mono)", fontSize: 10.5, color: "oklch(var(--muted-foreground))" }}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <div key={t} style={{ flex: 1 }}>
              {Math.round(total * t)}ms
            </div>
          ))}
        </div>
        {stages.map((s, i) => {
          const startPct = (s.start / total) * 100;
          const widthPct = (s.latency_ms / total) * 100;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < stages.length - 1 ? "1px solid oklch(var(--border))" : "none", cursor: "default" }}
                 onClick={() => setExpanded(expanded === i ? -1 : i)}>
              <span className="mono text-xs muted" style={{ width: 22, textAlign: "right" }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ fontSize: 12.5, width: 240, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {s.name.replace(/^\d+\s/, "")}
              </span>
              <div style={{ position: "relative", flex: 1, height: 22, background: "oklch(var(--muted) / 0.3)", borderRadius: 3 }}>
                <div style={{
                  position: "absolute",
                  left: `${startPct}%`,
                  width: `${Math.max(widthPct, 0.4)}%`,
                  top: 3, bottom: 3,
                  background: s.type === "GENERATION" ? "oklch(var(--accent))" : "oklch(var(--foreground) / 0.8)",
                  borderRadius: 2,
                  display: "flex", alignItems: "center", paddingLeft: 4,
                  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
                  color: s.type === "GENERATION" ? "oklch(var(--accent-foreground))" : "oklch(var(--background))",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}>
                  {widthPct > 5 ? `${s.latency_ms}ms` : ""}
                </div>
              </div>
              <span className="mono text-xs" style={{ width: 56, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {s.latency_ms}ms
              </span>
              <span className="mono text-xs muted" style={{ width: 60, textAlign: "right" }}>
                ${s.cost_usd.toFixed(4)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Flame graph (stacked horizontal bars by category) ──────────────────────
function TraceFlame({ trace, expanded, setExpanded }) {
  const total = trace.total_latency_ms;
  const categories = [
    { name: "Preprocessing", stages: [0, 1],         color: "oklch(0.65 0.10 240)" },
    { name: "Retrieval",     stages: [2, 3],         color: "oklch(0.62 0.13 200)" },
    { name: "CRAG",          stages: [4, 5],         color: "oklch(0.65 0.18 25)" },
    { name: "Context",       stages: [6],            color: "oklch(0.65 0.14 145)" },
    { name: "Synthesis",     stages: [7, 8],         color: "oklch(0.60 0.16 285)" },
  ];

  return (
    <div className="card">
      <div className="card-body">
        {/* Top: category stack */}
        <div style={{ marginBottom: 16 }}>
          <div className="text-xs muted mono" style={{ marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>By category</div>
          <div style={{ display: "flex", height: 32, borderRadius: 4, overflow: "hidden", border: "1px solid oklch(var(--border))" }}>
            {categories.map((c) => {
              const cMs = c.stages.reduce((s, i) => s + trace.stages[i].latency_ms, 0);
              const pct = (cMs / total) * 100;
              return (
                <div key={c.name} style={{
                  width: `${pct}%`,
                  background: c.color, color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
                  paddingLeft: 6, paddingRight: 6,
                  whiteSpace: "nowrap", overflow: "hidden",
                  textShadow: "0 1px 1px rgba(0,0,0,0.2)",
                }}>
                  {pct > 6 ? `${c.name} ${pct.toFixed(0)}%` : ""}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 11.5, color: "oklch(var(--muted-foreground))" }}>
            {categories.map((c) => (
              <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: c.color }} />
                <span>{c.name}</span>
                <span className="mono" style={{ color: "oklch(var(--foreground))" }}>{c.stages.reduce((s, i) => s + trace.stages[i].latency_ms, 0)}ms</span>
              </div>
            ))}
          </div>
        </div>

        {/* Below: stage rows */}
        <div className="text-xs muted mono" style={{ marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>By stage</div>
        {trace.stages.map((s, i) => {
          const cat = categories.find((c) => c.stages.includes(i));
          const pct = (s.latency_ms / total) * 100;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0", cursor: "default" }}
                 onClick={() => setExpanded(expanded === i ? -1 : i)}>
              <span className="mono text-xs muted" style={{ width: 22 }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ fontSize: 12.5, width: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name.replace(/^\d+\s/, "")}</span>
              <div style={{ flex: 1, position: "relative", height: 18 }}>
                <div style={{
                  position: "absolute", left: 0, width: `${Math.max(pct, 0.4)}%`,
                  top: 0, bottom: 0,
                  background: cat?.color || "oklch(var(--foreground))",
                  borderRadius: 2,
                }} />
              </div>
              <span className="mono text-xs" style={{ width: 56, textAlign: "right" }}>{s.latency_ms}ms</span>
              <span className="mono text-xs muted" style={{ width: 60, textAlign: "right" }}>${s.cost_usd.toFixed(4)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FinalResponseCard({ trace }) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-header">
        <div>
          <h3 className="card-title">Final response</h3>
          <div className="card-desc">Stage 09 output · synthesized by {trace.model_used}</div>
        </div>
        <div className="row">
          <span className="badge badge-success"><span className="badge-dot" /> citation_validate_passed 5/5</span>
          <span className="badge badge-accent"><span className="badge-dot" /> 2 embedded images</span>
        </div>
      </div>
      <div className="card-body">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div className="text-xs muted mono" style={{ marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Query (final after CRAG)</div>
            <div style={{ padding: "10px 12px", background: "oklch(var(--muted) / 0.4)", border: "1px solid oklch(var(--border))", borderRadius: "var(--radius-sm)", fontSize: 13, lineHeight: 1.55 }}>
              {trace.query}
            </div>
          </div>
          <div>
            <div className="text-xs muted mono" style={{ marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Answer preview</div>
            <div style={{ padding: "10px 12px", background: "oklch(var(--muted) / 0.4)", border: "1px solid oklch(var(--border))", borderRadius: "var(--radius-sm)", fontSize: 13, lineHeight: 1.55 }}>
              For multi-currency inter-company journals in D365 F&O, you need to align three settings across both legal entities…
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── /traces (list) ──────────────────────────────────────────────────────────
function PageTracesList({ onNavigate, tweaks }) {
  const traces = window.MOCK_RECENT_QUERIES.map((q) => ({
    ...q,
    started_at: new Date(Date.now() - parseInt(q.at) * 60 * 1000).toISOString(),
  }));
  return (
    <div className="content">
      <div className="content-wide">
        <div className="page-header">
          <div>
            <h1 className="page-title">Traces</h1>
            <p className="page-subtitle">Every <span className="mono">/query</span> call generates a 9-stage Langfuse trace. Correlated by <span className="mono">trace_id</span>.</p>
          </div>
          <div className="page-actions">
            <button className="btn btn-secondary btn-sm"><IcFilter size={13} /> Filter</button>
            <button className="btn btn-secondary btn-sm"><IcDownload size={13} /> Export</button>
            <button className="btn btn-secondary btn-sm"><IcLink size={13} /> Open Langfuse ↗</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
          <div className="input-search-wrap" style={{ flex: 1, maxWidth: 340 }}>
            <span className="icon-leading"><IcSearch size={14} /></span>
            <input className="input" placeholder="Filter by user, KB, trace_id…" />
          </div>
          <div className="seg">
            <button className="seg-btn" data-active="true">All</button>
            <button className="seg-btn"><span className="status-dot ready" /> Success</button>
            <button className="seg-btn"><span className="status-dot failed" /> Error</button>
            <button className="seg-btn"><span className="badge-dot" style={{ background: "oklch(var(--accent))" }} /> CRAG triggered</button>
          </div>
          <div className="spacer" />
          <select className="select"><option>Last 24h</option><option>Last 7d</option><option>Last 30d</option></select>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Trace</th>
                <th>User</th>
                <th>KB</th>
                <th>Query</th>
                <th>CRAG</th>
                <th className="col-num">Latency</th>
                <th className="col-num">Cost</th>
                <th className="col-num">When</th>
                <th className="col-shrink"></th>
              </tr>
            </thead>
            <tbody>
              {traces.map((t) => (
                <tr key={t.id} onClick={() => onNavigate("trace-detail", { traceId: t.trace_id })}>
                  <td><span className="mono text-xs" style={{ color: "oklch(var(--accent))" }}>{t.trace_id.slice(-16)}</span></td>
                  <td><span className="mono text-xs">{t.user}</span></td>
                  <td><span className="badge badge-muted">{t.kb}</span></td>
                  <td style={{ maxWidth: 380 }}>
                    <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: 13 }}>{t.q}</div>
                  </td>
                  <td>{t.crag ? <span className="badge badge-accent"><span className="badge-dot" /> 1×</span> : <span className="text-xs muted">—</span>}</td>
                  <td className="col-num">{t.latency_ms}ms</td>
                  <td className="col-num">${t.cost.toFixed(4)}</td>
                  <td className="col-num text-xs">{t.at}</td>
                  <td className="col-shrink"><button className="btn btn-ghost btn-icon btn-xs"><IcChevRight size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

window.PageTrace = PageTrace;
window.PageTracesList = PageTracesList;
