/** Supported puzzle types */
export type PuzzleType =
	| '2x2' | '3x3' | '4x4' | '5x5' | '6x6' | '7x7'
	| 'megaminx'
	| 'pyraminx'
	| 'clock'
	| 'square-one'
	| 'skewb'
	| 'random';

/** Alias map: lowercase alias -> PuzzleType */
export const PUZZLE_ALIASES: Record<string, PuzzleType> = {
	'2x2': '2x2', '2': '2x2',
	'3x3': '3x3', '3': '3x3',
	'4x4': '4x4', '4': '4x4',
	'5x5': '5x5', '5': '5x5',
	'6x6': '6x6', '6': '6x6',
	'7x7': '7x7', '7': '7x7',
	'mega': 'megaminx', 'minx': 'megaminx', 'megaminx': 'megaminx',
	'pyra': 'pyraminx', 'pyram': 'pyraminx', 'pyraminx': 'pyraminx',
	'clock': 'clock',
	'sq': 'square-one', 'sq-1': 'square-one', 'sq1': 'square-one', 'square-one': 'square-one',
	'skewb': 'skewb', 'skb': 'skewb',
	'random': 'random',
};

/** Human-readable names for each puzzle type */
export const PUZZLE_NAMES: Record<PuzzleType, string> = {
	'2x2': '2x2x2 Cube',
	'3x3': '3x3x3 Cube',
	'4x4': '4x4x4 Cube',
	'5x5': '5x5x5 Cube',
	'6x6': '6x6x6 Cube',
	'7x7': '7x7x7 Cube',
	'megaminx': 'Megaminx',
	'pyraminx': 'Pyraminx',
	'clock': 'Clock',
	'square-one': 'Square-1',
	'skewb': 'Skewb',
	'random': 'Random',
};

/** Check if a puzzle type is an NxN cube */
export function isNxNCube(type: PuzzleType): boolean {
	return ['2x2', '3x3', '4x4', '5x5', '6x6', '7x7'].includes(type);
}

/** Get the N value from an NxN cube type */
export function getNxNSize(type: PuzzleType): number {
	const map: Record<string, number> = {
		'2x2': 2, '3x3': 3, '4x4': 4, '5x5': 5, '6x6': 6, '7x7': 7,
	};
	return map[type] ?? 3;
}

/** List of valid puzzle key examples for error messages */
export const VALID_PUZZLE_KEYS = [
	'3x3', '2x2', '4x4', '5x5', '6x6', '7x7',
	'mega', 'pyra', 'clock', 'sq1', 'skewb', 'random',
];

/** Resolve a key string to a puzzle type, or null if invalid */
export function resolvePuzzleType(key: string): PuzzleType | null {
	const lower = key.trim().toLowerCase();

	// Check NxN pattern first: "NxN" where N is 2-7
	const nxMatch = /^(\d)x\1$/.exec(lower);
	if (nxMatch) {
		const n = parseInt(nxMatch[1]!, 10);
		if (n >= 2 && n <= 7) {
			return `${n}x${n}` as PuzzleType;
		}
	}

	return PUZZLE_ALIASES[lower] ?? null;
}

/** Get a user-friendly error message for invalid puzzle types */
export function invalidPuzzleMessage(key: string): string {
	return `Unknown puzzle type: "${key}". Valid options: ${VALID_PUZZLE_KEYS.join(', ')}`;
}

/** Random puzzle types (excluding 'random' itself) */
const RANDOM_POOL: PuzzleType[] = [
	'2x2', '3x3', '4x4', '5x5', '6x6', '7x7',
	'megaminx', 'pyraminx', 'clock', 'square-one', 'skewb',
];

/** Pick a random puzzle type */
export function randomPuzzleType(): PuzzleType {
	return RANDOM_POOL[Math.floor(Math.random() * RANDOM_POOL.length)]!;
}
