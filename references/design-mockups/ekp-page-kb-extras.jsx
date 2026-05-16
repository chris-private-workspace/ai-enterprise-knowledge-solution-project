// ekp-page-kb-images.jsx — Images tab in KB Detail
// Gallery of all extracted images with SHA256 dedup viz + chunk references.

function TabImages({ kb, onNavigate }) {
  const images = window.MOCK_IMAGES;
  const [filter, setFilter] = useState("all"); // all | screenshot | diagram | slide | logo | low_value
  const [selected, setSelected] = useState(null);

  const counts = {
    all: images.length,
    screenshot: images.filter((i) => i.type === "screenshot").length,
    diagram: images.filter((i) => i.type === "diagram").length,
    slide: images.filter((i) => i.type === "slide").length,
    logo: images.filter((i) => i.type === "logo").length,
    low_value: images.filter((i) => i.low_value).length,
  };
  const filtered = filter === "low_value"
    ? images.filter((i) => i.low_value)
    : filter === "all"
      ? images
      : images.filter((i) => i.type === filter);

  const totalSizeKb = images.reduce((s, i) => s + i.size_kb, 0);
  const dedupSavings = images.filter((i) => i.dedup_savings).length;
  const totalRefs = images.reduce((s, i) => s + i.used_in_chunks.length, 0);

  return (
    <div>
      {/* Stats strip */}
      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
        <div className="stat">
          <div className="stat-label"><IcLayers size={13} /> Extracted images</div>
          <div className="stat-value">{images.length}</div>
          <div className="stat-meta">Across {[...new Set(images.flatMap((i) => i.used_in_docs))].length} documents</div>
        </div>
        <div className="stat">
          <div className="stat-label"><IcShield size={13} /> SHA256 dedup</div>
          <div className="stat-value">{dedupSavings}<span className="stat-unit"> deduped</span></div>
          <div className="stat-meta">Same hash → single Blob; {totalRefs} chunk references total</div>
        </div>
        <div className="stat">
          <div className="stat-label"><IcDatabase size={13} /> Blob storage</div>
          <div className="stat-value">{(totalSizeKb / 1024).toFixed(1)}<span className="stat-unit"> MB</span></div>
          <div className="stat-meta mono">ekp-kb-{kb.kb_id}-screenshots</div>
        </div>
        <div className="stat">
          <div className="stat-label"><IcAlert size={13} /> low_value flagged</div>
          <div className="stat-value">{counts.low_value}</div>
          <div className="stat-meta">Excluded from retrieval — logos, decorations</div>
        </div>
      </div>

      {/* How it works strip */}
      <div className="banner banner-info" style={{ marginBottom: 16 }}>
        <IcSparkles size={15} style={{ color: "oklch(var(--info))" }} />
        <div style={{ flex: 1, lineHeight: 1.5 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>How chunks reference images</div>
          <div className="text-xs muted mono" style={{ marginTop: 2 }}>
            Parser extracts <b style={{ color: "oklch(var(--foreground))" }}>EmbeddedImage{`{sha256, alt_text, doc_order}`}</b> → Extractor adds kb_id/doc_id → Uploader pushes blob with <b style={{ color: "oklch(var(--foreground))" }}>{'{sha256}.{ext}'}</b> path (cross-doc dedup) → Chunker references via <b style={{ color: "oklch(var(--foreground))" }}>embedded_image_positions:["img@{`{doc_order}`}"]</b> → Orchestrator resolves to <b style={{ color: "oklch(var(--foreground))" }}>ImageRef.blob_url</b> in ChunkRecord
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <div className="input-search-wrap" style={{ maxWidth: 320, flex: 1 }}>
          <span className="icon-leading"><IcSearch size={14} /></span>
          <input className="input" placeholder="Search by alt text or SHA256…" />
        </div>
        <div className="seg">
          {[
            { id: "all", label: "All" },
            { id: "screenshot", label: "Screenshots" },
            { id: "diagram", label: "Diagrams" },
            { id: "slide", label: "Slides" },
            { id: "logo", label: "Logos" },
            { id: "low_value", label: "low_value" },
          ].map((f) => (
            <button key={f.id} className="seg-btn" data-active={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label} <span className="text-xs mono" style={{ opacity: 0.6 }}>{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="spacer" />
        <button className="btn btn-secondary btn-sm"><IcDownload size={13} /> Export manifest</button>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {filtered.map((img, i) => (
          <ImageCard key={img.sha256} img={img} idx={i} onClick={() => setSelected(img)} />
        ))}
      </div>

      {selected && <ImageDetailModal img={selected} onClose={() => setSelected(null)} onNavigate={onNavigate} kb={kb} />}
    </div>
  );
}

function ImageCard({ img, idx, onClick }) {
  const colors = ["oklch(var(--accent))", "oklch(0.62 0.13 200)", "oklch(0.65 0.14 145)", "oklch(0.60 0.16 285)", "oklch(0.65 0.18 25)"];
  const c = colors[idx % colors.length];
  const heroBg = `linear-gradient(135deg, ${c.replace(")", " / 0.2)")}, ${c.replace(")", " / 0.05)")})`;

  return (
    <div onClick={onClick}
         style={{
           border: "1px solid oklch(var(--border))",
           borderRadius: "var(--radius-md)",
           overflow: "hidden",
           background: "oklch(var(--card))",
           transition: "border-color 0.15s, box-shadow 0.15s",
           cursor: "default",
         }}
         onMouseEnter={(e) => { e.currentTarget.style.borderColor = "oklch(var(--border-strong))"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}
         onMouseLeave={(e) => { e.currentTarget.style.borderColor = "oklch(var(--border))"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{
        height: 130,
        background: heroBg,
        position: "relative",
        display: "grid", placeItems: "center",
        color: c,
      }}>
        <IcLayers size={28} />
        {img.used_in_docs.length > 1 && (
          <span className="badge badge-success" style={{ position: "absolute", top: 8, left: 8, fontSize: 10.5 }}>
            <span className="badge-dot" /> Dedup ×{img.used_in_docs.length}
          </span>
        )}
        {img.low_value && (
          <span className="badge badge-warning" style={{ position: "absolute", top: 8, right: 8, fontSize: 10.5 }}>low_value</span>
        )}
        <span style={{ position: "absolute", bottom: 6, right: 8, fontFamily: "var(--font-mono)", fontSize: 10, color: "oklch(var(--muted-foreground))", background: "oklch(var(--background) / 0.7)", padding: "1px 5px", borderRadius: 3 }}>
          {img.width}×{img.height}
        </span>
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, height: 36, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {img.alt_text || <span className="muted">(no alt_text)</span>}
        </div>
        <div className="text-xs muted mono" style={{ marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {img.sha256.slice(0, 14)}…
        </div>
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <span className="badge badge-muted" style={{ fontSize: 10 }}>{img.type}</span>
          <span className="text-xs muted" style={{ marginLeft: "auto" }}>{img.used_in_chunks.length} chunk{img.used_in_chunks.length > 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}

function ImageDetailModal({ img, onClose, onNavigate, kb }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 720, maxHeight: "88vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div className="modal-title" style={{ fontSize: 14.5 }}>{img.alt_text || "(no alt_text)"}</div>
              <div className="text-xs muted mono" style={{ marginTop: 4, wordBreak: "break-all" }}>{img.sha256}</div>
            </div>
            <div className="spacer" />
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><IcX size={14} /></button>
          </div>
        </div>
        <div className="modal-body">
          {/* Preview */}
          <div style={{
            height: 260,
            background: "linear-gradient(135deg, oklch(var(--accent) / 0.18), oklch(var(--accent) / 0.04))",
            borderRadius: "var(--radius-md)",
            border: "1px solid oklch(var(--accent) / 0.25)",
            display: "grid", placeItems: "center",
            color: "oklch(var(--accent))",
            marginBottom: 16,
            position: "relative",
          }}>
            <IcLayers size={36} />
            <span className="text-xs mono" style={{ position: "absolute", bottom: 10, right: 14, color: "oklch(var(--muted-foreground))" }}>
              {img.width}×{img.height} · {img.size_kb}KB · doc_order {img.doc_order}
            </span>
          </div>

          {/* Metadata table */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <FieldRow label="Type" value={<span className="badge badge-muted">{img.type}</span>} />
            <FieldRow label="Dimensions" value={`${img.width}×${img.height}px`} mono />
            <FieldRow label="Size" value={`${img.size_kb} KB`} mono />
            <FieldRow label="low_value" value={img.low_value ? <span className="badge badge-warning">flagged</span> : <span className="text-xs muted">false</span>} />
          </div>

          <div className="text-xs muted mono" style={{ marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>blob_url</div>
          <div style={{ padding: "8px 10px", background: "oklch(var(--muted) / 0.4)", border: "1px solid oklch(var(--border))", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-mono)", fontSize: 11, color: "oklch(var(--muted-foreground))", wordBreak: "break-all", lineHeight: 1.5, marginBottom: 14 }}>
            {img.blob_url}
          </div>

          {/* Dedup savings */}
          {img.dedup_savings && (
            <div className="banner banner-success" style={{ marginBottom: 14, padding: "8px 12px" }}>
              <IcCheck size={14} style={{ color: "oklch(var(--success))" }} />
              <div style={{ fontSize: 12.5 }}>
                <b>SHA256 dedup applied</b> — {img.dedup_savings}
              </div>
            </div>
          )}

          {/* Referencing chunks */}
          <div className="text-xs muted mono" style={{ marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Referenced by {img.used_in_chunks.length} chunk{img.used_in_chunks.length > 1 ? "s" : ""}
          </div>
          <div className="col" style={{ gap: 6 }}>
            {img.used_in_chunks.slice(0, 5).map((cid, j) => (
              <div key={cid} style={{
                padding: "8px 10px",
                border: "1px solid oklch(var(--border))",
                borderRadius: "var(--radius-sm)",
                display: "flex", alignItems: "center", gap: 10,
                cursor: "default",
              }}>
                <span className="mono text-xs" style={{ color: "oklch(var(--accent))", flexShrink: 0 }}>{cid}</span>
                <span className="text-xs muted" style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  in <b style={{ color: "oklch(var(--foreground))" }}>{img.used_in_docs[Math.min(j, img.used_in_docs.length - 1)]}</b>
                </span>
                <button className="btn btn-ghost btn-icon btn-xs"><IcChevRight size={12} /></button>
              </div>
            ))}
            {img.used_in_chunks.length > 5 && (
              <div className="text-xs muted" style={{ padding: "4px 10px" }}>+{img.used_in_chunks.length - 5} more references</div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm"><IcEdit size={13} /> Edit alt_text</button>
          <button className="btn btn-secondary btn-sm"><IcDownload size={13} /> Download</button>
          <div className="spacer" />
          {!img.low_value
            ? <button className="btn btn-secondary btn-sm">Mark as low_value</button>
            : <button className="btn btn-secondary btn-sm">Unflag</button>}
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, value, mono }) {
  return (
    <div>
      <div className="text-xs muted mono" style={{ marginBottom: 3, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 13, fontFamily: mono ? "var(--font-mono)" : "inherit", fontWeight: 500 }}>{value}</div>
    </div>
  );
}

// ── Chunking Lab tab ────────────────────────────────────────────────────────
function TabChunkingLab({ kb, onNavigate }) {
  const cmp = window.MOCK_CHUNKING_COMPARISON;
  const [activeStrategy, setActiveStrategy] = useState("layout_aware");
  const [chunkSize, setChunkSize] = useState(800);
  const [overlap, setOverlap] = useState(100);

  return (
    <div>
      <div className="banner banner-info" style={{ marginBottom: 16 }}>
        <IcSparkles size={15} style={{ color: "oklch(var(--info))" }} />
        <div style={{ flex: 1, lineHeight: 1.5 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Preview chunking on a sample document</div>
          <div className="text-xs muted" style={{ marginTop: 2 }}>
            Strategies are picked by <span className="mono">ingestion/chunker/strategies.py</span>. Only <span className="mono">layout_aware</span> and <span className="mono">slide_based</span> are implemented; <span className="mono">heading_aware</span> raises <span className="mono">NotImplementedError</span> (W3+ deferred).
          </div>
        </div>
      </div>

      {/* Sample doc + controls */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Sample document</h3>
              <div className="card-desc">{cmp.doc_title}</div>
            </div>
            <button className="btn btn-secondary btn-sm">Change sample…</button>
          </div>
          <div className="card-body" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <FieldRow label="Format" value={<span className="mono" style={{ textTransform: "uppercase" }}>{cmp.doc_format}</span>} />
            <FieldRow label="Pages"  value={cmp.doc_pages} mono />
            <FieldRow label="Tokens" value={cmp.doc_tokens.toLocaleString()} mono />
            <FieldRow label="Images" value={cmp.doc_images} mono />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Chunking parameters</h3>
          </div>
          <div className="card-body">
            <div className="field" style={{ marginBottom: 12 }}>
              <label className="label">Chunk size (tokens) <span className="text-xs muted mono" style={{ marginLeft: 6 }}>{chunkSize}</span></label>
              <input type="range" min={200} max={1200} step={50} value={chunkSize} onChange={(e) => setChunkSize(+e.target.value)} style={{ width: "100%" }} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label">Overlap <span className="text-xs muted mono" style={{ marginLeft: 6 }}>{overlap}</span></label>
              <input type="range" min={0} max={300} step={10} value={overlap} onChange={(e) => setOverlap(+e.target.value)} style={{ width: "100%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Strategy comparison */}
      <h3 className="card-title" style={{ marginBottom: 10 }}>Strategy comparison</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {cmp.strategies.map((s) => (
          <StrategyCard key={s.id} strategy={s} active={activeStrategy === s.id} onClick={() => s.supported && setActiveStrategy(s.id)} />
        ))}
      </div>

      {/* Sample output */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Output preview · {cmp.strategies.find((s) => s.id === activeStrategy).label}</h3>
            <div className="card-desc">First 3 chunks emitted from § 4.2 Multi-Currency Setup</div>
          </div>
          <button className="btn btn-accent btn-sm"><IcCheck size={13} /> Apply to KB</button>
        </div>
        <div className="card-body card-body-tight">
          {(cmp.strategies.find((s) => s.id === activeStrategy).sample_chunks || []).map((c, i) => (
            <div key={i} style={{ padding: "14px 18px", borderBottom: i < 2 ? "1px solid oklch(var(--border))" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span className="mono text-xs" style={{ background: "oklch(var(--muted))", padding: "1px 6px", borderRadius: 3, fontWeight: 600 }}>#{i + 1}</span>
                <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{c.title}</span>
                {c.has_image && <span className="badge badge-accent"><IcLayers size={10} /> image</span>}
                <span className="text-xs mono muted">{c.tokens} tok</span>
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "oklch(var(--foreground) / 0.85)" }}>{c.preview}</div>
            </div>
          ))}
          {(cmp.strategies.find((s) => s.id === activeStrategy).sample_chunks || []).length === 0 && (
            <div className="empty">
              <div className="empty-icon"><IcAlert size={20} /></div>
              <div className="empty-title">Same output as layout_aware</div>
              <div>Auto strategy picks layout_aware for .docx — see <span className="mono">strategies.py:_resolve_auto</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StrategyCard({ strategy, active, onClick }) {
  return (
    <div onClick={onClick}
         style={{
           border: `1px solid ${active ? "oklch(var(--accent))" : strategy.supported ? "oklch(var(--border))" : "oklch(var(--border))"}`,
           background: active ? "oklch(var(--accent) / 0.05)" : "oklch(var(--card))",
           borderRadius: "var(--radius-md)",
           padding: 14,
           opacity: strategy.supported ? 1 : 0.55,
           cursor: "default",
           transition: "border-color 0.15s, background 0.15s",
         }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{strategy.label}</span>
        {!strategy.supported && <span className="badge badge-muted">N/A</span>}
        {strategy.same_as && <span className="badge badge-muted">= {strategy.same_as}</span>}
      </div>
      <div className="text-xs muted" style={{ marginBottom: 10, lineHeight: 1.4 }}>{strategy.hint}</div>

      {strategy.supported ? (
        <div className="col" style={{ gap: 5, fontFamily: "var(--font-mono)", fontSize: 11 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">chunks_emitted</span>
            <span style={{ fontWeight: 600 }}>{strategy.chunks_emitted}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">avg_tokens</span>
            <span>{strategy.avg_tokens}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">p95_tokens</span>
            <span>{strategy.p95_tokens}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">low_value</span>
            <span style={{ color: "oklch(var(--warning))" }}>{strategy.low_value_count}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">images_assoc</span>
            <span style={{ color: "oklch(var(--accent))" }}>{strategy.images_associated}</span>
          </div>
          {strategy.heading_boundary_skip != null && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="muted">boundary_skip</span>
              <span>{strategy.heading_boundary_skip}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs muted" style={{ lineHeight: 1.5, padding: "8px 0" }}>
          <span style={{ color: "oklch(var(--destructive))", fontWeight: 500 }}>Not available · </span>{strategy.skip_reason}
        </div>
      )}
    </div>
  );
}

window.TabImages = TabImages;
window.TabChunkingLab = TabChunkingLab;
