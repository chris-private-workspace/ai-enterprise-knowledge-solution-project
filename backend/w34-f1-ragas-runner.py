"""W34 F1.2 LIVE RAGAs eval runner — invokes POST /eval/run with
eval-set-v0-w25-supplement.yaml + captures EvalReport JSON.

Mirrors W26 F2.20 pattern (file-based payload via curl --data-binary to avoid
shell escape issues). Saves raw JSON + summary table.

Expected runtime: ~8-15 minutes for 13 queries with RAGAs 4-metric judge.
W26 F2.20 reference 492s baseline; W33 prompt + W32 (h') may add overhead per
W33 F2 evidence (~57-91% slower than W32 baseline).
"""
from __future__ import annotations

import json
import sys
import time
import urllib.request

# W36 PC-W35-1 — reconfigure stdout utf-8 防 Windows cp1252 default 撞 unicode print
sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[union-attr]

BACKEND = "http://127.0.0.1:8000"
AUTH = "Bearer dev-token"
EVAL_SET_ID = "eval-set-v0-w25-supplement"
OUTPUT_RAW_JSON = "w34-f1-ragas-eval-raw.json"


def main() -> int:
    # Verify backend ready
    try:
        with urllib.request.urlopen(f"{BACKEND}/health", timeout=5) as r:
            print(f"backend /health = {r.status}")
    except Exception as e:
        print(f"FATAL backend not ready: {e}")
        return 1

    payload = json.dumps({
        "eval_set_id": EVAL_SET_ID,
        "llm_model": "gpt-5.5",
        "reranker": "cohere-v4.0-pro",
        "enable_crag": True,
    }).encode()
    req = urllib.request.Request(
        f"{BACKEND}/eval/run",
        data=payload,
        headers={"Content-Type": "application/json", "Authorization": AUTH},
        method="POST",
    )

    print(f"POST /eval/run eval_set_id={EVAL_SET_ID} — expected runtime ~8-15min")
    print(f"  (W26 F2.20 reference 492s baseline; W33 may add overhead)")
    t0 = time.time()
    try:
        # Long timeout — RAGAs 4-metric on 13 queries via gpt-5.4-mini judge
        with urllib.request.urlopen(req, timeout=1800) as resp:
            raw_bytes = resp.read()
            data = json.loads(raw_bytes.decode())
    except Exception as e:
        elapsed = time.time() - t0
        print(f"\nFATAL eval /run failed after {elapsed:.1f}s: {type(e).__name__}: {e}")
        return 1

    elapsed = time.time() - t0
    print(f"\n/eval/run completed in {elapsed:.1f}s")

    with open(OUTPUT_RAW_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Wrote raw JSON to {OUTPUT_RAW_JSON}")

    # Summary
    print("\n=== W34 F1.2 RAGAs eval summary ===")
    metrics = {k: v for k, v in data.items() if k != "failed_queries"}
    print(json.dumps(metrics, indent=2, ensure_ascii=False))

    failed = data.get("failed_queries", []) or []
    print(f"\n=== Failed queries ({len(failed)}) ===")
    for fq in failed:
        if fq.get("query_id", "").startswith("_"):
            continue  # orchestrator notes
        print(f"  {fq.get('query_id', '?'):20s} -> {fq.get('metric_failed')} : {fq.get('got', '')[:80]}")

    # W26 F1 baseline comparison
    print("\n=== W34 vs W26 F1 baseline ===")
    w26_baseline = {
        "faithfulness": 0.9851,
        "correctness": 0.7416,
        "recall_at_5": 0.8744,
        "p95_latency_ms": 1001,
    }
    print(f"  {'metric':<20s} {'W26 F1':<10s} {'W34':<10s} {'delta_pp':<10s} {'verdict'}")
    for metric, baseline in w26_baseline.items():
        w34_val = data.get(metric, 0.0)
        if isinstance(w34_val, (int, float)) and isinstance(baseline, (int, float)):
            delta_pp = (w34_val - baseline) * 100 if metric != "p95_latency_ms" else (w34_val - baseline)
            verdict = ""
            if metric == "faithfulness":
                if w34_val >= 0.9651:
                    verdict = "G1 preserve OK"
                elif w34_val >= 0.9351:
                    verdict = "G1 flag [WARN]"
                else:
                    verdict = "G1 break [ALERT] trigger F1.5"
            print(f"  {metric:<20s} {baseline:<10.4f} {w34_val:<10.4f} {delta_pp:+.2f}      {verdict}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
