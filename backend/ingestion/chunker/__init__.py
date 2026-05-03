"""Chunker package: layout-aware chunking strategies (per architecture.md §3.3).

W2 baseline implements layout_aware (.docx). slide_based + heading_aware are
W3+ scope and raise NotImplementedError until then (per Karpathy §1.2).

- base.py:        ChunkSpec dataclass + Chunker Protocol
- layout_aware.py: heading-aware section split + table-as-chunk + token budget
- strategies.py:   strategy selector based on KbConfig.chunk_strategy
"""
