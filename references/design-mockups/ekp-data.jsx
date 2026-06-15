// ekp-data.jsx — Mock data grounded in the real EKP backend schemas.
// Sources: backend/api/schemas/{kb,query,retrieval_test,observability,eval}.py
// Real-world cohort facts (per W2 Gate 1 baseline + Beta cohort Q7 Resolved):
//   • Drive Manuals — D365 F&O ERP, 100+ docs, R@5 = 0.9722
//   • Beta candidates: RAPO / HR / Customer Service SOP / Sales Playbooks

const MOCK_KBS = [
  {
    kb_id: "drive-manuals",
    name: "Drive Manuals",
    description: "Microsoft D365 F&O ERP user manuals — Drive Project corpus. Word + PDF + PPT mix; primary source for Beta launch.",
    config: {
      embedding_model: "text-embedding-3-large",
      embedding_dimension: 1024,
      chunk_strategy: "layout_aware",
      default_top_k: 50,
      default_rerank_k: 5,
    },
    total_documents: 112,
    total_chunks: 4287,
    total_screenshots: 318,
    failed_documents: [
      { doc_id: "doc_9f3a", error: "PPTX layout extraction failed — slide 47 contains nested SmartArt", failed_at: "2026-05-12T08:22:41Z" },
      { doc_id: "doc_a118", error: "Source PDF has 0 selectable text layers (scanned image only)", failed_at: "2026-05-12T08:18:09Z" },
    ],
    last_indexed_at: "2026-05-15T22:14:00Z",
    storage_size_mb: 287.4,
    index_name: "ekp-kb-drive-manuals-v1",
    recall_at_5: 0.9722,
    status: "ready",
    owner: "Chris Lai",
    tags: ["ERP", "D365 F&O", "Beta cohort"],
  },
  {
    kb_id: "rapo-internal",
    name: "RAPO 內部知識庫",
    description: "RAPO operating procedures + team playbooks. Includes meeting notes and decision memos from W2-W18 sprints.",
    config: { embedding_model: "text-embedding-3-large", embedding_dimension: 1024, chunk_strategy: "heading_aware", default_top_k: 50, default_rerank_k: 5 },
    total_documents: 64,
    total_chunks: 1843,
    total_screenshots: 24,
    failed_documents: [],
    last_indexed_at: "2026-05-15T11:02:00Z",
    storage_size_mb: 124.7,
    index_name: "ekp-kb-rapo-internal-v1",
    recall_at_5: 0.941,
    status: "ready",
    owner: "Chris Lai",
    tags: ["Internal", "Playbook"],
  },
  {
    kb_id: "hr-manuals",
    name: "HR Internal Manuals",
    description: "Onboarding policy, leave policy, Ricoh-flavored HR forms. Predominantly Word docs with policy tables.",
    config: { embedding_model: "text-embedding-3-large", embedding_dimension: 1024, chunk_strategy: "heading_aware", default_top_k: 50, default_rerank_k: 5 },
    total_documents: 38,
    total_chunks: 921,
    total_screenshots: 8,
    failed_documents: [],
    last_indexed_at: "2026-05-14T16:48:00Z",
    storage_size_mb: 56.2,
    index_name: "ekp-kb-hr-manuals-v1",
    recall_at_5: 0.892,
    status: "ready",
    owner: "Priya Anand",
    tags: ["HR", "Policy"],
  },
  {
    kb_id: "customer-service-sop",
    name: "Customer Service SOP",
    description: "FAQ + troubleshooting trees + customer reply templates for Ricoh service desk.",
    config: { embedding_model: "text-embedding-3-large", embedding_dimension: 1024, chunk_strategy: "auto", default_top_k: 50, default_rerank_k: 5 },
    total_documents: 87,
    total_chunks: 2104,
    total_screenshots: 156,
    failed_documents: [],
    last_indexed_at: "2026-05-15T03:30:00Z",
    storage_size_mb: 178.9,
    index_name: "ekp-kb-customer-service-sop-v1",
    recall_at_5: 0.918,
    status: "indexing",
    indexing_progress: 0.62,
    owner: "Mei-Ling Wu",
    tags: ["Service", "FAQ"],
  },
  {
    kb_id: "sales-playbooks",
    name: "Sales Playbooks",
    description: "Product spec sheets, pricing approval flow, regional sales scripts.",
    config: { embedding_model: "text-embedding-3-large", embedding_dimension: 1024, chunk_strategy: "slide_based", default_top_k: 50, default_rerank_k: 5 },
    total_documents: 29,
    total_chunks: 612,
    total_screenshots: 84,
    failed_documents: [],
    last_indexed_at: "2026-05-13T19:05:00Z",
    storage_size_mb: 92.1,
    index_name: "ekp-kb-sales-playbooks-v1",
    recall_at_5: 0.867,
    status: "ready",
    owner: "Daniel Kim",
    tags: ["Sales", "Pitch deck"],
  },
];

