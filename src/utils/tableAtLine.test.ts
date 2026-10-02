import { tableAt, tableBoundsAt } from './tableAtLine';

const doc = [
    '# Title',                                  // 0
    '',                                         // 1
    'Prose with a | pipe in it.',               // 2
    '',                                         // 3
    '| figure | patient |',                     // 4
    '| --- | --- |',                            // 5
    '| ![[a.png]] | AML0001 |',                 // 6
    '| ![[b.png]] | AML0002 |',                 // 7
    '',                                         // 8
    '> [!note] Callout',                        // 9
    '> | a | b |',                              // 10
    '> | :-- | --: |',                          // 11
    '> | ![[c.png]] | x |',                     // 12
    '',                                         // 13
    'a | b',                                    // 14
    'c | d',                                    // 15
];

describe('tableBoundsAt', () => {
    test.each([4, 5, 6, 7])('line %i is inside the top-level table', (l) => {
        expect(tableBoundsAt(doc, l)).toEqual({ from: 4, to: 7 });
    });

    test('a table inside a callout is found', () => {
        expect(tableBoundsAt(doc, 12)).toEqual({ from: 10, to: 12 });
    });

    test.each([0, 1, 2, 3, 8, 9, 13])('line %i is not a table', (l) => {
        expect(tableBoundsAt(doc, l)).toBeNull();
    });

    test('piped prose with no delimiter row is not a table', () => {
        expect(tableBoundsAt(doc, 14)).toBeNull();
    });

    test('out-of-range lines return null', () => {
        expect(tableBoundsAt(doc, -1)).toBeNull();
        expect(tableBoundsAt(doc, doc.length)).toBeNull();
    });
});

describe('tableAt', () => {
    test('returns the whole table, embeds included', () => {
        expect(tableAt(doc, 7)).toBe(doc.slice(4, 8).join('\n'));
    });

    test('strips quote prefixes from a table in a callout', () => {
        expect(tableAt(doc, 10)).toBe(
            '| a | b |\n| :-- | --: |\n| ![[c.png]] | x |',
        );
    });
});
