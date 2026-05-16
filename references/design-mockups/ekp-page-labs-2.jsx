// ekp-page-labs-2.jsx — Tier 2 Preview pages (part 2).
// Fine-Tune · Workflow Builder · Per-user Personalization · Multi-Tenancy.

// ════════════════════════════════════════════════════════════════════════════
// 5. Custom Fine-Tune — new C14 Training Pipeline
// ════════════════════════════════════════════════════════════════════════════
function PageLabsFineTune({ onNavigate }) {
  const runs = [
    { id: "ft_2026_05_10_a", base_model: "gpt-5.5", dataset: "drive-eval-curated-v2", samples: 1247, status: "deployed", recall_delta: +0.038, faith_delta: +0.022, cost: "$84.21", deployed_as: "gpt-5.5-drive-tuned-v2", finished_at: "2026-05-10T18:42:00Z" },
    { id: "ft_2026_05_05_b", base_model: "gpt-5.4-mini", dataset: "drive-eval-curated-v1", samples: 824, status: "deployed", recall_delta: +0.024, faith_delta: +0.014, cost: "$32.18", deployed_as: "gpt-5.4-mini-drive-tuned-v1", finished_at: "2026-05-05T11:28:00Z" },
    { id: "ft_2026_05_14_c", base_model: "gpt-5.5", dataset: "drive-feedback-v1", samples: 312, status: "running", recall_delta: null, faith_delta: null, cost: "$18.42", progress: 0.74, finished_at: null },
    { id: "ft_2026_05_12_d", base_model: "gpt-5.4-mini", dataset: "rapo-internal-v1", samples: 142, status: "failed", recall_delta: null, faith_delta: null, cost: "$4.18", error: "Insufficient training samples (< 200)", finished_at: "2026-05-12T15:08:00Z" },
  ];

  return (
    <div className="content">
      <div className="content-wide">
        <LabsHeader
          icon={IcSparkles}
          title="Custom LLM Fine-Tuning"
          subtitle="Distill domain knowledge into a smaller, faster model. Datasets sourced from queries + thumbs-up feedback + curated eval-set seed."
          slot="new component C14 Training Pipeline · C05 Generation swaps deployment_name to fine-tuned model"
        />

        {/* Pipeline */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
              {[
                { label: "01 Dataset prep",   value: "1.2k samples",   sub: "Queries + thumbs-up + eval-set",            icon: IcDatabase },
                { label: "02 Train",          value: "Azure OpenAI FT", sub: "Base · gpt-5.5 · 3 epochs · LR 2e-5",      icon: IcZap },
                { label: "03 Eval",           value: "RAGAs gate",     sub: "Must beat baseline R@5 + Faith by 2pp",   icon: IcActivity },
                { label: "04 Deploy",         value: "Model registry",  sub: "Versioned · gradual rollout · canary",     icon: IcCloud },
              ].map((s, i) => {
                const Ic = s.icon;
                return (
                  <div key={s.label} style={{ padding: "16px 18px", borderRight: i < 3 ? "1px solid oklch(var(--border))" : "none", display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "oklch(var(--accent) / 0.1)", color: "oklch(var(--accent))", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <Ic size={15} />
                    </div>
                    <div>
                      <div className="text-xs muted mono" style={{ marginBottom: 2, letterSpacing: "0.04em", textTransform: "uppercase" }}>{s.label}</div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.value}</div>
                      <div className="text-xs muted">{s.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Training runs */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">Training runs</h3>
              <div className="card-desc">Recent fine-tune jobs · deployed runs auto-eligible for canary rollout</div>
            </div>
            <button className="btn btn-accent btn-sm"><IcPlus size={13} /> New training run</button>
          </div>
          <div className="card-body card-body-tight">
            <table className="table">
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Base · Dataset</th>
                  <th className="col-num">Samples</th>
                  <th>Status</th>
                  <th className="col-num">Δ Recall@5</th>
                  <th className="col-num">Δ Faith</th>
                  <th className="col-num">Cost</th>
                  <th className="col-num">When</th>
                  <th className="col-shrink"></th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td className="col-mono"><span style={{ color: "oklch(var(--accent))" }}>{r.id}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span className="badge badge-muted">{r.base_model}</span>
                        <span className="text-xs muted">·</span>
                        <span className="mono text-xs">{r.dataset}</span>
                      </div>
                      {r.deployed_as && (
                        <div className="text-xs mono" style={{ marginTop: 3, color: "oklch(var(--accent))" }}>→ {r.deployed_as}</div>
                      )}
                      {r.error && (
                        <div className="text-xs" style={{ marginTop: 3, color: "oklch(var(--destructive))" }}>{r.error}</div>
                      )}
                    </td>
                    <td className="col-num">{r.samples}</td>
                    <td>
                      {r.status === "deployed" && <span className="badge badge-success"><span className="badge-dot" /> DEPLOYED</span>}
                      {r.status === "running"  && <span className="badge badge-info"><span className="badge-dot" /> {Math.round(r.progress * 100)}%</span>}
                      {r.status === "failed"   && <span className="badge badge-error"><span className="badge-dot" /> FAILED</span>}
                    </td>
                    <td className="col-num">
                      {r.recall_delta != null
                        ? <span style={{ color: r.recall_delta > 0 ? "oklch(var(--success))" : "oklch(var(--destructive))" }}>
                            {r.recall_delta > 0 ? "+" : ""}{(r.recall_delta * 100).toFixed(1)}pp
                          </span>
                        : <span className="muted">—</span>}
                    </td>
                    <td className="col-num">
                      {r.faith_delta != null
                        ? <span style={{ color: r.faith_delta > 0 ? "oklch(var(--success))" : "oklch(var(--destructive))" }}>
                            {r.faith_delta > 0 ? "+" : ""}{(r.faith_delta * 100).toFixed(1)}pp
                          </span>
                        : <span className="muted">—</span>}
                    </td>
                    <td className="col-num">{r.cost}</td>
                    <td className="col-num text-xs">{r.finished_at ? window.formatRelative(r.finished_at) : "—"}</td>
                    <td className="col-shrink"><button className="btn btn-ghost btn-icon btn-xs"><IcMore size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Model registry + dataset prep */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Deployed model registry</h3>
              <span className="badge badge-success">2 active</span>
            </div>
            <div className="card-body card-body-tight">
              {[
                { name: "gpt-5.5-drive-tuned-v2", canary: 25, latency_ms: 3214, cost_per_q: 0.024, primary: true },
                { name: "gpt-5.5 (Azure OpenAI base)", canary: 75, latency_ms: 4128, cost_per_q: 0.029, primary: false },
                { name: "gpt-5.4-mini-drive-tuned-v1", canary: 0, latency_ms: 1842, cost_per_q: 0.008, primary: false, label: "Standby" },
              ].map((m, i, arr) => (
                <div key={m.name} style={{ padding: "12px 16px", borderBottom: i < arr.length - 1 ? "1px solid oklch(var(--border))" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</span>
                    {m.primary && <span className="badge badge-accent">PRIMARY</span>}
                    {m.label && <span className="badge badge-muted">{m.label}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: "oklch(var(--muted-foreground))", fontFamily: "var(--font-mono)" }}>
                    <span>traffic <b style={{ color: "oklch(var(--foreground))" }}>{m.canary}%</b></span>
                    <span>p95 <b style={{ color: "oklch(var(--foreground))" }}>{m.latency_ms}ms</b></span>
                    <span>$/q <b style={{ color: "oklch(var(--foreground))" }}>${m.cost_per_q.toFixed(3)}</b></span>
                  </div>
                  {m.canary > 0 && (
                    <div className="progress accent" style={{ height: 4, marginTop: 6 }}>
                      <i style={{ width: `${m.canary}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Dataset preparation</h3>
              <button className="btn btn-secondary btn-xs"><IcPlus size={11} /> New dataset</button>
            </div>
            <div className="card-body">
              <div className="text-xs muted" style={{ marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>Sources</div>
              <div className="col" style={{ gap: 6 }}>
                {[
                  { name: "Thumbs-up feedback queries", count: 1247, weight: 0.4, type: "feedback" },
                  { name: "Curated eval set",            count: 184,  weight: 0.3, type: "eval" },
                  { name: "Production traces (filtered)",count: 612,  weight: 0.2, type: "trace" },
                  { name: "Synthetic augmentation",       count: 408,  weight: 0.1, type: "synthetic" },
                ].map((s) => (
                  <div key={s.name} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", border: "1px solid oklch(var(--border))", borderRadius: "var(--radius-sm)" }}>
                    <input type="checkbox" defaultChecked={s.weight > 0.1} style={{ accentColor: "oklch(var(--accent))" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500 }}>{s.name}</div>
                      <div className="text-xs muted mono">{s.count.toLocaleString()} samples · weight {s.weight}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs muted" style={{ marginTop: 14, padding: "8px 10px", background: "oklch(var(--muted) / 0.4)", borderRadius: "var(--radius-sm)", lineHeight: 1.6 }}>
                <b style={{ color: "oklch(var(--foreground))" }}>Estimate:</b> 2,471 weighted samples · ~$84 fine-tune cost · ~2h training time on Azure OpenAI Service
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 6. Workflow Builder — new C15 Workflow Engine
// ════════════════════════════════════════════════════════════════════════════
function PageLabsWorkflows({ onNavigate }) {
  return (
    <div className="content">
      <div className="content-wide">
        <LabsHeader
          icon={IcZap}
          title="Workflow Builder"
          subtitle="Visual pipeline editor. Compose retrieval → rerank → filter → synthesize → output stages. Templates for common patterns (FAQ, summarization, comparative analysis)."
          slot="new component C15 Workflow Engine · C09 Admin UI hosts the canvas editor"
        />

        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 280px", gap: 12, height: 620 }}>
          {/* Node palette */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div className="card-header" style={{ padding: "10px 12px" }}>
              <h3 className="card-title" style={{ fontSize: 12.5 }}>Nodes</h3>
            </div>
            <div className="card-body card-body-tight" style={{ overflowY: "auto" }}>
              {[
                { cat: "Input",  items: [{ name: "User query", icon: IcChat }, { name: "API trigger", icon: IcLink }, { name: "Schedule", icon: IcClock }] },
                { cat: "Retrieve", items: [{ name: "Hybrid", icon: IcSearch }, { name: "Vector only", icon: IcLayers }, { name: "BM25 only", icon: IcFile }, { name: "GraphRAG", icon: IcLayers }] },
                { cat: "Process",  items: [{ name: "Rerank", icon: IcZap }, { name: "Filter", icon: IcFilter }, { name: "CRAG L2", icon: IcRefresh }, { name: "Translate", icon: IcGlobe }] },
                { cat: "LLM",      items: [{ name: "Synthesize", icon: IcSparkles }, { name: "Summarize", icon: IcEdit }, { name: "Extract", icon: IcLayers }, { name: "Classify", icon: IcTag }] },
                { cat: "Output",   items: [{ name: "SSE stream", icon: IcSend }, { name: "Email", icon: IcInbox }, { name: "Slack", icon: IcChat }, { name: "Webhook", icon: IcLink }] },
              ].map((g) => (
                <div key={g.cat}>
                  <div className="nav-section-label" style={{ padding: "10px 12px 4px" }}>{g.cat}</div>
                  {g.items.map((it) => {
                    const Ic = it.icon;
                    return (
                      <div key={it.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", fontSize: 12, cursor: "grab" }}>
                        <Ic size={12} className="muted" />
                        <span>{it.name}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div className="card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div className="card-header" style={{ padding: "8px 14px" }}>
              <div className="row">
                <input className="input" defaultValue="FAQ workflow · Drive Manuals" style={{ height: 26, fontSize: 12.5, maxWidth: 280 }} />
                <span className="badge badge-success"><span className="badge-dot" /> ACTIVE</span>
              </div>
              <div className="row">
                <button className="btn btn-secondary btn-xs"><IcDownload size={11} /> Export JSON</button>
                <button className="btn btn-secondary btn-xs">Save</button>
                <button className="btn btn-accent btn-xs"><IcZap size={11} /> Test run</button>
              </div>
            </div>
            <div style={{ flex: 1, position: "relative", background: "oklch(var(--muted) / 0.15)", backgroundImage: "radial-gradient(oklch(var(--border-strong) / 0.6) 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
              <WorkflowCanvasSvg />
            </div>
            <div style={{ padding: "8px 14px", borderTop: "1px solid oklch(var(--border))", display: "flex", alignItems: "center", gap: 10, background: "oklch(var(--muted) / 0.3)" }}>
              <span className="mono text-xs muted">7 nodes · 6 connections · validated ✓</span>
              <div className="spacer" />
              <span className="text-xs mono muted">100%</span>
              <button className="btn btn-ghost btn-icon btn-xs"><IcPlus size={11} /></button>
              <button className="btn btn-ghost btn-icon btn-xs">—</button>
            </div>
          </div>

          {/* Properties + templates */}
          <div className="col" style={{ gap: 12, overflow: "hidden" }}>
            <div className="card" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div className="card-header" style={{ padding: "10px 12px" }}>
                <div>
                  <h3 className="card-title" style={{ fontSize: 12.5 }}>Node properties</h3>
                  <div className="text-xs muted mono">node_3 · Rerank</div>
                </div>
              </div>
              <div className="card-body" style={{ padding: 12, overflowY: "auto", flex: 1 }}>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label className="label" style={{ fontSize: 11.5 }}>Reranker</label>
                  <select className="select" style={{ height: 28, fontSize: 12 }}>
                    <option>cohere-v4.0-pro</option>
                    <option>cohere-v3.5</option>
                    <option>azure-semantic</option>
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label className="label" style={{ fontSize: 11.5 }}>Output K</label>
                  <input className="input mono" defaultValue="5" style={{ height: 28, fontSize: 12 }} />
                </div>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label className="label" style={{ fontSize: 11.5 }}>Score threshold</label>
                  <input className="input mono" defaultValue="0.40" style={{ height: 28, fontSize: 12 }} />
                </div>
                <div className="row" style={{ marginBottom: 8 }}>
                  <span className="switch" data-on="true" />
                  <span className="text-xs">Trace to Langfuse</span>
                </div>
                <div className="row">
                  <span className="switch" data-on="false" />
                  <span className="text-xs">Fail-open on rerank error</span>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header" style={{ padding: "10px 12px" }}>
                <h3 className="card-title" style={{ fontSize: 12.5 }}>Templates</h3>
              </div>
              <div className="card-body card-body-tight">
                {["FAQ + citation","Summarization","Comparative analysis","Auto-tagging"].map((t, i, arr) => (
                  <div key={t} style={{ padding: "7px 12px", borderBottom: i < arr.length - 1 ? "1px solid oklch(var(--border))" : "none", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <IcLayers size={11} className="muted" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowCanvasSvg() {
  const nodes = [
    { id: 1, x: 60,  y: 240, w: 140, label: "User query",    color: "oklch(0.55 0.16 145)", icon: "Q" },
    { id: 2, x: 240, y: 240, w: 140, label: "Hybrid retrieve", color: "oklch(0.55 0.13 240)", icon: "R" },
    { id: 3, x: 420, y: 160, w: 140, label: "Rerank · cohere v4", color: "oklch(var(--accent))", icon: "K" },
    { id: 4, x: 420, y: 320, w: 140, label: "CRAG L2 judge",   color: "oklch(var(--accent))", icon: "C" },
    { id: 5, x: 600, y: 240, w: 140, label: "Synthesize · gpt-5.5", color: "oklch(0.55 0.16 285)", icon: "S" },
    { id: 6, x: 780, y: 180, w: 110, label: "SSE stream",     color: "oklch(0.55 0.16 25)",  icon: "→" },
    { id: 7, x: 780, y: 300, w: 110, label: "Webhook",        color: "oklch(0.55 0.16 25)",  icon: "→" },
  ];
  const edges = [
    { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 2, to: 4 },
    { from: 3, to: 5 }, { from: 4, to: 5 }, { from: 5, to: 6 }, { from: 5, to: 7 },
  ];
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <svg viewBox="0 0 920 480" style={{ width: "100%", height: "100%" }}>
      {edges.map((e, i) => {
        const a = nodeMap[e.from], b = nodeMap[e.to];
        const x1 = a.x + a.w, y1 = a.y;
        const x2 = b.x, y2 = b.y;
        const mx = (x1 + x2) / 2;
        return (
          <path key={i} d={`M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                fill="none" stroke="oklch(var(--foreground))" strokeWidth="1.5" opacity="0.55"
                markerEnd="url(#arrow)" />
        );
      })}
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill="oklch(var(--foreground))" opacity="0.6" />
        </marker>
      </defs>
      {nodes.map((n) => (
        <g key={n.id}>
          <rect x={n.x} y={n.y - 22} width={n.w} height={44} rx={8}
                fill={n.color} fillOpacity="0.12"
                stroke={n.color} strokeWidth="1.5" />
          <circle cx={n.x + 18} cy={n.y} r={11} fill={n.color} />
          <text x={n.x + 18} y={n.y + 4} fontFamily="JetBrains Mono" fontSize="11" fontWeight="700"
                textAnchor="middle" fill="white">{n.icon}</text>
          <text x={n.x + 38} y={n.y + 4} fontFamily="Inter" fontSize="11.5" fontWeight="500"
                fill="oklch(var(--foreground))">{n.label}</text>
          <circle cx={n.x} cy={n.y} r={3} fill={n.color} />
          <circle cx={n.x + n.w} cy={n.y} r={3} fill={n.color} />
        </g>
      ))}
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 7. Per-user Personalization — embedding boost
// ════════════════════════════════════════════════════════════════════════════
function PageLabsPersonalization({ onNavigate }) {
  return (
    <div className="content">
      <div className="content-wide">
        <LabsHeader
          icon={IcStar}
          title="Per-User Personalization"
          subtitle="User profile embedding adjusts retrieval ranking. Frequently-accessed sections get gentle boost; recently-marked-stale content gets damped. Respects privacy (per-user vector only)."
          slot="plugs into C04 Retrieval (ranking boost) · per-user state stored in Postgres · derived from feedback + query log"
        />

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
          {/* Profile + interests */}
          <div className="col" style={{ gap: 16 }}>
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Your knowledge fingerprint</h3>
                  <div className="card-desc">Auto-derived from your queries + thumbs-up feedback · resets on request</div>
                </div>
                <span className="badge badge-accent">8.7k events</span>
              </div>
              <div className="card-body">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
                  <Mini label="Top interest" value="GL Setup" />
                  <Mini label="Most-cited doc" value="d365_fno_gl_v2.4" mono />
                  <Mini label="Profile freshness" value="3d ago" />
                </div>

                {/* Topic chips */}
                <div className="text-xs muted mono" style={{ marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Topic distribution</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {[
                    { topic: "General Ledger · Posting Definitions", weight: 0.32 },
                    { topic: "Multi-Currency Setup",                   weight: 0.21 },
                    { topic: "Inter-Company Workflow",                  weight: 0.18 },
                    { topic: "Approval Matrix",                          weight: 0.12 },
                    { topic: "Period-End Close",                         weight: 0.09 },
                    { topic: "Procurement",                               weight: 0.05 },
                    { topic: "HR · onboarding",                          weight: 0.03 },
                  ].map((t) => {
                    const size = 10 + t.weight * 24;
                    return (
                      <span key={t.topic} style={{
                        padding: "4px 10px",
                        border: "1px solid oklch(var(--accent) / 0.3)",
                        background: `oklch(var(--accent) / ${0.06 + t.weight * 0.18})`,
                        borderRadius: 999,
                        fontSize: size > 14 ? 13 : 11.5,
                        fontWeight: 500,
                        color: "oklch(var(--foreground))",
                      }}>
                        {t.topic} <span className="mono text-xs" style={{ opacity: 0.65 }}>{(t.weight * 100).toFixed(0)}%</span>
                      </span>
                    );
                  })}
                </div>

                {/* Boost mechanism */}
                <div className="text-xs muted mono" style={{ marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Boost mechanism</div>
                <div style={{ padding: "10px 12px", background: "oklch(var(--muted) / 0.4)", border: "1px solid oklch(var(--border))", borderRadius: "var(--radius-sm)", fontSize: 12.5, lineHeight: 1.6 }}>
                  Final score = <span className="mono">0.85 × hybrid_score + 0.15 × cosine(query, profile_embedding)</span><br />
                  Boost is bounded · cannot promote a chunk past rank 1 unless hybrid_score is within 0.05 of the top result.
                </div>
              </div>
            </div>

            {/* History */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Recent activity</h3>
                <button className="btn btn-ghost btn-xs">Export my data</button>
              </div>
              <div className="card-body card-body-tight">
                {[
                  { type: "query",    text: "Multi-currency posting definitions for inter-company journals",  doc: "d365_fno_gl_v2.4",   at: "2m ago",  rating: "up" },
                  { type: "thumbs_up",text: "Approval matrix Capex vs Opex thresholds",                       doc: "d365_fno_proc_v3.1", at: "4m ago",  rating: "up" },
                  { type: "query",    text: "Period-end close checklist for fiscal year transition",          doc: "d365_finance_overview_2026Q1", at: "8m ago" },
                  { type: "thumbs_down", text: "Refund policy for cancelled subscriptions",                    doc: "customer-service-sop", at: "12m ago", rating: "down" },
                  { type: "saved",     text: "Item master storage dimension lockout",                         doc: "d365_fno_sc_v2.0",   at: "3h ago"  },
                ].map((e, i, arr) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "10px 18px", borderBottom: i < arr.length - 1 ? "1px solid oklch(var(--border))" : "none" }}>
                    <div style={{ width: 24, height: 24, borderRadius: 4, background: "oklch(var(--muted))", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      {e.type === "query"      && <IcChat size={12} />}
                      {e.type === "thumbs_up"  && <IcArrowUp size={12} style={{ color: "oklch(var(--success))" }} />}
                      {e.type === "thumbs_down" && <IcArrowDown size={12} style={{ color: "oklch(var(--destructive))" }} />}
                      {e.type === "saved"      && <IcStar size={12} style={{ color: "oklch(var(--accent))" }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.text}</div>
                      <div className="text-xs muted mono">{e.doc}</div>
                    </div>
                    <span className="text-xs muted mono" style={{ flexShrink: 0 }}>{e.at}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="col" style={{ gap: 16 }}>
            <div className="card">
              <div className="card-header"><h3 className="card-title">Personalization settings</h3></div>
              <div className="card-body">
                <div className="row" style={{ marginBottom: 12 }}>
                  <span className="switch" data-on="true" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Enable boost</div>
                    <div className="text-xs muted">Off = pure hybrid retrieval (no personalization)</div>
                  </div>
                </div>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label className="label">Boost weight · <span className="mono text-xs muted">0.15</span></label>
                  <input type="range" min={0} max={0.3} step={0.01} defaultValue={0.15} style={{ width: "100%" }} />
                  <div className="hint">Higher = stronger personalization · max bounded at 0.30 to prevent filter bubble</div>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="label">Decay window</label>
                  <select className="select" defaultValue="30">
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="all">All time</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3 className="card-title">Privacy</h3></div>
              <div className="card-body" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                <p style={{ marginTop: 0 }}>
                  Your profile embedding is <b>never shared</b> across users or with the model provider. It lives in our Postgres only, isolated by user_id.
                </p>
                <p>Aggregate workspace-level trends (anonymized) may inform global retrieval tuning.</p>
                <div className="hr" />
                <button className="btn btn-secondary btn-sm" style={{ width: "100%", marginBottom: 6 }}>
                  <IcDownload size={13} /> Export my profile data
                </button>
                <button className="btn btn-destructive btn-sm" style={{ width: "100%" }}>
                  <IcTrash size={13} /> Reset personalization profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, mono }) {
  return (
    <div style={{ padding: "10px 12px", border: "1px solid oklch(var(--border))", borderRadius: "var(--radius-sm)" }}>
      <div className="text-xs muted" style={{ marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, fontFamily: mono ? "var(--font-mono)" : "inherit" }}>{value}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 8. Multi-Tenancy — C02 + C03 + C11 integration
// ════════════════════════════════════════════════════════════════════════════
function PageLabsTenancy({ onNavigate }) {
  const tenants = [
    { id: "ricoh-rapo",     name: "Ricoh · RAPO",          domain: "ekp-beta.ricoh.com",     users: 28,  kbs: 5, storage_mb: 739, plan: "Beta",       status: "active", primary: true },
    { id: "ricoh-japan",    name: "Ricoh Japan",           domain: "ekp.ricoh.co.jp",         users: 142, kbs: 8, storage_mb: 1842, plan: "Enterprise", status: "active" },
    { id: "ricoh-eu",       name: "Ricoh EU",              domain: "ekp.ricoh.eu",            users: 87,  kbs: 6, storage_mb: 921, plan: "Enterprise", status: "active" },
    { id: "ricoh-services", name: "Ricoh Professional Services", domain: "ekp.ricoh-services.com", users: 32,  kbs: 4, storage_mb: 412, plan: "Pilot",      status: "active" },
    { id: "acme-corp",      name: "Acme Corp (Trial)",     domain: "ekp.acme-trial.com",      users: 12,  kbs: 2, storage_mb: 84,  plan: "Trial",      status: "trial" },
  ];

  return (
    <div className="content">
      <div className="content-wide">
        <LabsHeader
          icon={IcShield}
          title="Multi-Tenancy"
          subtitle="True tenant isolation across data, compute, and identity. Each tenant has its own Azure AI Search namespace, Blob containers, and Entra tenant claim. Self-service tenant creation for trial accounts."
          slot="C02 KB Manager (tenant_id column) + C03 Indexing (tenant prefix in index name) + C11 Identity (tenant claim) · all 3 internal-only changes"
        />

        <div className="stat-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
          <Stat label="Active tenants" value="5" sub="4 Enterprise · 1 Trial" />
          <Stat label="Total users" value="301" sub="Across all tenants" />
          <Stat label="Aggregate KBs" value="25" sub="Avg 5 per tenant" />
          <Stat label="Storage (total)" value="3.9 GB" sub="ekp-tenant-{tid}-* containers" />
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">Tenants</h3>
              <div className="card-desc">Per-tenant index name <span className="mono">ekp-{`{tenant_id}`}-kb-{`{kb_id}`}-v{`{version}`}</span> · isolated Blob containers</div>
            </div>
            <button className="btn btn-accent btn-sm"><IcPlus size={13} /> Provision tenant</button>
          </div>
          <div className="card-body card-body-tight">
            <table className="table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Domain · Entra tenant_id</th>
                  <th>Plan</th>
                  <th className="col-num">Users</th>
                  <th className="col-num">KBs</th>
                  <th className="col-num">Storage</th>
                  <th>Status</th>
                  <th className="col-shrink"></th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "var(--radius-sm)", background: "oklch(var(--accent))", color: "oklch(var(--accent-foreground))", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 11 }}>
                          {t.name.charAt(0)}
                        </div>
                        <div>
                          <div className="table-row-link" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {t.name}
                            {t.primary && <span className="badge badge-accent">CURRENT</span>}
                          </div>
                          <div className="text-xs muted mono">tenant_id <span style={{ color: "oklch(var(--foreground))" }}>{t.id}</span></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="mono text-xs">{t.domain}</div>
                      <div className="text-xs muted mono">9d…b4c1 (Entra)</div>
                    </td>
                    <td>
                      {t.plan === "Enterprise" && <span className="badge badge-accent">Enterprise</span>}
                      {t.plan === "Beta"       && <span className="badge badge-info">Beta</span>}
                      {t.plan === "Pilot"      && <span className="badge badge-warning">Pilot</span>}
                      {t.plan === "Trial"      && <span className="badge badge-muted">Trial</span>}
                    </td>
                    <td className="col-num">{t.users}</td>
                    <td className="col-num">{t.kbs}</td>
                    <td className="col-num">{t.storage_mb >= 1000 ? (t.storage_mb / 1024).toFixed(1) + " GB" : t.storage_mb + " MB"}</td>
                    <td>
                      {t.status === "active" && <span className="badge badge-success"><span className="badge-dot" /> ACTIVE</span>}
                      {t.status === "trial"  && <span className="badge badge-warning"><span className="badge-dot" /> TRIAL</span>}
                    </td>
                    <td className="col-shrink"><button className="btn btn-ghost btn-icon btn-xs"><IcMore size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Isolation diagram + per-tenant config */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Isolation architecture</h3>
              <div className="card-desc">Per-tenant prefix on every persistent resource · request-context tenant_id middleware</div>
            </div>
            <div className="card-body" style={{ padding: 0, background: "oklch(var(--muted) / 0.15)" }}>
              <TenantIsolationSvg />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Ricoh Japan · config</h3>
              <span className="badge badge-accent">Enterprise</span>
            </div>
            <div className="card-body">
              {[
                ["Primary language",   "ja-JP", "select"],
                ["Region",             "Japan East", "select"],
                ["Storage quota",      "10 GB · 18% used", "text"],
                ["Max KBs",            "20", "text"],
                ["Default LLM",        "gpt-5.5", "select"],
                ["Default reranker",   "cohere-v4.0-pro", "select"],
                ["Entra tenant_id",    "f8b1c4d9-…b4c1", "mono"],
                ["Branded URL",        "ekp.ricoh.co.jp", "mono"],
              ].map(([k, v, kind]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid oklch(var(--border))" }}>
                  <span className="text-xs muted">{k}</span>
                  <span className={kind === "mono" ? "mono text-xs" : "text-xs"} style={{ fontWeight: 500, fontFamily: kind === "mono" ? "var(--font-mono)" : "inherit" }}>{v}</span>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" style={{ width: "100%", marginTop: 12 }}><IcEdit size={13} /> Edit configuration</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TenantIsolationSvg() {
  return (
    <svg viewBox="0 0 720 360" style={{ width: "100%", height: 320 }}>
      {/* Tenant lanes */}
      {[
        { y: 30,  name: "Ricoh · RAPO",  tid: "ricoh-rapo",     c: "oklch(var(--accent))" },
        { y: 130, name: "Ricoh Japan",   tid: "ricoh-japan",    c: "oklch(0.55 0.13 240)" },
        { y: 230, name: "Acme Corp",     tid: "acme-corp",      c: "oklch(0.55 0.16 145)" },
      ].map((t, idx) => (
        <g key={t.tid}>
          <rect x="10" y={t.y - 5} width="700" height="78" rx="6" fill={t.c} fillOpacity="0.06" stroke={t.c} strokeWidth="1.2" strokeDasharray="3 3" />
          <text x="20" y={t.y + 16} fontFamily="Inter" fontSize="13" fontWeight="600" fill="oklch(var(--foreground))">{t.name}</text>
          <text x="20" y={t.y + 30} fontFamily="JetBrains Mono" fontSize="10" fill="oklch(var(--muted-foreground))">tenant_id={t.tid}</text>

          {/* Resources per tenant */}
          {[
            { x: 200, label: "AI Search Index", v: `ekp-${t.tid}-kb-*` },
            { x: 380, label: "Blob Container", v: `screenshots-${t.tid}` },
            { x: 540, label: "Postgres",      v: `tenant_id=${t.tid}` },
          ].map((r) => (
            <g key={r.label}>
              <rect x={r.x} y={t.y + 4} width="155" height="60" rx="4"
                    fill="oklch(var(--card))" stroke={t.c} strokeWidth="1" />
              <text x={r.x + 8} y={t.y + 22} fontFamily="Inter" fontSize="10.5" fontWeight="600" fill="oklch(var(--foreground))">{r.label}</text>
              <text x={r.x + 8} y={t.y + 38} fontFamily="JetBrains Mono" fontSize="9.5" fill={t.c}>{r.v}</text>
              <circle cx={r.x + 145} cy={t.y + 22} r="3" fill={t.c} />
            </g>
          ))}
        </g>
      ))}
      <text x="360" y="345" fontFamily="JetBrains Mono" fontSize="10" fill="oklch(var(--muted-foreground))" textAnchor="middle">
        Hard isolation — cross-tenant query is impossible by construction (tenant_id prefix on every resource)
      </text>
    </svg>
  );
}

window.PageLabsFineTune        = PageLabsFineTune;
window.PageLabsWorkflows       = PageLabsWorkflows;
window.PageLabsPersonalization = PageLabsPersonalization;
window.PageLabsTenancy         = PageLabsTenancy;
