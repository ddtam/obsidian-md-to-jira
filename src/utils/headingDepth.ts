/**
 * Re-level the headings of Jira or Confluence markup so the shallowest
 * becomes `top`, keeping their relative depth: a note whose headings run
 * h3 to h5 copies as h2 to h4 with `top` 2. A heading pushed past h6 stays
 * at h6, since markup has no deeper level. `top` 0 leaves them as written.
 *
 * Lines inside `{code}` and `{noformat}` blocks are never touched: a code
 * block quoting `h2. Heading` is content, not a heading.
 */
const HEADING = /^h([1-6])\.(\s)/;
const FENCE = /^\{(code|noformat)(:[^}]*)?\}\s*$/;

export function rebaseHeadings(markup: string, top: number): string {
	if (!top) return markup;
	const lines = markup.split('\n');
	const isHeading: boolean[] = [];
	let open: string | null = null;
	let shallowest = 7;
	lines.forEach((line, i) => {
		const f = line.match(FENCE);
		if (f) {
			// The same macro opens and closes a block.
			open = open === f[1] ? null : open ?? f[1];
			isHeading[i] = false;
			return;
		}
		const h = open ? null : line.match(HEADING);
		isHeading[i] = !!h;
		if (h) shallowest = Math.min(shallowest, Number(h[1]));
	});
	if (shallowest === 7) return markup;
	const shift = top - shallowest;
	return lines.map((line, i) => {
		if (!isHeading[i]) return line;
		return line.replace(HEADING, (_, n, sp) =>
			`h${Math.min(6, Math.max(1, Number(n) + shift))}.${sp}`);
	}).join('\n');
}
