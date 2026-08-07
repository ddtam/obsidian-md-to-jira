<h1 align="center">Markdown to Jira Plus</h1>

<div align="center">
  Convert Obsidian notes or selections to Jira/Confluence markup — and back.<br/>
  Fork of <a href="https://github.com/muckmuck96/obsidian-md-to-jira">muckmuck96/obsidian-md-to-jira</a> with extra control over Markdown → Jira output.
</div>

---

## Install (via BRAT)

This plugin isn't in the official Obsidian community store. Install it with [BRAT](https://github.com/TfTHacker/obsidian42-brat):

1. Install the **BRAT** plugin from the community store.
2. BRAT settings → **Add Beta plugin**.
3. Paste this repo's URL: `https://github.com/ddtam/obsidian-md-to-jira`
4. Enable **Markdown to Jira Plus** in Settings → Community plugins.

BRAT tracks the latest release here — use its **Check for updates** to pull new changes. The plugin id is `obsidian-md-to-jira-plus`, so it coexists with the upstream `obsidian-md-to-jira` if you have both installed.

## Usage

The note must be in **editor view**. Run these from the command palette:

- **Note to Jira markup (clipboard)** — convert the focused note.
- **Selection to Jira markup (clipboard)** — convert the current selection.
- **Note to Confluence markup (clipboard)** / **Selection to Confluence markup (clipboard)** — same, targeting Confluence.
- **Jira markup (clipboard) to markdown note** / **Confluence markup (clipboard) to markdown note** — convert the other direction.

## Output formatting

This fork adds options under **Settings → Markdown to Jira Plus → Output formatting**:

- **Image embed style** — `!path|thumbnail!` by default (or `|alt=...`, or plain `!path!`).
- **Warning panel** — off by default, so local images no longer emit a yellow `{panel}` warning around the markup (toggleable).
- **Explicit line breaks** — insert `\\` after headings and tables so Jira renders visible whitespace (toggleable per element). Headings own their own leading space, and any boundary emits at most one break, so two toggles applying to the same boundary never double up. These apply to Confluence output too.
- **Code block style** — `{code:lang}` (syntax highlighted) or `{noformat}` (plain) for older Jira instances that don't render `{code}` macros.

Spacing between blocks is decided in one place (`src/rules/blockSpacing.ts`), which reproduces the blank lines from your note and adds the forced breaks. Tables are always rectangular: short rows are padded with empty cells so the pipe count matches, and rows wider than the header keep their extra cells instead of being truncated.

When a conversion includes local images, the preview modal lists them with **Reveal** / **Copy path** / **Open all in folder** — the last stages every image into one temp folder so you can select all and drag them into Jira together.

## Local development

Iterate against a real Obsidian vault before cutting a release:

1. `cp .env.local.example .env.local`, then set `OBSIDIAN_VAULT=/absolute/path/to/your/vault`.
2. `npm run dev` — esbuild writes `main.js`, `manifest.json`, and `styles.css` straight into `<vault>/.obsidian/plugins/obsidian-md-to-jira-plus/` and rebuilds on every save.
3. Enable **Markdown to Jira Plus** in that vault, then reload (Ctrl/Cmd-R) after each change.

If `OBSIDIAN_VAULT` is unset, `npm run dev` writes the artifacts to the repo root instead.

## Releasing (maintainers)

```sh
# Bump manifest + versions, build, commit, push, and create the GitHub release
npm run brat:release -- 1.0.1-plus.3

# Or just rebuild + verify artifacts without tagging
npm run brat:build
```

The release script pushes to the `fork` remote (`ddtam/obsidian-md-to-jira`).

## Credits

Built on [muckmuck96/obsidian-md-to-jira](https://github.com/muckmuck96/obsidian-md-to-jira).
