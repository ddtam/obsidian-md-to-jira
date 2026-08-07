import type MarkdownIt from 'markdown-it';
import type { MdToken } from '../utils/mdTypes';
import { SPACING } from '../constants';

// Single source of truth for the whitespace between top-level blocks.
//
// Before this module, nine renderer rules each emitted their own trailing
// newlines and `\\` markers, using three different blank-line formulas, with no
// normalization pass afterwards. Every rule had to reason about what its
// neighbours would emit — `table_close` literally scanned ahead for a heading to
// avoid doubling whitespace.
//
// Instead, a core rule runs last and splices one synthetic `mtj_spacing` token
// in front of every top-level block. Its renderer emits the separator, and the
// block rules emit content only. There is exactly one separator per boundary,
// so two rules can no longer both claim a forced break.

export type BlockKind =
	| 'paragraph'
	| 'heading'
	| 'list'
	| 'table'
	| 'fence'
	| 'hr'
	| 'blockquote'
	| 'callout'
	| 'other';

export interface SpacingBlock {
	kind: BlockKind;
	/** Index of the block's opening token in the token array. */
	openIdx: number;
	/** Source line the block starts on. */
	startLine: number;
	/** Exclusive source line the block's content ends on, list-corrected. */
	contentEndLine: number;
}

export interface ExplicitBreakPolicy {
	afterHeading: boolean;
	beforeTable: boolean;
	afterTable: boolean;
}

export interface BlockSpacingOptions {
	breaks: ExplicitBreakPolicy;
	/** Defaults to SPACING.FORCED_BREAK. */
	breakMarkup?: string;
}

const OPENERS: Record<string, BlockKind> = {
	paragraph_open: 'paragraph',
	heading_open: 'heading',
	bullet_list_open: 'list',
	ordered_list_open: 'list',
	table_open: 'table',
	fence: 'fence',
	hr: 'hr',
	blockquote_open: 'blockquote',
	callout_open: 'callout',
	confluence_callout_open: 'callout',
	html_block: 'other',
};

/**
 * List containers over-extend their `map` to swallow trailing blank lines
 * (`- a\n- b\n\n\n\npara` gives `bullet_list_open.map = [0, 5]`), while the
 * `inline` tokens inside them do not. Excluding them from the end-line scan is
 * what lets one formula replace the two that existed before.
 */
const OVEREXTENDING = new Set([
	'bullet_list_open',
	'ordered_list_open',
	'list_item_open',
]);

/** Map a token type to its block kind, or null if it does not open a block. */
export function classifyBlockToken(type: string): BlockKind | null {
	return OPENERS[type] ?? null;
}

/**
 * Group top-level tokens into blocks, recording where each one's content
 * actually ends.
 */
export function collectBlocks(tokens: MdToken[]): SpacingBlock[] {
	const blocks: SpacingBlock[] = [];

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (token.level !== 0) {
			continue;
		}

		const kind = classifyBlockToken(token.type);
		if (kind === null || token.map === null) {
			continue;
		}

		const startLine = token.map[0];
		// The opener's own map is unusable for list containers — it is the one
		// that over-extends — so seed from the start line and let the inner
		// content tokens establish the real end.
		let contentEndLine = OVEREXTENDING.has(token.type)
			? startLine
			: token.map[1];

		// Walk to the matching close, tracking the furthest real content line.
		if (token.nesting === 1) {
			let depth = 0;
			for (let j = i; j < tokens.length; j++) {
				const inner = tokens[j];
				depth += inner.nesting;

				if (inner.map && !OVEREXTENDING.has(inner.type)) {
					contentEndLine = Math.max(contentEndLine, inner.map[1]);
				}

				if (depth === 0 && j > i) {
					break;
				}
			}
		}

		blocks.push({ kind, openIdx: i, startLine, contentEndLine });
	}

	return blocks;
}

/**
 * Does this boundary get a forced break?
 *
 * The standard: **headings own their own leading space**, and a boundary emits
 * at most one break, claimed either by the block before it (`afterHeading`,
 * `afterTable`) or the block after it (`beforeTable`). This is what makes the
 * heading-then-table doubling structurally impossible, and it subsumes the old
 * `table_close` heading lookahead, which was a one-off encoding of the same rule.
 */
export function needsExplicitBreak(
	prev: BlockKind | null,
	next: BlockKind,
	breaks: ExplicitBreakPolicy
): boolean {
	if (prev === null) {
		return false;
	}
	if (next === 'heading') {
		return false;
	}
	if (prev === 'heading' && breaks.afterHeading) {
		return true;
	}
	if (next === 'table' && breaks.beforeTable) {
		return true;
	}
	if (prev === 'table' && breaks.afterTable) {
		return true;
	}
	return false;
}

/**
 * Blocks that always want a blank line before them (or after them), regardless
 * of how the source was written. Callouts read as panels and need separating;
 * headings keep the blank line the old `paragraph_close` fallback gave them.
 */
function minimumGap(prev: SpacingBlock, next: SpacingBlock): number {
	if (next.kind === 'heading' || next.kind === 'callout' || prev.kind === 'callout') {
		return 1;
	}
	return 0;
}

/**
 * The separator string emitted immediately before `next`.
 *
 * Contract with the block renderers: each block ends its own content with
 * exactly one `\n` (its line terminator). The separator supplies only what goes
 * *between* blocks — the forced break, then the blank lines.
 */
export function computeSeparator(
	prev: SpacingBlock | null,
	next: SpacingBlock,
	opts: BlockSpacingOptions
): string {
	if (prev === null) {
		return '';
	}

	const sourceGap = Math.max(0, next.startLine - prev.contentEndLine);
	const gap = Math.max(sourceGap, minimumGap(prev, next));

	const mark = needsExplicitBreak(prev.kind, next.kind, opts.breaks)
		? `${opts.breakMarkup ?? SPACING.FORCED_BREAK}\n`
		: '';

	return `${mark}${'\n'.repeat(gap)}`;
}

/**
 * markdown-it plugin. Registers the spacing renderer and a core rule that
 * injects the spacing tokens.
 */
export function blockSpacing(md: MarkdownIt, opts: BlockSpacingOptions): void {
	md.renderer.rules[SPACING.TOKEN] = (tokens, idx) => tokens[idx].content;

	md.core.ruler.push('mtj_block_spacing', (state) => {
		const blocks = collectBlocks(state.tokens);

		// Splice back to front so earlier indices stay valid.
		for (let i = blocks.length - 1; i >= 0; i--) {
			const separator = computeSeparator(
				i === 0 ? null : blocks[i - 1],
				blocks[i],
				opts
			);
			if (separator === '') {
				continue;
			}
			const token = new state.Token(SPACING.TOKEN, '', 0);
			token.content = separator;
			state.tokens.splice(blocks[i].openIdx, 0, token);
		}

		return true;
	});
}