// W77 / ADR-0056 層 A 段③ — per-doc `profile`(W72 profiler 結果,mirror W76 DocProfileInfo:
// profile label / confidence / fallback_applied / 13-signal bundle)。indexed docs 有 profile;
// indexing / failed / queued docs 無(自然 unprofiled,L2 badge 顯示「未分析」)。
const MOCK_DOCUMENTS = [
  { doc_id: "d365_fno_gl_v2.4", title: "D365 F&O — General Ledger Configuration v2.4", source: "SharePoint", file_type: "docx", size_kb: 4218, pages: 87, chunks: 142, screenshots: 18, status: "indexed", indexed_at: "2026-05-15T22:14:00Z", chunk_strategy: "layout_aware", language: "en", profile: { profile: "P1_sop_imgdense", confidence: 0.92, fallback_applied: false, signals: { paragraphs: 138, headings: 34, max_depth: 4, list_items: 82, images: 26, tables: 5, img_density: 0.188, head_density: 0.246, list_ratio: 0.594, tickbox_density: 0, pdf_pages: null, pdf_empty_ratio: null, pdf_avg_chars: null } } },
  { doc_id: "d365_fno_ap_v1.8", title: "Accounts Payable Process Manual v1.8", source: "SharePoint", file_type: "docx", size_kb: 3104, pages: 64, chunks: 98, screenshots: 12, status: "indexed", indexed_at: "2026-05-15T22:11:00Z", chunk_strategy: "layout_aware", language: "en", profile: { profile: "P1_sop_imgdense", confidence: 0.88, fallback_applied: false, signals: { paragraphs: 96, headings: 24, max_depth: 4, list_items: 58, images: 17, tables: 3, img_density: 0.177, head_density: 0.25, list_ratio: 0.604, tickbox_density: 0, pdf_pages: null, pdf_empty_ratio: null, pdf_avg_chars: null } } },
  { doc_id: "d365_fno_proc_v3.1", title: "Procurement Workflow v3.1 — Approval Matrix", source: "SharePoint", file_type: "pdf",  size_kb: 6892, pages: 124, chunks: 187, screenshots: 31, status: "indexed", indexed_at: "2026-05-15T22:08:00Z", chunk_strategy: "layout_aware", language: "en", profile: { profile: "P1_sop_text", confidence: 0.79, fallback_applied: false, signals: { paragraphs: 210, headings: 28, max_depth: 3, list_items: 64, images: 0, tables: 8, img_density: 0, head_density: 0.133, list_ratio: 0.305, tickbox_density: 0, pdf_pages: 124, pdf_empty_ratio: 0.0, pdf_avg_chars: 1980 } } },
  { doc_id: "d365_finance_overview_2026Q1", title: "Finance Module Overview Q1 2026 (Training Deck)", source: "SharePoint", file_type: "pptx", size_kb: 12480, pages: 52, chunks: 52, screenshots: 47, status: "indexed", indexed_at: "2026-05-15T22:03:00Z", chunk_strategy: "slide_based", language: "en", profile: { profile: "P3_slide_imgdense", confidence: 0.95, fallback_applied: false, signals: { paragraphs: 52, headings: 52, max_depth: 1, list_items: 18, images: 47, tables: 2, img_density: 0.904, head_density: 1.0, list_ratio: 0.346, tickbox_density: 0, pdf_pages: null, pdf_empty_ratio: null, pdf_avg_chars: null } } },
  { doc_id: "d365_fno_sc_v2.0", title: "Supply Chain Management — Master Setup v2.0", source: "Drive", file_type: "docx", size_kb: 5821, pages: 102, chunks: 156, screenshots: 24, status: "indexed", indexed_at: "2026-05-15T21:58:00Z", chunk_strategy: "heading_aware", language: "en", profile: { profile: "P1_sop_imgdense", confidence: 0.90, fallback_applied: false, signals: { paragraphs: 142, headings: 36, max_depth: 4, list_items: 88, images: 24, tables: 6, img_density: 0.169, head_density: 0.254, list_ratio: 0.62, tickbox_density: 0, pdf_pages: null, pdf_empty_ratio: null, pdf_avg_chars: null } } },
  { doc_id: "d365_fno_hr_v1.2", title: "HR + Payroll Integration Guide v1.2", source: "SharePoint", file_type: "docx", size_kb: 2842, pages: 58, chunks: 84, screenshots: 6, status: "indexed", indexed_at: "2026-05-15T21:52:00Z", chunk_strategy: "heading_aware", language: "en", profile: { profile: "P1_sop_text", confidence: 0.83, fallback_applied: false, signals: { paragraphs: 88, headings: 18, max_depth: 3, list_items: 28, images: 6, tables: 2, img_density: 0.068, head_density: 0.205, list_ratio: 0.318, tickbox_density: 0, pdf_pages: null, pdf_empty_ratio: null, pdf_avg_chars: null } } },
  { doc_id: "d365_release_notes_2026q1", title: "D365 F&O Release Notes — 2026 Q1 Wave", source: "Drive", file_type: "pdf", size_kb: 1408, pages: 28, chunks: 41, screenshots: 0, status: "indexed", indexed_at: "2026-05-15T21:48:00Z", chunk_strategy: "auto", language: "en", profile: { profile: "P2_prose", confidence: 0.74, fallback_applied: false, signals: { paragraphs: 164, headings: 12, max_depth: 2, list_items: 14, images: 0, tables: 1, img_density: 0, head_density: 0.073, list_ratio: 0.085, tickbox_density: 0, pdf_pages: 28, pdf_empty_ratio: 0.0, pdf_avg_chars: 2400 } } },
  { doc_id: "d365_security_2026", title: "Security & Role Management 2026 Edition", source: "SharePoint", file_type: "pdf", size_kb: 5174, pages: 96, chunks: 124, screenshots: 19, status: "indexed", indexed_at: "2026-05-15T21:40:00Z", chunk_strategy: "layout_aware", language: "en", profile: { profile: "P1_sop_text", confidence: 0.56, fallback_applied: true, signals: { paragraphs: 188, headings: 14, max_depth: 2, list_items: 30, images: 0, tables: 12, img_density: 0, head_density: 0.074, list_ratio: 0.16, tickbox_density: 0.02, pdf_pages: 96, pdf_empty_ratio: 0.0, pdf_avg_chars: 1750 } } },
  { doc_id: "d365_warehousing_v4.0", title: "Warehouse Management Module v4.0 (slides)", source: "SharePoint", file_type: "pptx", size_kb: 9824, pages: 38, chunks: 38, screenshots: 36, status: "indexing", indexing_progress: 0.74, chunk_strategy: "slide_based", language: "en" },
  { doc_id: "doc_9f3a", title: "Advanced Reporting — Power BI Connector Setup", source: "Drive", file_type: "pptx", size_kb: 7102, pages: 47, chunks: 0, screenshots: 0, status: "failed", failed_at: "2026-05-12T08:22:41Z", error: "PPTX layout extraction failed — slide 47 contains nested SmartArt", chunk_strategy: "slide_based", language: "en" },
  { doc_id: "doc_a118", title: "Legacy Vendor Contracts Archive (Scanned)", source: "Drive", file_type: "pdf", size_kb: 18420, pages: 248, chunks: 0, screenshots: 0, status: "failed", failed_at: "2026-05-12T08:18:09Z", error: "Source PDF has 0 selectable text layers (scanned image only)", chunk_strategy: "auto", language: "en" },
  { doc_id: "d365_compliance_v1.1", title: "Compliance & Audit Trails v1.1", source: "SharePoint", file_type: "docx", size_kb: 2208, pages: 42, chunks: 67, screenshots: 4, status: "queued", chunk_strategy: "heading_aware", language: "en" },
];

