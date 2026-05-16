// ekp-page-kb-new.jsx — /kb/new 4-step creation wizard
// Surface what's LOCKED after creation (affects index schema) vs EDITABLE.
// Backend: POST /kb { kb_id, name, description, config: KbConfig }
// Per ADR-0018: kb_id forms index name `ekp-kb-{kb_id}-v{version}` → must be index-name-safe.

function PageKbNew({ onNavigate }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    description: "",
    kb_id: "",
    kb_id_auto: true,
    embedding_model: "text-embedding-3-large",
    embedding_dimension: 1024,
    chunk_strategy: "auto",
    // Multimodal config
    extract_embedded_images: true,
    render_pdf_pages: false,
    slide_screenshots: true,
    captioning_model: "gpt-5.5-vision",
    low_value_threshold: 0.3,
    dedup_strategy: "sha256",
    return_images_in_chat: true,
    // Retrieval defaults
    default_top_k: 50,
    default_rerank_k: 5,
  });

  const update = (k, v) => setForm({ ...form, [k]: v });

  useEffect(() => {
    if (form.kb_id_auto && form.name) {
      const safe = form.name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
      if (safe !== form.kb_id) setForm((f) => ({ ...f, kb_id: safe }));
    }
  }, [form.name, form.kb_id_auto]);

  const steps = [
    { id: 0, label: "Identity",       hint: "Name + kb_id" },
    { id: 1, label: "Format & chunking",  hint: "Embedding + chunker" },
    { id: 2, label: "Multimodal",     hint: "Images + screenshots" },
    { id: 3, label: "Retrieval defaults", hint: "Top-K + rerank-K" },
    { id: 4, label: "Review & create", hint: "Provisions index" },
  ];

  return (
    <div className="content">
      <div className="content-narrow">
        <div className="page-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <button className="btn btn-ghost btn-xs btn-ghost-muted" onClick={() => onNavigate("kb")}>
                <IcChevLeft size={12} /> Knowledge
              </button>
            </div>
            <h1 className="page-title">Create a new knowledge base</h1>
            <p className="page-subtitle">
              A KB is an isolated <b>multimodal</b> retrieval namespace — text chunks <b>+ embedded images</b>, with cross-doc SHA256 dedup. Queries return text answers <b>with relevant screenshots inline</b>. We'll provision an Azure AI Search index{" "}
              <span className="mono">ekp-kb-{form.kb_id || "{kb_id}"}-v1</span> plus a Blob container for the images.
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="card" style={{ marginBottom: 16, overflow: "visible" }}>
          <div style={{ display: "flex", padding: "18px 24px", alignItems: "center", gap: 12 }}>
            {steps.map((s, i) => (
              <React.Fragment key={s.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "default" }} onClick={() => setStep(s.id)}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: step >= s.id ? "oklch(var(--primary))" : "oklch(var(--muted))",
                    color: step >= s.id ? "oklch(var(--primary-foreground))" : "oklch(var(--muted-foreground))",
                    display: "grid", placeItems: "center",
                    fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 12,
                    border: step === s.id ? "2px solid oklch(var(--accent))" : "0",
                  }}>
                    {step > s.id ? <IcCheck size={14} /> : i + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: step === s.id ? 600 : 500 }}>{s.label}</div>
                    <div className="text-xs muted">{s.hint}</div>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ flex: 1, height: 1, background: step > i ? "oklch(var(--foreground))" : "oklch(var(--border))" }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {step === 0 && <StepIdentity form={form} update={update} onNext={() => setStep(1)} />}
        {step === 1 && <StepConfig form={form} update={update} onBack={() => setStep(0)} onNext={() => setStep(2)} />}
        {step === 2 && <StepMultimodal form={form} update={update} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
        {step === 3 && <StepDefaults form={form} update={update} onBack={() => setStep(2)} onNext={() => setStep(4)} />}
        {step === 4 && <StepReview form={form} onBack={() => setStep(3)} onCreate={() => onNavigate("kb-detail", { kbId: form.kb_id || "new-kb" })} />}
      </div>
    </div>
  );
}

