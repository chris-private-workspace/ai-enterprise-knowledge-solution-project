// ekp-page-chat.jsx — /chat per §5.2 + C10 W3 D4 (revised W19)
// Three citation-placement modes + inline image cards + Sources strip + screenshot modal
//
// Citation flow (real backend):
//   QueryResponse.citations: list[Citation]
//   each Citation has: chunk_id, doc_id, doc_title, chunk_title, chunk_index,
//                      section_path, relevance_score, embedded_images: list[ImageRef]

const SAMPLE_CITATIONS = [
  {
    idx: 1, chunk_id: "kb-drive-manuals_doc-d365_fno_gl_v2_4_chunk-0084",
    doc_id: "d365_fno_gl_v2.4", doc_title: "D365 F&O — General Ledger Configuration v2.4",
    chunk_title: "Posting Definitions — Multi-Currency Setup",
    section_path: ["General Ledger", "Setup", "Posting Definitions", "Multi-Currency"],
    chunk_index: 84,
    relevance_score: 0.9421,
    file_type: "docx",
    page: 48,
    embedded_images: [{ kind: "screen-posting-definitions" }],
    preview: "When configuring posting definitions for multi-currency journals, the exchange rate type field must align with the legal entity's accounting currency.",
  },
  {
    idx: 2, chunk_id: "kb-drive-manuals_doc-d365_fno_ap_v1_8_chunk-0018",
    doc_id: "d365_fno_ap_v1.8", doc_title: "Accounts Payable Process Manual v1.8",
    chunk_title: "Inter-Company Journal Workflow",
    section_path: ["AP", "Inter-Company", "Workflow"],
    chunk_index: 18,
    relevance_score: 0.8907,
    file_type: "docx",
    page: 23,
    embedded_images: [],
    preview: "Inter-company accounting must be enabled with 'Post in both companies' to route the offsetting leg through the inter-company clearing account.",
  },
  {
    idx: 3, chunk_id: "kb-drive-manuals_doc-d365_fno_proc_v3_1_chunk-0064",
    doc_id: "d365_fno_proc_v3.1", doc_title: "Procurement Workflow v3.1 — Approval Matrix",
    chunk_title: "Exchange Rate Type — Legal Entity Mapping",
    section_path: ["Procurement", "Setup", "Currency"],
    chunk_index: 64,
    relevance_score: 0.8814,
    file_type: "pdf",
    page: 31,
    embedded_images: [],
    preview: "Each legal entity requires its own exchange rate type mapping. The source LE and destination LE values must both be configured under GL > Currencies.",
  },
  {
    idx: 4, chunk_id: "kb-drive-manuals_doc-d365_finance_overview_2026Q1_chunk-0017",
    doc_id: "d365_finance_overview_2026Q1", doc_title: "Finance Module Overview Q1 2026 (Training Deck)",
    chunk_title: "Slide 17 — Period-End Close Checklist",
    section_path: ["Finance Overview", "Period-End"],
    chunk_index: 17,
    relevance_score: 0.8651,
    file_type: "pptx",
    page: 17,
    embedded_images: [{ kind: "slide-checklist" }],
    preview: "Run the multi-currency revaluation batch before period close. See full checklist on slide 17.",
  },
  {
    idx: 5, chunk_id: "kb-drive-manuals_doc-d365_fno_sc_v2_0_chunk-0033",
    doc_id: "d365_fno_sc_v2.0", doc_title: "Supply Chain Management — Master Setup v2.0",
    chunk_title: "Item Master — Storage Dimension Group",
    section_path: ["SCM", "Item Master", "Dimensions", "Storage"],
    chunk_index: 33,
    relevance_score: 0.8492,
    file_type: "docx",
    page: 44,
    embedded_images: [],
    preview: "Storage dimensions are inventory-locked once first transaction posts. Run the inventory-reset utility to change.",
  },
];

function PageChat({ tweaks, onNavigate }) {
  const [kbId, setKbId] = useState("drive-manuals");
  const [showCitationPanel, setShowCitationPanel] = useState(true);
  const [showHistoryPanel, setShowHistoryPanel] = useState(true);
  const [showScreenshot, setShowScreenshot] = useState(null);
  const [activeConv, setActiveConv] = useState("conv_a7f4b2c1");
  const kb = window.MOCK_KBS.find((k) => k.kb_id === kbId);
  const placement = tweaks.citationPlacement || "sidebar";

  // Build the grid: optional left history panel + main + optional right citation panel.
  const cols = [
    showHistoryPanel ? "260px" : null,
    "1fr",
    (showCitationPanel && placement === "sidebar") ? "400px" : null,
  ].filter(Boolean).join(" ");

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: cols,
      height: "calc(100vh - var(--topbar-h))",
      overflow: "hidden",
    }}>
      {showHistoryPanel && (
        <ConversationHistoryPanel
          conversations={window.MOCK_CONVERSATIONS}
          activeId={activeConv}
          onSelect={setActiveConv}
          onClose={() => setShowHistoryPanel(false)}
        />
      )}
      <div style={{
        display: "flex", flexDirection: "column", overflow: "hidden",
        borderRight: showCitationPanel && placement === "sidebar" ? "1px solid oklch(var(--border))" : "none",
      }}>
        <ChatHeader kb={kb} kbs={window.MOCK_KBS} onKbChange={setKbId}
                    placement={placement}
                    showCitations={showCitationPanel}
                    showHistory={showHistoryPanel}
                    onToggleCitations={() => setShowCitationPanel(!showCitationPanel)}
                    onToggleHistory={() => setShowHistoryPanel(!showHistoryPanel)} />
        <ChatThread placement={placement}
                    citations={SAMPLE_CITATIONS}
                    onOpenScreenshot={setShowScreenshot}
                    onNavigate={onNavigate} />
        <ChatComposer />
      </div>
      {showCitationPanel && placement === "sidebar" && (
        <CitationPanel citations={SAMPLE_CITATIONS}
                       onClose={() => setShowCitationPanel(false)}
                       onOpenScreenshot={setShowScreenshot}
                       onNavigate={onNavigate} />
      )}
      {showScreenshot && (
        <ScreenshotModal citation={showScreenshot}
                         onClose={() => setShowScreenshot(null)}
                         onNavigate={onNavigate} />
      )}
    </div>
  );
}

