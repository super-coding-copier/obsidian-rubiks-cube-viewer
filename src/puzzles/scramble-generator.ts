// ============================================================
// Scramble Generator — Random-move scrambles for all puzzles
// ============================================================

// ---------------------------------------------------------------------------
// NxN Cube (2x2–7x7)
// Reuses existing cube-simulator module, thin wrapper for consistency.
// ---------------------------------------------------------------------------

import { createCube, applyMoves as applyCubeMoves, type CubeState } from '../cube-simulator';
export { createCube, applyCubeMoves, CubeState };

function randInt(max: number): number {
	return Math.floor(Math.random() * max);
}

/** SiGN moves for n>2 */
const SIX_BASIC = ['U', 'D', 'L', 'R', 'F', 'B'];
const MODS = ['', "'", '2'];

export function generateCubeScramble(n: number): string {
	if (n === 2) {
		// 2x2: U,R,F only, 10 moves
		const faces = ['U', 'R', 'F'];
		const moves: string[] = [];
		let last = -1;
		for (let i = 0; i < 10; i++) {
			let f: number;
			do { f = randInt(3); } while (f === last);
			last = f;
			moves.push(faces[f]! + MODS[randInt(3)]!);
		}
		return moves.join(' ');
	}
	// 3x3: 20 moves, standard
	if (n === 3) {
		const moves: string[] = [];
		let last = -1;
		for (let i = 0; i < 20; i++) {
			let f: number;
			do { f = randInt(6); } while (f === last);
			last = f;
			moves.push(SIX_BASIC[f]! + MODS[randInt(3)]!);
		}
		return moves.join(' ');
	}
	// 4x4-7x7: SiGN wide moves
	const outerCount = n <= 4 ? 30 : n <= 6 ? 40 : 50;
	const moves: string[] = [];
	let lastFace = -1;
	for (let i = 0; i < outerCount; i++) {
		let f: number;
		do { f = randInt(6); } while (f === lastFace);
		lastFace = f;
		const face = SIX_BASIC[f]!;
		const wide = randInt(Math.floor(n / 2)) + 1;
		const mod = MODS[randInt(3)]!;
		if (wide === 1) {
			moves.push(face + mod);
		} else {
			moves.push(wide + face + 'w' + mod);
		}
	}
	return moves.join(' ');
}

// ---------------------------------------------------------------------------
// Pyraminx
// ---------------------------------------------------------------------------

export interface PyraminxState {
	/** 4 faces × 9 stickers, face order: F=0, D=1, L=2, R=3 */
	faces: string[][];
}

const PYRA_SOLVED: Record<number, string> = {
	0: 'G', // F = green
	1: 'Y', // D = yellow
	2: 'R', // L = red
	3: 'B', // R = blue
};

export function createPyraminx(): PyraminxState {
	return {
		faces: [0, 1, 2, 3].map(f => Array(9).fill(PYRA_SOLVED[f]!)),
	};
}

/**
 * Triangle face layout (9 stickers per face):
 *        0
 *      1   2
 *    3   4   5
 *  6   7   8
 *
 * Corners: 0=top, [6,7,8]=bottom row, [3]=left mid, [5]=right mid
 * Each vertex (U/L/R/B) turn cycles stickers among 3 faces.
 *
 * Face → vertex mapping for each face corner:
 * Face F (idx 0): corner 0=U_vert, corner[6..8]=L_vert or R_vert
 * Face D (idx 1): ...
 *
 * Simplified: define per-vertex cycle indices for affected faces.
 */

/** Indices (face, sticker) that cycle CW per vertex turn.
 *  U affects faces F(0), L(2), R(3)  */
const PYRA_U_CYCLE: [number, number][][] = [
	/* corner */ [[0,0], [2,0], [3,0]],
	/* edge1  */ [[0,1], [2,5], [3,3]],
	/* edge2  */ [[0,2], [2,1], [3,5]],
	/* center */ [[0,4], [2,4], [3,4]],
];