const MOCK_CHUNKS = [
  { chunk_id: "ch_drive_142_a3", doc_id: "d365_fno_gl_v2.4", doc_title: "D365 F&O — General Ledger Configuration v2.4", chunk_title: "Posting Definitions — Multi-Currency Setup", chunk_index: 42, section_path: ["General Ledger", "Setup", "Posting Definitions", "Multi-Currency"], score: 0.9421, source: "BM25+Vector", rerank_delta: +3, chunk_text_preview: "When configuring posting definitions for multi-currency journals, the **exchange rate type** field must align with the legal entity's accounting currency. Failure to map this field triggers a posting validation error at month-end close. Reference Section 4.3 for the full validation matrix.", embedded_images: 0 },
  { chunk_id: "ch_drive_98_b1",  doc_id: "d365_fno_ap_v1.8", doc_title: "Accounts Payable Process Manual v1.8", chunk_title: "Invoice Three-Way Match — Tolerance Configuration", chunk_index: 18, section_path: ["AP", "Invoice Processing", "Three-Way Match"], score: 0.8907, source: "Vector", rerank_delta: 0, chunk_text_preview: "Three-way match tolerance is defined per-vendor in **Procurement > Setup > Vendor groups**. The default tolerance is ±2% on unit price and ±5% on quantity. Approval routing escalates to the AP supervisor when any line exceeds these bounds.", embedded_images: 1 },
  { chunk_id: "ch_drive_187_c4", doc_id: "d365_fno_proc_v3.1", doc_title: "Procurement Workflow v3.1", chunk_title: "Approval Matrix — Capex vs Opex Thresholds", chunk_index: 64, section_path: ["Procurement", "Approval Workflow", "Matrix"], score: 0.8814, source: "BM25+Vector", rerank_delta: +2, chunk_text_preview: "Capital expenditure (Capex) requests above USD 50,000 require **two-level approval**: department head + finance controller. Operating expenditure (Opex) follows the standard single-approver flow unless it exceeds the monthly cost-center budget.", embedded_images: 0 },
  { chunk_id: "ch_drive_52_d2",  doc_id: "d365_finance_overview_2026Q1", doc_title: "Finance Module Overview Q1 2026", chunk_title: "Slide 17 — Period-End Close Checklist", chunk_index: 17, section_path: ["Finance Overview", "Period-End"], score: 0.8651, source: "Vector", rerank_delta: -1, chunk_text_preview: "Period-end checklist (slide content): 1) Run accruals batch  2) Reconcile sub-ledgers  3) Validate inter-company entries  4) Generate trial balance  5) Lock posting period. Estimated runtime: 45–90 min depending on transaction volume.", embedded_images: 1 },
  { chunk_id: "ch_drive_156_e7", doc_id: "d365_fno_sc_v2.0",  doc_title: "Supply Chain Management — Master Setup v2.0", chunk_title: "Item Master — Storage Dimension Group", chunk_index: 33, section_path: ["SCM", "Item Master", "Dimensions", "Storage"], score: 0.8492, source: "BM25", rerank_delta: +1, chunk_text_preview: "Storage dimension groups govern how inventory is tracked across **site / warehouse / location / pallet / batch**. Once an item posts an inventory transaction, the dimension group is **locked**; changing it requires the inventory-reset utility and an audit log entry.", embedded_images: 0 },
];

