import { getHex } from '../colors';
import type { MegaminxState } from './scramble-generator';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Megaminx renderer: 12 pentagonal faces in unfolded net layout.
 *
 * Face layout (11 stickers per pentagon):
 *   Center: index 0
 *   Corners (CW from top): indices 1-5
 *   Edges (between corners, CW from between 1-2): indices 6-10
 *
 * Pentagon net arrangement (tnoodle-style):
 *
 *         [0]         (top)
 *   [4] [3] [2] [1]   (upper ring)
 * [8] [7] [6] [5] [9]  (lower ring)
 *         [10]        (bottom)
 *             [11]    (bottom-right tip)
 *
 * Faces: 0..11 corresponding to color indices in solver order.
 */

const PENT_R = 40; // circumradius of pentagon
const PAD = 6;

// Pentagon vertices for a regular pentagon centered at (cx, cy)
function pentagonVertices(cx: number, cy: number, r: number): [number, number][] {
	const verts: [number, number][] = [];
	for (let i = 0; i < 5; i++) {
		const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
		verts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
	}
	return verts;
}

// Center positions for each face in the net
function faceCenter(idx: number): [number, number] {
	const dx = PENT_R * 2 + PAD;
	const dy = PENT_R * Math.cos(Math.PI / 5) * 2 + PAD;

	// Face centers in the unfolded net
	const positions: [number, number][] = [
		[dx * 2.5, dy * 0.5],            // 0: top
		[dx * 4.5, dy * 1.8],            // 1: upper right
		[dx * 4.0, dy * 1.8 + dy],       // 2: upper mid-right
		[dx * 1.0, dy * 1.8 + dy],       // 3: upper mid-left
		[dx * 0.5, dy * 1.8],            // 4: upper left
		[dx * 3.5, dy * 1.8 + dy * 1.9],// 5: lower mid-right
		[dx * 2.5, dy * 1.8 + dy * 2.0],// 6: lower center
		[dx * 1.5, dy * 1.8 + dy * 1.9],// 7: lower mid-left
		[dx * 1.0, dy * 1.8 + dy * 2.5],// 8: bottom-left
		[dx * 4.0, dy * 1.8 + dy * 2.5],// 9: bottom-right
		[dx * 2.5, dy * 1.8 + dy * 3.2],// 10: bottom
		[dx * 2.5, dy * 1.8 + dy * 4.0],// 11: bottom tip
	];

	return positions[idx] ?? [0, 0];
}

