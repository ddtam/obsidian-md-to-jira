// Widen GFM table headers so that no body row is silently truncated.
//
// markdown-it's table rule lets the header row define the column count and then
// renders body rows with `for (i = 0; i < columnCount; i++)` — any cell beyond
// that count is discarded during *block parsing*, so no core rule or renderer
// can recover it (node_modules/markdown-it/lib/rules_block/table.mjs:201-213).
// The only place to fix it is the markdown source.
//
// Invariant: this function never adds or removes lines. Every `token.map` line
// index is therefore unchanged, so the block-spacing arithmetic that reads
// those maps is completely unaffected by normalization.

/**
 * Split a table row into cells the way markdown-it does, honouring `\|` escapes.
 * Mirrors `escapedSplit` in markdown-it's table rule.
 */
function escapedSplit(str: string): string[] {
	const result: string[] = [];
	const max = str.length;

	let pos = 0;
	let ch = str.charCodeAt(pos);
	let isEscaped = false;
	let lastPos = 0;
	let current = '';

	while (pos < max) {
		if (ch === 0x7c /* | */) {
			if (!isEscaped) {
				result.push(current + str.substring(lastPos, pos));
				current = '';
				lastPos = pos + 1;
			} else {
				current += str.substring(lastPos, pos - 1);
				lastPos = pos;
			}
		}

		isEscaped = ch === 0x5c /* \ */;
		pos++;
		ch = str.charCodeAt(pos);
	}

	result.push(current + str.substring(lastPos));

	return result;
}

/** Cell count for a row, applying markdown-it's leading/trailing-empty trim. */
function countCells(line: string): number {
	const columns = escapedSplit(line.trim());
	if (columns.length && columns[0] === '') {
		columns.shift();
	}
	if (columns.length && columns[columns.length - 1] === '') {
		columns.pop();
	}
	return columns.length;
}

/** Does this line look like a table delimiter row (`|---|:--:|`)? */
function isDelimiterRow(line: string): boolean {
	const trimmed = line.trim();
	if (trimmed === '' || !/^[-:|][-:|\s]*$/.test(trimmed)) {
		return false;
	}
	const parts = trimmed.split('|');
	let cells = 0;
	for (let i = 0; i < parts.length; i++) {
		const t = parts[i].trim();
		if (!t) {
			// Empty is only allowed at the very start or end.
			if (i === 0 || i === parts.length - 1) {
				continue;
			}
			return false;
		}
		if (!/^:?-+:?$/.test(t)) {
			return false;
		}
		cells++;
	}
	return cells > 0;
}

/** Leading-whitespace width, tabs counted as 4 as markdown-it does. */
function indentWidth(line: string): number {
	let width = 0;
	for (const ch of line) {
		if (ch === ' ') {
			width += 1;
		} else if (ch === '\t') {
			width += 4;
		} else {
			break;
		}
	}
	return width;
}

const FENCE_RE = /^ {0,3}(```|~~~)/;

/**
 * A body row ends the table if it is blank, indented as code, or starts another
 * block. Being conservative here can only stop the scan early, which means we
 * widen by less — never that we corrupt a row.
 */
function endsTableBody(line: string): boolean {
	if (line.trim() === '') {
		return true;
	}
	if (indentWidth(line) >= 4) {
		return true;
	}
	return /^ {0,3}(#{1,6}\s|>|```|~~~|(?:[*+-]|\d{1,9}[.)])\s|(?:\*\s*){3,}$|(?:-\s*){3,}$|(?:_\s*){3,}$)/.test(
		line
	);
}

/**
 * Append `count` empty cells to a table row.
 *
 * Appends only — existing cell text is never re-serialized, so `\|` escapes and
 * inline code spans in the header pass through untouched.
 */
function widenRow(line: string, count: number, filler: string): string {
	if (count <= 0) {
		return line;
	}
	const endsWithPipe = line.trimEnd().endsWith('|');
	const closer = endsWithPipe ? '' : ' |';
	return line.trimEnd() + closer + ` ${filler} |`.repeat(count);
}

/**
 * Widen GFM table headers so no body row is truncated by markdown-it.
 * Fenced code blocks are skipped. Line count is always preserved.
 */
export function normalizeTables(markdown: string): string {
	const lines = markdown.split('\n');
	let inFence = false;
	let fenceMarker = '';

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		const fenceMatch = FENCE_RE.exec(line);
		if (fenceMatch) {
			if (!inFence) {
				inFence = true;
				fenceMarker = fenceMatch[1];
			} else if (line.trim().startsWith(fenceMarker)) {
				inFence = false;
				fenceMarker = '';
			}
			continue;
		}
		if (inFence) {
			continue;
		}

		// A table needs a header line with a pipe, then a delimiter row.
		const delimiter = lines[i + 1];
		if (
			delimiter === undefined ||
			line.indexOf('|') === -1 ||
			line.trim() === '' ||
			indentWidth(line) >= 4 ||
			!isDelimiterRow(delimiter)
		) {
			continue;
		}

		const headerCells = countCells(line);
		if (headerCells === 0 || headerCells !== countCells(delimiter)) {
			// markdown-it requires header and delimiter counts to match; if they
			// do not, this is not a table and we must not touch it.
			continue;
		}

		let maxCells = headerCells;
		let end = i + 2;
		for (; end < lines.length; end++) {
			if (endsTableBody(lines[end])) {
				break;
			}
			maxCells = Math.max(maxCells, countCells(lines[end]));
		}

		if (maxCells > headerCells) {
			const extra = maxCells - headerCells;
			lines[i] = widenRow(line, extra, '');
			lines[i + 1] = widenRow(delimiter, extra, '---');
		}

		// Skip past this table; its body rows are not table headers.
		i = end - 1;
	}

	return lines.join('\n');
}
