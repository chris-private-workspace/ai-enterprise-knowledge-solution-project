"""Eval framework package (per architecture.md §6.3 + components/C06-eval.md).

W2 baseline:
- runner.py — load eval-set YAML + invoke RetrievalEngine + compute Recall@5
- gates.py — Gate 1 R@5 ≥ 80% threshold logic per architecture.md §6.3 hard gate

W3+ adds RAGAs full 4-metric runner + LLM judge (gpt-5.4-mini) + W4 reranker shootout.
"""
