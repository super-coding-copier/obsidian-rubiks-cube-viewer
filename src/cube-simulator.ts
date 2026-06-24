import { DEFAULT_FACE_COLORS, FACES, type Face } from './colors';

/** Cube state: 6 faces, each an NxN grid of single-char color codes */
export interface CubeState {
	n: number;
	faces: Record<Face, string[][]>;
}

// --- Helpers ---

function cloneGrid(grid: string[][]): string[][] {
	return grid.map(row => [...row]);
}

function cloneFaces(faces: Record<Face, string[][]>): Record<Face, string[][]> {
	const out = {} as Record<Face, string[][]>;
	for (const f of FACES) {
		out[f] = cloneGrid(faces[f]);
	}
	return out;
}

function createFace(n: number, c: string): string[][] {
	return Array.from({ length: n }, () => Array<string>(n).fill(c));
}

/** Get a column as array [row0..rowN-1] */
function getCol(face: string[][], col: number): string[] {
	return face.map(row => row[col]!);
}

/** Set a column from array [row0..rowN-1] */
function setCol(face: string[][], col: number, vals: string[]): void {
	for (let i = 0; i < vals.length; i++) {
		face[i]![col] = vals[i]!;
	}
}

/** Get a row as array [col0..colN-1] */
function getRow(face: string[][], row: number): string[] {
	return [...face[row]!];
}

/** Set a row from array [col0..colN-1] */
function setRow(face: string[][], row: number, vals: string[]): void {
	face[row] = [...vals];
}

/** Rotate an NxN grid clockwise (mutates and returns) */
function rotateCW(g: string[][]): string[][] {
	const n = g.length;
	const copy = cloneGrid(g);
	for (let r = 0; r < n; r++) {
		for (let c = 0; c < n; c++) {
			g[r]![c] = copy[n - 1 - c]![r]!;
		}
	}
	return g;
}

/** Rotate an NxN grid counter-clockwise (mutates and returns) */
function rotateCCW(g: string[][]): string[][] {
	const n = g.length;
	const copy = cloneGrid(g);
	for (let r = 0; r < n; r++) {
		for (let c = 0; c < n; c++) {
			g[r]![c] = copy[c]![n - 1 - r]!;
		}
	}
	return g;
}

function reversed(arr: string[]): string[] {
	return [...arr].reverse();
}

// --- Public API ---

/** Create a solved cube of size n */
export function createCube(n: number): CubeState {
	return {
		n,
		faces: {
			U: createFace(n, DEFAULT_FACE_COLORS['U']),
			D: createFace(n, DEFAULT_FACE_COLORS['D']),
			F: createFace(n, DEFAULT_FACE_COLORS['F']),
			B: createFace(n, DEFAULT_FACE_COLORS['B']),
			R: createFace(n, DEFAULT_FACE_COLORS['R']),
			L: createFace(n, DEFAULT_FACE_COLORS['L']),
		},
	};
}

/** Apply a single move (e.g., "R", "U'", "F2", "Rw") to a cube state (mutates). */
export function applyMove(cube: CubeState, move: string): void {
	const parsed = parseMove(move);
	if (!parsed) {
		return;
	}
	const { face, dir, wide } = parsed;
	const n = cube.n;
	const layers = wide ? [0, 1] : [0]; // wide = 2 layers; for simplicity we support 2-layer wide moves

	for (const layer of layers) {
		if (layer >= n) continue;
		applyLayerMove(cube, face, layer, dir);
	}
}

/** Apply a sequence of moves (space-separated) */
export function applyMoves(cube: CubeState, sequence: string): void {
	const moves = sequence.trim().split(/\s+/).filter(Boolean);
	for (const m of moves) {
		applyMove(cube, m);
	}
}

/** Create a cube from custom face colors (filling mode).
 *  faceColors: { U: "WWWWWWWWW", F: "GGGGGGGGG", ... }
 *  Each string has n*n chars, row-major order.
 */
export function createCubeFromFilling(
	n: number,
	faceColors: Partial<Record<Face, string>>,
): CubeState {
	const faces = {} as Record<Face, string[][]>;
	for (const f of FACES) {
		const data = faceColors[f] ?? '';
		faces[f] = [];
		for (let r = 0; r < n; r++) {
			const row: string[] = [];
			for (let c = 0; c < n; c++) {
				const ch = data[r * n + c] ?? 'A';
				row.push(ch);
			}
			faces[f]!.push(row);
		}
	}
	return { n, faces };
}

