/**
 * Locate the markdown table that contains a given line and return its
 * source, so a whole table can be converted without relying on Live
 * Preview's table widget. That widget keeps its own cell selection,
 * which is not an editor text selection: selecting a table and running
 * the selection command hands the translator text with no image embeds.
 *
 * A table inside a callout or blockquote is returned with its `>`
 * prefixes stripped, since the table is what is being exported.
 */

const QUOTE_PREFIX = /^\s*(?:>\s?)*/;
const DELIMITER_CELL = /^\s*:?-+:?\s*$/;

function stripQuote(line: string): string {
    return line.replace(QUOTE_PREFIX, '');
}

function isRow(line: string): boolean {
    const body = stripQuote(line).trim();
    return body.length > 0 && body.includes('|');
}

function isDelimiterRow(line: string): boolean {
    let body = stripQuote(line).trim();
    if (body.startsWith('|')) body = body.slice(1);
    if (body.endsWith('|')) body = body.slice(0, -1);
    const cells = body.split('|');
    return cells.length > 0 && cells.every((c) => DELIMITER_CELL.test(c));
}

export interface TableBounds {
    from: number;
    to: number;
}

/** Inclusive line bounds of the table containing `line`, or null. */
export function tableBoundsAt(
    lines: string[],
    line: number,
): TableBounds | null {
    if (line < 0 || line >= lines.length || !isRow(lines[line])) {
        return null;
    }
    let from = line;
    while (from > 0 && isRow(lines[from - 1])) from--;
    let to = line;
    while (to < lines.length - 1 && isRow(lines[to + 1])) to++;
    // A run of piped lines is a table only when its second line is the
    // delimiter row; anything else is prose that happens to hold a pipe.
    if (to - from < 1 || !isDelimiterRow(lines[from + 1])) return null;
    return { from, to };
}

/** Source of the table containing `line`, quote prefixes removed. */
export function tableAt(lines: string[], line: number): string | null {
    const b = tableBoundsAt(lines, line);
    if (!b) return null;
    return lines.slice(b.from, b.to + 1).map(stripQuote).join('\n');
}
