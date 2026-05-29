import {
	App,
	Modal,
	ButtonComponent,
	Notice,
	TFile,
	FileSystemAdapter,
	Platform,
} from 'obsidian';

type Segment = { text: string; cls?: string };

export interface PreviewImage {
	src: string;
	alt: string;
	isLocal: boolean;
}

/**
 * Modal for previewing converted markup before copying to clipboard
 */
export class PreviewModal extends Modal {
	private markup: string;
	private markupType: 'jira' | 'confluence';
	private onCopy: () => void;
	private images: PreviewImage[];

	constructor(
		app: App,
		markup: string,
		markupType: 'jira' | 'confluence',
		onCopy: () => void,
		images: PreviewImage[] = [],
	) {
		super(app);
		this.markup = markup;
		this.markupType = markupType;
		this.onCopy = onCopy;
		this.images = images;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		const markupName = this.markupType === 'confluence' ? 'Confluence' : 'Jira';
		this.titleEl.setText(`${markupName} markup preview`);

		const previewContainer = contentEl.createDiv({ cls: 'mtj-preview-container' });
		const codeEl = previewContainer.createEl('code');
		this.highlightSyntax(codeEl, this.markup);

		contentEl.createEl('p', {
			text: `${this.markup.length} characters`,
			cls: 'mtj-preview-info',
		});

		const localImages = this.images.filter((i) => i.isLocal);
		if (localImages.length > 0) {
			this.renderImageList(contentEl, localImages);
		}

		const buttonContainer = contentEl.createDiv({ cls: 'mtj-modal-buttons' });

		new ButtonComponent(buttonContainer)
			.setButtonText('Close')
			.onClick(() => {
				this.close();
			});

		// Copy intentionally leaves the modal open so you can still come back and
		// open the image folder if you forgot to grab the images first.
		new ButtonComponent(buttonContainer)
			.setButtonText('Copy to clipboard')
			.setCta()
			.onClick(() => {
				this.onCopy();
			});
	}

	private renderImageList(container: HTMLElement, images: PreviewImage[]): void {
		const section = container.createDiv({ cls: 'mtj-image-list' });
		section.createEl('h4', {
			text: `Local images to upload to Jira (${images.length})`,
		});
		section.createEl('p', {
			text:
				"Jira can't reference your vault's local files — drag the images into your Jira issue.",
			cls: 'mtj-image-list-hint',
		});

		if (Platform.isDesktopApp && this.app.vault.adapter instanceof FileSystemAdapter) {
			const actions = section.createDiv({ cls: 'mtj-image-list-actions' });
			new ButtonComponent(actions)
				.setButtonText(`Open all ${images.length} in folder`)
				.setCta()
				.setTooltip(
					'Stage every image in one temp folder and open it — then select all (Ctrl/Cmd+A) and drag them into Jira together'
				)
				.onClick(() => this.openAllInFolder(images));
		}

		const list = section.createEl('ul', { cls: 'mtj-image-list-items' });
		for (const img of images) {
			const item = list.createEl('li', { cls: 'mtj-image-list-item' });
			item.createSpan({ text: img.src, cls: 'mtj-image-list-path' });

			const btnRow = item.createDiv({ cls: 'mtj-image-list-buttons' });

			new ButtonComponent(btnRow)
				.setButtonText('Reveal')
				.setTooltip('Reveal file in your OS file manager')
				.onClick(() => this.revealImage(img.src));

			new ButtonComponent(btnRow)
				.setButtonText('Copy path')
				.setTooltip('Copy the file path to clipboard')
				.onClick(async () => {
					await navigator.clipboard.writeText(img.src);
					new Notice(`Copied: ${img.src}`);
				});
		}
	}

	private revealImage(src: string): void {
		const file = this.app.metadataCache.getFirstLinkpathDest(src, '');
		if (file && file instanceof TFile) {
			// Show the file in Obsidian's file explorer
			const leaf = this.app.workspace.getLeaf(false);
			leaf.openFile(file).catch(() => {
				new Notice(`Could not open ${src}`);
			});
			return;
		}
		new Notice(`File not found in vault: ${src}`);
	}

