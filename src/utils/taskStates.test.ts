import {
    DEFAULT_TASK_MAPPING,
    LEGACY_TASK_MAPPING,
    TASK_STATES,
    isLegacyTaskMapping,
} from './taskStates';
import { calloutIcons } from './calloutIcons';

describe('task state defaults', () => {
    const tags = new Set(Object.values(calloutIcons).map((i) => i.jiraTag));

    test('every default is offered in the icon dropdown', () => {
        for (const s of TASK_STATES) expect(tags.has(s.default)).toBe(true);
    });

    test('every legacy value is offered, so old mappings still display', () => {
        for (const v of Object.values(LEGACY_TASK_MAPPING)) {
            expect(tags.has(v)).toBe(true);
        }
    });

    test('an open task is not a tick and a done task is', () => {
        expect(DEFAULT_TASK_MAPPING['[ ]']).not.toBe('(/)');
        expect(DEFAULT_TASK_MAPPING['[x]']).toBe('(/)');
    });
});

describe('isLegacyTaskMapping', () => {
    test('matches the untouched legacy defaults', () => {
        expect(isLegacyTaskMapping({ ...LEGACY_TASK_MAPPING })).toBe(true);
    });

    test('an edited value is left alone', () => {
        expect(isLegacyTaskMapping({ ...LEGACY_TASK_MAPPING, '[ ]': '(x)' }))
            .toBe(false);
    });

    test('an added custom state is left alone', () => {
        expect(isLegacyTaskMapping({ ...LEGACY_TASK_MAPPING, '[?]': '(?)' }))
            .toBe(false);
    });

    test('the new defaults are not legacy', () => {
        expect(isLegacyTaskMapping({ ...DEFAULT_TASK_MAPPING })).toBe(false);
    });
});