// ── Conversation history sidebar (Beta+ scope per C10 spec §7) ─────────────
// "localStorage W7; server-side persistence Tier 2 multi-user"
function ConversationHistoryPanel({ conversations, activeId, onSelect, onClose }) {
  const groups = [
    { id: "today",     label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "this-week", label: "This week" },
    { id: "older",     label: "Older" },
  ];

  return (
    <aside style={{
      display: "flex", flexDirection: "column",
      background: "oklch(var(--card))",
      borderRight: "1px solid oklch(var(--border))",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid oklch(var(--border))", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Conversations</span>
          <span className="badge badge-accent" style={{ fontSize: 10, fontWeight: 600 }}>BETA+</span>
          <div className="spacer" />
          <button className="btn btn-ghost btn-icon btn-xs" title="Close history" onClick={onClose}><IcX size={12} /></button>
        </div>
        <button className="btn btn-secondary btn-sm" style={{ width: "100%", justifyContent: "flex-start", gap: 8 }}>
          <IcPlus size={13} /> New chat
        </button>
        <div className="input-search-wrap" style={{ marginTop: 8 }}>
          <span className="icon-leading"><IcSearch size={13} /></span>
          <input className="input" placeholder="Search conversations…" style={{ height: 28, fontSize: 12.5 }} />
        </div>
      </div>

      {/* Privacy notice */}
      <div style={{
        padding: "8px 12px",
        background: "oklch(var(--muted) / 0.5)",
        borderBottom: "1px solid oklch(var(--border))",
        fontSize: 11,
        color: "oklch(var(--muted-foreground))",
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexShrink: 0,
      }}>
        <IcShield size={11} />
        <span>Private to <b style={{ color: "oklch(var(--foreground))" }}>chris.lai</b></span>
        <span title="Beta+ localStorage; Tier 2 server-side" style={{ cursor: "default" }}>·</span>
        <span>localStorage</span>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: 6 }}>
        {groups.map((g) => {
          const items = conversations.filter((c) => c.group === g.id);
          if (!items.length) return null;
          return (
            <div key={g.id}>
              <div className="nav-section-label" style={{ padding: "10px 8px 4px" }}>{g.label}</div>
              {items.map((c) => (
                <ConversationItem key={c.id} conv={c} active={c.id === activeId} onClick={() => onSelect(c.id)} />
              ))}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: "8px 12px",
        borderTop: "1px solid oklch(var(--border))",
        flexShrink: 0,
        fontSize: 11,
        color: "oklch(var(--muted-foreground))",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}>
        <IcInbox size={11} />
        <span>{conversations.length} conversations</span>
        <div className="spacer" />
        <button className="btn btn-ghost btn-xs">Manage</button>
      </div>
    </aside>
  );
}

function ConversationItem({ conv, active, onClick }) {
  return (
    <div onClick={onClick}
         style={{
           padding: "8px 10px",
           borderRadius: "var(--radius-sm)",
           cursor: "default",
           background: active ? "oklch(var(--muted))" : "transparent",
           borderLeft: active ? "2px solid oklch(var(--accent))" : "2px solid transparent",
           transition: "background var(--duration-fast)",
           marginBottom: 1,
         }}
         onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "oklch(var(--muted) / 0.5)"; }}
         onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        {conv.starred && <IcStar size={10} style={{ color: "oklch(var(--accent))", flexShrink: 0 }} />}
        <span style={{
          fontSize: 12.5,
          fontWeight: active ? 600 : 500,
          flex: 1,
          minWidth: 0,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          lineHeight: 1.35,
        }}>{conv.title}</span>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 10.5, color: "oklch(var(--muted-foreground))" }}>
        <span className="mono" style={{ background: "oklch(var(--muted))", padding: "0 4px", borderRadius: 2, fontSize: 9.5 }}>{conv.kb_name}</span>
        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)" }}>{conv.message_count}m</span>
      </div>
    </div>
  );
}

