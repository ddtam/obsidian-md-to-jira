# TODO

## Outstanding

- **14 failing tests in `src/core/ReverseTranslator.test.ts`** (Jira/Confluence → Markdown). Inherited from upstream, not introduced by this fork — `ReverseTranslator.ts` and its test were last touched by upstream commits `740c974` and `0fa3694`. Mostly rule-ordering bugs: `-strikethrough-` yields `~<sub>strikethrough</sub>~` because the strikethrough rule emits `~~` and the `~subscript~` rule then eats its own output. Also affects `[text|url]`, `[~user]`, `!url|alt=`, table conversion, panel→callout, and the `{info}`/`{warning}`/`{note}`/`{tip}` macros.
- **De-duplicate `basics.ts` and `confluenceBasics.ts`.** They are still near-copies of each other for the leaf renderers. Extract a `sharedBasics.ts` taking a `flavor: 'jira' | 'confluence'` option, leaving both as thin adapters with unchanged exported signatures (so `Translator.ts` and `ConfluenceTranslator.ts` need no changes). The golden fixtures must not move at all — if they do, the extraction is wrong. Also worth folding in: the metadata prelude is duplicated three times (`Translator.ts` twice, `ConfluenceTranslator.ts` once) and could be a `renderMetadataBlock()` export from `frontmatter.ts`; and Confluence's inlined `fence` renderer should call `renderCodeBlock` so it honours `codeBlockStyle` like Jira does.
- **Inline code containing braces renders badly.** `` `{panel}` `` becomes `{{{panel}}}`, which Jira mis-parses. Only bites notes that document Jira markup inside Obsidian, so low priority.
- **Nested block spacing is unmodelled.** `blockSpacing` deliberately handles top-level blocks only; paragraphs inside list items and blockquotes keep the original ad-hoc arithmetic behind a `level > 0` guard in `paragraph_close`. Fine today, but a recursive per-container model would be the honest fix if nested spacing bugs turn up.

## Done (1.0.1-plus.4)

- Single source of truth for inter-block spacing — `src/rules/blockSpacing.ts`. Nine independent emitters using three different blank-line formulas replaced by one `computeSeparator`. The `table_close` heading-lookahead hack is gone.
- Standard settled: headings own their leading space, and any boundary emits at most one forced break. Fixes heading-then-table `\\` doubling structurally.
- The three explicit-line-break toggles now apply to Confluence output too (they were completely inert there), and there is one default instead of `basics.ts` saying `false` while `DEFAULT_SETTINGS` said `true`.
- Tables are always rectangular: empty cells print as `| |` instead of collapsing into `||` (a Jira *header* cell marker), and rows wider than the header keep their cells via `src/utils/tableNormalize.ts` instead of being truncated during block parsing.
- Callout bodies no longer leak into a `{quote}` outside the `{panel}` — a bare `>` blank line used to end the block early. Bodies are inline-parsed now, so bold, links, wiki links and mentions work inside a callout.
- Callouts are separated from surrounding content by a blank line.
- `hardbreak` no longer emits a raw `<br>`; `{panel:|title=X}` no longer carries a stray empty parameter; the last paragraph in a blockquote no longer pushes a blank line before the closing `{quote}`; dead `md.renderer.rules.inline` removed from both rule files.
- Golden-file fixtures under `src/__fixtures__/` (`npm run test:golden`, `npm run test:golden:update`) are now the sole authority on whitespace; the `toContain` unit tests remain coarse semantic checks.
