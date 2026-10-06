import { parseFenceInfo, renderCodeBlock } from './codeBlock';
import { rebaseHeadings } from './headingDepth';
import MarkdownIt from 'markdown-it';
import { wikiLinks } from '../rules/wikiLinks';

describe('parseFenceInfo: Code Styler options after the language', () => {
    test.each([
        ['bash', 'bash', null],
        ["bash hl:'run_bam2cram.sh'", 'bash', null],
        ['bash title:"bin/run.sh"', 'bash', 'bin/run.sh'],
        ['r title:analysis.R fold', 'r', 'analysis.R'],
        ['python fold', 'python', null],
        [' fold title:example', '', 'example'],
        ['title:"x y"', '', 'x y'],
        ['', '', null],
    ])('%j -> %j, title %j', (info, lang, title) => {
        expect(parseFenceInfo(info)).toEqual({ lang, title });
    });
});

describe('renderCodeBlock', () => {
    test('options after the language never reach the macro', () => {
        expect(renderCodeBlock('ls', "bash hl:'ls' fold", 'code'))
            .toBe('{code:bash}\nls\n{code}\n');
    });
    test.each(['text', 'txt', 'plain', 'plaintext', ''])(
        '%j is plain text, so {noformat}', (lang) => {
            expect(renderCodeBlock('a\nb', lang, 'code'))
                .toBe('{noformat}\na\nb\n{noformat}\n');
        });
    test('a title becomes a bold line above the block', () => {
        expect(renderCodeBlock('x=1', 'r title:"bin/a.R"', 'code'))
            .toBe('*bin/a.R*\n{code:r}\nx=1\n{code}\n');
    });
    test('noformat style still drops the language', () => {
        expect(renderCodeBlock('ls', 'bash', 'noformat'))
            .toBe('{noformat}\nls\n{noformat}\n');
    });
});

describe('rebaseHeadings', () => {
    const md = 'h3. A\ntext\nh4. B\nh5. C\n{code:bash}\nh3. not a heading\n{code}';
    test('0 leaves headings as written', () => {
        expect(rebaseHeadings(md, 0)).toBe(md);
    });
    test('h3..h5 to top 2 is h2..h4, keeping relative depth', () => {
        expect(rebaseHeadings(md, 2)).toBe(
            'h2. A\ntext\nh3. B\nh4. C\n{code:bash}\nh3. not a heading\n{code}');
    });
    test('a heading pushed past h6 stays h6', () => {
        expect(rebaseHeadings('h1. A\nh3. B', 5)).toBe('h5. A\nh6. B');
    });
    test('text inside {noformat} is never re-levelled', () => {
        expect(rebaseHeadings('h2. A\n{noformat}\nh2. x\n{noformat}', 1))
            .toBe('h1. A\n{noformat}\nh2. x\n{noformat}');
    });
    test('markup with no headings is unchanged', () => {
        expect(rebaseHeadings('just text', 2)).toBe('just text');
    });
});

describe('wikilinks with display text', () => {
    const md = new MarkdownIt().use(wikiLinks);
    test('the display text is the link text', () => {
        expect(md.renderInline('[[Audit note#The store|1.433 TB]]'))
            .toBe('[1.433 TB|#audit-note#the-store]');
    });
    test('a link with no display text is unchanged', () => {
        expect(md.renderInline('[[Audit note]]'))
            .toBe('[Audit note|#audit-note]');
    });
});
