// ekp-page-doc-detail.jsx — /kb/[id]/doc/[docId]
// Three-pane: outline (left) · chunk list (center) · chunk inspector (right)
// Surfaces the real C01 ingestion pipeline output:
//   parser structure + extracted images + chunk-image association (embedded_image_positions)

function PageDocDetail({ kbId, docId, onNavigate }) {
  const kb = window.MOCK_KBS.find((k) => k.kb_id === kbId) || window.MOCK_KBS[0];
  const doc = window.MOCK_DOC_DETAIL;
  const allImages = window.MOCK_IMAGES.filter((img) => img.used_in_docs.includes(doc.doc_id));
  const [selectedChunk, setSelectedChunk] = useState(0);

  const sampleChunks = [
    { idx: 84, title: "4.2 Multi-Currency Setup — Exchange Rate Mapping", section_path: ["GL Setup", "Posting Definitions", "Multi-Currency"], tokens: 312, has_image: true, image_idx: 0, low_value: false, preview: "When configuring posting definitions for multi-currency journals, the **exchange rate type** field must align with the legal entity's accounting currency. Failure to map this field triggers a posting validation error at month-end close." },
    { idx: 85, title: "4.2 Multi-Currency Setup — Validation Errors", section_path: ["GL Setup", "Posting Definitions", "Multi-Currency"], tokens: 286, has_image: false, low_value: false, preview: "Validation runs at month-end close via the GL period-close batch. Common error codes: POST-VAL-101 (mismatched currency), POST-VAL-204 (missing exchange rate type)…" },
    { idx: 86, title: "4.2 Multi-Currency Setup — Reference Validation Matrix", section_path: ["GL Setup", "Posting Definitions", "Multi-Currency"], tokens: 198, has_image: true, image_idx: 1, low_value: false, preview: "Reference Section 4.3 for the full validation matrix. The matrix is keyed on (source_currency, dest_currency, rate_type) and lists all allowed combinations." },
    { idx: 87, title: "4.3 Validation Matrix — Header", section_path: ["GL Setup", "Posting Definitions", "Validation Matrix"], tokens: 64,  has_image: false, low_value: true, preview: "Section 4.3 — Validation Matrix" },
    { idx: 88, title: "4.3 Validation Matrix — Allowed Combinations", section_path: ["GL Setup", "Posting Definitions", "Validation Matrix"], tokens: 514, has_image: true, image_idx: 0, low_value: false, preview: "The following table lists allowed (source, destination, rate_type) combinations. Inter-company posting requires both legal entities have the rate type explicitly mapped." },
  ];

  const chunk = sampleChunks[selectedChunk];
  const chunkImage = chunk.has_image ? allImages[chunk.image_idx] : null;

  return (
    <div className="content content-wide" style={{ paddingTop: 16, paddingBottom: 16 }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <button className="btn btn-ghost btn-xs btn-ghost-muted" onClick={() => onNavigate("kb")}>
              <IcChevLeft size={12} /> Knowledge
            </button>
            <span className="text-xs muted">·</span>
            <button className="btn btn-ghost btn-xs btn-ghost-muted" onClick={() => onNavigate("kb-detail", { kbId: kb.kb_id })}>
              {kb.name}
            </button>
            <span className="text-xs muted">·</span>
            <span className="text-xs muted mono">{doc.doc_id}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 className="page-title" style={{ fontSize: 19 }}>{doc.title}</h1>
            <span className="badge badge-success"><span className="badge-dot" /> INDEXED</span>
          </div>
          <div className="page-subtitle" style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12.5, fontFamily: "var(--font-mono)", marginTop: 6 }}>
            <span><IcFile size={11} style={{ verticalAlign: "-2px", marginRight: 4 }} />{doc.file_type.toUpperCase()} · {(doc.size_kb / 1024).toFixed(1)} MB · {doc.pages} pp</span>
            <span>· chunk_strategy <b style={{ color: "oklch(var(--foreground))" }}>{doc.chunk_strategy}</b></span>
            <span>· {doc.total_chunks} chunks ({doc.low_value_chunks} low_value)</span>
            <span>· {doc.total_tokens.toLocaleString()} tokens</span>
            <span>· {doc.total_images} embedded images</span>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm"><IcLink size={13} /> Open in SharePoint</button>
          <button className="btn btn-secondary btn-sm"><IcRefresh size={13} /> Re-process</button>
          <button className="btn btn-secondary btn-sm" style={{ color: "oklch(var(--destructive))" }}>
            <IcTrash size={13} /> Delete
          </button>
        </div>
      </div>

      {/* Pipeline stages strip */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)" }}>
            {[
              { label: "Parse",   value: `${doc.parse_duration_ms}ms`, sub: "Docling layout-aware",           icon: IcFile, ok: true },
              { label: "Extract", value: `${doc.total_images} imgs`,    sub: "SHA256 dedup applied",           icon: IcLayers, ok: true },
              { label: "Chunk",   value: `${doc.total_chunks} chunks`,   sub: `${doc.chunk_strategy} strategy`, icon: IcLayers, ok: true },
              { label: "Embed",   value: `${doc.embed_duration_ms}ms`,   sub: "embed-3-large 1024d",            icon: IcZap, ok: true },
              { label: "Index",   value: "upserted",                     sub: kb.index_name,                     icon: IcDatabase, ok: true },
            ].map((s, i) => {
              const Ic = s.icon;
              return (
                <div key={s.label} style={{ padding: "14px 18px", borderRight: i < 4 ? "1px solid oklch(var(--border))" : "none", display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "var(--radius-sm)",
                    background: "oklch(var(--success) / 0.12)",
                    color: "oklch(var(--success))",
                    display: "grid", placeItems: "center", flexShrink: 0,
                  }}><IcCheck size={15} /></div>
                  <div>
                    <div className="text-xs muted mono" style={{ letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, fontFamily: "var(--font-mono)" }}>{s.value}</div>
                    <div className="text-xs muted">{s.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Image strip */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Extracted images <span className="text-xs muted mono" style={{ marginLeft: 6 }}>{allImages.length} total · SHA256 deduplicated</span></h3>
            <div className="card-desc">Each chunk in this doc references images via <span className="mono">embedded_image_positions</span>; orchestrator resolves to <span className="mono">ImageRef.blob_url</span></div>
          </div>
          <button className="btn btn-ghost btn-sm">View all in Image Library →</button>
        </div>
        <div className="card-body" style={{ padding: "14px 18px" }}>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {allImages.map((img, i) => <ImageThumb key={img.sha256} img={img} idx={i} />)}
          </div>
        </div>
      </div>

      {/* 3-pane main */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 380px", gap: 16 }}>
        {/* Left: outline */}
        <div className="card" style={{ alignSelf: "start", position: "sticky", top: 16 }}>
          <div className="card-header" style={{ padding: "10px 14px" }}>
            <div>
              <h3 className="card-title" style={{ fontSize: 12.5 }}>Document outline</h3>
            </div>
          </div>
          <div className="card-body card-body-tight" style={{ maxHeight: 540, overflowY: "auto", padding: "6px 0" }}>
            {doc.outline.map((s, i) => (
              <div key={i} style={{
                padding: `5px ${14}px 5px ${14 + (s.level - 1) * 14}px`,
                fontSize: s.level === 1 ? 12.5 : 12,
                fontWeight: s.level === 1 ? 600 : 450,
                background: s.active ? "oklch(var(--accent) / 0.08)" : "transparent",
                color: s.active ? "oklch(var(--accent))" : "oklch(var(--foreground))",
                borderLeft: s.active ? "2px solid oklch(var(--accent))" : "2px solid transparent",
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "default",
                lineHeight: 1.4,
              }}>
                <span style={{ flex: 1 }}>{s.title}</span>
                <span className="text-xs muted mono">{s.chunk_count}</span>
              </div>
            ))}
          </div>
          <div className="card-footer" style={{ padding: "8px 12px" }}>
            <span className="text-xs muted mono">{doc.outline.length} sections</span>
            <button className="btn btn-ghost btn-xs">Export TOC</button>
          </div>
        </div>

        {/* Center: chunk list */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Chunks · 4.2 Multi-Currency Setup</h3>
              <div className="card-desc">9 chunks in this section · showing 5 around your selection</div>
            </div>
            <div className="row">
              <button className="btn btn-secondary btn-xs"><IcFilter size={12} /> All</button>
              <button className="btn btn-secondary btn-xs"><IcLayers size={12} /> With images</button>
              <button className="btn btn-secondary btn-xs muted">low_value</button>
            </div>
          </div>
          <div className="card-body card-body-tight">
            {sampleChunks.map((c, i) => {
              const img = c.has_image ? allImages[c.image_idx] : null;
              const active = selectedChunk === i;
              return (
                <div key={i}
                     onClick={() => setSelectedChunk(i)}
                     style={{
                       padding: "14px 18px",
                       borderBottom: i < sampleChunks.length - 1 ? "1px solid oklch(var(--border))" : "none",
                       background: active ? "oklch(var(--muted) / 0.5)" : "transparent",
                       borderLeft: active ? "2px solid oklch(var(--accent))" : "2px solid transparent",
                       cursor: "default",
                       opacity: c.low_value ? 0.65 : 1,
                     }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span className="mono text-xs" style={{ background: "oklch(var(--muted))", padding: "1px 6px", borderRadius: 3, fontWeight: 600 }}>#{c.idx}</span>
                    <div className="section-path text-xs" style={{ flex: 1 }}>
                      {c.section_path.map((s, j) => <span key={j}>{s}</span>)}
                    </div>
                    {c.low_value && <span className="badge badge-warning">low_value</span>}
                    {c.has_image && <span className="badge badge-accent"><IcLayers size={10} /> image</span>}
                    <span className="text-xs mono muted">{c.tokens} tok</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{c.title}</div>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.55, color: "oklch(var(--foreground) / 0.85)" }}
                         dangerouslySetInnerHTML={{ __html: c.preview.replace(/\*\*(.+?)\*\*/g, "<mark>$1</mark>") }} />
                    {img && (
                      <div style={{
                        width: 72, height: 50, flexShrink: 0,
                        background: `linear-gradient(135deg, oklch(var(--accent) / 0.15), oklch(var(--accent) / 0.04))`,
                        border: "1px solid oklch(var(--accent) / 0.25)",
                        borderRadius: 4,
                        display: "grid", placeItems: "center",
                        color: "oklch(var(--accent))",
                      }}>
                        <IcLayers size={14} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: chunk inspector */}
        <div className="col" style={{ gap: 16, alignSelf: "start", position: "sticky", top: 16 }}>
          <ChunkInspector chunk={chunk} kb={kb} image={chunkImage} />
        </div>
      </div>
    </div>
  );
}

function ImageThumb({ img, idx, onClick }) {
  const colors = ["oklch(var(--accent))", "oklch(0.62 0.13 200)", "oklch(0.65 0.14 145)", "oklch(0.60 0.16 285)", "oklch(0.65 0.18 25)"];
  const c = colors[idx % colors.length];
  return (
    <div onClick={onClick}
         title={img.alt_text}
         style={{
           flexShrink: 0,
           width: 140,
           border: "1px solid oklch(var(--border))",
           borderRadius: "var(--radius-sm)",
           overflow: "hidden",
           background: "oklch(var(--card))",
           cursor: "default",
         }}>
      <div style={{
        height: 78,
        background: `linear-gradient(135deg, ${c} / 0.18, ${c} / 0.05)`.replace(/oklch\((.+?)\)/g, (_, x) => `oklch(${x.split(" / ")[0]} / 0.18)`),
        backgroundImage: `linear-gradient(135deg, ${c.replace(")", " / 0.2)")}, ${c.replace(")", " / 0.05)")})`,
        display: "grid", placeItems: "center",
        position: "relative",
        color: c,
      }}>
        <IcLayers size={20} />
        {img.low_value && (
          <span className="badge badge-warning" style={{ position: "absolute", top: 4, right: 4, fontSize: 9.5 }}>low_value</span>
        )}
        {img.used_in_docs.length > 1 && (
          <span className="badge badge-success" style={{ position: "absolute", top: 4, left: 4, fontSize: 9.5 }}>
            <span className="badge-dot" /> ×{img.used_in_docs.length}
          </span>
        )}
      </div>
      <div style={{ padding: "6px 8px" }}>
        <div className="text-xs" style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3 }}>
          {img.alt_text || "—"}
        </div>
        <div className="text-xs muted mono" style={{ marginTop: 2 }}>
          {img.width}×{img.height} · {img.size_kb}KB
        </div>
      </div>
    </div>
  );
}

function ChunkInspector({ chunk, kb, image }) {
  const chunkId = `kb-${kb.kb_id}_doc-d365_fno_gl_v2_4_chunk-${String(chunk.idx).padStart(4, "0")}`;
  return (
    <>
      <div className="card">
        <div className="card-header" style={{ padding: "12px 16px" }}>
          <div>
            <h3 className="card-title" style={{ fontSize: 13 }}>Chunk inspector</h3>
            <div className="text-xs muted mono" style={{ marginTop: 2 }}>{chunkId}</div>
          </div>
          <div className="row">
            <button className="btn btn-ghost btn-icon btn-xs"><IcCopy size={12} /></button>
            <button className="btn btn-ghost btn-icon btn-xs"><IcEdit size={12} /></button>
          </div>
        </div>
        <div className="card-body" style={{ padding: 14 }}>
          {/* metadata */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
            <span className="badge badge-muted">chunk_index <b style={{ marginLeft: 2 }}>{chunk.idx}</b></span>
            <span className="badge badge-muted">tokens <b style={{ marginLeft: 2 }}>{chunk.tokens}</b></span>
            {chunk.has_image && <span className="badge badge-accent">embedded_images <b style={{ marginLeft: 2 }}>1</b></span>}
            {chunk.low_value && <span className="badge badge-warning">low_value</span>}
          </div>

          {/* section_path */}
          <div className="text-xs muted mono" style={{ marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>section_path</div>
          <div className="section-path" style={{ fontSize: 12, marginBottom: 12 }}>
            {chunk.section_path.map((s, j) => <span key={j}>{s}</span>)}
          </div>

          {/* prev/next */}
          <div className="text-xs muted mono" style={{ marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>Linked chunks</div>
          <div className="text-xs mono" style={{ marginBottom: 14, color: "oklch(var(--muted-foreground))" }}>
            ← <span style={{ color: "oklch(var(--accent))" }}>chunk-{String(chunk.idx - 1).padStart(4, "0")}</span> · this · <span style={{ color: "oklch(var(--accent))" }}>chunk-{String(chunk.idx + 1).padStart(4, "0")}</span> →
          </div>

          {/* embedded image (if any) */}
          {image && (
            <>
              <div className="text-xs muted mono" style={{ marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Associated image
              </div>
              <div style={{
                border: "1px solid oklch(var(--accent) / 0.25)",
                borderRadius: "var(--radius-sm)",
                background: "oklch(var(--accent) / 0.04)",
                padding: 10,
                marginBottom: 14,
              }}>
                <div style={{
                  height: 110, marginBottom: 8,
                  background: "linear-gradient(135deg, oklch(var(--accent) / 0.18), oklch(var(--accent) / 0.04))",
                  borderRadius: 4,
                  display: "grid", placeItems: "center",
                  color: "oklch(var(--accent))",
                }}>
                  <IcLayers size={24} />
                </div>
                <div className="text-xs" style={{ fontWeight: 500, lineHeight: 1.4 }}>{image.alt_text}</div>
                <div className="text-xs muted mono" style={{ marginTop: 4, wordBreak: "break-all", lineHeight: 1.4 }}>
                  sha256 {image.sha256.slice(0, 12)}…
                </div>
                <div className="text-xs muted mono" style={{ marginTop: 2 }}>
                  {image.width}×{image.height} · doc_order {image.doc_order}
                </div>
              </div>
            </>
          )}

          {/* embedding preview */}
          <div className="text-xs muted mono" style={{ marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Embedding vector <span style={{ fontWeight: 500, color: "oklch(var(--foreground))" }}>1024d</span>
          </div>
          <div style={{
            border: "1px solid oklch(var(--border))",
            borderRadius: "var(--radius-sm)",
            background: "oklch(var(--muted) / 0.4)",
            padding: 10,
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            lineHeight: 1.5,
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            gap: "2px 6px",
            color: "oklch(var(--muted-foreground))",
          }}>
            {[0.024, -0.018, 0.092, 0.144, -0.061, 0.027, -0.084, 0.117,
              0.038, -0.052, 0.071, 0.094, -0.022, 0.013, -0.046, 0.082,
              0.041, -0.029, 0.068, 0.075, -0.034, 0.018, -0.011, 0.063].map((v, i) => (
              <span key={i} style={{ color: v > 0 ? "oklch(var(--accent))" : "oklch(var(--foreground))" }}>
                {v.toFixed(3)}
              </span>
            ))}
            <span style={{ gridColumn: "1 / -1", color: "oklch(var(--muted-foreground))", marginTop: 4 }}>
              …  +1000 more dims  …
            </span>
          </div>
        </div>
        <div className="card-footer" style={{ padding: "8px 14px" }}>
          <div className="text-xs muted mono">embed-3-large · MRL truncate 1024d</div>
          <button className="btn btn-ghost btn-xs">Full JSON →</button>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 14 }}>
          <div className="text-xs muted mono" style={{ marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Chunk text
          </div>
          <div style={{
            background: "oklch(var(--muted) / 0.4)",
            border: "1px solid oklch(var(--border))",
            borderRadius: "var(--radius-sm)",
            padding: "10px 12px",
            fontSize: 12.5,
            lineHeight: 1.6,
            maxHeight: 220,
            overflowY: "auto",
          }}
          dangerouslySetInnerHTML={{ __html: chunk.preview.replace(/\*\*(.+?)\*\*/g, "<mark>$1</mark>") }} />
        </div>
      </div>
    </>
  );
}

window.PageDocDetail = PageDocDetail;
window.ImageThumb = ImageThumb;