// 10-stage Langfuse trace per backend/api/schemas/observability.py + §5.7 +
// ADR-0037 W26 F2 (Parent-Document Retriever stage 08 inserted between Context
// Expander + LLM Synthesis; pre-W26 F2 baseline was 9 stages without stage 08)
const MOCK_TRACE = {
  trace_id: "trace_2026_05_15_a7f4b2c1",
  trace_url: "https://langfuse.ekp-beta.ricoh.com/trace/2026_05_15_a7f4b2c1",
  status: "ok",
  query: "How do I configure multi-currency posting definitions for inter-company journals in D365 F&O?",
  kb_id: "drive-manuals",
  user: "chris.lai@ricoh.com",
  started_at: "2026-05-15T14:32:18.412Z",
  total_latency_ms: 4128,
  total_input_tokens: 8421,
  total_output_tokens: 612,
  total_cost_usd: 0.0287,
  crag_triggered: true,
  crag_iterations: 1,
  model_used: "gpt-5.5",
  reranker_used: "cohere-v4.0-pro",
  stages: [
    { name: "01 Query Preprocessor", type: "SPAN", latency_ms: 24, cost_usd: 0, status: "ok", details: { sanitized_query: "How do I configure multi-currency posting definitions for inter-company journals in D365 F&O?", language: "en", token_count: 18 } },
    { name: "02 Query Rewriter", type: "GENERATION", latency_ms: 412, cost_usd: 0.0008, model: "gpt-5.4-mini", input_tokens: 142, output_tokens: 58, status: "ok", details: { rewrites: ["multi-currency posting definitions inter-company D365", "configure inter-company journal exchange rate D365 F&O"] } },
    { name: "03 Hybrid Retrieval (BM25 + Vector + RRF)", type: "SPAN", latency_ms: 218, cost_usd: 0.0002, status: "ok", details: { bm25_hits: 10, vector_hits: 10, rrf_merged: 14, embed_latency_ms: 84, search_latency_ms: 134 } },
    { name: "04 Reranker", type: "SPAN", latency_ms: 384, cost_usd: 0.0021, status: "ok", details: { reranker: "cohere-v4.0-pro", input_count: 14, output_count: 5, promoted: 2, demoted: 1 } },
    { name: "05 CRAG Confidence Judge", type: "GENERATION", latency_ms: 612, cost_usd: 0.0042, model: "gpt-5.5-pro", input_tokens: 1842, output_tokens: 28, status: "ok", details: { confidence: 0.61, threshold: 0.70, sticky: false, verdict: "RE_RETRIEVE" } },
    { name: "06 Re-retrieve (CRAG L2)", type: "SPAN", latency_ms: 284, cost_usd: 0.0003, status: "ok", details: { strategy: "query_decomposition", new_chunks: 3, replaced: 2, expanded_count: 5 } },
    { name: "07 Context Expander", type: "SPAN", latency_ms: 182, cost_usd: 0.0001, status: "ok", details: { expanded_count: 5, boundary_skip_count: 1, fetch_latency_ms: 142 } },
    { name: "08 Parent-Document Retriever", type: "SPAN", latency_ms: 95, cost_usd: 0, status: "ok", details: { requested_anchors: 1, parents_fetched: 1, siblings_aggregated: 12, truncated_count: 0, skipped_shallow_count: 0, fetch_latency_ms: 85 } },
    { name: "09 LLM Synthesis", type: "GENERATION", latency_ms: 1842, cost_usd: 0.0198, model: "gpt-5.5", input_tokens: 6212, output_tokens: 488, status: "ok", details: { temperature: 0.2, citations_generated: 5, has_refusal_token: false } },
    { name: "10 Final Response", type: "SPAN", latency_ms: 170, cost_usd: 0.0012, status: "ok", details: { embedded_image_count: 2, screenshot_attach_count: 0, citation_validate_passed: 5 } },
  ],
};

// Eval — RAGAs 4 metric per §5.6 + reranker shootout per ADR-0012
const MOCK_EVAL_REPORT = {
  eval_set_id: "drive-eval-v2-2026-05-14",
  eval_set_size: 184,
  recall_at_5: 0.9722,
  faithfulness: 0.9418,
  answer_relevancy: 0.9081,
  context_precision: 0.8821,
  context_recall: 0.9512,
  p95_latency_ms: 4218,
  crag_trigger_rate: 0.18,
  avg_cost_per_query_usd: 0.0312,
  finished_at: "2026-05-14T22:17:00Z",
};

const MOCK_SHOOTOUT = {
  eval_set_id: "drive-eval-v2-2026-05-14",
  started_at: "2026-05-14T20:42:00Z",
  finished_at: "2026-05-14T22:17:00Z",
  winner: "cohere-v4.0-pro",
  rerankers: [
    { reranker: "cohere-v4.0-pro", recall_at_5: 0.9722, faithfulness: 0.9418, answer_relevancy: 0.9081, p95_latency_ms: 4218, avg_cost_per_query_usd: 0.0312, locked: true, locked_reason: "ADR-0012 production lock (W6 D1 reaffirm)" },
    { reranker: "cohere-v3.5",     recall_at_5: 0.9241, faithfulness: 0.8242, answer_relevancy: 0.8312, p95_latency_ms: 4102, avg_cost_per_query_usd: 0.0298, delta: { recall: -4.81, faith: -11.76, relevancy: -7.69 } },
    { reranker: "azure-semantic",  recall_at_5: 0.8714, faithfulness: 0.8118, answer_relevancy: 0.8021, p95_latency_ms: 3812, avg_cost_per_query_usd: 0.0271, delta: { recall: -10.08, faith: -13.00, relevancy: -10.60 } },
    { reranker: "off",             recall_at_5: 0.8126, faithfulness: 0.7842, answer_relevancy: 0.7714, p95_latency_ms: 3402, avg_cost_per_query_usd: 0.0247, baseline: true },
    { reranker: "voyage-rerank-2.5", skipped: true, skip_reason: "DROPPED at W4 per Karpathy §1.2 — Cohere v4.0-pro outranked" },
    { reranker: "zeroentropy-zerank-1", skipped: true, skip_reason: "DROPPED at W4 per Karpathy §1.2" },
  ],
};

