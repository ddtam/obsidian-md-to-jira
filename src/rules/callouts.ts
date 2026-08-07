import * as markdownIt from 'markdown-it';
import { MTJCallout } from 'src/settings';


export function callouts(md: markdownIt, options: MTJCallout[]): void {
    md.block.ruler.before('blockquote', 'callout', (state, startLine, endLine, silent) => {
        const start = state.bMarks[startLine] + state.tShift[startLine];
        const max = state.eMarks[startLine];

        // Check for callout marker `> [!NOTE]`
        if (state.src.charCodeAt(start) !== 0x3E /* > */ || state.src.charCodeAt(start + 1) !== 0x20 /* space */) {
            return false;
        }

        const marker = state.src.slice(start + 2, max).match(/^\[!(.+?)\]\s*(.*)/);
        if (!marker) {
            return false;
        }

        if (silent) {
            return true;
        }

        const tokenOpen = state.push('callout_open', '', 1);
        tokenOpen.markup = marker[0];
        tokenOpen.content = marker[1].toLowerCase(); // Callout type
        tokenOpen.info = marker[2]; // Callout title
        tokenOpen.block = true;

        let nextLine = startLine + 1;

        // Capture the callout content
        const content: string[] = [];

        while (nextLine < endLine) {
            const pos = state.bMarks[nextLine] + state.tShift[nextLine];
            const maxPos = state.eMarks[nextLine];

            if (state.sCount[nextLine] < state.blkIndent) {
                break;
            }

            // Obsidian writes a blank line inside a callout as a bare '>', with
            // no trailing space. Requiring '> ' here used to end the block early
            // and leave the rest of the body to markdown-it's blockquote rule,
            // which rendered it as a {quote} sitting *outside* the {panel}.
            const bodyMatch = state.src.slice(pos, maxPos).match(/^>[ \t]?(.*)$/);
            if (bodyMatch === null) {
                break;
            }
            content.push(bodyMatch[1]);

            nextLine++;
        }

        // A callout ending in a bare '>' should not gain a dangling blank line.
        while (content.length > 0 && content[content.length - 1].trim() === '') {
            content.pop();
        }

        // Update the state line
        state.line = nextLine;

        // The body is an inline token, not an opaque one, so that markdown-it
        // parses it: bold, links, wiki links, mentions and issue links all work
        // inside a callout. Without this they render as literal markdown.
        const contentToken = state.push('inline', '', 0);
        contentToken.content = content.join('\n');
        contentToken.map = [startLine + 1, nextLine];
        contentToken.children = [];

        // Push the closing token
        state.push('callout_close', '', -1);

        tokenOpen.map = [startLine, nextLine];

        return true;
    }, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });

    const configFor = (type: string) => options.find(ccfg => ccfg.identifier == type);

    /** The callout type of the open token that encloses `idx`. */
    const enclosingType = (tokens: { type: string; content: string }[], idx: number): string => {
        for (let i = idx; i >= 0; i--) {
            if (tokens[i].type === 'callout_open') {
                return tokens[i].content.toUpperCase();
            }
        }
        return '';
    };

    // Renderer for callout open
    md.renderer.rules.callout_open = (tokens, idx) => {
        const type = tokens[idx].content.toUpperCase();
        let title = tokens[idx].info || type;
        let panelColor = '';
        const calloutConfiguration = configFor(type);
        if (calloutConfiguration) {
            panelColor = `bgColor=${calloutConfiguration.contentBgColor}|titleBGColor=${calloutConfiguration.titleBgColor}|titleColor=${calloutConfiguration.titleColor}`
            if (calloutConfiguration.titleIcon != "none") {
                title = `${calloutConfiguration.titleIcon} ${title}`;
            }
        }
        // The content colour opens here rather than around an opaque content
        // token, because the body is now inline-parsed into many tokens.
        const openColor = calloutConfiguration ? `{color:${calloutConfiguration.contentColor}}` : '';
        // Without a matching config there is no colour spec, and emitting
        // `{panel:|title=X}` leaves a stray empty parameter.
        const params = panelColor ? `${panelColor}|title=${title}` : `title=${title}`;
        return `{panel:${params}}\n${openColor}`;
    };

    // Renderer for callout close
    md.renderer.rules.callout_close = (tokens, idx) => {
        const closeColor = configFor(enclosingType(tokens, idx)) ? '{color}' : '';
        return `${closeColor}\n{panel}\n`;
    };
}