function renderMegaminxFace(
	svg: SVGSVGElement,
	cx: number, cy: number,
	stickers: string[],
	_faceIdx: number,
): void {
	const verts = pentagonVertices(cx, cy, PENT_R);
	const center = [cx, cy] as [number, number];

	// Background pentagon
	const bg = document.createElementNS(SVG_NS, 'polygon');
	bg.setAttribute('points', verts.map(([x, y]) => `${x},${y}`).join(' '));
	bg.setAttribute('fill', '#1a1a1a');
	bg.setAttribute('stroke', '#333');
	bg.setAttribute('stroke-width', '1');
	svg.appendChild(bg);

	// Center sticker (small pentagon)
	const centerVerts = pentagonVertices(cx, cy, PENT_R * 0.28);
	const centerPoly = document.createElementNS(SVG_NS, 'polygon');
	centerPoly.setAttribute('points', centerVerts.map(([x, y]) => `${x},${y}`).join(' '));
	centerPoly.setAttribute('fill', getHex(stickers[0] ?? 'A'));
	centerPoly.setAttribute('stroke', 'rgba(0,0,0,0.3)');
	centerPoly.setAttribute('stroke-width', '0.5');
	svg.appendChild(centerPoly);

	// Corner stickers (indices 1-5, CW from top)
	for (let i = 0; i < 5; i++) {
		const vCorner = verts[i]!;
		const vNext = verts[(i + 1) % 5]!;
		const vPrev = verts[(i + 4) % 5]!;

		// Corner sticker: triangle formed by corner vertex and two interior points
		const midNext: [number, number] = [
			(vCorner[0] * 0.4 + center[0] * 0.6),
			(vCorner[1] * 0.4 + center[1] * 0.6),
		];
		const midPrev: [number, number] = [
			(vCorner[0] * 0.4 + center[0] * 0.6),
			(vCorner[1] * 0.4 + center[1] * 0.6),
		];

		// Actually, corner is the area near the vertex, bounded by lines from center
		const pm: [number, number] = [
			(vCorner[0] * 0.72 + vNext[0] * 0.14 + vPrev[0] * 0.14),
			(vCorner[1] * 0.72 + vNext[1] * 0.14 + vPrev[1] * 0.14),
		];
		const pn: [number, number] = [
			(vNext[0] * 0.72 + center[0] * 0.14 + vCorner[0] * 0.14),
			(vNext[1] * 0.72 + center[1] * 0.14 + vCorner[1] * 0.14),
		];
		const pp: [number, number] = [
			(vPrev[0] * 0.72 + center[0] * 0.14 + vCorner[0] * 0.14),
			(vPrev[1] * 0.72 + center[1] * 0.14 + vCorner[1] * 0.14),
		];

		const cornerPoly = document.createElementNS(SVG_NS, 'polygon');
		cornerPoly.setAttribute('points', `${vCorner[0]},${vCorner[1]} ${pn[0]},${pn[1]} ${pm[0]},${pm[1]} ${pp[0]},${pp[1]}`);
		cornerPoly.setAttribute('fill', getHex(stickers[1 + i] ?? 'A'));
		cornerPoly.setAttribute('stroke', 'rgba(0,0,0,0.3)');
		cornerPoly.setAttribute('stroke-width', '0.4');
		svg.appendChild(cornerPoly);
	}

	// Edge stickers (indices 6-10, between corners)
	for (let i = 0; i < 5; i++) {
		const vCorner = verts[i]!;
		const vNext = verts[(i + 1) % 5]!;

		// Edge quad
		const pc1: [number, number] = [
			(vCorner[0] * 0.52 + vNext[0] * 0.38 + center[0] * 0.1),
			(vCorner[1] * 0.52 + vNext[1] * 0.38 + center[1] * 0.1),
		];
		const pc2: [number, number] = [
			(vCorner[0] * 0.38 + vNext[0] * 0.52 + center[0] * 0.1),
			(vCorner[1] * 0.38 + vNext[1] * 0.52 + center[1] * 0.1),
		];
		const pc3: [number, number] = [
			(vCorner[0] * 0.28 + vNext[0] * 0.28 + center[0] * 0.44),
			(vCorner[1] * 0.28 + vNext[1] * 0.28 + center[1] * 0.44),
		];
		const pc4: [number, number] = [
			(vCorner[0] * 0.28 + vNext[0] * 0.28 + center[0] * 0.44),
			(vCorner[1] * 0.28 + vNext[1] * 0.28 + center[1] * 0.44),
		];

		// Simplified: edge as trapezoid
		const em1: [number, number] = [
			(vCorner[0] * 0.6 + vNext[0] * 0.4),
			(vCorner[1] * 0.6 + vNext[1] * 0.4),
		];
		const em2: [number, number] = [
			(vCorner[0] * 0.4 + vNext[0] * 0.6),
			(vCorner[1] * 0.4 + vNext[1] * 0.6),
		];
		const ei1: [number, number] = [
			(vCorner[0] * 0.36 + vNext[0] * 0.24 + center[0] * 0.4),
			(vCorner[1] * 0.36 + vNext[1] * 0.24 + center[1] * 0.4),
		];
		const ei2: [number, number] = [
			(vCorner[0] * 0.24 + vNext[0] * 0.36 + center[0] * 0.4),
			(vCorner[1] * 0.24 + vNext[1] * 0.36 + center[1] * 0.4),
		];

		const edgePoly = document.createElementNS(SVG_NS, 'polygon');
		edgePoly.setAttribute('points', `${em1[0]},${em1[1]} ${em2[0]},${em2[1]} ${ei2[0]},${ei2[1]} ${ei1[0]},${ei1[1]}`);
		edgePoly.setAttribute('fill', getHex(stickers[6 + i] ?? 'A'));
		edgePoly.setAttribute('stroke', 'rgba(0,0,0,0.3)');
		edgePoly.setAttribute('stroke-width', '0.4');
		svg.appendChild(edgePoly);
	}
}

const SVG_W = 6 * (PENT_R * 2 + PAD);
const SVG_H = 5.5 * (PENT_R * 2 + PAD);

/** Adjust all face centers for a nice net layout */
function adjustLayout(): [number, number][] {
	const w = PENT_R * 2 + PAD;
	const h = PENT_R * Math.cos(Math.PI / 5) * 2 + PAD;

	return [
		[w * 2.5, h * 0.5],           // 0: top
		[w * 4.3, h * 1.8],           // 1: upper ring from right
		[w * 3.7, h * 2.8],           // 2
		[w * 1.3, h * 2.8],           // 3
		[w * 0.7, h * 1.8],           // 4
		[w * 3.7, h * 4.2],           // 5: lower ring
		[w * 2.5, h * 4.2],           // 6
		[w * 1.3, h * 4.2],           // 7
		[w * 1.3, h * 5.3],           // 8: bottom ring
		[w * 3.7, h * 5.3],           // 9
		[w * 2.5, h * 5.5],           // 10
		[w * 2.5, h * 6.5],           // 11
	];
}

export function renderMegaminx(state: MegaminxState): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg');
	svg.setAttribute('xmlns', SVG_NS);
	svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
	svg.setAttribute('width', String(SVG_W));
	svg.setAttribute('height', String(SVG_H));
	svg.style.display = 'block';
	svg.style.margin = '0 auto';

	const centers = adjustLayout();

	for (let i = 0; i < 12; i++) {
		const [cx, cy] = centers[i]!;
		renderMegaminxFace(svg, cx, cy, state.faces[i]!, i);
	}

	return svg;
}