const MOCK_FAILED_QUERIES = [
  { query_id: "q_184_017", query: "What is the difference between sub-ledger reconciliation and journal validation?", expected: "Section 5.2 + 5.3, mentions GL reconciliation tool", got: "Generic accounting answer, no D365 specifics", metric_failed: ["faithfulness", "context_precision"] },
  { query_id: "q_184_041", query: "How do I export the audit log for compliance review?", expected: "Compliance > Audit Trails > Export wizard", got: "Refused — confidence below threshold after CRAG", metric_failed: ["recall_at_5"] },
  { query_id: "q_184_088", query: "Can I batch-update vendor payment terms across legal entities?", expected: "AP Setup > Vendor Groups, multi-LE update tool", got: "Partial — missed cross-LE workflow", metric_failed: ["context_recall"] },
];

// Recent queries for Dashboard
const MOCK_RECENT_QUERIES = [
  { id: "q_1", at: "2 min ago", user: "priya.anand", kb: "Drive Manuals",  q: "Configure multi-currency posting definitions for inter-company journals", latency_ms: 4128, cost: 0.0287, crag: true,  trace_id: "trace_2026_05_15_a7f4b2c1" },
  { id: "q_2", at: "4 min ago", user: "daniel.kim",  kb: "Sales Playbooks", q: "What's the approval flow for discount > 15%?", latency_ms: 2841, cost: 0.0194, crag: false, trace_id: "trace_2026_05_15_b9e2a4d8" },
  { id: "q_3", at: "8 min ago", user: "chris.lai",   kb: "Drive Manuals",  q: "Period-end close checklist for fiscal year transition", latency_ms: 3214, cost: 0.0228, crag: false, trace_id: "trace_2026_05_15_c1f3b7e2" },
  { id: "q_4", at: "12 min ago", user: "mei.wu",     kb: "Customer Service SOP", q: "Refund policy for software subscriptions cancelled mid-term?", latency_ms: 5128, cost: 0.0341, crag: true,  trace_id: "trace_2026_05_15_d2a8c4f1" },
  { id: "q_5", at: "21 min ago", user: "priya.anand", kb: "HR Internal Manuals", q: "How many days of parental leave for new parents in Japan office?", latency_ms: 2418, cost: 0.0162, crag: false, trace_id: "trace_2026_05_15_e7b1d2a4" },
];

// Cost rows per backend/observability/realtime_cost.py
const MOCK_COST_SUMMARY = {
  total_projected_daily_usd: 24.18,
  total_projected_monthly_usd: 725.40,
  realtime_total_usd: 21.42,
  realtime_window_hours: 24,
  realtime_status: "ok",
  rows: [
    { service: "Azure OpenAI",  component: "gpt-5.5 synthesis",      projected_daily_usd: 14.20, projected_monthly_usd: 426.00, source: "Langfuse realtime" },
    { service: "Azure OpenAI",  component: "text-embedding-3-large", projected_daily_usd: 2.10,  projected_monthly_usd: 63.00,  source: "Langfuse realtime" },
    { service: "Cohere",         component: "rerank v4.0-pro",        projected_daily_usd: 3.42,  projected_monthly_usd: 102.60, source: "Langfuse realtime" },
    { service: "Azure AI Search",component: "S1 (5 KB indexes)",      projected_daily_usd: 4.46,  projected_monthly_usd: 133.80, source: "Azure billing" },
  ],
  alerts: [
    { name: "P95 latency drift", condition: "p95 > 5s for 10 min", severity: "p2", current: "4.21s", status: "ok" },
    { name: "CRAG trigger rate", condition: "trigger_rate > 0.30", severity: "p3", current: "0.18",  status: "ok" },
    { name: "Daily spend cap",   condition: "spend > USD 30/day",  severity: "p2", current: "$24.18", status: "ok" },
  ],
};

// 9-view nav per ADR-0024 §B (5 flat sidebar modules; settings via avatar menu)
const NAV = [
  { route: "dashboard", label: "Dashboard", icon: "IcHome" },
  { route: "chat",      label: "Chat",      icon: "IcChat", tail: "Cmd↵" },
  { route: "kb",        label: "Knowledge", icon: "IcDatabase", tail: "5" },
  { route: "eval",      label: "Eval",      icon: "IcActivity" },
  { route: "traces",    label: "Traces",    icon: "IcLayers" },
];

