"""W33 F2 5-run reproducibility verify — Q-W25-I07 + Q-W25-I01 control.

Mirrors W32 F2 pattern (5x I07 walkthrough cite rate + 5x I01 control no-regression).
Generates per-run JSON files for plan §F2.2/F2.3 evidence + aggregates inline.
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
    data["_latency_s"] = round(time.time() - t0, 3)
    out_path = f"w33-f2-{qname}-run-{run_idx}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return data


def summarize_i07(runs: list[dict]) -> dict:
    """Aggregate Q-W25-I07 walkthrough cite metrics per W32 baseline pattern."""
    totals = {"runs": [], "distinct_walkthroughs_avg": 0.0, "cit_count_avg": 0.0,
              "latency_avg": 0.0}
    distinct_sum = 0
    cit_sum = 0
    lat_sum = 0.0
    for i, r in enumerate(runs, 1):
        citations = r.get("citations", []) or []
        [c.get("chunk_id", "") for c in citations]
        # Walkthrough = chunk_title matching §X.M pattern (bare X.M OR §X.M)
        import re
        walkthrough_titles = []
        for c in citations:
            title = c.get("chunk_title", "") or ""
            if re.search(r"\b\d+\.\d+\b", title):
                walkthrough_titles.append(title)
        distinct = len(set(walkthrough_titles))
        totals["runs"].append({
            "run": i,
            "refused": r.get("refused", False),
            "citation_count": len(citations),
            "walkthrough_titles": walkthrough_titles,
            "distinct_walkthroughs": distinct,
            "latency_s": r.get("_latency_s", 0.0),
        })
        distinct_sum += distinct
        cit_sum += len(citations)
        lat_sum += r.get("_latency_s", 0.0)
    n = max(len(runs), 1)
    totals["distinct_walkthroughs_avg"] = round(distinct_sum / n, 2)
    totals["cit_count_avg"] = round(cit_sum / n, 2)
    totals["latency_avg"] = round(lat_sum / n, 2)
    # G1a strict: >= 2 distinct walkthroughs in >= 1 run
    totals["g1a_strict_pass"] = any(r["distinct_walkthroughs"] >= 2 for r in totals["runs"])
    # G1a relaxed: >= 1 walkthrough cited per run for >= 3/5
    totals["g1a_relaxed_count"] = sum(1 for r in totals["runs"] if r["distinct_walkthroughs"] >= 1)
    totals["g1a_relaxed_pass"] = totals["g1a_relaxed_count"] >= 3
    return totals


def summarize_i01(runs: list[dict]) -> dict:
    """G2 control: refusals 0/5 + avg_cit >= 3.5 per plan §3 G2."""
    refusals = sum(1 for r in runs if r.get("refused", False))
    cit_counts = [len(r.get("citations", []) or []) for r in runs]
    lat = [r.get("_latency_s", 0.0) for r in runs]
    return {
        "refusals": refusals,
        "refusal_total": len(runs),
        "cit_count_avg": round(sum(cit_counts) / max(len(cit_counts), 1), 2),
        "cit_count_per_run": cit_counts,
        "latency_avg": round(sum(lat) / max(len(lat), 1), 2),
        "g2_no_regression_pass": refusals == 0 and (sum(cit_counts) / max(len(cit_counts), 1)) >= 3.5,
    }


def main() -> int:
    # Verify backend ready
    try:
        with urllib.request.urlopen(f"{BACKEND}/health", timeout=5) as r:
            print(f"backend /health = {r.status}")
    except Exception as e:
        print(f"FATAL backend not ready: {e}")
        return 1

    i07_runs = []
    print("=== Q-W25-I07 (walkthrough cite rate) — 5 runs back-to-back ===")
    for i in range(1, 6):
        try:
            r = run_query("i07", i)
            cits = r.get("citations", []) or []
            print(f"  Run {i}: {len(cits)} citations, latency {r['_latency_s']}s, "
                  f"refused={r.get('refused', False)}")
            i07_runs.append(r)
        except Exception as e:
            print(f"  Run {i} FAILED: {e}")
            i07_runs.append({"_error": str(e), "_latency_s": 0.0, "citations": []})

    i01_runs = []
    print("\n=== Q-W25-I01 (control no-regression) — 5 runs back-to-back ===")
    for i in range(1, 6):
        try:
            r = run_query("i01", i)
            cits = r.get("citations", []) or []
            print(f"  Run {i}: {len(cits)} citations, latency {r['_latency_s']}s, "
                  f"refused={r.get('refused', False)}")
            i01_runs.append(r)
        except Exception as e:
            print(f"  Run {i} FAILED: {e}")
            i01_runs.append({"_error": str(e), "_latency_s": 0.0, "citations": []})

    print("\n=== AGGREGATE — Q-W25-I07 ===")
    s07 = summarize_i07(i07_runs)
    print(json.dumps(s07, indent=2, ensure_ascii=False))

    print("\n=== AGGREGATE — Q-W25-I01 control ===")
    s01 = summarize_i01(i01_runs)
    print(json.dumps(s01, indent=2, ensure_ascii=False))

    aggregate = {"i07": s07, "i01": s01, "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")}
    with open("w33-f2-aggregate.json", "w", encoding="utf-8") as f:
        json.dump(aggregate, f, indent=2, ensure_ascii=False)
    print("\nWrote w33-f2-aggregate.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