function ChatHeader({ kb, kbs, onKbChange, placement, showCitations, showHistory, onToggleCitations, onToggleHistory }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 20px",
      borderBottom: "1px solid oklch(var(--border))",
      flexShrink: 0,
      background: "oklch(var(--background))",
    }}>
      {!showHistory && (
        <button className="btn btn-ghost btn-icon btn-sm" title="Show conversation history" onClick={onToggleHistory}>
          <IcInbox size={14} />
        </button>
      )}
      <div className="row">
        <span className="text-xs muted mono">KB</span>
        <select className="select" value={kb.kb_id} onChange={(e) => onKbChange(e.target.value)} style={{ height: 28 }}>
          {kbs.map((k) => <option key={k.kb_id} value={k.kb_id}>{k.name}</option>)}
        </select>
        <span className="text-xs muted">·</span>
        <span className="text-xs muted">{kb.config.chunk_strategy}</span>
        <span className="text-xs muted">·</span>
        <span className="text-xs muted mono">{kb.total_chunks.toLocaleString()} chunks · {kb.total_screenshots} screenshots</span>
      </div>
      <div className="spacer" />
      <div className="row">
        <span className="text-xs muted">CRAG</span>
        <span className="switch" data-on="true" />
        <span className="text-xs muted" style={{ marginLeft: 12 }}>Show images</span>
        <span className="switch" data-on="true" />
      </div>
      <div className="row" style={{ marginLeft: 4 }}>
        <button className="btn btn-ghost btn-icon btn-sm" title="Focus mode (hide all panels)"><IcEye size={14} /></button>
        {placement === "sidebar" && (
          <button className="btn btn-ghost btn-icon btn-sm" title="Toggle sources panel" onClick={onToggleCitations}
                  style={{ background: showCitations ? "oklch(var(--muted))" : "transparent" }}>
            <IcBook size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function ChatThread({ placement, citations, onOpenScreenshot, onNavigate }) {
  // Citations that carry images — surface them inline + in the gallery
  const imageCitations = citations.filter((c) => c.embedded_images.length > 0);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 32px 32px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* User message */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <div className="avatar avatar-sm">CL</div>
          <div style={{ flex: 1 }}>
            <div className="text-xs muted mono" style={{ marginBottom: 4 }}>chris.lai · 2:32 PM</div>
            <div style={{ fontSize: 14.5, lineHeight: 1.55 }}>
              How do I configure multi-currency posting definitions for inter-company journals in D365 F&O? Source legal entity is USD, destination is JPY.
            </div>
          </div>
        </div>

        {/* Assistant message */}
        <div style={{ display: "flex", gap: 12 }}>
          <div className="avatar avatar-sm" style={{ background: "oklch(var(--accent))", color: "oklch(var(--accent-foreground))", border: 0 }}>E</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Meta row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>EKP</span>
              <span className="text-xs muted mono">gpt-5.5 · cohere-v4.0-pro · {imageCitations.length > 0 ? "5 citations · 2 with screenshots" : "5 citations"}</span>
              <span className="spacer" />
              <span className="text-xs muted mono">4.13s · $0.029</span>
            </div>

            {/* CRAG strip */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 11px",
              background: "oklch(var(--accent) / 0.06)",
              border: "1px solid oklch(var(--accent) / 0.22)",
              borderRadius: "var(--radius-sm)",
              marginBottom: 14,
              fontSize: 12.5,
            }}>
              <IcRefresh size={12} style={{ color: "oklch(var(--accent))", flexShrink: 0 }} />
              <span><b>CRAG L2 re-retrieve</b> · initial confidence 0.61 &lt; 0.70 threshold · added 3 chunks via query_decomposition</span>
              <span className="spacer" />
              <button className="btn btn-ghost btn-xs" onClick={() => onNavigate("trace-detail", { traceId: "trace_2026_05_15_a7f4b2c1" })}>
                View trace →
              </button>
            </div>

            {/* Answer body */}
            <AnswerBody placement={placement}
                       citations={citations}
                       onOpenScreenshot={onOpenScreenshot} />

            {/* Image gallery (if 2+ images) */}
            {imageCitations.length >= 2 && (
              <ImageGallery citations={imageCitations} onOpenScreenshot={onOpenScreenshot} />
            )}

            {/* Sources strip — always present, only suppressed when sidebar panel is shown */}
            {placement !== "sidebar" && (
              <SourcesStrip citations={citations}
                            onOpenScreenshot={onOpenScreenshot}
                            onNavigate={onNavigate} />
            )}

            {/* Action bar with proper Feedback widget per C06 /feedback endpoint */}
            <FeedbackBar traceId="trace_2026_05_15_a7f4b2c1" citations={citations} imageCount={imageCitations.length} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Feedback bar — wires to POST /feedback per C06 backend schema ──────────
// FeedbackRequest{ trace_id, rating: "thumbs_up" | "thumbs_down", comment? }
function FeedbackBar({ traceId, citations, imageCount }) {
  const [rating, setRating] = useState(null);
  const [showCommentBox, setShowCommentBox] = useState(false);

  return (
    <>
      <div style={{ display: "flex", gap: 4, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn btn-ghost btn-icon btn-xs" title="Copy answer"><IcCopy size={12} /></button>
        <button className="btn btn-ghost btn-icon btn-xs" title="Regenerate"><IcRefresh size={12} /></button>
        <div style={{ width: 1, height: 14, background: "oklch(var(--border))", margin: "0 4px" }} />

        {/* Feedback */}
        <span className="text-xs muted" style={{ marginRight: 2 }}>Was this helpful?</span>
        <button className="btn btn-ghost btn-xs"
                onClick={() => { setRating("thumbs_up"); setShowCommentBox(true); }}
                style={rating === "thumbs_up" ? { background: "oklch(var(--success) / 0.12)", color: "oklch(var(--success))" } : undefined}
                title="POST /feedback {rating: thumbs_up}">
          <IcArrowUp size={11} /> Yes
        </button>
        <button className="btn btn-ghost btn-xs"
                onClick={() => { setRating("thumbs_down"); setShowCommentBox(true); }}
                style={rating === "thumbs_down" ? { background: "oklch(var(--destructive) / 0.1)", color: "oklch(var(--destructive))" } : undefined}
                title="POST /feedback {rating: thumbs_down}">
          <IcArrowDown size={11} /> No
        </button>

        <div className="spacer" />
        <span className="text-xs muted mono" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IcLayers size={10} /> {citations.length} citations · {imageCount} with screenshots
          <span>·</span>
          <span style={{ color: "oklch(var(--accent))" }}>trace {traceId.slice(-12)}</span>
        </span>
      </div>

      {/* Comment box (appears after rating) */}
      {showCommentBox && (
        <div style={{
          marginTop: 10,
          padding: "10px 12px",
          background: "oklch(var(--muted) / 0.4)",
          border: "1px solid oklch(var(--border))",
          borderRadius: "var(--radius-sm)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span className="text-xs" style={{ fontWeight: 500 }}>
              {rating === "thumbs_up" ? "Glad it helped! Tell us more (optional)" : "Sorry about that. What went wrong? (optional)"}
            </span>
            <div className="spacer" />
            <button className="btn btn-ghost btn-icon btn-xs" onClick={() => setShowCommentBox(false)}><IcX size={11} /></button>
          </div>
          <textarea className="input" rows={2}
                    placeholder={rating === "thumbs_up" ? "What worked well?" : "Missing info, wrong answer, refused incorrectly…"}
                    style={{ minHeight: 50, fontSize: 12.5 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span className="text-xs muted mono">trace_id <span style={{ color: "oklch(var(--accent))" }}>{traceId.slice(-16)}</span></span>
            <div className="spacer" />
            <button className="btn btn-ghost btn-xs" onClick={() => setShowCommentBox(false)}>Skip</button>
            <button className="btn btn-accent btn-xs">Submit feedback</button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Answer body — inline citations + inline image cards ────────────────────
function AnswerBody({ placement, citations, onOpenScreenshot }) {
  const cit1 = citations[0], cit2 = citations[1], cit3 = citations[2], cit4 = citations[3];

  return (
    <div style={{ fontSize: 14, lineHeight: 1.7, color: "oklch(var(--foreground))" }}>
      <p style={{ marginTop: 0 }}>
        For multi-currency inter-company journals in D365 F&O, you need to align three settings across both legal entities.
        Configuration lives under <CodeChip>General ledger {">"} Setup {">"} Posting definitions</CodeChip>.
      </p>

      <ol style={{ paddingLeft: 22, lineHeight: 1.75 }}>
        <li>
          <b>Exchange rate type</b> — must match the destination legal entity's accounting currency.
          Both the source LE (USD) and destination LE (JPY) require their own exchange rate type defined under <CodeChip>GL {">"} Currencies {">"} Exchange rate types</CodeChip>
          <CitationPill ids={[1, 3]} placement={placement} citations={citations} />
        </li>
        <li>
          <b>Inter-company accounting</b> — enable "Post in both companies" and select the originating LE.
          This routes the JPY-side leg through the inter-company clearing account
          <CitationPill ids={[2]} placement={placement} citations={citations} />
        </li>
        <li>
          <b>Period-end reconciliation</b> — run the multi-currency revaluation batch before period close
          <CitationPill ids={[4]} placement={placement} citations={citations} />
        </li>
      </ol>

      {/* ── Inline image card #1 ── */}
      <InlineImageCard
        title="Posting definitions screen — exchange rate type field"
        caption="Citation [1] · Section 4.2 Multi-Currency Setup"
        figure="figure 1"
        kind="screen-posting-definitions"
        citation={cit1}
        onOpen={() => onOpenScreenshot(cit1)} />

      <p>
        <b>Common pitfall:</b> if the exchange rate type isn't mapped, posting validation fails at month-end close with a non-obvious error
        (<CodeChip>POST-VAL-204</CodeChip>). Reference Section 4.3 of the GL configuration manual for the full validation matrix
        <CitationPill ids={[1]} placement={placement} citations={citations} />.
      </p>

      <p>
        For the period-end checklist, the Finance Overview deck has a one-glance summary
        <CitationPill ids={[4]} placement={placement} citations={citations} />:
      </p>

      {/* ── Inline image card #2 ── */}
      <InlineImageCard
        title="Period-end close checklist (slide 17)"
        caption="Citation [4] · Finance Module Overview Q1 2026 Training Deck"
        figure="figure 2"
        kind="slide-checklist"
        citation={cit4}
        onOpen={() => onOpenScreenshot(cit4)} />
    </div>
  );
}

function CodeChip({ children }) {
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: 12.5,
      background: "oklch(var(--muted) / 0.6)",
      border: "1px solid oklch(var(--border))",
      padding: "1px 5px",
      borderRadius: 3,
      margin: "0 1px",
    }}>{children}</span>
  );
}

// Citation pill — supports hover preview popover
function CitationPill({ ids, placement, citations }) {
  const [hoverId, setHoverId] = useState(null);
  return (
    <span style={{ display: "inline-flex", gap: 2, marginLeft: 3, position: "relative" }}>
      {ids.map((id) => {
        const c = citations.find((x) => x.idx === id);
        return (
          <span key={id}
                onMouseEnter={() => setHoverId(id)}
                onMouseLeave={() => setHoverId(null)}
                title={c?.doc_title}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: 18, height: 18, padding: "0 5px", fontSize: 11, fontWeight: 600,
                  background: hoverId === id ? "oklch(var(--accent) / 0.22)" : "oklch(var(--accent) / 0.1)",
                  color: "oklch(var(--accent))",
                  border: "1px solid oklch(var(--accent) / 0.28)",
                  borderRadius: 4, fontFamily: "var(--font-mono)",
                  cursor: "default",
                  transition: "background var(--duration-fast)",
                  position: "relative",
                }}>
            {id}
            {/* Popover preview */}
            {hoverId === id && (
              <span style={{
                position: "absolute",
                bottom: "calc(100% + 6px)",
                left: "50%",
                transform: "translateX(-50%)",
                width: 320,
                padding: "10px 12px",
                background: "oklch(var(--popover))",
                border: "1px solid oklch(var(--border))",
                borderRadius: "var(--radius-sm)",
                boxShadow: "var(--shadow-lg)",
                fontFamily: "var(--font-sans)",
                fontWeight: 400,
                color: "oklch(var(--foreground))",
                textAlign: "left",
                zIndex: 10,
              }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                  <IcFile size={12} className="muted" />
                  <span style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>
                    {c.doc_title}
                  </span>
                  <span className="mono text-xs muted">{c.relevance_score.toFixed(3)}</span>
                </div>
                <div className="section-path text-xs" style={{ marginBottom: 6 }}>
                  {c.section_path.map((s, j) => <span key={j}>{s}</span>)}
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5, color: "oklch(var(--foreground) / 0.85)" }}>
                  {c.preview}
                </div>
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

// ── Inline image card — appears in the answer flow ─────────────────────────
function InlineImageCard({ title, caption, figure, kind, citation, onOpen }) {
  return (
    <figure style={{
      margin: "18px 0",
      border: "1px solid oklch(var(--border))",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
      background: "oklch(var(--card))",
    }}>
      <div onClick={onOpen} style={{ cursor: "default", position: "relative" }}>
        <SyntheticScreenshot kind={kind} compact />
        <div style={{
          position: "absolute", top: 10, right: 10,
          display: "flex", gap: 4,
        }}>
          <button className="btn btn-secondary btn-xs" style={{ background: "oklch(var(--background) / 0.9)" }} onClick={(e) => { e.stopPropagation(); onOpen(); }}>
            <IcEye size={11} /> Full size
          </button>
        </div>
      </div>
      <figcaption style={{
        padding: "10px 14px",
        background: "oklch(var(--muted) / 0.4)",
        borderTop: "1px solid oklch(var(--border))",
        fontSize: 12.5,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span className="mono text-xs muted">{figure}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, color: "oklch(var(--foreground))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </div>
          <div className="text-xs muted" style={{ marginTop: 1 }}>{caption}</div>
        </div>
      </figcaption>
    </figure>
  );
}

// ── Image gallery — appears below answer if 2+ images cited ────────────────
function ImageGallery({ citations, onOpenScreenshot }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span className="text-xs muted mono" style={{ letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}>
          Referenced screenshots
        </span>
        <span className="badge badge-muted">{citations.length}</span>
        <div className="spacer" />
        <button className="btn btn-ghost btn-xs">View all in Image Library →</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
        {citations.map((c) => (
          <button key={c.idx}
                  onClick={() => onOpenScreenshot(c)}
                  className="btn btn-secondary"
                  style={{
                    padding: 0, height: "auto", flexDirection: "column",
                    background: "oklch(var(--card))",
                    overflow: "hidden", textAlign: "left",
                    borderColor: "oklch(var(--border))",
                  }}>
            <div style={{ width: "100%", aspectRatio: "16/9", overflow: "hidden", position: "relative" }}>
              <SyntheticScreenshot kind={c.embedded_images[0]?.kind || "screen-generic"} mini />
              <span style={{
                position: "absolute", top: 4, left: 4,
                background: "oklch(var(--accent))", color: "oklch(var(--accent-foreground))",
                padding: "1px 6px", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
              }}>{c.idx}</span>
            </div>
            <div style={{ width: "100%", padding: "8px 10px" }}>
              <div style={{ fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {c.chunk_title}
              </div>
              <div className="text-xs muted mono" style={{ marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {c.doc_title}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Sources strip — bottom of answer ───────────────────────────────────────
function SourcesStrip({ citations, onOpenScreenshot, onNavigate }) {
  return (
    <div style={{
      marginTop: 22,
      padding: 14,
      border: "1px solid oklch(var(--border))",
      borderRadius: "var(--radius-md)",
      background: "oklch(var(--muted) / 0.2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <IcBook size={13} className="muted" />
        <span className="text-xs mono" style={{ letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600, color: "oklch(var(--foreground))" }}>
          Sources
        </span>
        <span className="text-xs muted">· {citations.length} chunks across {[...new Set(citations.map((c) => c.doc_id))].length} documents</span>
        <div className="spacer" />
        <button className="btn btn-ghost btn-xs">
          <IcLayers size={11} /> All retrieved chunks
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {citations.map((c) => (
          <SourceDocCard key={c.idx}
                         citation={c}
                         onOpenScreenshot={() => onOpenScreenshot(c)}
                         onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

function SourceDocCard({ citation, onOpenScreenshot, onNavigate }) {
  const hasImage = citation.embedded_images.length > 0;
  const fileColors = {
    docx: "oklch(0.55 0.13 240)",
    pdf:  "oklch(0.58 0.18 25)",
    pptx: "oklch(0.55 0.16 25)",
  };
  return (
    <div style={{
      padding: "10px 12px",
      background: "oklch(var(--card))",
      border: "1px solid oklch(var(--border))",
      borderRadius: "var(--radius-sm)",
      display: "flex", gap: 10,
      transition: "border-color var(--duration-fast)",
    }}
    onMouseEnter={(e) => e.currentTarget.style.borderColor = "oklch(var(--border-strong))"}
    onMouseLeave={(e) => e.currentTarget.style.borderColor = "oklch(var(--border))"}
    >
      {/* Left index */}
      <div style={{
        flexShrink: 0, width: 22, height: 22,
        borderRadius: 4,
        background: "oklch(var(--accent) / 0.12)",
        color: "oklch(var(--accent))",
        display: "grid", placeItems: "center",
        fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
      }}>{citation.idx}</div>

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <FileTypeIcon type={citation.file_type} color={fileColors[citation.file_type]} />
          <span style={{ fontSize: 12.5, fontWeight: 500, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {citation.doc_title}
          </span>
        </div>
        <div className="section-path text-xs" style={{ marginTop: 4 }}>
          {citation.section_path.map((s, j) => <span key={j}>{s}</span>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <span className="text-xs mono muted">p.{citation.page} · chunk #{citation.chunk_index}</span>
          <div style={{ flex: 1, height: 3, background: "oklch(var(--muted))", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${citation.relevance_score * 100}%`, height: "100%", background: "oklch(var(--accent))" }} />
          </div>
          <span className="mono text-xs" style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
            {citation.relevance_score.toFixed(3)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
          <button className="btn btn-ghost btn-xs" onClick={() => onNavigate("doc-detail", { kbId: "drive-manuals", docId: citation.doc_id })}>
            Open in source →
          </button>
          {hasImage && (
            <button className="btn btn-ghost btn-xs" onClick={onOpenScreenshot}>
              <IcLayers size={10} /> Screenshot
            </button>
          )}
          <button className="btn btn-ghost btn-xs">
            <IcLink size={10} /> Original ↗
          </button>
        </div>
      </div>

      {/* Right thumbnail (if image) */}
      {hasImage && (
        <div onClick={onOpenScreenshot}
             style={{
               width: 64, height: 48, flexShrink: 0,
               borderRadius: 4,
               border: "1px solid oklch(var(--border))",
               overflow: "hidden",
               cursor: "default",
             }}>
          <SyntheticScreenshot kind={citation.embedded_images[0].kind} mini />
        </div>
      )}
    </div>
  );
}

function FileTypeIcon({ type, color }) {
  return (
    <span style={{
      padding: "1px 5px",
      fontSize: 10,
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      letterSpacing: "0.04em",
      background: `${color.replace(")", " / 0.12)")}`,
      color: color,
      border: `1px solid ${color.replace(")", " / 0.25)")}`,
      borderRadius: 3,
      textTransform: "uppercase",
      lineHeight: 1.3,
    }}>{type}</span>
  );
}

// ── Citation panel (sidebar mode) ──────────────────────────────────────────
function CitationPanel({ citations, onClose, onOpenScreenshot, onNavigate }) {
  return (
    <aside style={{ display: "flex", flexDirection: "column", background: "oklch(var(--card))", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "11px 16px", borderBottom: "1px solid oklch(var(--border))", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Sources</div>
          <div className="text-xs muted">
            {citations.length} chunks · {citations.filter((c) => c.embedded_images.length > 0).length} with screenshots · sorted by relevance
          </div>
        </div>
        <div className="spacer" />
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><IcX size={14} /></button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {citations.map((c) => (
          <PanelSourceCard key={c.idx}
                           citation={c}
                           onOpenScreenshot={() => onOpenScreenshot(c)}
                           onNavigate={onNavigate} />
        ))}
      </div>
      <div style={{ padding: "9px 16px", borderTop: "1px solid oklch(var(--border))", background: "oklch(var(--muted) / 0.3)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span className="text-xs muted mono">Trace</span>
        <span className="mono text-xs" style={{ color: "oklch(var(--accent))" }}>2026_05_15_a7f4b2c1</span>
        <div className="spacer" />
        <button className="btn btn-ghost btn-xs">Langfuse ↗</button>
      </div>
    </aside>
  );
}

function PanelSourceCard({ citation, onOpenScreenshot, onNavigate }) {
  const hasImage = citation.embedded_images.length > 0;
  const fileColors = {
    docx: "oklch(0.55 0.13 240)",
    pdf:  "oklch(0.58 0.18 25)",
    pptx: "oklch(0.55 0.16 25)",
  };
  return (
    <div style={{
      border: "1px solid oklch(var(--border))",
      borderRadius: "var(--radius-sm)",
      padding: 12,
      background: "oklch(var(--card))",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{
          flexShrink: 0, width: 22, height: 22,
          background: "oklch(var(--accent) / 0.12)", color: "oklch(var(--accent))",
          borderRadius: 4,
          display: "grid", placeItems: "center",
          fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 11,
        }}>{citation.idx}</div>
        <FileTypeIcon type={citation.file_type} color={fileColors[citation.file_type]} />
        <span className="mono text-xs" style={{ fontWeight: 600, color: "oklch(var(--foreground))", marginLeft: "auto" }}>
          {citation.relevance_score.toFixed(3)}
        </span>
      </div>

      {/* Doc title */}
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3, lineHeight: 1.35 }}>
        {citation.chunk_title}
      </div>
      <div className="text-xs muted" style={{ marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {citation.doc_title}
      </div>

      {/* Section path */}
      <div className="section-path text-xs" style={{ marginBottom: 8 }}>
        {citation.section_path.map((s, j) => <span key={j}>{s}</span>)}
      </div>

      {/* Image thumb */}
      {hasImage && (
        <div onClick={onOpenScreenshot}
             style={{
               width: "100%", height: 120, marginBottom: 8,
               borderRadius: 4,
               border: "1px solid oklch(var(--border))",
               overflow: "hidden",
               cursor: "default",
             }}>
          <SyntheticScreenshot kind={citation.embedded_images[0].kind} mini />
        </div>
      )}

      {/* Preview */}
      <div className="text-xs" style={{
        background: "oklch(var(--muted) / 0.4)",
        padding: "6px 8px",
        borderRadius: 3,
        lineHeight: 1.5,
        color: "oklch(var(--foreground) / 0.85)",
        marginBottom: 8,
      }}>
        "{citation.preview}"
      </div>

      {/* Action footer */}
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <button className="btn btn-ghost btn-xs" onClick={() => onNavigate("doc-detail", { kbId: "drive-manuals", docId: citation.doc_id })}>
          Open source →
        </button>
        <span className="text-xs mono muted" style={{ marginLeft: "auto" }}>
          p.{citation.page} · #{citation.chunk_index}
        </span>
      </div>
    </div>
  );
}

// ── Synthetic screenshot — drawn SVG that looks like a real D365 screen ────
function SyntheticScreenshot({ kind, compact = false, mini = false }) {
  if (kind === "screen-posting-definitions") {
    return <SvgScreenPostingDefinitions mini={mini} compact={compact} />;
  }
  if (kind === "slide-checklist") {
    return <SvgSlideChecklist mini={mini} compact={compact} />;
  }
  return <SvgGenericScreen mini={mini} compact={compact} />;
}

function SvgScreenPostingDefinitions({ mini, compact }) {
  // D365-like form: header bar + side nav + form fields + table grid
  return (
    <svg viewBox="0 0 800 480" style={{ display: "block", width: "100%", height: "auto", background: "oklch(0.985 0.003 285)" }}>
      <defs>
        <linearGradient id="bar1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.25 0.04 240)" />
          <stop offset="1" stopColor="oklch(0.22 0.04 240)" />
        </linearGradient>
      </defs>
      {/* Top app bar */}
      <rect x="0" y="0" width="800" height="32" fill="url(#bar1)" />
      <circle cx="20" cy="16" r="3" fill="white" opacity="0.85" />
      <rect x="32" y="11" width="180" height="10" rx="2" fill="white" opacity="0.3" />
      <rect x="640" y="9" width="20" height="14" rx="2" fill="white" opacity="0.25" />
      <rect x="666" y="9" width="20" height="14" rx="2" fill="white" opacity="0.25" />
      <rect x="692" y="9" width="40" height="14" rx="7" fill="white" opacity="0.25" />
      {/* Breadcrumb / title bar */}
      <rect x="0" y="32" width="800" height="40" fill="oklch(0.96 0.004 285)" />
      <text x="20" y="56" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="600" fill="oklch(0.20 0.01 285)">Posting definitions</text>
      <text x="20" y="68" fontFamily="Inter, sans-serif" fontSize="10" fill="oklch(0.45 0 0)">General ledger › Setup › Posting › Posting definitions</text>
      {/* Action bar */}
      <rect x="0" y="72" width="800" height="34" fill="oklch(0.98 0.003 285)" stroke="oklch(0.90 0 0)" strokeWidth="0.5" />
      {[20, 80, 140, 200, 260].map((x, i) => (
        <g key={x}>
          <rect x={x} y="82" width="50" height="16" rx="2" fill="oklch(0.92 0 0)" />
          <text x={x + 25} y="93" fontFamily="Inter" fontSize="9" textAnchor="middle" fill="oklch(0.30 0 0)">
            {["New","Edit","Save","Delete","Validate"][i]}
          </text>
        </g>
      ))}
      {/* Left side nav */}
      <rect x="0" y="106" width="180" height="374" fill="oklch(0.97 0.003 285)" stroke="oklch(0.90 0 0)" strokeWidth="0.5" />
      {["Definitions","Rule mappings","Currency","Validation","Audit log"].map((label, i) => (
        <g key={label}>
          <rect x="0" y={120 + i * 32} width="180" height="30" fill={i === 2 ? "oklch(0.65 0.18 25 / 0.10)" : "transparent"} />
          {i === 2 && <rect x="0" y={120 + i * 32} width="3" height="30" fill="oklch(0.65 0.18 25)" />}
          <text x="20" y={138 + i * 32} fontFamily="Inter" fontSize="11" fontWeight={i === 2 ? 600 : 400} fill="oklch(0.20 0.01 285)">{label}</text>
        </g>
      ))}
      {/* Form fields */}
      <text x="200" y="130" fontFamily="Inter" fontSize="11" fontWeight="600" fill="oklch(0.20 0.01 285)">Currency mapping</text>
      <line x1="200" y1="136" x2="780" y2="136" stroke="oklch(0.90 0 0)" strokeWidth="0.5" />
      {[
        { l: "Legal entity",     v: "USMF (United States)" },
        { l: "Account currency", v: "USD" },
        { l: "Exchange rate type", v: "Default", highlight: true },
        { l: "Posting type",     v: "Inter-company" },
        { l: "Effective date",   v: "2026-01-01" },
      ].map((f, i) => (
        <g key={f.l}>
          <text x="216" y={166 + i * 32} fontFamily="Inter" fontSize="10" fill="oklch(0.45 0 0)">{f.l}</text>
          <rect x="356" y={154 + i * 32} width="220" height="22" rx="2"
                fill={f.highlight ? "oklch(0.65 0.18 25 / 0.08)" : "white"}
                stroke={f.highlight ? "oklch(0.65 0.18 25 / 0.5)" : "oklch(0.90 0 0)"} strokeWidth={f.highlight ? "1.5" : "0.5"} />
          <text x="366" y={170 + i * 32} fontFamily="Inter" fontSize="11" fontWeight={f.highlight ? 600 : 400} fill="oklch(0.20 0.01 285)">{f.v}</text>
          {f.highlight && (
            <g>
              <circle cx="592" cy={166 + i * 32} r="3" fill="oklch(0.65 0.18 25)" />
            </g>
          )}
        </g>
      ))}
      {/* Validation banner */}
      <rect x="200" y="328" width="576" height="32" rx="3" fill="oklch(0.78 0.16 80 / 0.12)" stroke="oklch(0.78 0.16 80 / 0.3)" strokeWidth="1" />
      <circle cx="216" cy="344" r="6" fill="oklch(0.78 0.16 80)" />
      <text x="216" y="348" fontFamily="Inter" fontSize="9" fontWeight="700" textAnchor="middle" fill="white">!</text>
      <text x="232" y="346" fontFamily="Inter" fontSize="10.5" fontWeight="500" fill="oklch(0.30 0 0)">
        Exchange rate type must align with the legal entity's accounting currency — see Section 4.3.
      </text>
      {/* Bottom table */}
      <text x="200" y="384" fontFamily="Inter" fontSize="11" fontWeight="600" fill="oklch(0.20 0.01 285)">Allowed combinations</text>
      <rect x="200" y="390" width="576" height="22" fill="oklch(0.95 0 0)" />
      {["Source","Dest","Rate type","Status"].map((h, i) => (
        <text key={h} x={216 + i * 144} y="404" fontFamily="Inter" fontSize="9" fontWeight="600" fill="oklch(0.45 0 0)">{h}</text>
      ))}
      {[
        ["USD","JPY","Default","Active"],
        ["USD","EUR","Default","Active"],
        ["JPY","USD","Reverse","Active"],
      ].map((row, ri) => (
        <g key={ri}>
          <rect x="200" y={412 + ri * 22} width="576" height="22" fill={ri % 2 ? "oklch(0.985 0 0)" : "white"} stroke="oklch(0.92 0 0)" strokeWidth="0.5" />
          {row.map((c, ci) => (
            <text key={ci} x={216 + ci * 144} y={426 + ri * 22} fontFamily="Inter" fontSize="10" fill="oklch(0.20 0.01 285)">{c}</text>
          ))}
        </g>
      ))}
    </svg>
  );
}

function SvgSlideChecklist({ mini, compact }) {
  return (
    <svg viewBox="0 0 800 480" style={{ display: "block", width: "100%", height: "auto", background: "oklch(0.99 0 0)" }}>
      {/* Slide top bar */}
      <rect x="0" y="0" width="800" height="80" fill="oklch(0.20 0.01 285)" />
      <text x="40" y="42" fontFamily="Inter" fontSize="22" fontWeight="700" fill="white">Period-End Close Checklist</text>
      <text x="40" y="62" fontFamily="Inter" fontSize="13" fill="oklch(0.78 0 0)">Slide 17 of 38 · Finance Module Overview Q1 2026</text>
      {/* Checklist items */}
      {[
        { t: "Run accruals batch",            d: "GL > Periodic > Accruals · runs ~12 min",          done: true },
        { t: "Reconcile sub-ledgers",         d: "AR / AP / Inventory · validates trial balance",    done: true },
        { t: "Validate inter-company entries",d: "Cross-LE journals · multi-currency revaluation",   done: true,  highlight: true },
        { t: "Generate trial balance",        d: "GL > Reports > Trial balance",                     done: false },
        { t: "Lock posting period",           d: "GL > Setup > Ledger > Periods",                    done: false },
      ].map((it, i) => (
        <g key={i}>
          <circle cx="60" cy={130 + i * 60} r="14" fill={it.done ? "oklch(0.65 0.16 145)" : "white"} stroke={it.done ? "oklch(0.65 0.16 145)" : "oklch(0.78 0 0)"} strokeWidth="2" />
          {it.done && <path d={`M${52} ${130 + i * 60} L${58} ${136 + i * 60} L${68} ${124 + i * 60}`} fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
          <rect x="86" y={114 + i * 60} width="660" height="34" rx="4"
                fill={it.highlight ? "oklch(0.65 0.18 25 / 0.08)" : "transparent"}
                stroke={it.highlight ? "oklch(0.65 0.18 25 / 0.3)" : "transparent"} strokeWidth="1" />
          <text x="100" y={128 + i * 60} fontFamily="Inter" fontSize="14" fontWeight="600" fill="oklch(0.20 0.01 285)">{i + 1}. {it.t}</text>
          <text x="100" y={142 + i * 60} fontFamily="Inter" fontSize="11" fill="oklch(0.45 0 0)">{it.d}</text>
          {it.highlight && (
            <text x="700" y={134 + i * 60} fontFamily="JetBrains Mono" fontSize="10" fontWeight="600" fill="oklch(0.65 0.18 25)">multi-currency ⟵</text>
          )}
        </g>
      ))}
      {/* Footer */}
      <rect x="0" y="430" width="800" height="50" fill="oklch(0.96 0 0)" />
      <text x="40" y="458" fontFamily="Inter" fontSize="11" fontWeight="600" fill="oklch(0.30 0 0)">Estimated total runtime · 45–90 min</text>
      <text x="40" y="472" fontFamily="Inter" fontSize="10" fill="oklch(0.45 0 0)">Subject to transaction volume; nightly close window starts 22:00 UTC.</text>
      <text x="760" y="466" fontFamily="Inter" fontSize="10" fill="oklch(0.45 0 0)" textAnchor="end">© Ricoh · D365 F&O Training</text>
    </svg>
  );
}

function SvgGenericScreen({ mini, compact }) {
  return (
    <svg viewBox="0 0 800 480" style={{ display: "block", width: "100%", height: "auto", background: "oklch(0.985 0 0)" }}>
      <rect x="0" y="0" width="800" height="32" fill="oklch(0.25 0.04 240)" />
      <rect x="32" y="11" width="180" height="10" rx="2" fill="white" opacity="0.3" />
      {[0,1,2,3,4].map((i) => (
        <g key={i}>
          <rect x="40" y={70 + i * 56} width="720" height="44" rx="3" fill="white" stroke="oklch(0.92 0 0)" />
          <rect x="56" y={82 + i * 56} width="160" height="10" rx="2" fill="oklch(0.30 0 0)" />
          <rect x="56" y={98 + i * 56} width="320" height="8" rx="2" fill="oklch(0.65 0 0)" />
        </g>
      ))}
    </svg>
  );
}

// ── Full screenshot modal ──────────────────────────────────────────────────
function ScreenshotModal({ citation, onClose, onNavigate }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" style={{ width: 1040, maxWidth: "92vw", maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <span className="badge badge-accent" style={{ fontSize: 12, fontWeight: 700 }}>{citation.idx}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="modal-title" style={{ fontSize: 14.5 }}>{citation.chunk_title}</div>
              <div className="text-xs muted mono">{citation.doc_title} · p.{citation.page}</div>
            </div>
            <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{citation.relevance_score.toFixed(3)}</span>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><IcX size={14} /></button>
          </div>
        </div>
        <div className="modal-body" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
          {/* Image */}
          <div style={{
            border: "1px solid oklch(var(--border))",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            background: "oklch(var(--muted) / 0.2)",
          }}>
            <SyntheticScreenshot kind={citation.embedded_images[0]?.kind || "screen-generic"} />
          </div>
          {/* Side: chunk text + context */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div className="text-xs muted mono" style={{ marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>section_path</div>
              <div className="section-path text-xs">
                {citation.section_path.map((s, j) => <span key={j}>{s}</span>)}
              </div>
            </div>
            <div>
              <div className="text-xs muted mono" style={{ marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>chunk_id</div>
              <div className="mono text-xs" style={{ wordBreak: "break-all", color: "oklch(var(--foreground))" }}>{citation.chunk_id}</div>
            </div>
            <div>
              <div className="text-xs muted mono" style={{ marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>Chunk preview</div>
              <div style={{ padding: "10px 12px", background: "oklch(var(--muted) / 0.4)", borderRadius: "var(--radius-sm)", fontSize: 12.5, lineHeight: 1.55, border: "1px solid oklch(var(--border))" }}>
                {citation.preview}
              </div>
            </div>
            <div className="spacer" />
            <button className="btn btn-accent" onClick={() => { onClose(); onNavigate("doc-detail", { kbId: "drive-manuals", docId: citation.doc_id }); }}>
              <IcFile size={14} /> Open in Document Detail
            </button>
            <button className="btn btn-secondary btn-sm"><IcLink size={13} /> Open original ↗</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Composer ───────────────────────────────────────────────────────────────
function ChatComposer() {
  return (
    <div style={{ borderTop: "1px solid oklch(var(--border))", padding: "14px 32px 18px", flexShrink: 0, background: "oklch(var(--background))" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: "column", border: "1px solid oklch(var(--border))", borderRadius: "var(--radius-md)", background: "oklch(var(--card))", padding: 4 }}>
          <textarea
            placeholder="Ask the knowledge base… (Enter to send, Shift+Enter for newline)"
            style={{ resize: "none", border: 0, outline: "none", padding: "10px 12px", fontSize: 14, minHeight: 60, background: "transparent", color: "inherit", fontFamily: "var(--font-sans)" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px 4px 8px" }}>
            <button className="btn btn-ghost btn-icon btn-sm" title="Attach screenshot"><IcUpload size={13} /></button>
            <button className="btn btn-ghost btn-icon btn-sm" title="Reference a doc"><IcFile size={13} /></button>
            <button className="btn btn-ghost btn-icon btn-sm" title="Slash commands"><IcCommand size={13} /></button>
            <div className="spacer" />
            <span className="text-xs muted mono">Drive Manuals · gpt-5.5</span>
            <button className="btn btn-accent btn-sm" style={{ marginLeft: 8 }}>
              <IcSend size={13} /> Send
            </button>
          </div>
        </div>
        <div className="text-xs muted" style={{ marginTop: 8, textAlign: "center" }}>
          Answers cite chunks with <span className="mono">section_path</span> + <span className="mono">embedded_images</span>. CRAG re-retrieves when confidence &lt; 0.70 (non-sticky).
        </div>
      </div>
    </div>
  );
}

window.PageChat = PageChat;
