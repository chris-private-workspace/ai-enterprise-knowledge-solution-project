"""Ingestion pipeline package (per architecture.md §3.3 + components/C01-ingestion.md).

Pipeline flow: parse -> chunk -> screenshot extract/upload -> embed -> emit ChunkRecord.
W2 implementation order: F1 parsers -> F2 chunker -> F3 screenshots -> F4 embedding -> F5 orchestrator.
"""