/** L vertex: affects F(0), D(1), R(3) */
const PYRA_L_CYCLE: [number, number][][] = [
	[[0,3], [1,0], [3,5]],
	[[0,5], [1,1], [3,0]],
	[[0,6], [1,2], [3,1]],
	[[0,8], [1,3], [3,2]],
];

/** R vertex: affects F(0), D(1), L(2) */
const PYRA_R_CYCLE: [number, number][][] = [
	[[0,5], [1,0], [2,3]],
	[[0,2], [1,2], [2,6]],
	[[0,0], [1,1], [2,8]],
	[[0,7], [1,3], [2,0]],
];

/** B vertex (back/bottom): affects D(1), L(2), R(3) */
const PYRA_B_CYCLE: [number, number][][] = [
	[[1,5], [2,1], [3,2]],
	[[1,6], [2,5], [3,6]],
	[[1,8], [2,0], [3,0]],
	[[1,7], [2,7], [3,8]],
];

const PYRA_VERTEX_CYCLES: Record<string, [number, number][][]> = {
	U: PYRA_U_CYCLE, L: PYRA_L_CYCLE, R: PYRA_R_CYCLE, B: PYRA_B_CYCLE,
};

function cyclePyraStickers(s: PyraminxState, cycles: [number, number][][], dir: number): void {
	for (let t = 0; t < (dir === 2 ? 2 : dir === -1 ? 2 : 1); t++) {
		for (const cycle of cycles) {
			const vals = cycle.map(([f, i]) => s.faces[f]![i]!);
			// shift: CW moves vals[0]→vals[1], vals[1]→vals[2], vals[2]→vals[0]
			const shifted = dir === -1
				? [vals[2]!, vals[0]!, vals[1]!]
				: [vals[1]!, vals[2]!, vals[0]!];
			cycle.forEach(([f, i], idx) => { s.faces[f]![i] = shifted[idx]!; });
		}
	}
}

function rotatePyraFace(face: string[], dir: number): void {
	// Rotate the triangle face's outer ring by permuting indices
	// dir: 1=CW, -1=CCW
	const ring = dir === 1
		? [0, 2, 5, 8, 6, 3]  // CW
		: [0, 3, 6, 8, 5, 2]; // CCW
	const vals = ring.map(i => face[i]!);
	for (let i = 0; i < ring.length; i++) {
		face[ring[i]!] = vals[(i + 1) % ring.length]!;
	}
}

