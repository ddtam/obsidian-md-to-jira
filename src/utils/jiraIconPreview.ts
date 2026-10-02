/**
 * Draws an approximation of how Jira renders a wiki emoticon, for the
 * preview beside each icon dropdown in the settings tab. These are drawn
 * here, not Jira's own images: those are served from each Jira site, so
 * they would need a site URL and a network request to show.
 */

type Shape = { tag: keyof SVGElementTagNameMap; attr: Record<string, string> };

const GREEN = '#36B37E';
const RED = '#DE350B';
const BLUE = '#0065FF';
const YELLOW = '#FFAB00';
const GOLD = '#FFC400';
const GREY = '#A5ADBA';
const INK = '#42526E';

const STAR = '8,1 10.1,5.6 15,6.1 11.3,9.4 12.4,14.3 ' +
    '8,11.8 3.6,14.3 4.7,9.4 1,6.1 5.9,5.6';

function disc(fill: string): Shape {
    return { tag: 'circle', attr: { cx: '8', cy: '8', r: '7', fill } };
}

function stroke(d: string, colour = 'white'): Shape {
    return { tag: 'path', attr: {
        d, fill: 'none', stroke: colour, 'stroke-width': '2',
        'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    } };
}

function glyph(text: string, fill = 'white'): Shape {
    return { tag: 'text', attr: {
        x: '8', y: '12', 'text-anchor': 'middle', 'font-size': '11',
        'font-weight': '700', 'font-family': 'sans-serif', fill,
        'data-text': text,
    } };
}

function star(fill: string): Shape[] {
    return [{ tag: 'polygon', attr: { points: STAR, fill } }];
}

function bulb(lit: boolean): Shape[] {
    return [
        { tag: 'circle', attr: lit
            ? { cx: '8', cy: '6.5', r: '4.8', fill: GOLD }
            : { cx: '8', cy: '6.5', r: '4.3', fill: 'none',
                stroke: GREY, 'stroke-width': '1.4' } },
        { tag: 'rect', attr: { x: '6', y: '11.5', width: '4', height: '3',
            rx: '0.8', fill: lit ? INK : GREY } },
    ];
}

function flag(raised: boolean): Shape[] {
    return [
        stroke('M3.5 2 V15', INK),
        { tag: 'path', attr: raised
            ? { d: 'M4 2.5 H13 L11 6 L13 9.5 H4 Z', fill: RED }
            : { d: 'M4 2.5 H13 L11 6 L13 9.5 H4 Z', fill: 'none',
                stroke: GREY, 'stroke-width': '1.2' } },
    ];
}

const SHAPES: Record<string, Shape[]> = {
    '(/)': [disc(GREEN), stroke('M4.6 8.3 L7 10.6 L11.4 5.6')],
    '(x)': [disc(RED), stroke('M5.5 5.5 L10.5 10.5 M10.5 5.5 L5.5 10.5')],
    '(i)': [disc(BLUE), glyph('i')],
    '(?)': [disc(BLUE), glyph('?')],
    '(+)': [disc(GREEN), stroke('M8 4.5 V11.5 M4.5 8 H11.5')],
    '(-)': [disc(RED), stroke('M4.5 8 H11.5')],
    '(!)': [
        { tag: 'path', attr: { d: 'M8 1.5 L15 14 H1 Z', fill: YELLOW } },
        glyph('!', INK),
    ],
    '(on)': bulb(true),
    '(off)': bulb(false),
    '(*)': star(GOLD),
    '(*y)': star(YELLOW),
    '(*r)': star(RED),
    '(*g)': star(GREEN),
    '(*b)': star(BLUE),
    '(flag)': flag(true),
    '(flagoff)': flag(false),
};

// Jira renders these as emoji, so the emoji is the honest preview.
const EMOJI: Record<string, string> = {
    '(y)': '👍', '(n)': '👎', ':)': '🙂', ':(': '🙁',
    ':P': '😋', ':D': '😀', ';)': '😉',
};

/** Replace `el`'s contents with a preview of the emoticon `tag`. */
export function renderJiraIcon(el: HTMLElement, tag: string): void {
    el.empty();
    el.setAttr('aria-label', tag === 'none' ? 'No icon' : tag);
    if (EMOJI[tag]) {
        el.setText(EMOJI[tag]);
        return;
    }
    const shapes = SHAPES[tag];
    if (!shapes) return;
    const svg = make('svg', { viewBox: '0 0 16 16', width: '18', height: '18' });
    for (const s of shapes) {
        const { 'data-text': text, ...attr } = s.attr;
        const node = make(s.tag, attr);
        if (text) node.textContent = text;
        svg.appendChild(node);
    }
    el.appendChild(svg);
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function make(tag: string, attr: Record<string, string>): SVGElement {
    const node = document.createElementNS(SVG_NS, tag) as SVGElement;
    for (const [k, v] of Object.entries(attr)) node.setAttribute(k, v);
    return node;
}
