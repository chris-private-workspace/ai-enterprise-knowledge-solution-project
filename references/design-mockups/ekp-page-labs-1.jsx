// ekp-page-labs.jsx — Tier 2 Preview pages.
// Each page is a design exploration of a planned Tier 2 feature.
// Source: COMPONENT_CATALOG.md §6 "Tier 2 Future Slots" + architecture.md §11.
// Status badge is consistent so users can confidently demo without confusion.

// ── Shared header ──────────────────────────────────────────────────────────
function LabsHeader({ icon: Ic, title, subtitle, slot, status = "preview" }) {
  return (
    <>
      <div style={{
        display: "flex", gap: 10, alignItems: "center",
        padding: "10px 16px",
        marginBottom: 18,
        background: "linear-gradient(90deg, oklch(var(--accent) / 0.08), oklch(var(--accent) / 0.03))",
        border: "1px solid oklch(var(--accent) / 0.25)",
        borderRadius: "var(--radius-md)",
        fontSize: 12.5,
      }}>
        <IcSparkles size={14} style={{ color: "oklch(var(--accent))", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <b style={{ color: "oklch(var(--accent))" }}>Tier 2 Preview</b>
          {" · "}This view explores planned post-W12 capability;{" "}
          <span className="mono">{slot}</span>
        </div>
        <span className="badge badge-accent" style={{ fontSize: 10.5 }}>NOT IMPLEMENTED</span>
      </div>
      <div className="page-header" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{
            width: 46, height: 46,
            borderRadius: "var(--radius-md)",
            background: "oklch(var(--accent) / 0.1)",
            color: "oklch(var(--accent))",
            display: "grid", placeItems: "center",
            flexShrink: 0,
          }}>
            <Ic size={22} />
          </div>
          <div>
            <h1 className="page-title">{title}</h1>
            <p className="page-subtitle">{subtitle}</p>
          </div>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 1. GraphRAG — plugs into C04 Retrieval + C01 Ingestion
// ════════════════════════════════════════════════════════════════════════════
function PageLabsGraphRag({ onNavigate }) {
  return (
    <div className="content">
      <div className="content-wide">
        <LabsHeader
          icon={IcLayers}
          title="GraphRAG — Knowledge Graph Retrieval"
          subtitle="Augments hybrid retrieval with entity-relation graph traversal. Better for multi-hop reasoning ('how does A affect B through C?')."
          slot="plugs into C04 Retrieval (graph traversal mode) + C01 Ingestion (entity / relation extraction)"
        />

        {/* Stats */}
        <div className="stat-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
          <Stat label="Entities extracted" value="14.2k" sub="Across Drive Manuals corpus" />
          <Stat label="Relations" value="38.7k" sub="Avg 2.7 per chunk" />
          <Stat label="Graph depth (avg)" value="4.2" sub="hops per traversal" />
          <Stat label="Δ Recall@5 vs Hybrid" value="+6.3pp" sub="On multi-hop eval subset" />
        </div>

        {/* Main split */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 16 }}>
          {/* Left: query + config */}
          <div className="col" style={{ gap: 16 }}>
            <div className="card">
              <div className="card-header"><h3 className="card-title">Query</h3></div>
              <div className="card-body">
                <div className="field">
                  <label className="label">Multi-hop query</label>
                  <textarea className="input" rows={3} defaultValue="Which legal entities are affected if we change the JPY exchange rate type from Default to Reverse, and what posting accounts get impacted?" />
                </div>
                <div className="field">
                  <label className="label">Retrieval mode</label>
                  <div className="seg" style={{ width: "100%" }}>
                    <button className="seg-btn" style={{ flex: 1 }}>Hybrid</button>
                    <button className="seg-btn" data-active="true" style={{ flex: 1 }}>GraphRAG</button>
                    <button className="seg-btn" style={{ flex: 1 }}>Both</button>
                  </div>
                </div>
                <div className="field">
                  <label className="label">Graph traversal depth · max <span className="mono text-xs muted">4</span></label>
                  <input type="range" min={1} max={6} defaultValue={4} style={{ width: "100%" }} />
                </div>
                <div className="field">
                  <label className="label">Entity extraction model</label>
                  <select className="select"><option>GPT-5.4-mini · GLINER fallback</option></select>
                </div>
                <button className="btn btn-accent" style={{ width: "100%" }}><IcZap size={14} /> Run graph retrieval</button>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3 className="card-title">Traversal path</h3></div>
              <div className="card-body card-body-tight">
                {[
                  { entity: "Legal Entity USMF", type: "ORG",           hop: 0, isStart: true },
                  { entity: "Exchange Rate Type Default", type: "CONFIG", hop: 1 },
                  { entity: "Posting Definition #PD-204", type: "RULE",   hop: 2 },
                  { entity: "GL Account 1100-USD", type: "ACCOUNT",       hop: 3 },
                  { entity: "Inter-Company Clearing", type: "ACCOUNT",    hop: 3, isEnd: true },
                ].map((n, i, arr) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: i < arr.length - 1 ? "1px solid oklch(var(--border))" : "none" }}>
                    <span className="mono text-xs" style={{ width: 24, color: "oklch(var(--muted-foreground))" }}>h{n.hop}</span>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: n.isStart ? "oklch(var(--success))" : n.isEnd ? "oklch(var(--accent))" : "oklch(var(--foreground))",
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500 }}>{n.entity}</div>
                    </div>
                    <span className="badge badge-muted" style={{ fontSize: 10 }}>{n.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: graph viz */}
          <div className="card" style={{ minHeight: 540 }}>
            <div className="card-header">
              <div>
                <h3 className="card-title">Knowledge graph · query subgraph</h3>
                <div className="card-desc">Highlighted path = traversal route · click any node to expand</div>
              </div>
              <div className="row">
                <button className="btn btn-secondary btn-xs">Reset view</button>
                <button className="btn btn-secondary btn-xs"><IcDownload size={11} /> Export GraphML</button>
              </div>
            </div>
            <div className="card-body" style={{ padding: 0, position: "relative", overflow: "hidden", background: "oklch(var(--muted) / 0.2)" }}>
              <GraphVizSvg />
              {/* Legend */}
              <div style={{
                position: "absolute", bottom: 16, left: 16,
                background: "oklch(var(--card) / 0.92)",
                border: "1px solid oklch(var(--border))",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                display: "flex", gap: 12,
              }}>
                {[
                  { c: "oklch(var(--success))",  l: "ORG" },
                  { c: "oklch(0.55 0.13 240)",   l: "CONFIG" },
                  { c: "oklch(var(--accent))",   l: "RULE" },
                  { c: "oklch(0.55 0.16 145)",   l: "ACCOUNT" },
                  { c: "oklch(0.55 0.16 285)",   l: "DOC" },
                ].map((it) => (
                  <span key={it.l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: it.c }} />{it.l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GraphVizSvg() {
  // Hand-positioned graph showing the traversal path highlighted
  const nodes = [
    { id: "le_usmf", x: 90, y: 240, label: "USMF\nLegal Entity", color: "oklch(var(--success))", path: true },
    { id: "le_dejp", x: 90, y: 380, label: "DEJP\nLegal Entity", color: "oklch(var(--success))" },
    { id: "le_us",   x: 90, y: 100, label: "USRT\nLegal Entity", color: "oklch(var(--success))" },
    { id: "rate_def",x: 290, y: 240, label: "Default\nRate Type", color: "oklch(0.55 0.13 240)", path: true },
    { id: "rate_rev",x: 290, y: 140, label: "Reverse\nRate Type", color: "oklch(0.55 0.13 240)" },
    { id: "pd_204",  x: 490, y: 240, label: "PD-204\nPosting Def", color: "oklch(var(--accent))", path: true },
    { id: "pd_192",  x: 490, y: 360, label: "PD-192\nPosting Def", color: "oklch(var(--accent))" },
    { id: "acc_1100",x: 680, y: 180, label: "1100-USD\nGL Account", color: "oklch(0.55 0.16 145)", path: true },
    { id: "acc_icc", x: 680, y: 300, label: "IC-Clear\nGL Account", color: "oklch(0.55 0.16 145)", path: true },
    { id: "doc_a",   x: 480, y: 60,  label: "GL Manual v2.4\nDocument", color: "oklch(0.55 0.16 285)" },
    { id: "doc_b",   x: 680, y: 460, label: "AP Manual v1.8\nDocument", color: "oklch(0.55 0.16 285)" },
  ];
  const edges = [
    { from: "le_usmf", to: "rate_def", path: true, label: "USES" },
    { from: "le_dejp", to: "rate_def", label: "USES" },
    { from: "le_us",   to: "rate_def", label: "USES" },
    { from: "le_dejp", to: "rate_rev", label: "USES" },
    { from: "rate_def",to: "pd_204",  path: true, label: "GOVERNS" },
    { from: "rate_def",to: "pd_192",  label: "GOVERNS" },
    { from: "pd_204",  to: "acc_1100",path: true, label: "POSTS" },
    { from: "pd_204",  to: "acc_icc", path: true, label: "POSTS" },
    { from: "pd_192",  to: "acc_icc", label: "POSTS" },
    { from: "rate_def",to: "doc_a",   label: "DOC_REF" },
    { from: "pd_192",  to: "doc_b",   label: "DOC_REF" },
  ];
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <svg viewBox="0 0 780 540" style={{ display: "block", width: "100%", height: 540 }}>
      {/* edges */}
      {edges.map((e, i) => {
        const a = nodeMap[e.from], b = nodeMap[e.to];
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const strokeColor = e.path ? "oklch(var(--accent))" : "oklch(var(--border-strong))";
        const strokeWidth = e.path ? 2.2 : 1;
        const opacity = e.path ? 1 : 0.5;
        return (
          <g key={i}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={strokeColor} strokeWidth={strokeWidth} opacity={opacity} />
            <text x={mx} y={my - 4} fontFamily="JetBrains Mono" fontSize="9"
                  textAnchor="middle" fill="oklch(var(--muted-foreground))" opacity={opacity}>
              {e.label}
            </text>
          </g>
        );
      })}
      {/* nodes */}
      {nodes.map((n) => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={n.path ? 28 : 22}
                  fill={n.color} fillOpacity={n.path ? 0.18 : 0.08}
                  stroke={n.color} strokeWidth={n.path ? 2.5 : 1.2} />
          <text x={n.x} y={n.y - 3} fontFamily="Inter" fontSize="10.5" fontWeight="600"
                textAnchor="middle" fill="oklch(var(--foreground))">
            {n.label.split("\n")[0]}
          </text>
          <text x={n.x} y={n.y + 9} fontFamily="JetBrains Mono" fontSize="8.5"
                textAnchor="middle" fill="oklch(var(--muted-foreground))">
            {n.label.split("\n")[1]}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 2. Multi-Agent Orchestration — plugs into C05 Generation
// ════════════════════════════════════════════════════════════════════════════
function PageLabsAgents({ onNavigate }) {
  const agents = [
    { id: "planner",    name: "Planner",     icon: IcLayers, model: "gpt-5.4-mini", role: "Decomposes the query into sub-questions; routes to retrievers", status: "ok", latency: 412 },
    { id: "retriever",  name: "Retriever",   icon: IcSearch, model: "—",            role: "Runs hybrid retrieval per sub-question; deduplicates chunks", status: "ok", latency: 218 },
    { id: "verifier",   name: "Verifier",    icon: IcShield, model: "gpt-5.4-mini", role: "Validates each chunk's relevance + flags hallucination risk", status: "ok", latency: 384 },
    { id: "synth",      name: "Synthesizer", icon: IcSparkles, model: "gpt-5.5",    role: "Generates final answer with citations from validated context", status: "ok", latency: 1842 },
    { id: "critic",     name: "Critic",      icon: IcAlert,  model: "gpt-5.5-pro",  role: "Final self-review; triggers re-plan if confidence < 0.80", status: "ok", latency: 612 },
  ];

  return (
    <div className="content">
      <div className="content-wide">
        <LabsHeader
          icon={IcCpu}
          title="Multi-Agent Orchestration"
          subtitle="Replaces single CRAG loop with specialized agents (planner / retriever / verifier / synthesizer / critic). Each agent's sub-trace is collapsible in the 9-stage view."
          slot="plugs into C05 Generation (L4+ orchestration layer; interface unchanged)"
        />

        <div className="stat-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
          <Stat label="Active agents" value="5" sub="Planner + 4 specialists" />
          <Stat label="Δ Faithfulness" value="+4.2pp" sub="vs single-agent CRAG" />
          <Stat label="P95 latency" value="6.8s" sub="+2.6s overhead vs Tier 1" />
          <Stat label="Avg cost / query" value="$0.061" sub="2× Tier 1 baseline" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16 }}>
          {/* Agent roster */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Agent roster</h3>
                <div className="card-desc">Edit role · model · tools per agent</div>
              </div>
              <button className="btn btn-secondary btn-xs"><IcPlus size={11} /> Add agent</button>
            </div>
            <div className="card-body card-body-tight">
              {agents.map((a, i) => {
                const Ic = a.icon;
                return (
                  <div key={a.id} style={{ display: "flex", gap: 12, padding: "12px 16px", borderBottom: i < agents.length - 1 ? "1px solid oklch(var(--border))" : "none" }}>
                    <div style={{
                      width: 32, height: 32, flexShrink: 0,
                      borderRadius: "var(--radius-sm)",
                      background: "oklch(var(--accent) / 0.1)", color: "oklch(var(--accent))",
                      display: "grid", placeItems: "center",
                    }}><Ic size={15} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{a.name}</span>
                        <span className="badge badge-muted">{a.model}</span>
                      </div>
                      <div className="text-xs muted" style={{ marginTop: 4, lineHeight: 1.45 }}>{a.role}</div>
                    </div>
                    <button className="btn btn-ghost btn-icon btn-xs"><IcEdit size={11} /></button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live collaboration trace */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Agent collaboration trace</h3>
                <div className="card-desc">Query: "Show me all Capex over USD 50k that needed two-level approval last quarter"</div>
              </div>
              <span className="badge badge-success"><span className="badge-dot" /> COMPLETE</span>
            </div>
            <div className="card-body card-body-tight">
              {[
                { agent: "Planner",     msg: "Decomposed into 3 sub-questions: (a) Capex definition, (b) approval matrix, (c) Q1 2026 transaction list", out: "3 sub-q", time: "412ms" },
                { agent: "Retriever",   msg: "Ran hybrid retrieval per sub-q · 15 unique chunks across 4 docs", out: "15 chunks", time: "218ms" },
                { agent: "Verifier",    msg: "Validated 14/15 chunks · 1 flagged as potential hallucination risk (low score, drop)", out: "14 verified", time: "384ms" },
                { agent: "Synthesizer", msg: "Composed answer with 7 citations · embedded 1 approval matrix screenshot", out: "7 cites", time: "1842ms" },
                { agent: "Critic",      msg: "Self-review · confidence 0.91 > 0.80 threshold · ACCEPT", out: "0.91", time: "612ms" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "14px 16px", borderBottom: i < 4 ? "1px solid oklch(var(--border))" : "none" }}>
                  <span className="mono text-xs" style={{ width: 16, color: "oklch(var(--muted-foreground))", flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 12.5 }}>{s.agent}</span>
                      <span className="badge badge-accent">{s.out}</span>
                    </div>
                    <div className="text-xs" style={{ lineHeight: 1.5, color: "oklch(var(--foreground) / 0.9)" }}>{s.msg}</div>
                  </div>
                  <span className="mono text-xs muted" style={{ flexShrink: 0 }}>{s.time}</span>
                </div>
              ))}
            </div>
            <div className="card-footer">
              <div className="text-xs muted mono">Total 3.47s · 5 agents · trace_id agent_2026_05_15_x9f4b</div>
              <button className="btn btn-ghost btn-xs">Full timeline →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 3. Multi-Language JP / ZH — plugs into C01 + C04
// ════════════════════════════════════════════════════════════════════════════
function PageLabsLanguages({ onNavigate }) {
  return (
    <div className="content">
      <div className="content-wide">
        <LabsHeader
          icon={IcGlobe}
          title="Multi-Language Support · JP / ZH"
          subtitle="Per-language analyzers in Azure AI Search · cross-lingual retrieval · language-aware prompt engineering"
          slot="plugs into C01 Ingestion (per-language analyzer) + C04 Retrieval (cross-lingual semantic config) + C09 UI (i18n routing)"
        />

        <div className="stat-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
          <Stat label="Languages enabled" value="3" sub="EN · 日本語 · 简体中文" />
          <Stat label="Cross-lingual queries" value="218" sub="Last 7d · 18% of total" />
          <Stat label="Translation latency" value="142ms" sub="GPT-5.4-mini" />
          <Stat label="Avg Recall@5 (cross-lingual)" value="89.4%" sub="-7.8pp vs same-lang" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
          {/* Demo */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Cross-lingual query demo</h3>
                <div className="card-desc">Japanese question retrieves from English D365 manual; answer translated back to Japanese with original cited.</div>
              </div>
            </div>
            <div className="card-body">
              {/* User Q */}
              <div style={{ marginBottom: 16, padding: "12px 14px", background: "oklch(var(--muted) / 0.4)", borderRadius: "var(--radius-sm)" }}>
                <div className="text-xs muted mono" style={{ marginBottom: 4 }}>USER · 日本語 (auto-detected · conf 0.98)</div>
                <div style={{ fontSize: 14, lineHeight: 1.55 }}>D365 F&Oで複数通貨の仕訳をする際、為替レートの種類はどのように設定すればよいですか?</div>
              </div>

              {/* Pipeline trace */}
              <div className="text-xs muted mono" style={{ marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Cross-lingual pipeline</div>
              <div className="col" style={{ gap: 4, marginBottom: 16 }}>
                {[
                  { i: 1, label: "Language detect", detail: "japanese · confidence 0.98", time: "8ms" },
                  { i: 2, label: "Query translate (jp→en)", detail: "GPT-5.4-mini · context: D365 F&O domain", time: "142ms" },
                  { i: 3, label: "Hybrid retrieval (en index)", detail: "ekp-kb-drive-manuals-v1 · top_k=5", time: "218ms" },
                  { i: 4, label: "Synthesize answer (en)", detail: "GPT-5.5 · 5 citations", time: "1842ms" },
                  { i: 5, label: "Translate answer (en→jp)", detail: "GPT-5.5 · preserves citation markers", time: "684ms" },
                ].map((s) => (
                  <div key={s.i} style={{ display: "flex", gap: 8, padding: "6px 0", alignItems: "center", borderBottom: "1px solid oklch(var(--border))" }}>
                    <span className="mono text-xs" style={{ width: 14, color: "oklch(var(--muted-foreground))" }}>{s.i}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>{s.label}</span>
                    <span className="text-xs muted mono">{s.detail}</span>
                    <span className="mono text-xs" style={{ width: 56, textAlign: "right", color: "oklch(var(--foreground))" }}>{s.time}</span>
                  </div>
                ))}
              </div>

              {/* Answer */}
              <div style={{ padding: "12px 14px", background: "oklch(var(--accent) / 0.05)", border: "1px solid oklch(var(--accent) / 0.2)", borderRadius: "var(--radius-sm)" }}>
                <div className="text-xs muted mono" style={{ marginBottom: 4 }}>EKP · 日本語 (translated from en)</div>
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                  多通貨の仕訳を設定するには、まず<b>「総勘定元帳 &gt; 設定 &gt; 転記定義」</b>から為替レートの種類を法人と一致させる必要があります<span style={{ background: "oklch(var(--accent) / 0.15)", padding: "1px 4px", borderRadius: 3, fontFamily: "var(--font-mono)", fontSize: 11, marginLeft: 2 }}>[1]</span>。法人間取引の場合は「両会社で転記」を有効化する必要があります<span style={{ background: "oklch(var(--accent) / 0.15)", padding: "1px 4px", borderRadius: 3, fontFamily: "var(--font-mono)", fontSize: 11, marginLeft: 2 }}>[2]</span>。
                </div>
                <div className="text-xs muted" style={{ marginTop: 8 }}>
                  Original citations (en) preserved: <span className="mono">[1]</span> GL Configuration v2.4 · <span className="mono">[2]</span> AP Process Manual v1.8
                </div>
              </div>
            </div>
          </div>

          {/* Config */}
          <div className="col" style={{ gap: 16 }}>
            <div className="card">
              <div className="card-header"><h3 className="card-title">Language analyzers</h3></div>
              <div className="card-body card-body-tight">
                {[
                  { code: "en", name: "English",  analyzer: "en.microsoft", status: "active" },
                  { code: "ja", name: "日本語",    analyzer: "ja.microsoft", status: "active" },
                  { code: "zh-Hans", name: "简体中文", analyzer: "zh-Hans.microsoft", status: "active" },
                  { code: "zh-Hant", name: "繁體中文", analyzer: "zh-Hant.microsoft", status: "soon" },
                  { code: "ko", name: "한국어",    analyzer: "ko.microsoft", status: "soon" },
                ].map((l, i, arr) => (
                  <div key={l.code} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: i < arr.length - 1 ? "1px solid oklch(var(--border))" : "none" }}>
                    <span className="mono text-xs" style={{ background: "oklch(var(--muted))", padding: "1px 5px", borderRadius: 3, fontWeight: 600, width: 56, textAlign: "center" }}>{l.code}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{l.name}</span>
                    <span className="mono text-xs muted">{l.analyzer}</span>
                    {l.status === "active"
                      ? <span className="badge badge-success"><span className="badge-dot" /> ON</span>
                      : <span className="badge badge-muted">SOON</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3 className="card-title">Per-KB language config</h3></div>
              <div className="card-body">
                <div className="field">
                  <label className="label">Drive Manuals · primary language</label>
                  <select className="select" defaultValue="en"><option value="en">English (en)</option></select>
                </div>
                <div className="field">
                  <label className="label">Cross-lingual fallback languages</label>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <span className="badge badge-accent">ja ×</span>
                    <span className="badge badge-accent">zh-Hans ×</span>
                    <button className="btn btn-ghost btn-xs">+ Add</button>
                  </div>
                </div>
                <div className="row">
                  <span className="switch" data-on="true" />
                  <div className="text-xs" style={{ flex: 1 }}>Always show original-language citations alongside translated answer</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 4. Voice I/O — Chat extension
// ════════════════════════════════════════════════════════════════════════════
function PageLabsVoice({ onNavigate }) {
  return (
    <div className="content">
      <div className="content-wide">
        <LabsHeader
          icon={IcSend}
          title="Voice Input · Text-to-Speech Output"
          subtitle="Web Speech API for input · TTS for answer playback · accessibility-first design"
          slot="extends C10 Chat UI · Web Speech API (browser-native) + Azure Cognitive Services Speech (high-quality TTS)"
        />

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
          {/* Demo */}
          <div className="card">
            <div className="card-header"><h3 className="card-title">Voice composer · live preview</h3></div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Mic active state */}
              <div style={{
                border: "1px solid oklch(var(--accent) / 0.4)",
                background: "oklch(var(--accent) / 0.05)",
                borderRadius: "var(--radius-md)",
                padding: 18,
                display: "flex", alignItems: "center", gap: 16,
              }}>
                <button style={{
                  width: 56, height: 56,
                  borderRadius: "50%",
                  background: "oklch(var(--accent))",
                  color: "oklch(var(--accent-foreground))",
                  border: 0,
                  display: "grid", placeItems: "center",
                  cursor: "default",
                  boxShadow: "0 0 0 6px oklch(var(--accent) / 0.18)",
                  animation: "pulse 1.4s ease-in-out infinite",
                }}>
                  <IcZap size={22} />
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Listening… <span className="text-xs muted mono">(en-US · 0:12)</span></div>
                  {/* Waveform */}
                  <svg viewBox="0 0 320 40" style={{ width: "100%", height: 32 }}>
                    {Array.from({ length: 64 }).map((_, i) => {
                      const h = 6 + Math.abs(Math.sin(i * 0.4 + 1.2)) * 26 + Math.abs(Math.cos(i * 0.7)) * 8;
                      return <rect key={i} x={i * 5} y={(40 - h) / 2} width={3} height={h} rx={1.5} fill="oklch(var(--accent))" opacity={i > 56 ? 0.3 : 0.9} />;
                    })}
                  </svg>
                  <div className="text-xs muted mono" style={{ marginTop: 6 }}>
                    "How do I configure multi-currency posting…"
                  </div>
                </div>
                <div className="col" style={{ gap: 4 }}>
                  <button className="btn btn-ghost btn-icon btn-sm" title="Pause"><IcCheck size={14} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" title="Stop"><IcX size={14} /></button>
                </div>
              </div>

              {/* TTS playback */}
              <div style={{
                border: "1px solid oklch(var(--border))",
                background: "oklch(var(--card))",
                borderRadius: "var(--radius-md)",
                padding: 14,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: "oklch(var(--accent))", color: "oklch(var(--accent-foreground))", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <IcChat size={15} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Answer playback · TTS</div>
                    <div className="text-xs muted mono">Azure Speech · neural en-US Aria · 1.0× · 0:08 / 0:42</div>
                  </div>
                  <button className="btn btn-ghost btn-icon btn-sm"><IcX size={14} /></button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button className="btn btn-ghost btn-icon btn-sm"><IcArrowDown size={13} /></button>
                  <button className="btn btn-primary btn-icon btn-sm"><IcCheck size={13} /></button>
                  <div style={{ flex: 1, height: 4, background: "oklch(var(--muted))", borderRadius: 999, position: "relative" }}>
                    <div style={{ position: "absolute", inset: 0, width: "19%", background: "oklch(var(--accent))", borderRadius: 999 }} />
                    <div style={{ position: "absolute", top: -3, left: "19%", width: 10, height: 10, borderRadius: "50%", background: "oklch(var(--accent))" }} />
                  </div>
                  <span className="mono text-xs muted">0:42</span>
                </div>
              </div>

              {/* Transcript snippet */}
              <div style={{ fontSize: 13, lineHeight: 1.6, padding: "10px 12px", background: "oklch(var(--muted) / 0.4)", borderRadius: "var(--radius-sm)" }}>
                <span style={{ background: "oklch(var(--accent) / 0.18)", padding: "1px 3px", borderRadius: 2 }}>For multi-currency inter-company journals,</span> you need to align three settings across both legal entities. Configuration lives under <span className="mono" style={{ fontSize: 12 }}>General ledger › Setup › Posting definitions</span>…
              </div>
            </div>
          </div>

          {/* Config */}
          <div className="col" style={{ gap: 16 }}>
            <div className="card">
              <div className="card-header"><h3 className="card-title">Voice settings</h3></div>
              <div className="card-body">
                <div className="field">
                  <label className="label">Input language</label>
                  <select className="select"><option>en-US · English (US)</option><option>ja-JP · 日本語</option></select>
                </div>
                <div className="field">
                  <label className="label">TTS voice</label>
                  <div className="seg" style={{ width: "100%" }}>
                    <button className="seg-btn" data-active="true">Aria (en-US)</button>
                    <button className="seg-btn">Davis (en-US)</button>
                    <button className="seg-btn">Custom</button>
                  </div>
                </div>
                <div className="field">
                  <label className="label">Playback speed <span className="mono text-xs muted">1.0×</span></label>
                  <input type="range" min={0.5} max={2} step={0.1} defaultValue={1} style={{ width: "100%" }} />
                </div>
                <div className="row" style={{ marginBottom: 8 }}>
                  <span className="switch" data-on="true" />
                  <span className="text-xs" style={{ flex: 1 }}>Auto-play TTS when answer streams complete</span>
                </div>
                <div className="row">
                  <span className="switch" data-on="false" />
                  <span className="text-xs" style={{ flex: 1 }}>Read citations aloud in-line</span>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3 className="card-title">Accessibility</h3></div>
              <div className="card-body">
                {["Visual transcript while listening", "Visual TTS waveform during playback", "Larger touch targets for mic button", "Captions on demo videos"].map((opt) => (
                  <div key={opt} className="row" style={{ marginBottom: 8 }}>
                    <span className="switch" data-on="true" />
                    <span className="text-xs" style={{ flex: 1 }}>{opt}</span>
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

// Shared Stat card
function Stat({ label, value, sub }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-meta">{sub}</div>
    </div>
  );
}

window.PageLabsGraphRag   = PageLabsGraphRag;
window.PageLabsAgents     = PageLabsAgents;
window.PageLabsLanguages  = PageLabsLanguages;
window.PageLabsVoice      = PageLabsVoice;
window.LabsHeader = LabsHeader;
window.LabsStat = Stat;
