import { CodeBlockStyle } from '../settings';

/**
 * Languages that mean "no language": Jira's code macro does not know them,
 * and a bare `{code}` falls back to Java highlighting, so they render as
 * `{noformat}`, plain preformatted text.
 */
const PLAIN = new Set(['', 'text', 'txt', 'plain', 'plaintext', 'none']);

/** Code Styler's options without a value, which are never a language. */
const BARE_OPTIONS = new Set(['fold', 'wrap', 'unwrap', 'ignore']);

export interface FenceInfo {
	lang: string;
	title: string | null;
}

/**
 * Split a fence's info string into its language and its title, the way
 * Code Styler reads it: the first word is the language unless it is one of
 * Code Styler's options (`title:`, `hl:`, `fold`, ...), and every option
 * after it is the reader's, not Jira's, so all but the title are dropped.
 */
export function parseFenceInfo(info: string): FenceInfo {
	const raw = (info || '').trim();
	const first = raw.split(/\s+/)[0] || '';
	const isOption = /[:=]/.test(first) || BARE_OPTIONS.has(first.toLowerCase());
	const lang = isOption ? '' : first;
	const m = raw.match(/(?:^|\s)title[:=](?:"([^"]*)"|'([^']*)'|(\S+))/);
	const title = m ? (m[1] ?? m[2] ?? m[3] ?? null) : null;
	return { lang, title };
}

/**
 * Render a fenced code block as Jira markup. `{noformat}` carries no language
 * (it's plain preformatted text) — used for older Jira instances that don't
 * render `{code}` macros, and for any block whose language means plain text.
 * A Code Styler title, which names the file the block reproduces, is kept as
 * a bold line above the block rather than as a macro parameter.
 */
export function renderCodeBlock(
	code: string,
	info: string,
	style: CodeBlockStyle,
): string {
	const { lang, title } = parseFenceInfo(info);
	const head = title ? `*${title}*\n` : '';
	if (style === 'noformat' || PLAIN.has(lang.toLowerCase())) {
		return `${head}{noformat}\n${code}\n{noformat}\n`;
	}
	return `${head}{code:${lang}}\n${code}\n{code}\n`;
}
