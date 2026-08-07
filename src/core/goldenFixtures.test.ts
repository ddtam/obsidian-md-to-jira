import * as fs from 'fs';
import * as path from 'path';
import { App } from 'obsidian';
import { Translator } from './Translator';
import { ConfluenceTranslator } from './ConfluenceTranslator';
import MTJPlugin from '../main';
import { DEFAULT_SETTINGS, MTJPluginSettings } from '../settings';

jest.mock('../main');

// Uses the manual mock in src/__mocks__/obsidian.ts rather than an inline
// factory: importing DEFAULT_SETTINGS pulls in settings.ts, whose settings tab
// extends PluginSettingTab, so the mock must supply the real export surface.
jest.mock('obsidian');

jest.mock('../services/ImageHandler');

/**
 * Golden-file fixtures.
 *
 * Each fixture is a directory containing:
 *   input.md       the markdown to convert
 *   settings.json  optional, deep-merged over DEFAULT_SETTINGS
 *   expected.txt   the exact converted output
 *
 * Unlike the unit tests, these run against the REAL DEFAULT_SETTINGS, so they
 * exercise what users actually ship with. They are the sole authority on
 * whitespace; the `toContain` assertions elsewhere cover semantics.
 *
 * Regenerate after an intentional behaviour change:
 *   npm run test:golden:update
 * Then read `git diff` — that diff is the review.
 */

const FIXTURE_ROOT = path.join(__dirname, '..', '__fixtures__');
const UPDATE = process.env.UPDATE_GOLDEN === '1';

type Flavor = 'jira' | 'confluence';

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === 'object' && value !== null && !Array.isArray(value)
	);
}

function deepMerge<T>(base: T, override: unknown): T {
	if (!isPlainObject(override)) {
		return (override === undefined ? base : (override as T));
	}
	if (!isPlainObject(base)) {
		return override as unknown as T;
	}
	const out: Record<string, unknown> = { ...base };
	for (const [key, value] of Object.entries(override)) {
		out[key] = deepMerge((base as Record<string, unknown>)[key], value);
	}
	return out as unknown as T;
}

function listFixtures(flavor: Flavor): string[] {
	const dir = path.join(FIXTURE_ROOT, flavor);
	if (!fs.existsSync(dir)) {
		return [];
	}
	return fs
		.readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
}

function loadSettings(caseDir: string): MTJPluginSettings {
	const overridePath = path.join(caseDir, 'settings.json');
	const override = fs.existsSync(overridePath)
		? JSON.parse(fs.readFileSync(overridePath, 'utf8'))
		: {};
	// Structured-clone the defaults so one fixture cannot mutate another's.
	const base = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
	return deepMerge<MTJPluginSettings>(base, override);
}

async function convert(flavor: Flavor, caseDir: string): Promise<string> {
	const settings = loadSettings(caseDir);
	const plugin = {
		settings,
		app: {} as unknown as App,
	} as unknown as MTJPlugin;

	const input = fs.readFileSync(path.join(caseDir, 'input.md'), 'utf8');

	return flavor === 'jira'
		? new Translator(plugin).convertMarkdownToJira(input)
		: new ConfluenceTranslator(plugin).convertMarkdownToConfluence(input);
}

describe('golden fixtures', () => {
	test('UPDATE_GOLDEN must not be set in CI', () => {
		// A regenerating run rewrites expectations, so green proves nothing.
		// Guard against anyone self-approving a whitespace change in CI.
		expect(UPDATE && !!process.env.CI).toBe(false);
	});

	for (const flavor of ['jira', 'confluence'] as const) {
		const cases = listFixtures(flavor);
		if (cases.length === 0) {
			continue;
		}

		describe(flavor, () => {
			test.each(cases)('%s', async (name) => {
				const caseDir = path.join(FIXTURE_ROOT, flavor, name);
				const expectedPath = path.join(caseDir, 'expected.txt');
				const actual = await convert(flavor, caseDir);

				if (UPDATE) {
					fs.writeFileSync(expectedPath, actual, 'utf8');
					return;
				}

				if (!fs.existsSync(expectedPath)) {
					throw new Error(
						`Missing golden for ${flavor}/${name}. Run: npm run test:golden:update`
					);
				}

				// Raw-string compare: Jest escapes \n in its differ, so a
				// whitespace-only change shows up as a readable diff.
				expect(actual).toBe(fs.readFileSync(expectedPath, 'utf8'));
			});
		});
	}
});
