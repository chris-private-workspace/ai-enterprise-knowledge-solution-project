"""CH-005 prompt content tests — assert Rule 6 + EXAMPLE 3 presence + preserve existing rules.

Per CH-005 spec §4 acceptance criteria item 4 — content-presence assertions
guard against accidental prompt regression (Karpathy §1.3 surgical envelope).
LLM behavior tests would require Azure OpenAI judge calls (expensive,
R8/Azure-key-bound umbrella per ADR-0017) — out of CH-005 dev-test scope.

Per CLAUDE.md §5.6 H6 — Generation pipeline critical module coverage.
"""

from __future__ import annotations

from generation.prompt_builder import REFUSAL_PHRASE, SYSTEM_PROMPT
from generation.query_reformulator import REFORMULATOR_SYSTEM_PROMPT

# ---------------------------------------------------------------------------
# Synthesizer SYSTEM_PROMPT — Rule 6 add + Rules 1-5 preserve per CH-005 (i)
# ---------------------------------------------------------------------------


def test_synthesizer_system_prompt_contains_rule_6_overview_aggregate() -> None:
    """CH-005 (i): Rule 6 instructs partial-synthesize for overview/aggregate queries."""
    assert "6." in SYSTEM_PROMPT
    assert "overview" in SYSTEM_PROMPT.lower()
    assert "aggregate" in SYSTEM_PROMPT.lower()
    assert "show me all" in SYSTEM_PROMPT.lower()


def test_synthesizer_system_prompt_rule_6_partial_coverage_framing() -> None:
    """CH-005 (i) §3.2: 'Based on available documentation:' framing prefix."""
    assert "based on available documentation" in SYSTEM_PROMPT.lower()


def test_synthesizer_system_prompt_rule_6_preserves_refusal_for_off_topic() -> None:
    """CH-005 (i) §3.1: Rule 2 REFUSAL_PHRASE mechanism preserved for completely-off-topic."""
    assert REFUSAL_PHRASE in SYSTEM_PROMPT
    # Rule 6 explicit override: only refuse when COMPLETELY off-topic
    assert "completely off-topic" in SYSTEM_PROMPT.lower()


def test_synthesizer_system_prompt_rules_1_to_5_preserved() -> None:
    """CH-005 surgical envelope: Rules 1-5 preserved exactly (Karpathy §1.3)."""
    # Rule 1 — citation markers
    assert "[chunk-{chunk_id}]" in SYSTEM_PROMPT
    # Rule 2 — refusal phrase
    assert REFUSAL_PHRASE in SYSTEM_PROMPT
    # Rule 3 — direct one-sentence answer + word target
    assert "150 words" in SYSTEM_PROMPT
    # Rule 4 — multi-language
    assert "繁體中文" in SYSTEM_PROMPT
    assert "日本語" in SYSTEM_PROMPT
    # Rule 5 — never fabricate chunk_ids
    assert "Never fabricate chunk_ids" in SYSTEM_PROMPT


def test_synthesizer_system_prompt_ch005_attribution_comment() -> None:
    """CH-005 (i): inline attribution comment for future-self trace."""
    assert "CH-005" in SYSTEM_PROMPT
    assert "R14 mitigation" in SYSTEM_PROMPT


# ---------------------------------------------------------------------------
# F3 Reformulator REFORMULATOR_SYSTEM_PROMPT — EXAMPLE 3 add + 1-2 preserve per CH-005 (iii)
# ---------------------------------------------------------------------------


def test_reformulator_system_prompt_contains_example_3() -> None:
    """CH-005 (iii): EXAMPLE 3 covers integration scenarios pattern."""
    assert "EXAMPLE 3:" in REFORMULATOR_SYSTEM_PROMPT
    assert "show me all the integration scenarios" in REFORMULATOR_SYSTEM_PROMPT


def test_reformulator_system_prompt_example_3_good_variants_domain_vocab() -> None:
    """CH-005 (iii) §3.3: EXAMPLE 3 good variants use domain-specific vocab."""
    # Good variants — domain-specific scenarios
    assert "customer service request submission" in REFORMULATOR_SYSTEM_PROMPT.lower()
    assert "saga-style multi-system orchestration" in REFORMULATOR_SYSTEM_PROMPT.lower()
    assert "event-driven flow service bus" in REFORMULATOR_SYSTEM_PROMPT.lower()


def test_reformulator_system_prompt_example_3_bad_variants_anti_patterns() -> None:
    """CH-005 (iii): EXAMPLE 3 bad variants signal generic-rephrase anti-pattern."""
    assert "all integration scenarios" in REFORMULATOR_SYSTEM_PROMPT.lower()
    assert "every integration pattern" in REFORMULATOR_SYSTEM_PROMPT.lower()


def test_reformulator_system_prompt_examples_1_and_2_preserved() -> None:
    """CH-005 surgical envelope: Examples 1-2 preserved exactly (Karpathy §1.3)."""
    # EXAMPLE 1 — deployment options
    assert "EXAMPLE 1:" in REFORMULATOR_SYSTEM_PROMPT
    assert "what are all the deployment options" in REFORMULATOR_SYSTEM_PROMPT
    assert "containerized deployment Kubernetes" in REFORMULATOR_SYSTEM_PROMPT
    # EXAMPLE 2 — authentication flows
    assert "EXAMPLE 2:" in REFORMULATOR_SYSTEM_PROMPT
    assert "describe the authentication flows" in REFORMULATOR_SYSTEM_PROMPT
    assert "OAuth 2.0 authorization code flow" in REFORMULATOR_SYSTEM_PROMPT


def test_reformulator_system_prompt_decomposition_rule_preserved() -> None:
    """CH-005 surgical envelope: decomposition rule (2) preserved."""
    # Rule 2 — decompose all/every/list into specific instances
    assert "decompose" in REFORMULATOR_SYSTEM_PROMPT.lower()
    assert "SPECIFIC INSTANCES" in REFORMULATOR_SYSTEM_PROMPT


def test_reformulator_system_prompt_json_output_format_preserved() -> None:
    """CH-005 surgical envelope: JSON output contract preserved."""
    assert '{{"variants"' in REFORMULATOR_SYSTEM_PROMPT
    assert "STRICTLY JSON" in REFORMULATOR_SYSTEM_PROMPT
