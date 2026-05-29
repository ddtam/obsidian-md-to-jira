<h1 align="center">Markdown to Jira Plus</h1>

<div align="center">
  Fork of <a href="https://github.com/muckmuck96/obsidian-md-to-jira">muckmuck96/obsidian-md-to-jira</a> with extra customization for Markdown → Jira conversion.
</div>

---

## Install (via BRAT)

This fork is not in the official Obsidian community plugin store. Install via [BRAT](https://github.com/TfTHacker/obsidian42-brat):

1. Install the **BRAT** plugin from the Obsidian community plugin store.
2. Open BRAT settings and choose **Add Beta plugin**.
3. Paste this fork's URL: `https://github.com/ddtam/obsidian-md-to-jira`
4. Enable **Markdown to Jira Plus** in Settings → Community plugins.

BRAT tracks the latest release on this repo — use BRAT's "Check for updates" to pull new changes.

The fork ships with plugin id `obsidian-md-to-jira-plus`, so it can coexist with the upstream `obsidian-md-to-jira` if you also have it installed.

## Fork changes

- **Image embed style** — `!path|thumbnail!` by default (or `|alt=...` or plain `!path!`)
- **No warning panel by default** — local images no longer emit the yellow `{panel}` warning around the image markup (toggleable in settings)
- **Explicit line breaks** — `\\` inserted after headings and tables so Jira renders visible whitespace (toggleable per-element)
- **Code block style** — choose `{code:lang}` (syntax highlighted) or `{noformat}` (plain preformatted) for older Jira instances that don't render `{code}` macros
- **Local image upload list** — the preview modal lists every local image in the conversion with **Reveal** / **Copy path** / **Open all in folder** buttons, opening automatically whenever local images are present
- **Sync-path bugfix** — URL/base64 images no longer leak `__IMAGE_PLACEHOLDER_N__` strings when there are no local images to process

These options live in Settings → Markdown to Jira Plus → **Output formatting**.

## Local development

To iterate on the plugin against a real Obsidian vault before cutting a BRAT release:

1. Copy the env example and point it at the vault you want to install into:
   ```sh
   cp .env.local.example .env.local
   # then edit .env.local — OBSIDIAN_VAULT=/absolute/path/to/your/vault
   ```
2. Start the watcher:
   ```sh
   npm run dev
   ```
   esbuild writes `main.js`, `manifest.json`, and `styles.css` straight into `<vault>/.obsidian/plugins/obsidian-md-to-jira-plus/` and rebuilds on every save.
3. In Obsidian, enable **Markdown to Jira Plus** under Settings → Community plugins.
4. After making changes, reload the plugin (Ctrl/Cmd-R, or the *Reload app without saving* command) to pick up the new build.

If `OBSIDIAN_VAULT` is unset, `npm run dev` falls back to writing artifacts at the repo root.

## Releasing (maintainers)

```sh
# Cut a new release (bumps manifest+versions, builds, commits, pushes, GH release)
npm run brat:release -- 1.0.1-plus.2

# Or rebuild + verify artifacts without tagging
npm run brat:build
```

The release script picks up the `fork` git remote; if you haven't added one:
```sh
git remote add fork https://github.com/ddtam/obsidian-md-to-jira.git
```

---

## Upstream README

The original plugin is documented below. The fork-specific behaviour above is layered on top of all of it.

<h2 align="center">Obsidian Markdown to Jira (and backwards)</h2>

<div align="center">
  Convert your note/selection into jira markup and vice versa!
</div>

### Install (upstream)
The upstream plugin can be installed from the **Community plugins** list inside Obsidian (id `obsidian-md-to-jira`). The fork above is a separate plugin id and can live alongside it.

If the plugin is not yet on the community list:
- download the latest release files **main.js** & **manifest.json** [here](https://github.com/muckmuck96/obsidian-md-to-jira/releases/latest)
- create a folder called `obsidian-md-to-jira` in the `.obsidian/plugins` folder of the vault to be installed
- place the **main.js** & **manifest.json** from the release there
- now you should be able to enable the plugin in the plugins tab of obsidian

## Usage
There are two ways to convert your markdown into jira markup. In both ways, the note has to be in **editor view**.

1. Focus the note you want to convert and use the command: `Note to Jira markup (clipboard) command`
2. Select some markdown you want to convert and use the command: `Selection to Jira markup (clipboard)`

Vice versa, you can convert jira markup into markdown using the command: `Jira markup (clipboard) to markdown note`

## Releases

# 1.0.1: Bugfixes & Cleanups
- fixed some bugs
- did some code cleanups
- extracted style.css from code

## 1.0.0: New Features on new converter
- added markup preview modal
- added auto detection of pasting jira markup in obsidian
- added mention and jira issue conversions
- added mermaid diagram support
- added support for confluence markup
- fixed some bugs

## 0.3.0: Finished fully functional new converter
- polished new converter (legacy converter will be removed within the next update)
- added requested feature [#7](https://github.com/muckmuck96/obsidian-md-to-jira/issues/7) in new converter
- added image translation [#2](https://github.com/muckmuck96/obsidian-md-to-jira/issues/2) in new converter

## 0.2.1: Improved line break handling
- fixed reported issue [#6](https://github.com/muckmuck96/obsidian-md-to-jira/issues/6) in new converter

## 0.2.0: New converter coming
- fixed reported issue [#5](https://github.com/muckmuck96/obsidian-md-to-jira/issues/5) in legacy converter
- added new converter (beta)

## 0.1.2: Security Update
- fixed cve vulnerabilities

## 0.1.1: Hotfix
- fixed empty convert result bug after callout feature implementation

## 0.1.0: Convert Callouts
- added callout configurations (look into the plugin settings)
- callouts are now getting converted too
- fixed multi-line bullet list bug [#3](https://github.com/muckmuck96/obsidian-md-to-jira/issues/3)

## 0.0.3: Image not transferred notification
- added notifications to converted selection at all image positions

## 0.0.2: Image translation
- added image translation to !path|thumbnail! to get an image with easy accessability

## 0.0.1: Initial release
- The first release of Markdown to Jira
