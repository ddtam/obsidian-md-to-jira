import { normalizeTables } from './tableNormalize';
import MarkdownIt from 'markdown-it';

/** Cell counts per row, straight from markdown-it's own token stream. */
function tableShape(markdown: string): number[] {
	const md = new MarkdownIt();
	const rows: number[] = [];
	let current = 0;
	let inRow = false;

	for (const token of md.parse(markdown, {})) {
		if (token.type === 'tr_open') {
			inRow = true;
			current = 0;
		} else if (token.type === 'tr_close') {
			inRow = false;
			rows.push(current);
		} else if (inRow && (token.type === 'td_open' || token.type === 'th_open')) {
			current++;
		}
	}
	return rows;
}

describe('normalizeTables', () => {
	describe('line-count invariant', () => {
		const samples = [
			'| A | B |\n|---|---|\n| 1 | 2 | 3 |\n',
			'no tables here\n\njust prose\n',
			'| A |\n|---|\n| 1 | 2 |\n\n| C |\n|---|\n| 9 | 8 | 7 |\n',
			'```\n| A | B |\n|---|---|\n```\n',
			'',
			'\n\n\n',
		];

		test.each(samples)('preserves line count for %j', (input) => {
			expect(normalizeTables(input).split('\n')).toHaveLength(
				input.split('\n').length
			);
		});
	});

	test('widens the header so an over-wide row is not truncated', () => {
		const input = '| A | B | C |\n|---|---|---|\n| 1 | 2 | 3 | 4 |\n';
		expect(tableShape(input)).toEqual([3, 3]);
		expect(tableShape(normalizeTables(input))).toEqual([4, 4]);
	});

	test('keeps short rows padded rather than dropping them', () => {
		const input = '| A | B | C |\n|---|---|---|\n| 1 | 2 |\n';
		expect(tableShape(normalizeTables(input))).toEqual([3, 3]);
	});

	test('widens to the widest row when rows disagree', () => {
		const input =
			'| A | B |\n|---|---|\n| 1 | 2 | 3 |\n| 1 |\n| 1 | 2 | 3 | 4 | 5 |\n';
		expect(tableShape(normalizeTables(input))).toEqual([5, 5, 5, 5]);
	});

	test('leaves a table alone when no row is wider than the header', () => {
		const input = '| A | B |\n|---|---|\n| 1 | 2 |\n';
		expect(normalizeTables(input)).toBe(input);
	});

	test('handles rows without leading and trailing pipes', () => {
		const input = 'A | B\n--- | ---\n1 | 2 | 3\n';
		expect(tableShape(normalizeTables(input))).toEqual([3, 3]);
	});

	test('preserves escaped pipes in header cells', () => {
		const input = '| a \\| b | B |\n|---|---|\n| 1 | 2 | 3 |\n';
		const md = new MarkdownIt();
		const tokens = md.parse(normalizeTables(input), {});
		const firstHeader = tokens.find(
			(t, i) => t.type === 'inline' && tokens[i - 1]?.type === 'th_open'
		);
		// markdown-it unescapes `\|` while splitting, so the cell keeps a literal
		// pipe and does not split into two — the escape survived normalization.
		expect(firstHeader?.content).toBe('a | b');
		expect(tableShape(normalizeTables(input))).toEqual([3, 3]);
	});

	test('ignores tables inside fenced code blocks', () => {
		const input = '```\n| A | B |\n|---|---|\n| 1 | 2 | 3 |\n```\n';
		expect(normalizeTables(input)).toBe(input);
	});

	test('ignores tildes-fenced code blocks', () => {
		const input = '~~~\n| A | B |\n|---|---|\n| 1 | 2 | 3 |\n~~~\n';
		expect(normalizeTables(input)).toBe(input);
	});

	test('normalizes multiple tables in one document', () => {
		const input =
			'| A | B |\n|---|---|\n| 1 | 2 | 3 |\n\nprose\n\n| C | D |\n|---|---|\n| 9 | 8 | 7 | 6 |\n';
		expect(tableShape(normalizeTables(input))).toEqual([3, 3, 4, 4]);
	});

	test('stops the body scan at a following block', () => {
		const input = '| A | B |\n|---|---|\n| 1 | 2 |\n# Heading | with a pipe\n';
		expect(normalizeTables(input)).toBe(input);
	});

	test('leaves non-tables untouched', () => {
		const input = 'a | b but no delimiter row\n\nplain text\n';
		expect(normalizeTables(input)).toBe(input);
	});

	test('leaves a mismatched header/delimiter pair untouched', () => {
		const input = '| A | B | C |\n|---|---|\n| 1 | 2 | 3 | 4 |\n';
		expect(normalizeTables(input)).toBe(input);
	});

	test('preserves alignment markers when widening', () => {
		const input = '| A | B |\n|:--|--:|\n| 1 | 2 | 3 |\n';
		const md = new MarkdownIt();
		const html = md.render(normalizeTables(input));
		expect(html).toContain('text-align:left');
		expect(html).toContain('text-align:right');
		expect(tableShape(normalizeTables(input))).toEqual([3, 3]);
	});
});
