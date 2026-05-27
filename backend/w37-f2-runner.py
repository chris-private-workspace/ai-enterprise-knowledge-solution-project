"""W37 F2 5-run reproducibility runner — (j') section_path prefix filter test.

Triggers /query 5x Q-W25-I07 + 5x Q-W25-I01 (W35 F2 pattern preserved). Backend
must be restarted with W37 F1 code loaded AND `.env` override
`CITATION_EXPANSION_SECTION_PATH_PREFIX_DEPTH=2` active.

Per W37 plan §3 Phase Gate G1a/G1b/G2:
- G1a MAINTAIN W35+W36 baseline: I07 strict 5/5 cited + refusals 0/5 + avg_cit ≥ 4.8
- G1b NEW cross_section_drift_count avg ≤ 1 (goal) / = 0 across all runs (stretch)
- G2 control I01 non-regression: refusals 0/5 + avg_cit ≥ 3.5

W36 PC-W35-1 — unicode print 修正 already shipped:
- sys.stdout.reconfigure(encoding="utf-8")
- ASCII fallback for math operators (<= >= ->) avoid Windows cp1252 crash
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
    with urllib.request.urlopen(req, timeout=180) as resp:
        data = json.loads(resp.read().decode())
    data["_total_latency_s"] = round(time.time() - t0, 3)
    out_path = f"w37-f2-{qname}-run-{run_idx}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return data


def _section_prefix(section_path: list, depth: int = 2) -> tuple:
    """Return tuple(section_path[:depth]) for hashable comparison."""
    if not isinstance(section_path, list):
        return ()
    return tuple(section_path[:depth])


def analyse_drift(citations: list) -> tuple[int, set]:
    """Compute cross_section_drift_count + unique section prefixes per run.

    Per W37 plan §2 F2.2.d:
    `cross_section_drift_count` = count of citations whose section_path[:2]
    differs from the FIRST citation's section_path[:2]. = 0 ideal, > 0 drift.
    """
    if not citations:
        return 0, set()
    anchor = _section_prefix(citations[0].get("section_path") or [])
    prefixes = {anchor}
    drift = 0
    for c in citations[1:]:
        prefix = _section_prefix(c.get("section_path") or [])
        prefixes.add(prefix)
        if prefix != anchor:
            drift += 1
    return drift, prefixes


def main() -> int:
    try:
        with urllib.request.urlopen(f"{BACKEND}/health", timeout=5) as r:
            print(f"backend /health = {r.status}")
    except Exception as e:
        print(f"FATAL backend not ready: {e}")
        return 1

    all_runs = []
    print("=== Q-W25-I07 (walkthrough cite) - 5 runs back-to-back ===")
    for i in range(1, 6):
        try:
            r = run_query("i07", i)
            cits = r.get("citations", []) or []
            drift, prefixes = analyse_drift(cits)
            print(f"  Run {i}: {len(cits)} citations, drift={drift}, "
                  f"unique_prefixes={len(prefixes)}, total {r['_total_latency_s']}s")
            for c in cits:
                sp = c.get("section_path") or []
                print(f"    - {c.get('chunk_id','')[:50]} | sp={sp}")
            all_runs.append({
                "query": "i07", "run": i,
                "total_latency_s": r['_total_latency_s'],
                "citation_count": len(cits),
                "cross_section_drift_count": drift,
                "unique_section_prefixes": len(prefixes),
            })
        except Exception as e:
            print(f"  Run {i} FAILED: {e}")
            all_runs.append({"query": "i07", "run": i, "error": str(e)})

    print("\n=== Q-W25-I01 (control no-regression) - 5 runs back-to-back ===")
    for i in range(1, 6):
        try:
            r = run_query("i01", i)
            cits = r.get("citations", []) or []
            drift, prefixes = analyse_drift(cits)
            print(f"  Run {i}: {len(cits)} citations, drift={drift}, "
                  f"unique_prefixes={len(prefixes)}, total {r['_total_latency_s']}s")
            for c in cits:
                sp = c.get("section_path") or []
                print(f"    - {c.get('chunk_id','')[:50]} | sp={sp}")
            all_runs.append({
                "query": "i01", "run": i,
                "total_latency_s": r['_total_latency_s'],
                "citation_count": len(cits),
                "cross_section_drift_count": drift,
                "unique_section_prefixes": len(prefixes),
            })
        except Exception as e:
            print(f"  Run {i} FAILED: {e}")
            all_runs.append({"query": "i01", "run": i, "error": str(e)})

    print("\n=== Aggregate ===")
    i07 = [r for r in all_runs if r.get("query") == "i07" and "citation_count" in r]
    i01 = [r for r in all_runs if r.get("query") == "i01" and "citation_count" in r]
    def avg(xs, key):
        vs = [x.get(key, 0) for x in xs]
        return sum(vs) / max(len(vs), 1)
    i07_avg_lat = avg(i07, "total_latency_s")
    i01_avg_lat = avg(i01, "total_latency_s")
    i07_avg_cit = avg(i07, "citation_count")
    i01_avg_cit = avg(i01, "citation_count")
    i07_avg_drift = avg(i07, "cross_section_drift_count")
    i01_avg_drift = avg(i01, "cross_section_drift_count")
    i07_refusals = sum(1 for r in i07 if r.get("citation_count", 0) == 0)
    i01_refusals = sum(1 for r in i01 if r.get("citation_count", 0) == 0)
    print(f"  I07: avg_lat {i07_avg_lat:.2f}s | avg_cit {i07_avg_cit:.1f} | "
          f"avg_drift {i07_avg_drift:.2f} | refusals {i07_refusals}/5")
    print(f"  I01: avg_lat {i01_avg_lat:.2f}s | avg_cit {i01_avg_cit:.1f} | "
          f"avg_drift {i01_avg_drift:.2f} | refusals {i01_refusals}/5")

    print("\n=== vs W35 F1 Option C baseline ===")
    print("  W35 I07 baseline: faith 0.9876 | cit avg 4.8 | refusals 0/5")
    print("  W35 I01 baseline: cit avg 5.4 | refusals 0/5")

    print("\n=== G1a + G1b + G2 decision tree per plan §3 ===")
    g1a_strict = i07_refusals == 0 and i07_avg_cit >= 4.8
    g1b_goal = i07_avg_drift <= 1.0
    g1b_stretch = all(r.get("cross_section_drift_count", 99) == 0 for r in i07)
    g2_control = i01_refusals == 0 and i01_avg_cit >= 3.5
    print(f"  G1a strict (refusals=0 + avg_cit >= 4.8): {'PASS' if g1a_strict else 'FAIL'}")
    print(f"  G1b goal (I07 avg_drift <= 1.0): {'PASS' if g1b_goal else 'FAIL'}")
    print(f"  G1b stretch (I07 drift = 0 across all runs): {'PASS' if g1b_stretch else 'FAIL'}")
    print(f"  G2 control (I01 refusals=0 + avg_cit >= 3.5): {'PASS' if g2_control else 'FAIL'}")

    with open("w37-f2-aggregate.json", "w", encoding="utf-8") as f:
        json.dump({
            "runs": all_runs,
            "i07_avg_latency_s": round(i07_avg_lat, 2),
            "i01_avg_latency_s": round(i01_avg_lat, 2),
            "i07_avg_cit": round(i07_avg_cit, 1),
            "i01_avg_cit": round(i01_avg_cit, 1),
            "i07_avg_drift": round(i07_avg_drift, 2),
            "i01_avg_drift": round(i01_avg_drift, 2),
            "i07_refusals": i07_refusals,
            "i01_refusals": i01_refusals,
            "g1a_strict_pass": g1a_strict,
            "g1b_goal_pass": g1b_goal,
            "g1b_stretch_pass": g1b_stretch,
            "g2_control_pass": g2_control,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "config_under_test": "CITATION_EXPANSION_SECTION_PATH_PREFIX_DEPTH=2",
        }, f, indent=2, ensure_ascii=False)
    print("\nWrote w37-f2-aggregate.json")
    print("\nLangfuse trace events to inspect:")
    print("  - citation_expansion_applied (section_path_prefix_depth field)")
    print("  - citation_expansion_neighbours_found (cited_section_path_prefix + chosen_count fields)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
