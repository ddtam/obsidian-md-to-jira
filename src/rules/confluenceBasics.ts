import * as MarkdownIt from "markdown-it";
import { Validator } from "../utils/Validator";
import { ConfluenceTranslator } from "../core/ConfluenceTranslator";
import { renderCellClose } from "../utils/tableCells";
import { blockSpacing } from "./blockSpacing";
import { listLevels } from "./listLevels";
import { DEFAULT_EXPLICIT_LINE_BREAKS } from "../constants";

/**
 * Confluence-specific markdown-it rules
 * Similar to Jira but with some Confluence-specific syntax
 */
export function confluenceBasics(md: MarkdownIt, options?: { translator?: ConfluenceTranslator }): void {
	const settings = options?.translator?.plugin.settings;
	const breaks = settings?.explicitLineBreaks ?? DEFAULT_EXPLICIT_LINE_BREAKS;

	listLevels(md, 'mtj_confluence_list_levels');
	blockSpacing(md, { breaks });

	md.renderer.rules.heading_open = (tokens, idx) => {
		const level = tokens[idx].tag.slice(1);
		return `h${level}. `;
	};

	md.renderer.rules.heading_close = () => {
		return '\n';
	};

	md.renderer.rules.paragraph_open = () => {
		return '';
	};

	md.renderer.rules.paragraph_close = (tokens, idx) => {
		// Top-level boundaries belong to the spacing token; nested paragraphs
		// (list items, blockquotes) keep the original arithmetic.
		if (tokens[idx].level === 0) {
			return '\n';
		}

		let isInListItem = false;
		for (let i = idx - 1; i >= 0; i--) {
			if (tokens[i].type === 'list_item_open') {
				isInListItem = true;
				break;
			}
			if (tokens[i].type === 'list_item_close') {
				break;
			}
		}

		if (isInListItem) {
			return '\n';
		}

		// The last paragraph in a container should not push a blank line ahead
		// of the closing markup (e.g. a blockquote's {quote}).
		if (tokens[idx + 1] && tokens[idx + 1].nesting === -1) {
			return '\n';
		}

		const openToken = tokens[idx - 2];
		let nextBlockToken = null;
		for (let i = idx + 1; i < tokens.length; i++) {
			if (tokens[i].type === 'paragraph_open' ||
				tokens[i].type === 'heading_open' ||
				tokens[i].type === 'list_item_open' ||
				tokens[i].type === 'table_open' ||
				tokens[i].type === 'hr' ||
				tokens[i].type === 'fence' ||
				tokens[i].type === 'blockquote_open') {
				nextBlockToken = tokens[i];
				break;
			}
		}

		if (openToken && openToken.map && nextBlockToken && nextBlockToken.map) {
			const currentEnd = openToken.map[1];
			const nextStart = nextBlockToken.map[0];
			const blankLines = nextStart - currentEnd;

			if (blankLines >= 1) {
				return '\n'.repeat(blankLines + 1);
			}
		}

		return '\n\n';
	};

	md.renderer.rules.list_item_open = (tokens, idx) => {
		const listLevel = tokens[idx].meta?.listLevel || 1;
		const isOrdered = tokens[idx].meta?.isOrdered || false;
		const marker = isOrdered ? '#' : '*';
		return marker.repeat(listLevel) + ' ';
	};

	md.renderer.rules.list_item_close = () => '';
	md.renderer.rules.bullet_list_open = () => '';
	md.renderer.rules.bullet_list_close = () => '';
	md.renderer.rules.ordered_list_open = () => '';
	md.renderer.rules.ordered_list_close = () => '';

	md.renderer.rules.text = (tokens, idx) => {
		return tokens[idx].content;
	};

	// Formatting
	md.renderer.rules.strong_open = () => '*';
	md.renderer.rules.strong_close = () => '*';
	md.renderer.rules.em_open = () => '_';
	md.renderer.rules.em_close = () => '_';
	md.renderer.rules.s_open = () => '-';
	md.renderer.rules.s_close = () => '-';

	// Links
	md.renderer.rules.link_open = (tokens, idx, options, env) => {
		env.currentHref = tokens[idx].attrGet('href');
		return `[`;
	};

	md.renderer.rules.link_close = (tokens, idx, options, env) => {
		const href = env.currentHref;
		return `|${href}]`;
	};

	// Images
	md.renderer.rules.image = (tokens, idx) => {
		const src = tokens[idx].attrGet('src');
		const alt = tokens[idx].content || 'Image';

		if (options?.translator && src != null) {
			return options.translator.registerImage(src, alt);
		}

		if (Validator.isUrlOrBase64(src)) {
			return `!${src}|alt=${alt}!`;
		}
		return `{panel:borderColor=#ffecb5|bgColor=#fff3cd}
				{color:#664d03}+*Warning:*+ The following file must be transferred manually via drag & drop: *${src}*{color}
				{panel}

				!${src}|alt=${alt}!`;
	};

	// Code
	md.renderer.rules.code_inline = (tokens, idx) => {
		return `{{${tokens[idx].content}}}`;
	};

	md.renderer.rules.fence = (tokens, idx) => {
		const token = tokens[idx];
		const code = token.content.trim();
		const lang = token.info.trim() || 'none';
		return `{code:${lang}}\n${code}\n{code}\n`;
	};

	// Tables (same as Jira - Confluence uses same syntax)
	md.renderer.rules.table_open = () => '';
	md.renderer.rules.table_close = () => '';
	md.renderer.rules.thead_open = () => '';
	md.renderer.rules.thead_close = () => '';
	md.renderer.rules.tbody_open = () => '';
	md.renderer.rules.tbody_close = () => '';
	md.renderer.rules.tr_open = () => '';

	md.renderer.rules.tr_close = (tokens, idx) => {
		let isHeaderRow = false;
		for (let i = idx - 1; i >= 0; i--) {
			if (tokens[i].type === 'thead_open') {
				isHeaderRow = true;
				break;
			}
			if (tokens[i].type === 'tbody_open' || tokens[i].type === 'thead_close') {
				break;
			}
		}
		return isHeaderRow ? '||\n' : '|\n';
	};

	md.renderer.rules.th_open = () => '||';
	md.renderer.rules.th_close = (tokens, idx) => renderCellClose(tokens, idx);
	md.renderer.rules.td_open = () => '|';
	md.renderer.rules.td_close = (tokens, idx) => renderCellClose(tokens, idx);

	// Blockquotes
	md.renderer.rules.blockquote_open = () => '{quote}\n';
	md.renderer.rules.blockquote_close = () => '{quote}\n';

	// Horizontal rule
	md.renderer.rules.hardbreak = () => '\\\\\n';
	md.renderer.rules.hr = () => '----\n';
}