export function applyPyraminxMove(s: PyraminxState, move: string): void {
	const m = /^([ULRBulrb])([']?)$/.exec(move);
	if (!m) return;
	let vert = m[1]!.toUpperCase();
	const tip = m[1]! >= 'a' && m[1]! <= 'z'; // lowercase = tip only
	const dir = m[2] === "'" ? -1 : 1;
	const cycles = PYRA_VERTEX_CYCLES[vert];
	if (!cycles) return;

	if (tip) {
		// Tip only: just cycle corner stickers (first cycle element of each group)
		const cornerCycles = cycles.map(c => [c[0]!] as [number, number][]);
		cyclePyraStickers(s, cornerCycles, dir);
	} else {
		cyclePyraStickers(s, cycles, dir);
		// Also rotate the 3 affected faces' outer rings
		const faceMap: Record<string, number[]> = {
			U: [0, 2, 3], L: [0, 1, 3], R: [0, 1, 2], B: [1, 2, 3],
		};
		const faces = faceMap[vert]!;
		for (const f of faces) {
			rotatePyraFace(s.faces[f]!, dir);
		}
	}
}

export function applyPyraminxMoves(s: PyraminxState, seq: string): void {
	const moves = seq.trim().split(/\s+/).filter(Boolean);
	for (const m of moves) applyPyraminxMove(s, m);
}

export function generatePyraminxScramble(): string {
	const verts = ['U', 'L', 'R', 'B'];
	const tips = ['u', 'l', 'r', 'b'];
	const movesOut: string[] = [];
	let last = -1;
	for (let i = 0; i < 11; i++) {
		let v: number;
		do { v = randInt(4); } while (v === last);
		last = v;
		movesOut.push(verts[v]! + (randInt(2) ? "'" : ""));
	}
	// Random tips
	for (const t of tips) {
		if (randInt(2)) {
			movesOut.push(t + (randInt(2) ? "'" : ""));
		}
	}
	return movesOut.join(' ');
}

// ---------------------------------------------------------------------------
// Skewb
// ---------------------------------------------------------------------------

export interface SkewbState {
	/** 6 faces × 5 stickers, order: U=0, R=1, F=2, D=3, L=4, B=5 */
	faces: string[][];
}

const SKEWB_SOLVED: Record<number, string> = {
	0: 'W', // U = white
	1: 'B', // R = blue
	2: 'R', // F = red
	3: 'Y', // D = yellow
	4: 'G', // L = green
	5: 'O', // B = orange
};

export function createSkewb(): SkewbState {
	return { faces: [0, 1, 2, 3, 4, 5].map(f => Array(5).fill(SKEWB_SOLVED[f]!)) };
}

/**
 * Skewb face layout (5 stickers):
 * Indices: 0=center, 1=top-right, 2=bottom-right, 3=bottom-left, 4=top-left
 * (diamond split)
 *
 * Moves (FCN): R, R', L, L', U, U', B, B'
 * Each turn rotates 4 corner stickers + 3 centers around the turn axis.
 */

// Predefined sticker cycles for each Skewb move.
// Format: array of [faceIdx, stickerIdx] cycles (3-length for centers, 4 for corners)
interface SkewbMoveData {
	centers: [number, number][][];
	corners: [number, number][][];
}

const SKEWB_R: SkewbMoveData = {
	centers: [[[0,0], [5,0], [3,0]]],
	corners: [
		[[0,4], [5,4], [3,2], [2,2]],
		[[0,2], [2,4], [3,4], [5,2]],
	],
};

const SKEWB_L: SkewbMoveData = {
	centers: [[[0,0], [2,0], [3,0]]],
	corners: [
		[[0,1], [2,3], [3,1], [5,3]],
		[[0,3], [5,1], [3,3], [2,1]],
	],
};

const SKEWB_U: SkewbMoveData = {
	centers: [[[1,0], [5,0], [4,0]]],
	corners: [
		[[1,1], [5,1], [4,1], [2,1]],
		[[1,4], [2,2], [4,4], [5,4]],
	],
};

const SKEWB_B: SkewbMoveData = {
	centers: [[[1,0], [2,0], [4,0]]],
	corners: [
		[[1,2], [2,4], [4,2], [5,2]],
		[[1,3], [5,3], [4,3], [2,3]],
	],
};

const SKEWB_MOVES: Record<string, SkewbMoveData> = {
	R: SKEWB_R, L: SKEWB_L, U: SKEWB_U, B: SKEWB_B,
};

function cycleSkewb(s: SkewbState, cycles: [number, number][][], times: number): void {
	for (let t = 0; t < times; t++) {
		for (const cycle of cycles) {
			const vals = cycle.map(([f, i]) => s.faces[f]![i]!);
			// shift forward by 1
			const shifted = [vals[vals.length - 1]!, ...vals.slice(0, -1)];
			cycle.forEach(([f, i], idx) => { s.faces[f]![i] = shifted[idx]!; });
		}
	}
}

export function applySkewbMove(s: SkewbState, move: string): void {
	const m = /^([RULB])([']?)$/.exec(move.toUpperCase());
	if (!m) return;
	const face = m[1]!;
	const dir = m[2] === "'" ? 3 : 1; // 3 CCW turns = 1 CW in reverse
	const data = SKEWB_MOVES[face];
	if (!data) return;
	cycleSkewb(s, data.centers, dir);
	cycleSkewb(s, data.corners, dir);
}

export function applySkewbMoves(s: SkewbState, seq: string): void {
	const moves = seq.trim().split(/\s+/).filter(Boolean);
	for (const m of moves) applySkewbMove(s, m);
}

export function generateSkewbScramble(): string {
	const faces = ['R', 'L', 'U', 'B'];
	const movesOut: string[] = [];
	let last = -1;
	for (let i = 0; i < 11; i++) {
		let f: number;
		do { f = randInt(4); } while (f === last);
		last = f;
		movesOut.push(faces[f]! + (randInt(2) ? "'" : ""));
	}
	return movesOut.join(' ');
}

// ---------------------------------------------------------------------------
// Clock
// ---------------------------------------------------------------------------

export interface ClockState {
	/** 18 pin values (0-11 o'clock): front[0..8] + back[0..8] */
	pins: number[];
}

export function createClock(): ClockState {
	return { pins: Array(18).fill(0) };
}

/**
 * Clock moves use the WCA format:
 *   UR4+ dr2- DL3+ ul5+ ALL3- y2 U3+ ... etc.
 *
 * Pin layout (front side, looking at face):
 *   UL(0) U(1) UR(2)
 *   L(3)  C(4) R(5)
 *   DL(6) D(7) DR(8)
 *
 * Pins up: which dials are affected when a wheel is turned.
 * - UR pin: affects UR, U, R, C
 * - DR pin: affects DR, D, R, C
 * - DL pin: affects DL, D, L, C
 * - UL pin: affects UL, U, L, C
 * - U pin: affects U, UR, UL
 * - R pin: affects R, UR, DR
 * - D pin: affects D, DR, DL
 * - L pin: affects L, UL, DL
 * - ALL pin: affects all 9
 */

interface PinDef {
	/** indices of dials this pin affects */
	dials: number[];
	/** which side(s): 0=front, 1=back */
	sides: number[];
}

const PIN_DEFS: Record<string, PinDef> = {
	UR:  { dials: [2, 1, 5, 4], sides: [0] },
	DR:  { dials: [8, 7, 5, 4], sides: [0] },
	DL:  { dials: [6, 7, 3, 4], sides: [0] },
	UL:  { dials: [0, 1, 3, 4], sides: [0] },
	U:   { dials: [1, 0, 2],     sides: [0] },
	R:   { dials: [5, 2, 8],     sides: [0] },
	D:   { dials: [7, 6, 8],     sides: [0] },
	L:   { dials: [3, 0, 6],     sides: [0] },
	ALL: { dials: [0,1,2,3,4,5,6,7,8], sides: [0] },
};

function parseClockMove(move: string): { pin: string; turns: number } | null {
	const m = /^(UR|DR|DL|UL|U|R|D|L|ALL)(\d+)([+-])$/i.exec(move);
	if (!m) return null;
	const pin = m[1]!.toUpperCase();
	const val = parseInt(m[2]!, 10);
	const dir = m[3]!;
	return { pin, turns: dir === '-' ? -val : val };
}

export function applyClockMove(s: ClockState, move: string): void {
	const parsed = parseClockMove(move);
	if (!parsed) return;
	const def = PIN_DEFS[parsed.pin];
	if (!def) return;

	// Apply to affected sides and dials
	for (const side of def.sides) {
		const base = side * 9;
		for (const dial of def.dials) {
			s.pins[base + dial] = ((s.pins[base + dial]! + parsed.turns) % 12 + 12) % 12;
		}
	}
}

export function applyClockMoves(s: ClockState, seq: string): void {
	// Handle y2 (flip front/back)
	const parts = seq.match(/(y2|\S+)/gi) ?? [];
	for (const p of parts) {
		if (p.toLowerCase() === 'y2') {
			// Swap front and back
			const front = s.pins.slice(0, 9);
			const back = s.pins.slice(9, 18);
			for (let i = 0; i < 9; i++) {
				s.pins[i] = back[i]!;
				s.pins[9 + i] = front[i]!;
			}
		} else {
			applyClockMove(s, p);
		}
	}
}

export function generateClockScramble(): string {
	const parts: string[] = [];
	const pins = ['UR', 'DR', 'DL', 'UL', 'U', 'R', 'D', 'L', 'ALL'];
	// Phase 1: first side
	for (let i = 0; i < 5; i++) {
		const pin = pins[i % 4]!; // UR, DR, DL, UL
		const turns = randInt(12) - 6; // -6 to +5
		parts.push(pin + Math.abs(turns) + (turns >= 0 ? '+' : '-'));
	}
	parts.push('y2');
	// Phase 2: second side
	for (let i = 0; i < 4; i++) {
		const pin = pins[i % 4]!;
		const turns = randInt(12) - 6;
		parts.push(pin + Math.abs(turns) + (turns >= 0 ? '+' : '-'));
	}
	// Final ALL turn
	{
		const turns = randInt(12) - 6;
		parts.push('ALL' + Math.abs(turns) + (turns >= 0 ? '+' : '-'));
	}
	return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Square-1
// ---------------------------------------------------------------------------

export interface SquareOneState {
	/** 24 pieces: top face[0..11] + bottom face[12..23]
	 *  Each entry is a color code. Positions alternate corner/edge around the face.
	 *  Order: CW starting from the "front" seam.
	 */
	pieces: string[];
}

const SQ1_SOLVED_TOP = ['Y','Y','Y','Y','Y','Y','Y','Y','Y','Y','Y','Y']; // all yellow
const SQ1_SOLVED_BOT = ['W','W','W','W','W','W','W','W','W','W','W','W']; // all white

export function createSquareOne(): SquareOneState {
	return { pieces: [...SQ1_SOLVED_TOP, ...SQ1_SOLVED_BOT] };
}

/**
 * Square-1 moves:
 *   (x, y)  — rotate top by x*30°, bottom by y*30°
 *   /       — slash (swap right half of top with right half of bottom)
 *
 * Corner pieces are 60° (2 units), edge pieces are 30° (1 unit).
 * The state tracks 12 positions per face, but pieces have different widths.
 * For simplicity, track each 30° slot as a position.
 */

function rotateLayer(layer: string[], steps: number): void {
	// Positive = CW, negative = CCW
	const n = layer.length;
	if (steps === 0) return;
	const shifted = steps > 0
		? [...layer.slice(n - steps), ...layer.slice(0, n - steps)]
		: [...layer.slice(-steps), ...layer.slice(0, -steps)];
	for (let i = 0; i < n; i++) layer[i] = shifted[i]!;
}

export function applySquareOneMove(s: SquareOneState, move: string): void {
	if (move === '/') {
		// Slash: swap right 6 of top with right 6 of bottom
		const topRight = s.pieces.slice(6, 12);
		const botRight = s.pieces.slice(18, 24);
		for (let i = 0; i < 6; i++) {
			s.pieces[6 + i] = botRight[i]!;
			s.pieces[18 + i] = topRight[i]!;
		}
		return;
	}
	const m = /^\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)$/.exec(move);
	if (!m) return;
	const topSteps = parseInt(m[1]!, 10);
	const botSteps = parseInt(m[2]!, 10);
	rotateLayer(s.pieces.slice(0, 12) as any, topSteps);
	// Need to rotate in-place. Let me redo:
	const top = s.pieces.slice(0, 12);
	const bot = s.pieces.slice(12, 24);
	const newTop = [...top.slice(-topSteps % 12 + (topSteps > 0 ? 0 : 12)),
		...top.slice(0, (-topSteps % 12 + (topSteps > 0 ? 0 : 12)) % 12 || 0)];
	// I'll handle via modulo properly
	rotateLayer(top as string[], ((topSteps % 12) + 12) % 12);
	rotateLayer(bot as string[], ((botSteps % 12) + 12) % 12);
	// put back
	for (let i = 0; i < 12; i++) {
		s.pieces[i] = top[i]!;
		s.pieces[12 + i] = bot[i]!;
	}
}

export function applySquareOneMoves(s: SquareOneState, seq: string): void {
	// Split by spaces, but keep (x,y) together
	const tokens = seq.match(/\([^)]+\)|\S+/g) ?? [];
	for (const t of tokens) {
		applySquareOneMove(s, t);
	}
}

export function generateSquareOneScramble(): string {
	const parts: string[] = [];
	for (let i = 0; i < 30; i++) {
		if (i % 2 === 0) {
			// Rotation
			const top = randInt(12) - 5;
			const bot = randInt(12) - 5;
			parts.push(`(${top},${bot})`);
		} else {
			parts.push('/');
		}
	}
	return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Megaminx
// ---------------------------------------------------------------------------

export interface MegaminxState {
	/** 12 faces × 11 stickers per face */
	faces: string[][];
}

const MEGA_COLORS = ['W', 'O', 'PK', 'R', 'Y', 'LG', 'G', 'LB', 'B', 'PI', 'PP', 'GY'];
// White, Orange, Pink, Red, Yellow, LightGreen, Green, LightBlue, Blue, Purple, PalePink, Gray

export function createMegaminx(): MegaminxState {
	return { faces: [0,1,2,3,4,5,6,7,8,9,10,11].map(f => Array(11).fill(MEGA_COLORS[f]!)) };
}

/**
 * Megaminx face layout (11 stickers per pentagonal face):
 * Indices:
 *        0
 *    1       4
 *  2   9  10   3
 *    5   8   7
 *        6
 *
 * Or simpler: 0=center, 1-5=corners, 6-10=edges (between corners)
 * Let me use: 0=center, 1-5=corners CW from top, 6-10=edges between corners CW
 *
 * Index:
 *          1
 *      6       5
 *    2   0   10   4
 *      7       9
 *          3
 *            8
 */

/**
 * Megaminx moves:
 *   R++, R-- : rotate R face by 72° CW, 144° CW
 *   D++, D-- : rotate D face
 *   U, U'   : rotate U face
 *
 * Pochmann format: 7 lines × 10 moves each
 */

export function applyMegaminxMove(s: MegaminxState, move: string): void {
	const m = /^([RD])(\+\+|\-\-)$/.exec(move.toUpperCase());
	const u = /^(U)([']?)$/.exec(move.toUpperCase());

	if (m) {
		const faceIdx = m[1] === 'R' ? 0 : 4; // R=0 (white), D=4 (yellow)
		const turns = m[2] === '++' ? 1 : 2;
		for (let t = 0; t < turns; t++) {
			rotateMegaminxFace(s, faceIdx);
		}
	} else if (u) {
		const turns = u[2] === "'" ? 3 : 1; // U' = 3 * U
		for (let t = 0; t < turns; t++) {
			rotateMegaminxU(s);
		}
	}
}

/**
 * Simplified megaminx face adjacency in the net layout:
 *        [0]
 *  [4] [3] [2] [1]
 * [8] [7] [6] [5] [9]
 *        [10]
 *        [11]
 *
 * R face (index 0, top): edges touch faces 1,2,3,4
 * D face (index 4, upper-left): edges touch faces 0,3,7,8
 * U turn: rotates the top "ring" (faces 0-4) and bottom faces.
 */
const MEGA_R_ADJ = [1, 2, 3, 4]; // faces adjacent to R (face 0)
const MEGA_D_ADJ = [3, 7, 8, 4]; // faces adjacent to D (face 4) - simplified

function rotateMegaminxFace(s: MegaminxState, faceIdx: number): void {
	const face = s.faces[faceIdx]!;
	// Rotate corners (indices 1-5) CW
	const corners = face.slice(1, 6);
	face[1] = corners[4]!;
	for (let i = 2; i <= 5; i++) face[i] = corners[i - 2]!;
	// Rotate edges (indices 6-10) CW
	const edges = face.slice(6, 11);
	face[6] = edges[4]!;
	for (let i = 7; i <= 10; i++) face[i] = edges[i - 7]!;

	// Swap corner and edge stickers with adjacent faces to make scramble visible
	const adjFaces = faceIdx === 0 ? MEGA_R_ADJ : faceIdx === 4 ? MEGA_D_ADJ : [];
	for (let ci = 0; ci < 4; ci++) {
		const adjFaceIdx = adjFaces[ci]!;
		const adjFace = s.faces[adjFaceIdx]!;
		// Swap one corner and one edge between the faces
		const tmpCorner = adjFace[1]!;
		adjFace[1] = face[1 + ci]!;
		face[1 + ci] = tmpCorner;
		const tmpEdge = adjFace[6]!;
		adjFace[6] = face[6 + ci]!;
		face[6 + ci] = tmpEdge;
	}
}

function rotateMegaminxU(s: MegaminxState): void {
	// U turn: cycle faces [0,1,2,3,4] and [5,6,7,8,9]
	// Upper ring: [0,1,2,3,4] → [4,0,1,2,3] (clockwise looking from top is 0→1→2→3→4→0)
	// But U is defined differently, so just do a simple swap chain.
	// Simplification: rotate each face in the upper and lower ring
	for (const faceIdx of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
		rotateMegaminxFace(s, faceIdx);
	}
}

export function applyMegaminxMoves(s: MegaminxState, seq: string): void {
	const moves = seq.trim().split(/\s+/).filter(Boolean);
	for (const m of moves) applyMegaminxMove(s, m);
}

export function generateMegaminxScramble(): string {
	// Pochmann format: 7 lines, each line: 10 R/D moves + 1 U at end
	const lines: string[] = [];
	for (let line = 0; line < 7; line++) {
		const lineMoves: string[] = [];
		for (let i = 0; i < 10; i++) {
			const face = randInt(2) ? 'R' : 'D';
			const dir = randInt(2) ? '++' : '--';
			lineMoves.push(face + dir);
		}
		lineMoves.push(randInt(2) ? 'U' : "U'");
		lines.push(lineMoves.join(' '));
	}
	return lines.join('\n');
}

// ============================================================
// Unified puzzle state type & factory
// ============================================================

import type { PuzzleType } from './types';

export type PuzzleState =
	| { type: 'cube'; data: CubeState }
	| { type: 'pyraminx'; data: PyraminxState }
	| { type: 'skewb'; data: SkewbState }
	| { type: 'clock'; data: ClockState }
	| { type: 'square-one'; data: SquareOneState }
	| { type: 'megaminx'; data: MegaminxState };

/** Create solved state for a puzzle type */
export function createPuzzleState(type: PuzzleType): PuzzleState {
	switch (type) {
		case '2x2': return { type: 'cube', data: createCube(2) };
		case '3x3': return { type: 'cube', data: createCube(3) };
		case '4x4': return { type: 'cube', data: createCube(4) };
		case '5x5': return { type: 'cube', data: createCube(5) };
		case '6x6': return { type: 'cube', data: createCube(6) };
		case '7x7': return { type: 'cube', data: createCube(7) };
		case 'pyraminx': return { type: 'pyraminx', data: createPyraminx() };
		case 'skewb': return { type: 'skewb', data: createSkewb() };
		case 'clock': return { type: 'clock', data: createClock() };
		case 'square-one': return { type: 'square-one', data: createSquareOne() };
		case 'megaminx': return { type: 'megaminx', data: createMegaminx() };
		default: return { type: 'cube', data: createCube(3) };
	}
}

/** Generate scramble sequence for a puzzle type */
export function generateScramble(type: PuzzleType): string {
	switch (type) {
		case '2x2': return generateCubeScramble(2);
		case '3x3': return generateCubeScramble(3);
		case '4x4': return generateCubeScramble(4);
		case '5x5': return generateCubeScramble(5);
		case '6x6': return generateCubeScramble(6);
		case '7x7': return generateCubeScramble(7);
		case 'pyraminx': return generatePyraminxScramble();
		case 'skewb': return generateSkewbScramble();
		case 'clock': return generateClockScramble();
		case 'square-one': return generateSquareOneScramble();
		case 'megaminx': return generateMegaminxScramble();
		default: return generateCubeScramble(3);
	}
}

/** Apply move sequence to a puzzle state (mutates) */
export function applyPuzzleMoves(state: PuzzleState, sequence: string): void {
	switch (state.type) {
		case 'cube':
			applyCubeMoves(state.data, sequence);
			break;
		case 'pyraminx':
			applyPyraminxMoves(state.data, sequence);
			break;
		case 'skewb':
			applySkewbMoves(state.data, sequence);
			break;
		case 'clock':
			applyClockMoves(state.data, sequence);
			break;
		case 'square-one':
			applySquareOneMoves(state.data, sequence);
			break;
		case 'megaminx':
			applyMegaminxMoves(state.data, sequence);
			break;
	}
}
