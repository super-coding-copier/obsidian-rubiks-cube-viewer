import { getHex } from '../colors';
import type { SkewbState } from './scramble-generator';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Skewb renderer: 6 diamond-split square faces.
 *
 * Face layout (5 stickers per face):
 *        [1]
 *   [4] [0] [2]
 *        [3]
 *
 *  0 = center square
 *  1 = top corner triangle
 *  2 = right corner triangle
 *  3 = bottom corner triangle
 *  4 = left corner triangle
 *
 * Face arrangement in SVG:
 *      [U]
 * [L]  [F]  [R]  [B]
 *      [D]
 */

const FS = 80; // face size (square side)
const GAP = 8;

const FACE_POSITIONS: Record<number, [number, number]> = {
	0: [FS + GAP, 0],           // U
	1: [2 * (FS + GAP), FS + GAP], // R
	2: [FS + GAP, FS + GAP],    // F
	3: [FS + GAP, 2 * (FS + GAP)], // D
	4: [0, FS + GAP],           // L
	5: [3 * (FS + GAP), FS + GAP], // B
};

const SVG_W = 4 * (FS + GAP);
const SVG_H = 3 * (FS + GAP);

function renderSkewbFace(
	svg: SVGSVGElement,
	x: number, y: number,
	stickers: string[],
	faceIdx: number,
): void {
	const half = FS / 2;

	// Background
	const bg = document.createElementNS(SVG_NS, 'rect');
	bg.setAttribute('x', String(x));
	bg.setAttribute('y', String(y));
	bg.setAttribute('width', String(FS));
	bg.setAttribute('height', String(FS));
	bg.setAttribute('rx', '4');
	bg.setAttribute('ry', '4');
	bg.setAttribute('fill', '#1a1a1a');
	bg.setAttribute('stroke', '#333');
	bg.setAttribute('stroke-width', '1');
	svg.appendChild(bg);

	// Center square sticker
	const cs = FS * 0.3;
	const ctx = x + half;
	const cty = y + half;
	const crect = document.createElementNS(SVG_NS, 'rect');
	crect.setAttribute('x', String(ctx - cs / 2));
	crect.setAttribute('y', String(cty - cs / 2));
	crect.setAttribute('width', String(cs));
	crect.setAttribute('height', String(cs));
	crect.setAttribute('rx', String(cs * 0.15));
	crect.setAttribute('ry', String(cs * 0.15));
	crect.setAttribute('fill', getHex(stickers[0] ?? 'A'));
	crect.setAttribute('stroke', 'rgba(0,0,0,0.3)');
	crect.setAttribute('stroke-width', '0.5');
	svg.appendChild(crect);

	// Corner triangles: indices 1(top), 2(right), 3(bottom), 4(left)
	const corners: [string, [number, number][], number][] = [
		// top (1): triangle pointing down
		['top', [[x, y], [x + FS, y], [x + half, y + half]], 1],
		// right (2): triangle pointing left
		['right', [[x + FS, y], [x + FS, y + FS], [x + half, y + half]], 2],
		// bottom (3): triangle pointing up
		['bottom', [[x + FS, y + FS], [x, y + FS], [x + half, y + half]], 3],
		// left (4): triangle pointing right
		['left', [[x, y + FS], [x, y], [x + half, y + half]], 4],
	];

	const inset = 0.12; // inset from edge

	for (const [, pts, stickerIdx] of corners) {
		// Inset the corner triangle slightly
		const mx = (pts[0]![0] + pts[1]![0] + pts[2]![0]) / 3;
		const my = (pts[0]![1] + pts[1]![1] + pts[2]![1]) / 3;

		const ix0 = mx + (pts[0]![0] - mx) * (1 - inset);
		const iy0 = my + (pts[0]![1] - my) * (1 - inset);
		const ix1 = mx + (pts[1]![0] - mx) * (1 - inset);
		const iy1 = my + (pts[1]![1] - my) * (1 - inset);
		const ix2 = mx + (pts[2]![0] - mx) * (1 - inset);
		const iy2 = my + (pts[2]![1] - my) * (1 - inset);

		const path = document.createElementNS(SVG_NS, 'path');
		path.setAttribute('d', `M${ix0},${iy0} L${ix1},${iy1} L${ix2},${iy2} Z`);
		path.setAttribute('fill', getHex(stickers[stickerIdx] ?? 'A'));
		path.setAttribute('stroke', 'rgba(0,0,0,0.3)');
		path.setAttribute('stroke-width', '0.5');
		svg.appendChild(path);
	}
}

export function renderSkewb(state: SkewbState): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg');
	svg.setAttribute('xmlns', SVG_NS);
	svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
	svg.setAttribute('width', String(SVG_W));
	svg.setAttribute('height', String(SVG_H));
	svg.style.display = 'block';
	svg.style.margin = '0 auto';

	for (let i = 0; i < 6; i++) {
		const [px, py] = FACE_POSITIONS[i]!;
		renderSkewbFace(svg, px, py, state.faces[i]!, i);
	}

	return svg;
}