// ── Images (per ingestion/screenshots/extractor.py — sha256 dedup, blob URL) ─
// Real shape: { blob_url, alt_text, checksum_sha256, width, height }
// Each image tracks: source doc(s), referencing chunks, doc_order, low_value flag.
const MOCK_IMAGES = [
  {
    sha256: "a8f3c1b9d4e7f2056a89b4c1d2e3f4a8f3c1b9d4e7f2056a89b4c1d2e3f4b1c4",
    blob_url: "https://ekpbeta.blob.core.windows.net/ekp-kb-drive-manuals-screenshots/a8f3c1b9d4e7f2056a89b4c1d2e3f4a8f3c1b9d4e7f2056a89b4c1d2e3f4b1c4.png",
    alt_text: "Posting definitions configuration screen — exchange rate type field highlighted",
    width: 1860, height: 1080, size_kb: 412,
    used_in_docs: ["d365_fno_gl_v2.4"],
    used_in_chunks: ["ch_drive_142_a3"],
    doc_order: 12,
    type: "screenshot",
    low_value: false,
    extracted_at: "2026-05-15T22:14:00Z",
  },
  {
    sha256: "b1d4e7f2056a89b4c1d2e3f4a8f3c1b9d4e7f2056a89b4c1d2e3f4b1c4a8f3c1",
    blob_url: "https://ekpbeta.blob.core.windows.net/ekp-kb-drive-manuals-screenshots/b1d4e7f2056a89b4c1d2e3f4a8f3c1b9d4e7f2056a89b4c1d2e3f4b1c4a8f3c1.png",
    alt_text: "Ricoh corporate header logo",
    width: 480, height: 96, size_kb: 24,
    used_in_docs: ["d365_fno_gl_v2.4", "d365_fno_ap_v1.8", "d365_fno_proc_v3.1", "d365_fno_sc_v2.0", "d365_fno_hr_v1.2"],
    used_in_chunks: ["ch_drive_001_logo", "ch_drive_098_logo", "ch_drive_187_logo", "ch_drive_156_logo", "ch_drive_084_logo"],
    doc_order: 0,
    type: "logo",
    low_value: true,
    dedup_savings: "uploaded 1×, referenced 5×",
    extracted_at: "2026-05-15T22:00:00Z",
  },
  {
    sha256: "c1f3b7e2056a89b4c1d2e3f4a8f3c1b9d4e7f2056a89b4c1d2e3f4b1c4a8f3c2",
    blob_url: "https://ekpbeta.blob.core.windows.net/ekp-kb-drive-manuals-screenshots/c1f3b7e2056a89b4c1d2e3f4a8f3c1b9d4e7f2056a89b4c1d2e3f4b1c4a8f3c2.png",
    alt_text: "Three-way match tolerance configuration — Vendor groups screen",
    width: 1920, height: 1140, size_kb: 384,
    used_in_docs: ["d365_fno_ap_v1.8"],
    used_in_chunks: ["ch_drive_98_b1"],
    doc_order: 8,
    type: "screenshot",
    low_value: false,
    extracted_at: "2026-05-15T22:11:00Z",
  },
  {
    sha256: "d2a8c4f1056a89b4c1d2e3f4a8f3c1b9d4e7f2056a89b4c1d2e3f4b1c4a8f3c3",
    blob_url: "https://ekpbeta.blob.core.windows.net/ekp-kb-drive-manuals-screenshots/d2a8c4f1056a89b4c1d2e3f4a8f3c1b9d4e7f2056a89b4c1d2e3f4b1c4a8f3c3.png",
    alt_text: "Approval matrix flowchart — Capex vs Opex thresholds",
    width: 1680, height: 940, size_kb: 268,
    used_in_docs: ["d365_fno_proc_v3.1"],
    used_in_chunks: ["ch_drive_187_c4"],
    doc_order: 16,
    type: "diagram",
    low_value: false,
    extracted_at: "2026-05-15T22:08:00Z",
  },
  {
    sha256: "e7b1d2a4056a89b4c1d2e3f4a8f3c1b9d4e7f2056a89b4c1d2e3f4b1c4a8f3c4",
    blob_url: "https://ekpbeta.blob.core.windows.net/ekp-kb-drive-manuals-screenshots/e7b1d2a4056a89b4c1d2e3f4a8f3c1b9d4e7f2056a89b4c1d2e3f4b1c4a8f3c4.png",
    alt_text: "Period-end close checklist — slide 17 (Finance Overview deck)",
    width: 1920, height: 1080, size_kb: 318,
    used_in_docs: ["d365_finance_overview_2026Q1"],
    used_in_chunks: ["ch_drive_52_d2"],
    doc_order: 17,
    type: "slide",
    low_value: false,
    extracted_at: "2026-05-15T22:03:00Z",
  },
  {
    sha256: "f4a8f3c1056a89b4c1d2e3f4a8f3c1b9d4e7f2056a89b4c1d2e3f4b1c4a8f3c5",
    blob_url: "https://ekpbeta.blob.core.windows.net/ekp-kb-drive-manuals-screenshots/f4a8f3c1056a89b4c1d2e3f4a8f3c1b9d4e7f2056a89b4c1d2e3f4b1c4a8f3c5.png",
    alt_text: "Procurement workflow — approval routing diagram",
    width: 1600, height: 800, size_kb: 184,
    used_in_docs: ["d365_fno_proc_v3.1", "d365_fno_sc_v2.0"],
    used_in_chunks: ["ch_drive_187_d1", "ch_drive_156_a2"],
    doc_order: 22,
    type: "diagram",
    low_value: false,
    dedup_savings: "uploaded 1×, referenced 2×",
    extracted_at: "2026-05-15T21:58:00Z",
  },
  {
    sha256: "1c4a8f3c056a89b4c1d2e3f4a8f3c1b9d4e7f2056a89b4c1d2e3f4b1c4a8f3c6",
    blob_url: "https://ekpbeta.blob.core.windows.net/ekp-kb-drive-manuals-screenshots/1c4a8f3c056a89b4c1d2e3f4a8f3c1b9d4e7f2056a89b4c1d2e3f4b1c4a8f3c6.png",
    alt_text: "Storage dimension group — site/warehouse/location/pallet/batch hierarchy",
    width: 1480, height: 720, size_kb: 142,
    used_in_docs: ["d365_fno_sc_v2.0"],
    used_in_chunks: ["ch_drive_156_e7"],
    doc_order: 28,
    type: "diagram",
    low_value: false,
    extracted_at: "2026-05-15T21:58:00Z",
  },
  {
    sha256: "2a4c8f3c056a89b4c1d2e3f4a8f3c1b9d4e7f2056a89b4c1d2e3f4b1c4a8f3c7",
    blob_url: "https://ekpbeta.blob.core.windows.net/ekp-kb-drive-manuals-screenshots/2a4c8f3c056a89b4c1d2e3f4a8f3c1b9d4e7f2056a89b4c1d2e3f4b1c4a8f3c7.png",
    alt_text: "",
    width: 320, height: 80, size_kb: 18,
    used_in_docs: ["d365_fno_gl_v2.4"],
    used_in_chunks: ["ch_drive_142_decoration"],
    doc_order: 4,
    type: "decoration",
    low_value: true,
    extracted_at: "2026-05-15T22:14:00Z",
  },
];

