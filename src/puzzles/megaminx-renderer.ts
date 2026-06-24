import { getHex } from '../colors';
import type { MegaminxState } from './scramble-generator';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Megaminx renderer: 12 pentagonal faces in unfolded net layout.
 *
 * Net arrangement:
 *         [0]              (top)
 *   [4]  [3]  [2]  [1]     (upper ring)
 * [8] [7] [6] [5] [9]      (lower ring)
 *         [10]              (bottom)
 *         [11]              (bottom tip)
 *
 * Each face: 11 stickers — 1 center, 5 corners, 5 edges.
 */

const PENT_R = 44; // circumradius
const PAD = 12;    // spacing between pentagons

function pentVertices(cx: number, cy: number, r: number): [number, number][] {
	const verts: [number, number][] = [];
	for (let i = 0; i < 5; i++) {
		const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
		verts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
	}
	return verts;
}

// Horizontal and vertical spacing units
const SW = PENT_R * 2 + PAD; // 100
// For pentagonal tiling: vertical distance between rows is approx 1.5 * r
const SH = PENT_R * 1.6;

// Layout: 12 face centers in net
function layout(): [number, number][] {
	// Base origin with padding
	const ox = SW * 2;
	const oy = SH * 0.8;

	return [
		[ox + SW * 1.0,  oy + SH * 0.0],  // 0: top center
		[ox + SW * 2.2,  oy + SH * 0.6],  // 1: upper ring far-right
		[ox + SW * 1.7,  oy + SH * 1.5],  // 2: upper ring right
		[ox + SW * 0.3,  oy + SH * 1.5],  // 3: upper ring left
		[ox + SW * -0.2, oy + SH * 0.6],  // 4: upper ring far-left
		[ox + SW * 1.7,  oy + SH * 2.8],  // 5: lower ring right
		[ox + SW * 1.0,  oy + SH * 2.8],  // 6: lower ring center
		[ox + SW * 0.3,  oy + SH * 2.8],  // 7: lower ring left
		[ox + SW * -0.2, oy + SH * 3.8],  // 8: bottom ring far-left
		[ox + SW * 2.2,  oy + SH * 3.8],  // 9: bottom ring far-right
		[ox + SW * 1.0,  oy + SH * 4.3],  // 10: bottom center
		[ox + SW * 1.0,  oy + SH * 5.3],  // 11: bottom tip
	];
}

const SVG_W = SW * 4 + PAD * 2;
const SVG_H = SH * 6.5 + PAD * 2;

function renderFace(
	svg: SVGSVGElement,
	cx: number, cy: number,
	stickers: string[],
): void {
	const verts = pentVertices(cx, cy, PENT_R);

	// Background pentagon
	const bg = document.createElementNS(SVG_NS, 'polygon');
	bg.setAttribute('points', verts.map(([x, y]) => `${x},${y}`).join(' '));
	bg.setAttribute('fill', '#1a1a1a');
	bg.setAttribute('stroke', '#444');
	bg.setAttribute('stroke-width', '1.5');
	svg.appendChild(bg);

	// Center sticker (small pentagon)
	const cVerts = pentVertices(cx, cy, PENT_R * 0.26);
	const cP = document.createElementNS(SVG_NS, 'polygon');
	cP.setAttribute('points', cVerts.map(([x, y]) => `${x},${y}`).join(' '));
	cP.setAttribute('fill', getHex(stickers[0] ?? 'A'));
	cP.setAttribute('stroke', 'rgba(0,0,0,0.35)');
	cP.setAttribute('stroke-width', '0.5');
	svg.appendChild(cP);

	// Corner stickers (indices 1-5)
	for (let i = 0; i < 5; i++) {
		const v = verts[i]!;
		const vn = verts[(i + 1) % 5]!;
		const vp = verts[(i + 4) % 5]!;

		// Interior points for the corner quad
		// p1: near the corner vertex on the edge to next vertex
		const p1x = v[0] * 0.65 + vn[0] * 0.20 + cx * 0.15;
		const p1y = v[1] * 0.65 + vn[1] * 0.20 + cy * 0.15;
		// p2: near the corner vertex on the edge to prev vertex
		const p2x = v[0] * 0.65 + vp[0] * 0.20 + cx * 0.15;
		const p2y = v[1] * 0.65 + vp[1] * 0.20 + cy * 0.15;
		// p3: interior near center
		const p3x = v[0] * 0.45 + cx * 0.40 + vn[0] * 0.075 + vp[0] * 0.075;
		const p3y = v[1] * 0.45 + cy * 0.40 + vn[1] * 0.075 + vp[1] * 0.075;

		const poly = document.createElementNS(SVG_NS, 'polygon');
		poly.setAttribute('points', `${v[0]},${v[1]} ${p1x},${p1y} ${p3x},${p3y} ${p2x},${p2y}`);
		poly.setAttribute('fill', getHex(stickers[1 + i] ?? 'A'));
		poly.setAttribute('stroke', 'rgba(0,0,0,0.3)');
		poly.setAttribute('stroke-width', '0.4');
		svg.appendChild(poly);
	}

	// Edge stickers (indices 6-10)
	for (let i = 0; i < 5; i++) {
		const v = verts[i]!;
		const vn = verts[(i + 1) % 5]!;

		// Edge as a trapezoid: outer edge of pentagon to inner points
		const eo1x = v[0] * 0.62 + vn[0] * 0.38;
		const eo1y = v[1] * 0.62 + vn[1] * 0.38;
		const eo2x = v[0] * 0.38 + vn[0] * 0.62;
		const eo2y = v[1] * 0.38 + vn[1] * 0.62;

		const ei1x = v[0] * 0.38 + vn[0] * 0.22 + cx * 0.40;
		const ei1y = v[1] * 0.38 + vn[1] * 0.22 + cy * 0.40;
		const ei2x = v[0] * 0.22 + vn[0] * 0.38 + cx * 0.40;
		const ei2y = v[1] * 0.22 + vn[1] * 0.38 + cy * 0.40;

		const poly = document.createElementNS(SVG_NS, 'polygon');
		poly.setAttribute('points', `${eo1x},${eo1y} ${eo2x},${eo2y} ${ei2x},${ei2y} ${ei1x},${ei1y}`);
		poly.setAttribute('fill', getHex(stickers[6 + i] ?? 'A'));
		poly.setAttribute('stroke', 'rgba(0,0,0,0.3)');
		poly.setAttribute('stroke-width', '0.4');
		svg.appendChild(poly);
	}
}

export function renderMegaminx(state: MegaminxState): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg');
	svg.setAttribute('xmlns', SVG_NS);
	svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
	svg.setAttribute('width', String(SVG_W));
	svg.setAttribute('height', String(SVG_H));
	svg.style.display = 'block';
	svg.style.margin = '0 auto';

	const centers = layout();
	for (let i = 0; i < 12; i++) {
		const [cx, cy] = centers[i]!;
		renderFace(svg, cx, cy, state.faces[i]!);
	}

	return svg;
}
