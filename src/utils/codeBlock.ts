import { CodeBlockStyle } from '../settings';

/**
 * Render a fenced code block as Jira markup. `{noformat}` carries no language
 * (it's plain preformatted text) — used for older Jira instances that don't
 * render `{code}` macros.
 */
export function renderCodeBlock(
	code: string,
	lang: string,
	style: CodeBlockStyle,
): string {
	if (style === 'noformat') {
		return `{noformat}\n${code}\n{noformat}\n`;
	}
	const language = lang || 'none';
	return `{code:${language}}\n${code}\n{code}\n`;
}