// --- Internal move logic ---

interface ParsedMove {
	face: string;
	dir: number; // 1 = CW, -1 = CCW, 2 = double (2 CW)
	wide: boolean;
}

function parseMove(move: string): ParsedMove | null {
	const m = /^(\d*)([RrLlUuDdFfBb])([wW]?)('?)(2?)$/.exec(move);
	if (!m) return null;

	let face = m[2]!.toUpperCase();
	const lower = m[2]!;
	const wide = m[3]!.toLowerCase() === 'w' || lower !== face; // lowercase = wide
	let dir = 1;

	if (m[5] === '2') {
		dir = 2;
	} else if (m[4] === "'") {
		dir = -1;
	}

	return { face, dir, wide };
}

function applyLayerMove(cube: CubeState, face: string, layer: number, dir: number): void {
	const n = cube.n;
	const L = layer;
	const f = cube.faces;

	const times = dir === 2 ? 2 : dir === -1 ? 3 : 1;

	for (let t = 0; t < times; t++) {
		switch (face) {
			case 'R': moveR(f, n, L); break;
			case 'L': moveL(f, n, L); break;
			case 'U': moveU(f, n, L); break;
			case 'D': moveD(f, n, L); break;
			case 'F': moveF(f, n, L); break;
			case 'B': moveB(f, n, L); break;
		}
	}
}

/** R move: clockwise looking at right face */
function moveR(f: Record<Face, string[][]>, n: number, L: number): void {
	rotateCW(f['R']);
	const save = getCol(f['U'], n - 1 - L);
	setCol(f['U'], n - 1 - L, getCol(f['F'], n - 1 - L));
	setCol(f['F'], n - 1 - L, getCol(f['D'], n - 1 - L));
	setCol(f['D'], n - 1 - L, reversed(getCol(f['B'], L)));
	setCol(f['B'], L, reversed(save));
}

/** L move: clockwise looking at left face */
function moveL(f: Record<Face, string[][]>, n: number, L: number): void {
	rotateCW(f['L']);
	const save = getCol(f['U'], L);
	setCol(f['U'], L, reversed(getCol(f['B'], n - 1 - L)));
	setCol(f['B'], n - 1 - L, reversed(getCol(f['D'], L)));
	setCol(f['D'], L, getCol(f['F'], L));
	setCol(f['F'], L, save);
}

/** U move: clockwise looking at up face */
function moveU(f: Record<Face, string[][]>, n: number, L: number): void {
	rotateCW(f['U']);
	const save = getRow(f['F'], L);
	setRow(f['F'], L, getRow(f['R'], L));
	setRow(f['R'], L, getRow(f['B'], L));
	setRow(f['B'], L, getRow(f['L'], L));
	setRow(f['L'], L, save);
}

/** D move: clockwise looking at down face */
function moveD(f: Record<Face, string[][]>, n: number, L: number): void {
	rotateCW(f['D']);
	const save = getRow(f['F'], n - 1 - L);
	setRow(f['F'], n - 1 - L, getRow(f['L'], n - 1 - L));
	setRow(f['L'], n - 1 - L, getRow(f['B'], n - 1 - L));
	setRow(f['B'], n - 1 - L, getRow(f['R'], n - 1 - L));
	setRow(f['R'], n - 1 - L, save);
}

/** F move: clockwise looking at front face */
function moveF(f: Record<Face, string[][]>, n: number, L: number): void {
	rotateCW(f['F']);
	const save = getRow(f['U'], n - 1 - L);
	setRow(f['U'], n - 1 - L, reversed(getCol(f['L'], n - 1 - L)));
	setCol(f['L'], n - 1 - L, getRow(f['D'], L));
	setRow(f['D'], L, reversed(getCol(f['R'], L)));
	setCol(f['R'], L, save);
}

/** B move: clockwise looking at back face */
function moveB(f: Record<Face, string[][]>, n: number, L: number): void {
	rotateCW(f['B']);
	const save = getRow(f['U'], L);
	setRow(f['U'], L, getCol(f['R'], n - 1 - L));
	setCol(f['R'], n - 1 - L, reversed(getRow(f['D'], n - 1 - L)));
	setRow(f['D'], n - 1 - L, getCol(f['L'], L));
	setCol(f['L'], L, reversed(save));
}
