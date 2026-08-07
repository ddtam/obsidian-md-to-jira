import type MarkdownIt from 'markdown-it';

// Annotates list tokens with their nesting depth and ordered/bullet flag, so the
// list-item renderer can repeat the right marker (`**` , `##`).
//
// This was previously duplicated as `list_fix` in basics.ts and
// `confluence_list_fix` in confluenceBasics.ts. Both copies also synthesised a
// `list_end_marker` token whose only job was spacing; blockSpacing owns that
// now, so the marker is gone.

export function listLevels(md: MarkdownIt, ruleName = 'mtj_list_levels'): void {
	md.core.ruler.before('inline', ruleName, (state) => {
		const stack: Array<{ isOrdered: boolean }> = [];

		for (const token of state.tokens) {
			if (
				token.type === 'bullet_list_open' ||
				token.type === 'ordered_list_open'
			) {
				stack.push({ isOrdered: token.type === 'ordered_list_open' });
				token.meta = token.meta || {};
				token.meta.listLevel = stack.length;
				token.meta.isOrdered = token.type === 'ordered_list_open';
			} else if (
				token.type === 'bullet_list_close' ||
				token.type === 'ordered_list_close'
			) {
				stack.pop();
			} else if (token.type === 'list_item_open') {
				token.meta = token.meta || {};
				token.meta.listLevel = stack.length;
				token.meta.isOrdered = stack[stack.length - 1]?.isOrdered || false;
			}
		}

		return true;
	});
}