// ── Document outline / chunks (deeper, for Doc Detail) ──────────────────────
const MOCK_DOC_DETAIL = {
  doc_id: "d365_fno_gl_v2.4",
  title: "D365 F&O — General Ledger Configuration v2.4",
  source: "SharePoint",
  source_url: "https://ricoh.sharepoint.com/sites/D365-Docs/Shared Documents/GL/d365_fno_gl_v2.4.docx",
  file_type: "docx",
  size_kb: 4218,
  pages: 87,
  language: "en",
  chunk_strategy: "layout_aware",
  total_chunks: 142,
  total_images: 18,
  total_tokens: 48214,
  low_value_chunks: 6,
  parse_duration_ms: 7842,
  embed_duration_ms: 4128,
  indexed_at: "2026-05-15T22:14:00Z",
  // Document outline — heading hierarchy from layout_aware chunker
  outline: [
    { level: 1, title: "1. Introduction",                 chunk_count: 4,  page: 1 },
    { level: 1, title: "2. General Ledger Setup",         chunk_count: 18, page: 8 },
    { level: 2, title: "2.1 Legal Entities",             chunk_count: 6,  page: 8 },
    { level: 2, title: "2.2 Chart of Accounts",          chunk_count: 8,  page: 14 },
    { level: 2, title: "2.3 Fiscal Calendars",           chunk_count: 4,  page: 22 },
    { level: 1, title: "3. Currencies & Exchange Rates",  chunk_count: 12, page: 26 },
    { level: 2, title: "3.1 Currency Codes",             chunk_count: 4,  page: 26 },
    { level: 2, title: "3.2 Exchange Rate Types",        chunk_count: 5,  page: 30 },
    { level: 2, title: "3.3 Rate Import Schedules",      chunk_count: 3,  page: 35 },
    { level: 1, title: "4. Posting Definitions",          chunk_count: 22, page: 38 },
    { level: 2, title: "4.1 Posting Rule Engine",        chunk_count: 8,  page: 38 },
    { level: 2, title: "4.2 Multi-Currency Setup",       chunk_count: 9,  page: 48, active: true },
    { level: 2, title: "4.3 Validation Matrix",          chunk_count: 5,  page: 58 },
    { level: 1, title: "5. Inter-Company Journals",       chunk_count: 16, page: 62 },
    { level: 1, title: "6. Period-End Close",             chunk_count: 14, page: 72 },
    { level: 1, title: "7. Audit & Compliance",           chunk_count: 8,  page: 82 },
    { level: 1, title: "Appendix A — Error Reference",    chunk_count: 6,  page: 85 },
  ],
};

// ── Chunking strategy comparison data ───────────────────────────────────────
const MOCK_CHUNKING_COMPARISON = {
  doc_id: "d365_fno_gl_v2.4",
  doc_title: "D365 F&O — General Ledger Configuration v2.4",
  doc_format: "docx",
  doc_tokens: 48214,
  doc_pages: 87,
  doc_images: 18,
  strategies: [
    {
      id: "layout_aware",
      label: "Layout-aware",
      hint: "Docling — preserves headings, tables, lists, image positions",
      supported: true,
      chunks_emitted: 142,
      avg_tokens: 339,
      median_tokens: 312,
      p95_tokens: 612,
      low_value_count: 6,
      images_associated: 18,
      heading_boundary_skip: 4,
      sample_chunks: [
        { title: "4.2 Multi-Currency Setup — Exchange Rate Mapping",  tokens: 312, has_image: true,  preview: "When configuring posting definitions for multi-currency journals, the exchange rate type field must align…" },
        { title: "4.2 Multi-Currency Setup — Validation Errors",      tokens: 286, has_image: false, preview: "Failure to map this field triggers a posting validation error at month-end close…" },
        { title: "4.2 Multi-Currency Setup — Reference Section 4.3",  tokens: 198, has_image: true,  preview: "Reference Section 4.3 for the full validation matrix. Common error codes include POST-VAL-101…" },
      ],
    },
    {
      id: "slide_based",
      label: "Slide-based",
      hint: "python-pptx — one chunk per slide (only applies to .pptx)",
      supported: false,
      skip_reason: "Source doc is .docx — slide_based only applies to .pptx",
      chunks_emitted: 0,
      avg_tokens: 0,
      median_tokens: 0,
      p95_tokens: 0,
      low_value_count: 0,
      images_associated: 0,
    },
    {
      id: "heading_aware",
      label: "Heading-aware",
      hint: "Standalone heading-bounded — W3+ deferred",
      supported: false,
      skip_reason: "NotImplementedError — layout_aware already provides heading-bounded sections (per ingestion/chunker/strategies.py)",
      chunks_emitted: 0,
    },
    {
      id: "auto",
      label: "Auto",
      hint: "Detect doc_format → layout_aware (docx/pdf) / slide_based (pptx)",
      supported: true,
      chunks_emitted: 142,
      avg_tokens: 339,
      median_tokens: 312,
      p95_tokens: 612,
      low_value_count: 6,
      images_associated: 18,
      same_as: "layout_aware",
      sample_chunks: [],
    },
  ],
};