	/**
	 * Stage every local image into one reusable temp folder and open it in the OS
	 * file manager. The folder contains exactly the conversion's images, so the user
	 * can select-all and drag the whole set into Jira at once. The same folder is
	 * reused (contents cleared each time) so copies don't accumulate across clicks.
	 * Desktop-only — relies on Node fs/os/path + Electron shell, loaded lazily so
	 * mobile is unaffected.
	 */
	private async openAllInFolder(images: PreviewImage[]): Promise<void> {
		const adapter = this.app.vault.adapter;
		if (!(adapter instanceof FileSystemAdapter)) {
			new Notice('Opening a folder is only supported on the desktop app.');
			return;
		}

		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const fs = require('fs') as typeof import('fs');
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const os = require('os') as typeof import('os');
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const path = require('path') as typeof import('path');
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const { shell } = require('electron') as {
			shell: { openPath(p: string): Promise<string> };
		};

		const dir = path.join(os.tmpdir(), 'obsidian-md-to-jira-plus');
		try {
			fs.mkdirSync(dir, { recursive: true });
			// Clear the folder's *contents* (not the folder itself) so a file
			// manager window left open from a previous click keeps working.
			for (const entry of fs.readdirSync(dir)) {
				fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
			}
		} catch (err) {
			new Notice(`Could not prepare temp folder: ${(err as Error).message}`);
			return;
		}

		const usedNames = new Set<string>();
		let copied = 0;
		const missing: string[] = [];

		for (const img of images) {
			const file = this.app.metadataCache.getFirstLinkpathDest(img.src, '');
			if (!(file instanceof TFile)) {
				missing.push(img.src);
				continue;
			}

			// Avoid clobbering when two images from different folders share a name.
			let name = file.name;
			if (usedNames.has(name)) {
				const ext = file.extension ? `.${file.extension}` : '';
				const base = ext ? name.slice(0, -ext.length) : name;
				let n = 2;
				while (usedNames.has(`${base}-${n}${ext}`)) n++;
				name = `${base}-${n}${ext}`;
			}
			usedNames.add(name);

			try {
				fs.copyFileSync(adapter.getFullPath(file.path), path.join(dir, name));
				copied++;
			} catch (err) {
				missing.push(`${img.src} (${(err as Error).message})`);
			}
		}

		if (copied === 0) {
			new Notice('No local images could be staged — none resolved to vault files.');
			return;
		}

		const openErr = await shell.openPath(dir);
		if (openErr) {
			new Notice(`Staged ${copied} image(s) at ${dir}, but could not open it: ${openErr}`);
			return;
		}

		let msg = `Staged ${copied} image(s). Select all (Ctrl/Cmd+A) and drag them into Jira.`;
		if (missing.length > 0) {
			msg += ` Skipped ${missing.length}: ${missing.join(', ')}`;
		}
		new Notice(msg, 8000);
	}

	private highlightSyntax(container: HTMLElement, markup: string): void {
		const lines = markup.split('\n');
		lines.forEach((line, idx) => {
			const segments = this.tokenizeLine(line);
			for (const seg of segments) {
				if (seg.cls) {
					container.createSpan({ cls: seg.cls, text: seg.text });
				} else if (seg.text.length > 0) {
					container.appendText(seg.text);
				}
			}
			if (idx < lines.length - 1) {
				container.appendText('\n');
			}
		});
	}

	private tokenizeLine(line: string): Segment[] {
		const headingMatch = line.match(/^(h[1-6]\.)(.*)$/);
		if (headingMatch) {
			return [
				{ text: headingMatch[1], cls: 'mtj-syntax-accent' },
				{ text: headingMatch[2], cls: 'mtj-syntax-bold' },
			];
		}

		const listMatch = line.match(/^([*#]+)\s(.*)$/);
		if (listMatch) {
			const segments: Segment[] = [
				{ text: listMatch[1] + ' ', cls: 'mtj-syntax-accent' },
			];
			this.tokenizeInline(listMatch[2], segments);
			return segments;
		}

		const segments: Segment[] = [];
		this.tokenizeInline(line, segments);
		return segments;
	}

	private tokenizeInline(text: string, segments: Segment[]): void {
		let remaining = text;
		while (remaining.length > 0) {
			const blockMacro = remaining.match(
				/^(\{code[^}]*\}|\{\/code\}|\{noformat\}|\{panel[^}]*\}|\{panel\}|\{quote\})/
			);
			if (blockMacro) {
				segments.push({ text: blockMacro[0], cls: 'mtj-syntax-accent' });
				remaining = remaining.slice(blockMacro[0].length);
				continue;
			}

			const inlineCode = remaining.match(/^\{\{([^}]+)\}\}/);
			if (inlineCode) {
				segments.push({ text: '{{', cls: 'mtj-syntax-accent' });
				segments.push({ text: inlineCode[1], cls: 'mtj-syntax-inline-code' });
				segments.push({ text: '}}', cls: 'mtj-syntax-accent' });
				remaining = remaining.slice(inlineCode[0].length);
				continue;
			}

			if (remaining.startsWith('||')) {
				segments.push({ text: '||', cls: 'mtj-syntax-accent' });
				remaining = remaining.slice(2);
				continue;
			}

			const link = remaining.match(/^\[([^\]|]+)(\|)([^\]]+)\]/);
			if (link) {
				segments.push({ text: '[', cls: 'mtj-syntax-accent' });
				segments.push({ text: link[1], cls: 'mtj-syntax-link-text' });
				segments.push({ text: link[2], cls: 'mtj-syntax-accent' });
				segments.push({ text: link[3], cls: 'mtj-syntax-link-url' });
				segments.push({ text: ']', cls: 'mtj-syntax-accent' });
				remaining = remaining.slice(link[0].length);
				continue;
			}

			const nextSpecial = remaining.search(/[{[|]/);
			if (nextSpecial === -1) {
				segments.push({ text: remaining });
				break;
			}
			if (nextSpecial > 0) {
				segments.push({ text: remaining.slice(0, nextSpecial) });
				remaining = remaining.slice(nextSpecial);
			} else {
				segments.push({ text: remaining[0] });
				remaining = remaining.slice(1);
			}
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
