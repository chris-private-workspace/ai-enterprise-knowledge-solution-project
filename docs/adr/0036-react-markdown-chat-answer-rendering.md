# ADR-0036: react-markdown for chat answer markdown rendering

**Date**: 2026-05-24
**Status**: Accepted
**Approver**: Chris(chat AskUserQuestion 2026-05-24 W25 D2 BUG-021 — picked Recommended「react-markdown new dep」 over 「inline regex transform」+ 「keep plain text」alternatives)

## Context

W25 D2 user-eye verify on chat dialogue post BUG-019 + BUG-020 fixes surfaced 4 mockup-fidelity gaps,其中 Issue #2 = backend synthesizer emit markdown(numbered lists `1. ...` + 可能 `**bold**` / heading markers)但 frontend `<MessageRow>` render answer text `whiteSpace: 'pre-wrap'` 純 plain text。User feedback:「沒有加格式, 例如粗體之類的變化, 提高閱讀的容易度, 像mockup一樣的更佳的格式效果」。Mockup `references/design-mockups/ekp-page-chat.jsx` AnswerBody(line 442-500)用 `<p>` + `<ol>` + `<b>` + `<CodeChip>` structured elements — implies LLM synthesis output 應該 markdown-rendered to match。

Frontend stack(per `docs/architecture.md §3.2` vendor lock H2):Next.js 14 + shadcn/ui + Tailwind + TypeScript strict。冇現成 markdown renderer。

Triggered CLAUDE.md §5.2 H2 Vendor / Dependency Constraint(adding NEW non-utility dep)→ STOP+ask before add → User AskUserQuestion 2026-05-24 W25 D2 picked Recommended option。

## Decision

Add `react-markdown` as new frontend dependency for `<MessageRow>` answer body markdown rendering。

- **Package**:`react-markdown@^9.x`(current stable line)
- **Install**:`pnpm add react-markdown`(npm registry,non-binary,no R8 corp proxy mitigation needed per W17 F6 precedent — same path as react-hook-form / zod W24b F1)
- **Usage shape**:`<ReactMarkdown>{message.content}</ReactMarkdown>` 包住 answer body div content;default GFM-subset 已足夠 cover backend LLM 常見 emit(bold / italic / numbered list / bullet / inline code)
- **No remark-gfm extension** initially:LLM 暫時冇 emit table / strikethrough / task list 等 GFM-exclusive feature;Karpathy §1.2 simplicity — 只加 base renderer;若 future LLM prompt amend 引入 GFM-only feature 再 amendment
- **No raw HTML / sanitization config**:默認 `react-markdown@9.x` disable raw HTML rendering(security-by-default;XSS not possible from LLM output);無需 `rehype-sanitize` 等 plugin

## Alternatives Considered

### Alt-1:Inline regex transform helper(zero new dep)

**Rejected**。手寫 regex 處理 `**bold**` / `*italic*` / `\n\d+\. ` numbered list / `\n- ` bullet 等 patterns。

- Pros:zero new dependency;符合 Karpathy §1.2 "minimum code"
- Cons:
  - 覆蓋唔到全部 markdown syntax(LLM 可能 emit code block / heading / nested list 等)
  - Maintain burden 隨 LLM prompt evolution 上升
  - 多個 corner case 已知會掉(escape sequence / 連續 newlines / mixed inline+block)
  - Re-implement well-known wheel against mature library(react-markdown 已 10+ years battle-tested)

Karpathy §1.2 simplicity 同 maintenance burden trade-off — 50KB minified gzipped dep 比 hand-rolled regex 嘅 long-term cost 低。

### Alt-2:Keep plain text + backend prompt amendment to discourage markdown

**Rejected**。Backend synthesizer prompt 加 instruction「emit plain prose without markdown formatting」。

- Pros:zero frontend dep change;backend prompt-only fix
- Cons:
  - LLM 嘅 numbered/bulleted list 係 *核心* output structure(reasoning answer naturally enumerated steps)— forcing plain prose 降低 answer readability
  - Mockup design intent(line 442-500 `<ol>` + `<b>` + `<CodeChip>`)expects formatted output
  - Prompt engineering 處理 markdown suppression 通常 fragile(LLM 隨時 backslide)
  - 違反 H7 mockup design intent

User explicit framing 同 mockup intent 都指向 formatted output is the goal — backend prompt downgrade 違反呢個 goal。

### Alt-3:Custom MDX-style renderer(more flexibility)

**Rejected**。Roll own MDX-light parser using `mdast` + custom JSX components。

- Pros:full control over rendered components
- Cons:
  - Over-engineered for current need(只 render LLM synthesis output 嘅 markdown subset)
  - Build 自己解析器 = 重新發明 react-markdown 本身
  - 額外 maintenance burden 同 testing surface

Karpathy §1.1 think-before-coding + §1.2 simplicity — `react-markdown` 已足夠 cover Tier 1 scope。

## Consequences

### Positive

- ✅ Mockup-faithful answer formatting:bold / italic / numbered list / bullet / inline code 自動 rendered with proper styling
- ✅ Future-proof:LLM prompt evolution(加 heading / table / nested list 等)無需 frontend change
- ✅ Security-default:`react-markdown@9.x` disable raw HTML embedded markdown — XSS-safe by default(LLM output cannot inject script tags)
- ✅ Well-maintained:react-markdown 係 React ecosystem canonical Markdown renderer;~3M weekly downloads on npm;6 major versions over 10 years;ongoing maintenance
- ✅ Bundle impact 小:~50KB minified gzipped(acceptable cost relative to NextJS app bundle ~300KB+)

### Negative

- ❌ New direct dependency:H2 vendor list 由現有 `frontend/package.json` 增加 1 entry
- ❌ Need ongoing version maintenance(security patches);typical 6-month minor cadence
- ❌ Tree-shaking 唔完美(react-markdown 同 dependencies micromark / remark-parse 一齊拉入 bundle)— ~150KB total transitive,not all 50KB
- ❌ SSR considerations:`<MessageRow>` 已喺 `'use client'` boundary(chat/page.tsx line 1),react-markdown CSR-rendered;not affecting Server Components

### Neutral

- ⚪ 同 W24b F1 react-hook-form + zod + @hookform/resolvers 3 NEW deps install pattern 一致 — `pnpm add` clean,non-binary,no R8 mitigation needed;ADR-0017 no amendment required
- ⚪ Tailwind utility classes 同 react-markdown rendered elements 互通(可以 `<ReactMarkdown components={{ p: (props) => <p className="..." {...props} /> }} />` 自定 styling)— flexibility 未來 use

## References

- `docs/architecture.md §3.2` — Frontend vendor table H2(此 ADR 加新 entry)
- `references/design-mockups/ekp-page-chat.jsx` line 442-500 AnswerBody markdown-rendered intent
- CLAUDE.md §5.2 H2 Vendor / Dependency Constraint(stop-and-ask trigger)
- CLAUDE.md §1.2 Simplicity First(Alt-1 reject rationale)
- `docs/03-implementation/bugs/BUG-021-chat-answer-rendering-batch/` BUG-021 docs
- W24b F1 frontend npm-registry dep install precedent — `react-hook-form` + `zod` + `@hookform/resolvers` clean Plan B (a)
- ADR-0017(R8 corp-proxy mitigation) — npm-registry path NOT R8-affected,no amendment needed
