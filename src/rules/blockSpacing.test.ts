import MarkdownIt from 'markdown-it';
import {
	classifyBlockToken,
	collectBlocks,
	computeSeparator,
	needsExplicitBreak,
	BlockSpacingOptions,
	ExplicitBreakPolicy,
	SpacingBlock,
} from './blockSpacing';

const ALL_OFF: ExplicitBreakPolicy = {
	afterHeading: false,
	beforeTable: false,
	afterTable: false,
};
const ALL_ON: ExplicitBreakPolicy = {
	afterHeading: true,
	beforeTable: true,
	afterTable: true,
};

const opts = (breaks: ExplicitBreakPolicy): BlockSpacingOptions => ({ breaks });

function blocksOf(markdown: string): SpacingBlock[] {
	return collectBlocks(new MarkdownIt().parse(markdown, {}));
}

/**
 * The separator the engine would emit between block i-1 and block i.
 *
 * Blocks terminate their own content with one `\n`, so a separator of `''`
 * means "no blank line between these two blocks", not "no newline at all".
 */
function separators(markdown: string, breaks: ExplicitBreakPolicy): string[] {
	const blocks = blocksOf(markdown);
	return blocks.map((block, i) =>
		computeSeparator(i === 0 ? null : blocks[i - 1], block, opts(breaks))
	);
}

describe('classifyBlockToken', () => {
	test.each([
		['paragraph_open', 'paragraph'],
		['heading_open', 'heading'],
		['bullet_list_open', 'list'],
		['ordered_list_open', 'list'],
		['table_open', 'table'],
		['fence', 'fence'],
		['hr', 'hr'],
		['blockquote_open', 'blockquote'],
		['callout_open', 'callout'],
		['confluence_callout_open', 'callout'],
	])('%s classifies as %s', (type, kind) => {
		expect(classifyBlockToken(type)).toBe(kind);
	});

	test('returns null for non-openers', () => {
		expect(classifyBlockToken('paragraph_close')).toBeNull();
		expect(classifyBlockToken('inline')).toBeNull();
		expect(classifyBlockToken('td_open')).toBeNull();
	});
});

describe('collectBlocks', () => {
	test('finds top-level blocks in order', () => {
		const blocks = blocksOf('# Title\n\npara\n\n| a |\n|---|\n| 1 |\n');
		expect(blocks.map((b) => b.kind)).toEqual(['heading', 'paragraph', 'table']);
	});

	test('ignores nested blocks', () => {
		const blocks = blocksOf('- item one\n\n  second para in item\n');
		expect(blocks.map((b) => b.kind)).toEqual(['list']);
	});

	test('corrects the list container over-extending its map', () => {
		// bullet_list_open.map[1] is 5 here (it swallows the blank lines), but the
		// list's real content ends at line 2.
		const markdown = '- a\n- b\n\n\n\npara\n';
		const [list] = blocksOf(markdown);
		expect(list.contentEndLine).toBe(2);
	});

	test('records source lines for a simple paragraph pair', () => {
		const [first, second] = blocksOf('one\n\ntwo\n');
		expect(first.startLine).toBe(0);
		expect(first.contentEndLine).toBe(1);
		expect(second.startLine).toBe(2);
	});
});

describe('needsExplicitBreak', () => {
	test('is never claimed before a heading — headings own their space', () => {
		expect(needsExplicitBreak('table', 'heading', ALL_ON)).toBe(false);
		expect(needsExplicitBreak('paragraph', 'heading', ALL_ON)).toBe(false);
		expect(needsExplicitBreak('heading', 'heading', ALL_ON)).toBe(false);
	});

	test('honours each toggle', () => {
		expect(needsExplicitBreak('heading', 'paragraph', ALL_ON)).toBe(true);
		expect(needsExplicitBreak('paragraph', 'table', ALL_ON)).toBe(true);
		expect(needsExplicitBreak('table', 'paragraph', ALL_ON)).toBe(true);
	});

	test('emits nothing when every toggle is off', () => {
		expect(needsExplicitBreak('heading', 'paragraph', ALL_OFF)).toBe(false);
		expect(needsExplicitBreak('paragraph', 'table', ALL_OFF)).toBe(false);
		expect(needsExplicitBreak('table', 'paragraph', ALL_OFF)).toBe(false);
	});

	test('never claimed at the start of a document', () => {
		expect(needsExplicitBreak(null, 'table', ALL_ON)).toBe(false);
	});
});

describe('computeSeparator', () => {
	test('emits nothing before the first block', () => {
		expect(separators('one\n\ntwo\n', ALL_OFF)[0]).toBe('');
	});

	describe('reproduces source blank lines 1:1', () => {
		// These are the counts the pre-refactor paragraph_close locked in.
		test.each([
			[1, '\n'],
			[2, '\n\n'],
			[3, '\n\n\n'],
			[11, '\n'.repeat(11)],
		])('%i blank lines adds %j on top of the block terminator', (blanks, expected) => {
			const markdown = `one${'\n'.repeat(blanks + 1)}two\n`;
			expect(separators(markdown, ALL_OFF)[1]).toBe(expected);
		});
	});

	test('list followed by a table with two blank lines gives exactly 3 newlines', () => {
		// The old code needed a second, asymmetric formula for this case.
		const markdown =
			'- Item 1\n- Item 2\n\n\n| Header 1 | Header 2 |\n|---|---|\n| a | b |\n';
		expect(separators(markdown, ALL_OFF)[1]).toBe('\n\n');
	});

	test('a single forced break at a heading-then-table boundary', () => {
		// afterHeading and beforeTable both claim this boundary; only one wins.
		const markdown = '# Title\n\n| H1 | H2 |\n|----|----|\n| a | b |\n';
		expect(separators(markdown, ALL_ON)[1]).toBe('\\\\\n\n');
	});

	test('no forced break when a table is followed by a heading', () => {
		const markdown = '| H1 |\n|----|\n| a |\n\n## Next\n';
		expect(separators(markdown, ALL_ON)[1]).not.toContain('\\\\');
	});

	test('forced break when a table is followed by a paragraph', () => {
		const markdown = '| H1 |\n|----|\n| a |\n\nBody.\n';
		expect(separators(markdown, ALL_ON)[1]).toContain('\\\\');
	});

	test('a heading abutting a paragraph still gets a blank line', () => {
		const markdown = 'Body text.\n# Title\n';
		expect(separators(markdown, ALL_OFF)[1]).toBe('\n');
	});

	test('honours a custom break marker', () => {
		const blocks = blocksOf('# Title\n\nbody\n');
		expect(
			computeSeparator(blocks[0], blocks[1], {
				breaks: ALL_ON,
				breakMarkup: '%%',
			})
		).toBe('%%\n\n');
	});
});
