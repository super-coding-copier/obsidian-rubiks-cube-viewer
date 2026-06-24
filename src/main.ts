import { Plugin } from 'obsidian';
import { renderCube } from './cube-renderer';
import { createCubeFromFilling } from './cube-simulator';
import type { Face } from './colors';
import { resolvePuzzleType, randomPuzzleType, isNxNCube, getNxNSize, invalidPuzzleMessage, type PuzzleType } from './puzzles/types';
import { createPuzzleState, generateScramble, applyPuzzleMoves, type PuzzleState } from './puzzles/scramble-generator';
import { renderPyraminx } from './puzzles/pyraminx-renderer';
import { renderSkewb } from './puzzles/skewb-renderer';
import { renderClock } from './puzzles/clock-renderer';
import { renderSquareOne } from './puzzles/square-one-renderer';
import { renderMegaminx } from './puzzles/megaminx-renderer';

interface ParsedBlock {
	puzzle: PuzzleType;  // resolved puzzle type
	type: 'scramble' | 'filling';
	data: string;        // remaining content after key:value lines
}

/** Parse a key: value line. Returns [key, value] or null. */
function parseKeyValue(line: string): [string, string] | null {
	const m = /^([a-zA-Z_]+)\s*:\s*(.+)$/.exec(line);
	if (!m) return null;
	return [m[1]!.trim().toLowerCase(), m[2]!.trim()];
}

/** Parse the content of a ```cube code block */
function parseBlock(content: string): ParsedBlock | { error: string } | null {
	const lines = content.split('\n');
	const kv: Record<string, string> = {};
	const dataLines: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed === '' || trimmed.startsWith('//')) {
			continue;
		}
		const pair = parseKeyValue(trimmed);
		if (pair) {
			kv[pair[0]] = pair[1];
		} else {
			dataLines.push(trimmed);
		}
	}

	// Resolve puzzle type from cube: key
	const cubeStr = kv['cube'] ?? '3x3';
	let puzzle = resolvePuzzleType(cubeStr);

	if (!puzzle) {
		return { error: invalidPuzzleMessage(cubeStr) };
	}

	// Handle random type
	if (puzzle === 'random') {
		puzzle = randomPuzzleType();
	}

	// Parse type
	const typeStr = (kv['type'] ?? 'scramble').toLowerCase();
	if (typeStr !== 'scramble' && typeStr !== 'filling') return null;

	// filling mode only valid for NxN cubes
	if (typeStr === 'filling' && !isNxNCube(puzzle)) {
		return { error: `Filling mode is only supported for NxN cubes (2x2-7x7), not "${puzzle}".` };
	}

	return {
		puzzle,
		type: typeStr,
		data: dataLines.join('\n').trim(),
	};
}

/** Render a puzzle state to SVG based on its type */
function renderPuzzle(state: PuzzleState): SVGSVGElement {
	switch (state.type) {
		case 'cube':
			return renderCube(state.data);
		case 'pyraminx':
			return renderPyraminx(state.data);
		case 'skewb':
			return renderSkewb(state.data);
		case 'clock':
			return renderClock(state.data);
		case 'square-one':
			return renderSquareOne(state.data);
		case 'megaminx':
			return renderMegaminx(state.data);
	}
}

export default class RubiksCubePlugin extends Plugin {
	async onload() {
		this.registerMarkdownCodeBlockProcessor(
			'cube',
			(_source, el, _ctx) => {
				try {
					const parsed = parseBlock(_source);

					if (!parsed) {
						el.createDiv({ cls: 'cube-error', text: 'Invalid cube block format.' });
						return;
					}

					if ('error' in parsed) {
						el.createDiv({ cls: 'cube-error', text: parsed.error });
						return;
					}

					let state: PuzzleState;
					if (parsed.type === 'scramble') {
						state = createPuzzleState(parsed.puzzle);
						if (parsed.data) {
							applyPuzzleMoves(state, parsed.data);
						} else {
							// Generate a random scramble
							const scramble = generateScramble(parsed.puzzle);
							applyPuzzleMoves(state, scramble);
						}
					} else {
						// filling mode: NxN cubes only (already validated)
						const n = getNxNSize(parsed.puzzle);
						const faceColors = parseFillingData(parsed.data, n);
						state = {
							type: 'cube',
							data: createCubeFromFilling(n, faceColors),
						};
					}

					const svg = renderPuzzle(state);
					const wrapper = el.createDiv({ cls: 'cube-block' });
					wrapper.appendChild(svg);
				} catch (e) {
					el.createDiv({
						cls: 'cube-error',
						text: `Cube error: ${e instanceof Error ? e.message : String(e)}`,
					});
				}
			},
		);
	}

	onunload() {}
}

/** Parse filling data lines into face color map. */
function parseFillingData(
	data: string,
	n: number,
): Partial<Record<Face, string>> {
	const result: Partial<Record<Face, string>> = {};
	if (!data) return result;

	const lines = data.split('\n');
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('//')) continue;
		const pair = parseKeyValue(trimmed);
		if (!pair) continue;
		const face = pair[0].toUpperCase() as Face;
		let colors = pair[1];
		colors = colors.replace(/[,，]/g, '').replace(/\s+/g, '');
		if (colors.length >= n * n) {
			result[face] = colors;
		}
	}
	return result;
}
