"""W34 F2.2 5-run latency profile measurement — Q-W25-I07 + Q-W25-I01.

Triggers /query 5x I07 + 5x I01 (same pattern as W33 F2 runner). Backend must
be restarted with W34 F2.1 structlog stage timing instrumentation loaded
(synthesizer.py + citation_expansion.py).

Stage timings emitted via structlog `synthesizer_call` event + new
`expand_citations_list_chunks_batch` event — captured via backend stderr
log file (e.g. uvicorn-restart-w34-v2.log.err).

Aggregates per-stage mean latency to determine dominant cost (LLM emit /
prompt token / engine-fetch / mixed) per W33 retro decision tree.
"""
from __future__ import annotations

import json
import time
import urllib.request

BACKEND = "http://127.0.0.1:8000"
AUTH = "Bearer dev-token"

QUERIES = {
    "i07": {
        "query": "show me all the Integration scenarios",
        "kb_id": "sample-document-with-image-1",
    },
    "i01": {
        "query": "what is the high level architecture",
        "kb_id": "sample-document-with-image-1",
    },
}


def run_query(qname: str, run_idx: int) -> dict:
    payload = QUERIES[qname]
    body = json.dumps({"query": payload["query"], "kb_id": payload["kb_id"]}).encode()
    req = urllib.request.Request(
        f"{BACKEND}/query",
        data=body,
        headers={"Content-Type": "application/json", "Authorization": AUTH},
        method="POST",
    )
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode())
    data["_total_latency_s"] = round(time.time() - t0, 3)
    out_path = f"w34-f2-{qname}-run-{run_idx}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return data


def main() -> int:
    try:
        with urllib.request.urlopen(f"{BACKEND}/health", timeout=5) as r:
            print(f"backend /health = {r.status}")
    except Exception as e:
        print(f"FATAL backend not ready: {e}")
        return 1

    all_runs = []
    print("=== Q-W25-I07 (walkthrough cite) — 5 runs back-to-back ===")
    for i in range(1, 6):
        try:
            r = run_query("i07", i)
            cits = r.get("citations", []) or []
            print(f"  Run {i}: {len(cits)} citations, total {r['_total_latency_s']}s")
            all_runs.append({"query": "i07", "run": i, "total_latency_s": r['_total_latency_s'],
                             "citation_count": len(cits)})
        except Exception as e:
            print(f"  Run {i} FAILED: {e}")
            all_runs.append({"query": "i07", "run": i, "error": str(e)})

    print("\n=== Q-W25-I01 (control no-regression) — 5 runs back-to-back ===")
    for i in range(1, 6):
        try:
            r = run_query("i01", i)
            cits = r.get("citations", []) or []
            print(f"  Run {i}: {len(cits)} citations, total {r['_total_latency_s']}s")
            all_runs.append({"query": "i01", "run": i, "total_latency_s": r['_total_latency_s'],
                             "citation_count": len(cits)})
        except Exception as e:
            print(f"  Run {i} FAILED: {e}")
            all_runs.append({"query": "i01", "run": i, "error": str(e)})

    print("\n=== Aggregate ===")
    i07_lat = [r["total_latency_s"] for r in all_runs if r.get("query") == "i07" and "total_latency_s" in r]
    i01_lat = [r["total_latency_s"] for r in all_runs if r.get("query") == "i01" and "total_latency_s" in r]
    print(f"  I07 avg total latency: {sum(i07_lat) / max(len(i07_lat), 1):.2f}s")
    print(f"  I01 avg total latency: {sum(i01_lat) / max(len(i01_lat), 1):.2f}s")
    print(f"\n  W33 baseline I07: 30.4s / I01: 22.4s")
    print(f"  W32 baseline I07: 19.3s / I01: 11.7s")

    with open("w34-f2-aggregate.json", "w", encoding="utf-8") as f:
        json.dump({"runs": all_runs, "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")},
                  f, indent=2, ensure_ascii=False)
    print("\nWrote w34-f2-aggregate.json")
    print("\nStage-level timings:see backend uvicorn-restart-w34-v2.log.err for structlog JSON events:")
    print("  synthesizer_call → synth_overall_latency_ms / synth_prompt_build_latency_ms / synth_llm_completion_latency_ms / synth_expand_citations_latency_ms")
    print("  expand_citations_list_chunks_batch → unique_docs_count / expand_list_chunks_batch_latency_ms")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
