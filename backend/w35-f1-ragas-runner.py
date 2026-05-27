"""W35 F1.4 LIVE RAGAs eval runner — invokes POST /eval/run with
eval-set-v0-w25-supplement.yaml + captures EvalReport JSON.

Adapts W34 F1 runner — uses W34 F1 baseline (faith 0.9836 / correctness 0.7669 /
recall@5 0.8936 / p95 1331ms) for delta comparison + W34 -2pp envelope (0.9637)
as G1 preserve threshold.

Expected runtime: ~10-12 minutes (W34 F1 reference 642s baseline).
"""
from __future__ import annotations

import json
import time
import urllib.request

BACKEND = "http://127.0.0.1:8000"
AUTH = "Bearer dev-token"
EVAL_SET_ID = "eval-set-v0-w25-supplement"
OUTPUT_RAW_JSON = "w35-f1-option-c-raw.json"  # F1.7 Option C re-tighten (Option B saved as w35-f1-option-b-raw.json)


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

    print(f"POST /eval/run eval_set_id={EVAL_SET_ID} - expected runtime ~10-12min")
    print("  (W34 F1 reference 642s baseline)")
    t0 = time.time()
    try:
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
    print("\n=== W35 F1.4 RAGAs eval summary ===")
    metrics = {k: v for k, v in data.items() if k != "failed_queries"}
    print(json.dumps(metrics, indent=2, ensure_ascii=False))

    failed = data.get("failed_queries", []) or []
    print(f"\n=== Failed queries ({len(failed)}) ===")
    for fq in failed:
        if fq.get("query_id", "").startswith("_"):
            continue  # orchestrator notes
        print(f"  {fq.get('query_id', '?'):20s} -> {fq.get('metric_failed')} : {fq.get('got', '')[:80]}")

    # W35 vs W34 F1 baseline comparison + W26 F1 historical reference
    print("\n=== W35 vs W34 F1 baseline ===")
    w34_baseline = {
        "faithfulness": 0.9836,
        "correctness": 0.7669,
        "recall_at_5": 0.8936,
        "p95_latency_ms": 1331,
    }
    print(f"  {'metric':<20s} {'W34 F1':<10s} {'W35':<10s} {'delta_pp':<10s} {'verdict'}")
    for metric, baseline in w34_baseline.items():
        w35_val = data.get(metric, 0.0)
        if isinstance(w35_val, (int, float)) and isinstance(baseline, (int, float)):
            delta_pp = (w35_val - baseline) * 100 if metric != "p95_latency_ms" else (w35_val - baseline)
            verdict = ""
            if metric == "faithfulness":
                # W34 -2pp envelope = 0.9637 preserve threshold
                if w35_val >= 0.9637:
                    verdict = "G1 preserve OK"
                elif w35_val >= 0.9337:
                    verdict = "G1 flag - F1.7 evaluate"
                else:
                    verdict = "G1 break - F1.7 revert"
            print(f"  {metric:<20s} {baseline:<10.4f} {w35_val:<10.4f} {delta_pp:+.2f}      {verdict}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