function StepMultimodal({ form, update, onBack, onNext }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Multimodal — images & screenshots</h3>
        <span className="badge badge-info"><IcLayers size={10} /> Text + image retrieval</span>
      </div>
      <div className="card-body">
        {/* Hero explainer with pipeline (uses INFO blue, not accent) */}
        <div style={{
          padding: 14,
          background: "oklch(var(--info) / 0.06)",
          border: "1px solid oklch(var(--info) / 0.22)",
          borderRadius: "var(--radius-md)",
          marginBottom: 18,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <IcLayers size={14} style={{ color: "oklch(var(--info))" }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>How text + image retrieval works in this KB</span>
          </div>
          <div className="text-xs" style={{ lineHeight: 1.65, marginBottom: 12 }}>
            For .docx / .pdf / .pptx that contain both <b>text and images</b> (e.g. user manuals, training decks), images are extracted alongside text and bound to their parent text chunk via <span className="mono">embedded_image_positions: ["img@{`{doc_order}`}"]</span>. At query time, citations carry <b>both the text excerpt and the associated screenshot</b>.
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 4,
            background: "oklch(var(--card))",
            border: "1px solid oklch(var(--border))",
            borderRadius: "var(--radius-sm)",
            padding: 10,
            fontSize: 11,
          }}>
            {[
              { i: 1, label: "Parse",          ic: "📄", note: "Docling / python-pptx · extracts EmbeddedImage{sha256, alt_text, doc_order}", tier2: false },
              { i: 2, label: "Caption",        ic: "🤖", note: "Vision model fills alt_text when source has none", tier2: true },
              { i: 3, label: "Dedup",          ic: "🔗", note: "SHA256 → upload once · reference many", tier2: false },
              { i: 4, label: "Bind to chunks", ic: "🔀", note: "Chunker → embedded_image_positions → ImageRef", tier2: false },
              { i: 5, label: "Index",          ic: "📦", note: "Azure AI Search · embedded_images_json field", tier2: false },
            ].map((s, idx, arr) => (
              <div key={s.i} style={{
                position: "relative",
                padding: "8px 8px 6px",
                textAlign: "center",
                background: s.tier2 ? "oklch(var(--accent) / 0.06)" : "transparent",
                border: s.tier2 ? "1px dashed oklch(var(--accent) / 0.3)" : "1px solid transparent",
                borderRadius: 4,
              }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{s.ic}</div>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
                  {s.i}. {s.label}
                  {s.tier2 && <div className="badge badge-accent" style={{ marginTop: 4, fontSize: 9, padding: "0 4px", height: 14 }}>T2</div>}
                </div>
                <div className="text-xs muted" style={{ fontSize: 10, lineHeight: 1.35 }}>{s.note}</div>
                {idx < arr.length - 1 && (
                  <div style={{
                    position: "absolute", top: "50%", right: -8, width: 12, height: 1,
                    background: "oklch(var(--info) / 0.4)",
                  }} />
                )}
              </div>
            ))}
          </div>
          <div className="text-xs muted" style={{ marginTop: 8, fontSize: 10.5 }}>
            <span className="badge badge-accent" style={{ fontSize: 9, padding: "0 4px", height: 14, marginRight: 4 }}>T2</span>
            = Tier 2 preview, not yet implemented in the current Beta. Other steps are active today.
          </div>
        </div>

        {/* ── ACTIVE: Image extraction sources ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span className="badge badge-success"><span className="badge-dot" /> ACTIVE</span>
          <span className="nav-section-label" style={{ padding: 0 }}>Image extraction sources</span>
        </div>
        <div className="col" style={{ gap: 8, marginBottom: 18 }}>
          <OptionRow
            checked={form.extract_embedded_images}
            onToggle={(v) => update("extract_embedded_images", v)}
            title="Embedded images from documents"
            desc="Docling extracts inline PNG/JPG from .docx + .pdf; python-pptx pulls picture shapes from .pptx. Uses source-provided alt_text when present."
            badge="Primary source"
          />
          <OptionRow
            checked={form.slide_screenshots}
            onToggle={(v) => update("slide_screenshots", v)}
            title="Whole-slide screenshots for .pptx"
            desc="When a slide is image-heavy or layout-critical, capture the rendered slide as a single screenshot bound to that slide's chunk."
            tier2
          />
          <OptionRow
            checked={form.render_pdf_pages}
            onToggle={(v) => update("render_pdf_pages", v)}
            title="Render PDF pages as screenshots"
            desc="For PDFs where layout is critical (forms, diagrams), capture each page as a screenshot. Increases Blob storage ~10× per doc."
            tier2
            warn={form.render_pdf_pages ? "Triples ingestion time and Blob storage cost" : null}
          />
        </div>

        {/* ── TIER 2: Captioning ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span className="badge badge-accent">TIER 2 PREVIEW</span>
          <span className="nav-section-label" style={{ padding: 0 }}>Image captioning</span>
          <span className="text-xs muted" style={{ marginLeft: 4 }}>· auto-fills empty alt_text · no vision pipeline in Beta yet</span>
        </div>
        <div className="field" style={{ marginBottom: 18, opacity: 0.85 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { id: "gpt-5.5-vision",  label: "GPT-5.5 Vision",       hint: "Highest quality captions · ~$0.002/img", tier2: true },
              { id: "azure-doc-intel", label: "Azure Doc Intelligence", hint: "Structured (OCR + layout) · ~$0.001/img", tier2: true },
              { id: "off",             label: "Off — source alt_text only",   hint: "Current Beta behaviour · 0 cost", tier2: false, recommended: true },
            ].map((c) => {
              const active = form.captioning_model === c.id;
              return (
                <div key={c.id} onClick={() => update("captioning_model", c.id)}
                     style={{
                       border: `1px solid ${active && !c.tier2 ? "oklch(var(--foreground))" : active && c.tier2 ? "oklch(var(--accent) / 0.5)" : "oklch(var(--border))"}`,
                       background: active && !c.tier2 ? "oklch(var(--muted) / 0.5)" : active && c.tier2 ? "oklch(var(--accent) / 0.06)" : "transparent",
                       padding: "10px 12px", borderRadius: "var(--radius-sm)",
                       cursor: "default",
                       position: "relative",
                     }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{c.label}</span>
                    {active && <IcCheck size={11} className="muted" />}
                    {c.tier2 && <span className="badge badge-accent" style={{ fontSize: 9.5 }}>T2</span>}
                    {c.recommended && <span className="badge badge-success" style={{ fontSize: 9.5 }}>BETA DEFAULT</span>}
                  </div>
                  <div className="text-xs muted" style={{ marginTop: 4, lineHeight: 1.4 }}>{c.hint}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── ACTIVE: Dedup ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span className="badge badge-success"><span className="badge-dot" /> ACTIVE</span>
          <span className="nav-section-label" style={{ padding: 0 }}>Image deduplication</span>
        </div>
        <div className="field" style={{ marginBottom: 18 }}>
          <select className="select" value={form.dedup_strategy} onChange={(e) => update("dedup_strategy", e.target.value)}>
            <option value="sha256">SHA256 content hash · cross-document (active)</option>
            <option value="perceptual" disabled>Perceptual hash · fuzzy match — Tier 2</option>
          </select>
          <div className="hint">
            Same image (byte-for-byte) appearing in N documents → uploaded once to Blob, referenced N× from chunk records. Implemented in <span className="mono">ingestion/screenshots/extractor.py</span>.
          </div>
        </div>

        {/* ── TIER 2: low_value image filter ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span className="badge badge-accent">TIER 2 PREVIEW</span>
          <span className="nav-section-label" style={{ padding: 0 }}>low_value image filter</span>
          <span className="text-xs muted">· auto-skip logos, decorations, page numbers</span>
        </div>
        <div className="field" style={{ marginBottom: 18, opacity: 0.85 }}>
          <label className="label">
            Threshold · <span className="mono text-xs muted">{form.low_value_threshold.toFixed(2)}</span>
          </label>
          <input type="range" min={0} max={1} step={0.05}
                 value={form.low_value_threshold}
                 onChange={(e) => update("low_value_threshold", +e.target.value)}
                 style={{ width: "100%" }} />
          <div className="hint">
            <span className="badge badge-accent" style={{ fontSize: 9.5, marginRight: 4 }}>T2</span>
            Distinct from the chunk-level <span className="mono">low_value_flag</span> already in the codebase (which marks under-floor text chunks). This image-level filter requires a vision classifier — Tier 2.
          </div>
        </div>

        <div className="hr" />

        {/* ── UI-level toggle (not backend config) ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span className="badge badge-info"><IcEye size={9} /> UI BEHAVIOR</span>
          <span className="nav-section-label" style={{ padding: 0 }}>Query-time rendering</span>
        </div>
        <div className="row" style={{ marginBottom: 4, alignItems: "flex-start", gap: 10 }}>
          <span className="switch" data-on={form.return_images_in_chat} onClick={() => update("return_images_in_chat", !form.return_images_in_chat)} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Render inline images in chat answers</div>
            <div className="text-xs muted" style={{ lineHeight: 1.5 }}>
              Backend <span className="mono">/query</span> always returns <span className="mono">embedded_images</span> on citations. This flag is purely a Chat-UI rendering preference — when OFF, screenshots are still extracted + bound + searchable (visible in Document Detail / Image Library), the chat surface just hides them.
            </div>
          </div>
        </div>

        {/* Outcome preview */}
        <div style={{
          marginTop: 16,
          padding: "10px 12px",
          background: "oklch(var(--muted) / 0.5)",
          border: "1px dashed oklch(var(--border-strong))",
          borderRadius: "var(--radius-sm)",
          fontSize: 12.5,
          lineHeight: 1.6,
        }}>
          <b style={{ color: "oklch(var(--foreground))" }}>Expected query behaviour with these settings:</b>{" "}
          A user asks "How do I configure posting definitions for multi-currency journals?" → retrieval returns 5 chunks; 3 carry screenshots from the GL Setup manual; chat answer cites them as <span className="mono">[1][2][3]</span>{" "}
          {form.return_images_in_chat ? "with screenshots rendered inline beneath the relevant paragraphs" : "with screenshots collapsed (text-only mode)"}.
        </div>
      </div>
      <div className="card-footer">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
        <button className="btn btn-primary btn-sm" onClick={onNext}>Continue <IcChevRight size={13} /></button>
      </div>
    </div>
  );
}

function OptionRow({ checked, onToggle, title, desc, badge, warn, tier2 }) {
  return (
    <div onClick={() => onToggle(!checked)}
         style={{
           display: "flex", gap: 12, padding: "12px 14px",
           border: tier2 && checked
             ? "1px solid oklch(var(--accent) / 0.4)"
             : checked
               ? "1px solid oklch(var(--foreground) / 0.4)"
               : "1px solid oklch(var(--border))",
           background: tier2 && checked
             ? "oklch(var(--accent) / 0.05)"
             : checked
               ? "oklch(var(--muted) / 0.5)"
               : "transparent",
           borderRadius: "var(--radius-sm)",
           cursor: "default",
         }}>
      <span className="switch" data-on={checked} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{title}</span>
          {badge && <span className="badge badge-success" style={{ fontSize: 9.5 }}>{badge}</span>}
          {tier2 && <span className="badge badge-accent" style={{ fontSize: 9.5 }}>TIER 2</span>}
        </div>
        <div className="text-xs muted" style={{ marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
        {warn && checked && (
          <div className="text-xs" style={{ marginTop: 4, color: "oklch(var(--warning))", display: "flex", gap: 4, alignItems: "center" }}>
            <IcAlert size={11} /> {warn}
          </div>
        )}
      </div>
    </div>
  );
}

function StepIdentity({ form, update, onNext }) {
  const canContinue = form.name.trim() && form.kb_id.trim();
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">KB identity</h3>
      </div>
      <div className="card-body">
        <div className="field">
          <label className="label">Name</label>
          <input className="input" value={form.name} onChange={(e) => update("name", e.target.value)}
                 placeholder="e.g. Customer Service SOP" />
          <div className="hint">Display name shown to users · editable after creation</div>
        </div>
        <div className="field">
          <label className="label">Description</label>
          <textarea className="input" rows={3} value={form.description} onChange={(e) => update("description", e.target.value)}
                    placeholder="What this KB contains and who uses it…" />
          <div className="hint">Helps members understand scope · editable after creation</div>
        </div>
        <div className="field">
          <div style={{ display: "flex", alignItems: "center" }}>
            <label className="label" style={{ flex: 1, marginBottom: 0 }}>kb_id <IcShield size={11} style={{ verticalAlign: "-2px", marginLeft: 4, color: "oklch(var(--warning))" }} /></label>
            <div className="row">
              <span className="switch" data-on={form.kb_id_auto} onClick={() => update("kb_id_auto", !form.kb_id_auto)} />
              <span className="text-xs muted">Auto-derive from name</span>
            </div>
          </div>
          <input className="input mono" value={form.kb_id} onChange={(e) => update("kb_id", e.target.value)}
                 disabled={form.kb_id_auto}
                 placeholder="customer-service-sop" style={{ marginTop: 6 }} />
          <div className="hint">
            <b style={{ color: "oklch(var(--warning))" }}>Locked after creation.</b>{" "}
            Forms the Azure AI Search index name <span className="mono">ekp-kb-{form.kb_id || "{kb_id}"}-v1</span> and Blob container.
            Must be lowercase, hyphen/underscore only · max 40 chars.
          </div>
        </div>
      </div>
      <div className="card-footer">
        <div className="text-xs muted mono">Step 1 of 4</div>
        <button className="btn btn-primary btn-sm" disabled={!canContinue} onClick={onNext}>
          Continue <IcChevRight size={13} />
        </button>
      </div>
    </div>
  );
}

function StepConfig({ form, update, onBack, onNext }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Indexing configuration</h3>
        <span className="badge badge-warning"><IcShield size={10} /> Locked after creation</span>
      </div>
      <div className="card-body">
        <div className="banner banner-warning" style={{ marginBottom: 16 }}>
          <IcAlert size={14} style={{ color: "oklch(var(--warning))" }} />
          <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.55 }}>
            These choices affect the index schema and embedding vectors. Changing them later requires a <b>full re-index</b> (re-parse + re-embed every document into a new v{`{n+1}`} index).
          </div>
        </div>

        <div className="field">
          <label className="label">Embedding model</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { id: "text-embedding-3-large", label: "embed-3-large", hint: "1024d MRL · best recall · Azure OpenAI", supported: true },
              { id: "text-embedding-3-small", label: "embed-3-small", hint: "1536d · faster + cheaper", supported: false },
            ].map((m) => {
              const active = form.embedding_model === m.id;
              return (
                <div key={m.id} onClick={() => m.supported && update("embedding_model", m.id)}
                     style={{
                       border: `1px solid ${active ? "oklch(var(--foreground) / 0.4)" : "oklch(var(--border))"}`,
                       background: active ? "oklch(var(--muted) / 0.5)" : "transparent",
                       padding: "10px 12px", borderRadius: "var(--radius-sm)",
                       opacity: m.supported ? 1 : 0.55,
                       cursor: "default",
                     }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{m.label}</span>
                    {active && <IcCheck size={11} className="muted" />}
                    {!m.supported && <span className="badge badge-accent">TIER 2</span>}
                  </div>
                  <div className="text-xs muted" style={{ marginTop: 4 }}>{m.hint}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="field">
          <label className="label">Embedding dimension</label>
          <div className="seg" style={{ width: "100%", maxWidth: 320 }}>
            {[768, 1024, 1536, 3072].map((d) => (
              <button key={d} className="seg-btn" data-active={form.embedding_dimension === d}
                      onClick={() => update("embedding_dimension", d)} style={{ flex: 1 }}>
                {d}d
              </button>
            ))}
          </div>
          <div className="hint">MRL truncate · 1024d is W2 baseline (best recall/cost ratio per Q19)</div>
        </div>

        <div className="field">
          <label className="label">Chunk strategy</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { id: "auto",          label: "Auto",          hint: "Detect doc_format → pick layout_aware (docx/pdf) / slide_based (pptx)", supported: true },
              { id: "layout_aware",  label: "Layout-aware",  hint: "Docling · preserves headings, tables, lists, image positions",     supported: true },
              { id: "slide_based",   label: "Slide-based",   hint: "python-pptx · one chunk per slide (recommended for .pptx-heavy KBs)", supported: true },
              { id: "heading_aware", label: "Heading-aware", hint: "Standalone heading-bounded · W3+ deferred (NotImplementedError)",  supported: false },
            ].map((s) => {
              const active = form.chunk_strategy === s.id;
              return (
                <div key={s.id} onClick={() => s.supported && update("chunk_strategy", s.id)}
                     style={{
                       border: `1px solid ${active ? "oklch(var(--foreground) / 0.4)" : "oklch(var(--border))"}`,
                       background: active ? "oklch(var(--muted) / 0.5)" : "transparent",
                       padding: "10px 12px", borderRadius: "var(--radius-sm)",
                       opacity: s.supported ? 1 : 0.55,
                     }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{s.label}</span>
                    {active && <IcCheck size={11} className="muted" />}
                    {!s.supported && <span className="badge badge-muted">N/A</span>}
                  </div>
                  <div className="text-xs muted" style={{ marginTop: 4, lineHeight: 1.45 }}>{s.hint}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="card-footer">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
        <button className="btn btn-primary btn-sm" onClick={onNext}>Continue <IcChevRight size={13} /></button>
      </div>
    </div>
  );
}

function StepDefaults({ form, update, onBack, onNext }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Retrieval defaults</h3>
        <span className="badge badge-success"><IcEdit size={10} /> Editable later</span>
      </div>
      <div className="card-body">
        <div className="banner banner-info" style={{ marginBottom: 16 }}>
          <IcSparkles size={14} style={{ color: "oklch(var(--info))" }} />
          <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.55 }}>
            These are the <b>default</b> per-query parameters. Any chat or retrieval-test call can override them. You can also tune these later from the KB Settings tab — no re-index needed.
          </div>
        </div>

        <div className="field">
          <label className="label">Default top_k (retrieve before rerank) · <span className="mono text-xs">{form.default_top_k}</span></label>
          <input type="range" min={10} max={100} step={5} value={form.default_top_k}
                 onChange={(e) => update("default_top_k", +e.target.value)} style={{ width: "100%" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "oklch(var(--muted-foreground))", fontFamily: "var(--font-mono)", marginTop: 4 }}>
            <span>10 (fast)</span>
            <span>50 (W2 baseline)</span>
            <span>100 (thorough)</span>
          </div>
        </div>

        <div className="field">
          <label className="label">Default rerank_k (final chunks passed to LLM) · <span className="mono text-xs">{form.default_rerank_k}</span></label>
          <input type="range" min={3} max={20} value={form.default_rerank_k}
                 onChange={(e) => update("default_rerank_k", +e.target.value)} style={{ width: "100%" }} />
          <div className="hint">After Cohere reranks the top_k, only the top rerank_k chunks become LLM context. Higher = more grounding but more tokens.</div>
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label className="label">Default reranker</label>
          <select className="select"><option>cohere-v4.0-pro (production lock · ADR-0012)</option></select>
          <div className="hint">Workspace-wide locked per ADR-0012 · per-KB override available in Tier 2</div>
        </div>
      </div>
      <div className="card-footer">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
        <button className="btn btn-primary btn-sm" onClick={onNext}>Continue <IcChevRight size={13} /></button>
      </div>
    </div>
  );
}

function StepReview({ form, onBack, onCreate }) {
  const rows = [
    { k: "Name",          v: form.name || "—",      locked: false },
    { k: "Description",   v: form.description || "—", locked: false },
    { k: "kb_id",          v: form.kb_id || "—",      locked: true, mono: true },
    { k: "Index name",     v: `ekp-kb-${form.kb_id || "{kb_id}"}-v1`, locked: true, mono: true },
    { k: "Blob container", v: `ekp-kb-${form.kb_id || "{kb_id}"}-screenshots`, locked: true, mono: true },
    { k: "Embedding model", v: form.embedding_model + ` · ${form.embedding_dimension}d`, locked: true, mono: true },
    { k: "Chunk strategy",  v: form.chunk_strategy, locked: true, mono: true },
    { k: "Embedded images",       v: form.extract_embedded_images ? "Extracted (Docling + python-pptx)" : "Disabled", locked: true },
    { k: "Slide screenshots",     v: form.slide_screenshots ? "On (per-slide capture for .pptx)" : "Off", locked: true },
    { k: "PDF page render",       v: form.render_pdf_pages ? "On (page-as-screenshot)" : "Off", locked: true },
    { k: "Captioning model",      v: form.captioning_model === "off" ? "Off (source alt_text only)" : form.captioning_model, locked: true, mono: form.captioning_model !== "off" },
    { k: "low_value threshold",   v: form.low_value_threshold.toFixed(2), locked: true, mono: true },
    { k: "Dedup",                  v: form.dedup_strategy + " (cross-doc)", locked: true, mono: true },
    { k: "Return images in chat", v: form.return_images_in_chat ? "Yes — inline screenshots" : "No — text-only", locked: false },
    { k: "Default top_k",   v: String(form.default_top_k),    locked: false, mono: true },
    { k: "Default rerank_k", v: String(form.default_rerank_k), locked: false, mono: true },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Review & create</h3>
      </div>
      <div className="card-body card-body-tight">
        {rows.map((r, i, arr) => (
          <div key={r.k} style={{ display: "flex", alignItems: "center", padding: "11px 18px", borderBottom: i < arr.length - 1 ? "1px solid oklch(var(--border))" : "none" }}>
            <span style={{ width: 180, fontSize: 12.5, color: "oklch(var(--muted-foreground))" }}>{r.k}</span>
            <span style={{ flex: 1, fontSize: 13, fontFamily: r.mono ? "var(--font-mono)" : "inherit", fontWeight: 500 }}>{r.v}</span>
            {r.locked
              ? <span className="badge badge-warning"><IcShield size={10} /> Locked</span>
              : <span className="badge badge-success"><IcEdit size={10} /> Editable</span>}
          </div>
        ))}
      </div>
      <div className="card-footer">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
        <button className="btn btn-accent" onClick={onCreate}>
          <IcCheck size={14} /> Create KB & provision index
        </button>
      </div>
    </div>
  );
}

window.PageKbNew = PageKbNew;
