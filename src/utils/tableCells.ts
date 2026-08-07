import type { MdToken } from './mdTypes';

/**
 * Closing markup for a table cell.
 *
 * Cells are opened with `|` (body) or `||` (header) and closed with nothing, so
 * an empty cell would collapse its two delimiters into `||`. In Jira markup
 * `||` denotes a *header* cell, which corrupts the row — `|1|2||` reads as two
 * body cells followed by a header cell rather than three body cells.
 *
 * Emitting a single space for an empty cell keeps the pipe count honest and the
 * table rectangular.
 */
export function renderCellClose(tokens: MdToken[], idx: number): string {
	// tokens[idx - 1] is the cell's inline token: td_open, inline, td_close.
	const content = tokens[idx - 1]?.content ?? '';
	return content.trim() ? '' : ' ';
}
