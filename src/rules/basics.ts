import MarkdownIt from "markdown-it";
import { Validator } from "src/utils/Validator";
import { Translator } from "src/core/Translator";
import { renderImageMarkup } from "src/utils/imageMarkup";
import { renderCodeBlock } from "src/utils/codeBlock";
import { renderCellClose } from "src/utils/tableCells";
import { blockSpacing } from "src/rules/blockSpacing";
import { listLevels } from "src/rules/listLevels";
import { DEFAULT_EXPLICIT_LINE_BREAKS } from "src/constants";

export function basics(md: MarkdownIt, options?: { translator?: Translator }): void {
    const settings = options?.translator?.plugin.settings;
    const breaks = settings?.explicitLineBreaks ?? DEFAULT_EXPLICIT_LINE_BREAKS;
    const embedStyle = settings?.imageEmbedStyle ?? 'alt';
    const warningPanel = settings?.imageWarningPanel ?? false;
    const codeBlockStyle = settings?.codeBlockStyle ?? 'code';

    md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
        const level = tokens[idx].tag.slice(1);
        return `h${level}. `;
    };

    md.renderer.rules.heading_close = () => {
        return '\n';
    };

    md.renderer.rules.paragraph_open = () => {
        return '';
    };

    md.renderer.rules.paragraph_close = (tokens, idx) => {
        // Top-level boundaries belong to the spacing token; a paragraph only
        // terminates its own line. Nested paragraphs (list items, blockquotes)
        // keep the original arithmetic — blockSpacing deliberately does not
        // descend into containers.
        if (tokens[idx].level === 0) {
            return '\n';
        }

        let isInListItem = false;
        for (let i = idx - 1; i >= 0; i--) {
            if (tokens[i].type === 'list_item_open') {
                isInListItem = true;
                break;
            }
            if (tokens[i].type === 'list_item_close') {
                break;
            }
        }

        if (isInListItem) {
            return '\n';
        }

        // The last paragraph in a container should not push a blank line ahead
        // of the closing markup — a blockquote ending here would otherwise emit
        // a stray blank line before its {quote}.
        if (tokens[idx + 1] && tokens[idx + 1].nesting === -1) {
            return '\n';
        }

        const openToken = tokens[idx - 2];

        let nextBlockToken = null;
        for (let i = idx + 1; i < tokens.length; i++) {
            if (tokens[i].type === 'paragraph_open' ||
                tokens[i].type === 'heading_open' ||
                tokens[i].type === 'list_item_open' ||
                tokens[i].type === 'table_open' ||
                tokens[i].type === 'hr' ||
                tokens[i].type === 'fence' ||
                tokens[i].type === 'blockquote_open') {
                nextBlockToken = tokens[i];
                break;
            }
        }

        if (openToken && openToken.map && nextBlockToken && nextBlockToken.map) {
            const currentEnd = openToken.map[1];
            const nextStart = nextBlockToken.map[0];
            const blankLines = nextStart - currentEnd;

            if (blankLines >= 1) {
                return '\n'.repeat(blankLines + 1);
            }
        }

        return '\n\n';
    };

    listLevels(md);
    blockSpacing(md, { breaks });

    md.renderer.rules.list_item_open = (tokens, idx) => {
        const listLevel = tokens[idx].meta?.listLevel || 1;
        const isOrdered = tokens[idx].meta?.isOrdered || false;
        const marker = isOrdered ? '#' : '*';
        return marker.repeat(listLevel) + ' ';
    };

    md.renderer.rules.list_item_close = () => {
        return '';
    };

    md.renderer.rules.bullet_list_open = () => {
        return '';
    };

    md.renderer.rules.bullet_list_close = () => {
        return '';
    };

    md.renderer.rules.ordered_list_open = () => {
        return '';
    };

    md.renderer.rules.ordered_list_close = () => {
        return ''; 
    };

    md.renderer.rules.text = (tokens, idx) => {
        return tokens[idx].content;
    };

    md.renderer.rules.strong_open = () => {
        return '*';
    };

    md.renderer.rules.strong_close = () => {
        return '*';
    };

    md.renderer.rules.em_open = () => {
        return '_';
    };

    md.renderer.rules.em_close = () => {
        return '_';
    };

    md.renderer.rules.s_open = () => {
        return '-'; 
    };

    md.renderer.rules.s_close = () => {
        return '-'; 
    };

    md.renderer.rules.link_open = (tokens, idx, options, env) => {
        env.currentHref = tokens[idx].attrGet('href');
        return `[`;
    };

    md.renderer.rules.link_close = (tokens, idx, options, env) => {
        const href = env.currentHref; 
        return `|${href}]`;
    };

    md.renderer.rules.text = (tokens, idx) => {
        return tokens[idx].content;
    };

    md.renderer.rules.image = (tokens, idx) => {
        const src = tokens[idx].attrGet('src');
        const alt = tokens[idx].content || 'Image';

        if (Validator.isUrlOrBase64(src)) {
            if (src != null && options?.translator) {
                options.translator.registerLocalImage(src, alt, false);
            }
            return renderImageMarkup(src as string, alt, embedStyle);
        }

        if (options?.translator && src != null) {
            return options.translator.registerImage(src, alt);
        }

        const inline = renderImageMarkup(src as string, alt, embedStyle);
        if (warningPanel) {
            return `{panel:borderColor=#ffecb5|bgColor=#fff3cd}
{color:#664d03}+*Warning:*+ The following file must be transferred manually via drag & drop: *${src}*{color}
{panel}

${inline}`;
        }
        return inline;
    };

    md.renderer.rules.code_inline = (tokens, idx) => {
        return `{{${tokens[idx].content}}}`;
    };

    md.renderer.rules.fence = (tokens, idx) => {
        const token = tokens[idx];
        const code = token.content.trim();
        const lang = token.info.trim();
        return renderCodeBlock(code, lang, codeBlockStyle);
    };

    md.renderer.rules.table_open = () => {
        return '';
    };

    md.renderer.rules.table_close = () => {
        return '';
    };

    md.renderer.rules.thead_open = () => {
        return '';
    };

    md.renderer.rules.thead_close = () => {
        return '';
    };

    md.renderer.rules.tbody_open = () => {
        return '';
    };

    md.renderer.rules.tbody_close = () => {
        return '';
    };

    md.renderer.rules.tr_open = () => {
        return '';
    };

    md.renderer.rules.tr_close = (tokens, idx) => {
        let isHeaderRow = false;
        for (let i = idx - 1; i >= 0; i--) {
            if (tokens[i].type === 'thead_open') {
                isHeaderRow = true;
                break;
            }
            if (tokens[i].type === 'tbody_open' || tokens[i].type === 'thead_close') {
                break;
            }
        }

        if (isHeaderRow) {
            return '||\n';
        }

        return '|\n';
    };

    md.renderer.rules.th_open = () => {
        return '||';
    };

    md.renderer.rules.th_close = (tokens, idx) => {
        return renderCellClose(tokens, idx);
    };

    md.renderer.rules.td_open = () => {
        return '|';
    };

    md.renderer.rules.td_close = (tokens, idx) => {
        return renderCellClose(tokens, idx);
    };

    md.renderer.rules.blockquote_open = () => {
        return '{quote}\n';
    };

    md.renderer.rules.blockquote_close = () => {
        return '{quote}\n';
    };

    md.renderer.rules.hardbreak = () => {
        return '\\\\\n';
    };

    md.renderer.rules.hr = () => {
        return '----\n'; 
    };
}