'use client';

/**
 * Settings → 文件分類規則 tab — W78 / ADR-0056 層 A 段③ frontend 實作.
 *
 * 100% mockup fidelity match against references/design-mockups/ekp-page-settings-tabs.jsx
 * `SettingsDocProfiling` + `ThresholdRow` (per CLAUDE.md §5.7 H7). admin 自行調試指揮中心:
 * profile→preset 映射 + 偵測 threshold。值對齊 backend `ingestion/profile_presets.py` (W73) +
 * W75 section cap=5 + `ingestion/profiler.py` threshold (W72).
 *
 * Static display per W78 plan §4-2: mockup 本身 static (`defaultValue` input + button 無
 * onClick) + backend 無 profile-override / threshold-write endpoint。input 保留 mockup 視覺
 * (uncontrolled, local-only)；「編輯」/「儲存規則」write action disabled + title (write surface
 * 屬段③後續,需 backend write API)。
 */

import { Layers } from 'lucide-react';

// profile→preset 映射 — 值對齊 backend ingestion/profile_presets.py (W73) + W75 section cap=5.
const PRESETS: {
  profile: string;
  id: string;
  cap: number;
  neighbour: string;
  marker: string;
  anchor: string;
  detail: string;
}[] = [
  { profile: 'P1 圖密SOP', id: 'P1_sop_imgdense', cap: 80, neighbour: '開 · 40', marker: '開', anchor: 'section · cap 5', detail: 'detailed' },
  { profile: 'P1 文字SOP', id: 'P1_sop_text', cap: 20, neighbour: '開 · 10', marker: '開', anchor: '—', detail: 'detailed' },
  { profile: 'P2 散文', id: 'P2_prose', cap: 12, neighbour: '關', marker: '關', anchor: '—', detail: 'detailed' },
  { profile: 'P3 圖密簡報', id: 'P3_slide_imgdense', cap: 40, neighbour: '開 · 20', marker: '開', anchor: '—', detail: 'concise' },
  { profile: 'P3 文字簡報', id: 'P3_slide_text', cap: 12, neighbour: '關', marker: '關', anchor: '—', detail: 'concise' },
  { profile: 'P4 掃描', id: 'P4_scan_imgdense', cap: 20, neighbour: '關', marker: '關', anchor: '—', detail: 'concise' },
  { profile: 'P5 表單', id: 'P5_form', cap: 8, neighbour: '關', marker: '關', anchor: '—', detail: 'concise' },
];

export function SettingsDocProfiling() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="banner banner-info">
        <Layers size={15} style={{ color: 'oklch(var(--info))', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13 }}>
            <b>文件分類規則</b> —
            系統 ingest 時用 rule-based profiler(W72)偵測文件 profile,自動套對應 recall preset。
          </div>
          <div className="text-xs muted" style={{ marginTop: 2 }}>
            呢度係自動規則嘅指揮中心:調 profile→preset 映射 + 偵測 threshold · ADR-0056 層 A · LLM 退選用保險
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Profile → preset 映射</h3>
            <div className="card-desc">
              每個偵測 profile 套邊套 recall/render preset。改呢度影響所有新 ingest 文件(現有要 re-index)。
            </div>
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Profile</th>
                  <th className="col-num">圖上限</th>
                  <th>鄰近圖</th>
                  <th>inline marker</th>
                  <th>section 錨定</th>
                  <th>詳細度</th>
                  <th className="col-shrink" />
                </tr>
              </thead>
              <tbody>
                {PRESETS.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="badge badge-muted">
                        <span className="badge-dot" /> {p.profile}
                      </span>
                      <div className="text-xs muted mono">{p.id}</div>
                    </td>
                    <td className="col-num mono">{p.cap}</td>
                    <td className="text-xs">{p.neighbour}</td>
                    <td className="text-xs">{p.marker}</td>
                    <td className="text-xs">{p.anchor}</td>
                    <td>
                      <span className="badge badge-muted">{p.detail}</span>
                    </td>
                    <td className="col-shrink">
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        disabled
                        title="編輯映射為段③後續(需 backend write API)"
                      >
                        編輯
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">偵測 threshold</h3>
            <div className="card-desc">
              調 profiler 分類門檻。低於信心門檻 → fallback 保守 preset + 標「待人手確認」。
            </div>
          </div>
        </div>
        <div className="card-body" style={{ display: 'grid', gap: 12 }}>
          <ThresholdRow
            label="低信心門檻(confidence)"
            value="0.70"
            hint="低於此 → 黃旗 + fallback 保守 preset"
          />
          <ThresholdRow
            label="P1 圖密門檻(img_density)"
            value="0.15"
            hint="≥ 此 + depth≥3 + list_ratio≥0.3 → P1 圖密SOP"
          />
          <ThresholdRow
            label="too_small 段落門檻"
            value="20"
            hint="少於此段落數 → too_small(唔路由,繼承上層)"
          />
        </div>
        <div className="card-footer">
          <div className="text-xs muted">改 threshold 只影響將來 ingest · ADR-0056 D2 rule v3</div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled
            title="儲存規則為段③後續(需 backend write API)"
          >
            儲存規則
          </button>
        </div>
      </div>
    </div>
  );
}

function ThresholdRow({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label className="label">{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input className="input" defaultValue={value} style={{ maxWidth: 110 }} />
        <span className="text-xs muted">{hint}</span>
      </div>
    </div>
  );
}