window.MOCK_IMAGES = MOCK_IMAGES;
window.MOCK_DOC_DETAIL = MOCK_DOC_DETAIL;
window.MOCK_CHUNKING_COMPARISON = MOCK_CHUNKING_COMPARISON;
window.MOCK_KBS = MOCK_KBS;

// ── Chat conversation history (Beta+ scope, localStorage per C10 spec) ─────
// Multi-user isolation: each user has private localStorage history; Tier 2
// adds server-side persistence + conversation share via URL.
const MOCK_CONVERSATIONS = [
  {
    id: "conv_a7f4b2c1",
    title: "Multi-currency posting definitions for inter-company journals",
    kb_id: "drive-manuals",
    kb_name: "Drive Manuals",
    last_message_at: "2026-05-15T14:32:18Z",
    message_count: 4,
    starred: true,
    trace_id: "trace_2026_05_15_a7f4b2c1",
    group: "today",
    preview: "How do I configure multi-currency posting definitions for inter-company journals…",
  },
  {
    id: "conv_b9e2a4d8",
    title: "Discount approval flow > 15%",
    kb_id: "sales-playbooks",
    kb_name: "Sales Playbooks",
    last_message_at: "2026-05-15T11:18:00Z",
    message_count: 2,
    starred: false,
    trace_id: "trace_2026_05_15_b9e2a4d8",
    group: "today",
    preview: "What's the approval flow for discount > 15%?",
  },
  {
    id: "conv_c1f3b7e2",
    title: "Period-end close for fiscal year transition",
    kb_id: "drive-manuals",
    kb_name: "Drive Manuals",
    last_message_at: "2026-05-15T09:42:00Z",
    message_count: 6,
    starred: false,
    trace_id: "trace_2026_05_15_c1f3b7e2",
    group: "today",
    preview: "Period-end close checklist for fiscal year transition",
  },
  {
    id: "conv_d2a8c4f1",
    title: "Refund policy for cancelled subscriptions",
    kb_id: "customer-service-sop",
    kb_name: "Customer Service SOP",
    last_message_at: "2026-05-14T22:18:00Z",
    message_count: 3,
    starred: false,
    trace_id: "trace_2026_05_15_d2a8c4f1",
    group: "yesterday",
    preview: "Refund policy for software subscriptions cancelled mid-term?",
  },
  {
    id: "conv_e7b1d2a4",
    title: "Parental leave — Japan office",
    kb_id: "hr-manuals",
    kb_name: "HR Internal Manuals",
    last_message_at: "2026-05-14T15:08:00Z",
    message_count: 2,
    starred: false,
    trace_id: "trace_2026_05_15_e7b1d2a4",
    group: "yesterday",
    preview: "How many days of parental leave for new parents in Japan office?",
  },
  {
    id: "conv_f3c1b7e2",
    title: "Item master storage dimension lockout",
    kb_id: "drive-manuals",
    kb_name: "Drive Manuals",
    last_message_at: "2026-05-13T16:22:00Z",
    message_count: 8,
    starred: true,
    trace_id: "trace_2026_05_15_f3c1b7e2",
    group: "this-week",
    preview: "Item master storage dimension change after first inventory posting",
  },
  {
    id: "conv_a4c8f3c0",
    title: "Vendor 3-way match tolerance configuration",
    kb_id: "drive-manuals",
    kb_name: "Drive Manuals",
    last_message_at: "2026-05-12T13:45:00Z",
    message_count: 5,
    starred: false,
    trace_id: "trace_2026_05_15_a4c8f3c0",
    group: "this-week",
    preview: "Three-way match tolerance configuration per vendor group",
  },
  {
    id: "conv_b1d4e7f2",
    title: "Onboarding policy summary",
    kb_id: "hr-manuals",
    kb_name: "HR Internal Manuals",
    last_message_at: "2026-05-08T10:30:00Z",
    message_count: 4,
    starred: false,
    trace_id: "trace_2026_05_15_b1d4e7f2",
    group: "older",
    preview: "Summarize new-hire onboarding policy",
  },
];

window.MOCK_CONVERSATIONS = MOCK_CONVERSATIONS;
window.MOCK_DOCUMENTS = MOCK_DOCUMENTS;
window.MOCK_CHUNKS = MOCK_CHUNKS;
window.MOCK_TRACE = MOCK_TRACE;
window.MOCK_EVAL_REPORT = MOCK_EVAL_REPORT;
window.MOCK_SHOOTOUT = MOCK_SHOOTOUT;
window.MOCK_FAILED_QUERIES = MOCK_FAILED_QUERIES;
window.MOCK_RECENT_QUERIES = MOCK_RECENT_QUERIES;
window.MOCK_COST_SUMMARY = MOCK_COST_SUMMARY;
window.NAV_ITEMS = NAV;
