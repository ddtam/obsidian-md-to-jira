/**
 * Markdown task states and the Jira emoticon each maps to by default.
 * One list feeds DEFAULT_SETTINGS, the settings tab and the migration,
 * which previously each carried their own copy of these defaults.
 */
export interface TaskState {
    key: string;
    label: string;
    default: string;
}

export const TASK_STATES: TaskState[] = [
    { key: '[ ]', label: 'Unchecked (to do)', default: '(off)' },
    { key: '[x]', label: 'Checked (done)', default: '(/)' },
    { key: '[X]', label: 'Checked (done, uppercase)', default: '(/)' },
    { key: '[>]', label: 'In progress / forwarded', default: '(*b)' },
    { key: '[-]', label: 'Cancelled', default: '(x)' },
    { key: '[/]', label: 'Partially complete', default: '(*y)' },
];

export const DEFAULT_TASK_MAPPING: Record<string, string> =
    Object.fromEntries(TASK_STATES.map((s) => [s.key, s.default]));

/**
 * The defaults shipped up to 1.0.1-plus.4, which mapped an open task to a
 * green tick and a done one to a lit bulb. A saved mapping identical to
 * this was never chosen by anyone, so it is safe to replace.
 */
export const LEGACY_TASK_MAPPING: Record<string, string> = {
    '[ ]': '(/)',
    '[x]': '(on)',
    '[X]': '(on)',
    '[>]': '(*b)',
    '[-]': '(-)',
    '[/]': '(*y)',
};

export function isLegacyTaskMapping(m: Record<string, string>): boolean {
    const keys = Object.keys(m);
    const legacy = Object.keys(LEGACY_TASK_MAPPING);
    return keys.length === legacy.length &&
        legacy.every((k) => m[k] === LEGACY_TASK_MAPPING[k]);
}
