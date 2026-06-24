import { getHex } from '../colors';
import type { PyraminxState } from './scramble-generator';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Face labels
const FACE_LABELS: Record<number, string> = { 0: 'F', 1: 'D', 2: 'L', 3: 'R' };

/**
 * Pyraminx renderer: 4 triangular faces in bow-tie layout.
 *
 * Layout (each triangle side = S):
 *
 *       [F]
 *   [L]     [R]
 *       [D]
 *
 * Triangle S = 120px. Bow-tie: F on top, D on bottom, L left, R right.
 */

const S = 120; // triangle side length
const H = S * Math.sqrt(3) / 2; // triangle height = S * √3 / 2
const PAD = 10;

const SVG_W = S * 2 + PAD * 3;
const SVG_H = H * 2 + PAD * 3;

// Center of each face's bounding box in the SVG
// F: top center
// D: bottom center
// L: left middle
// R: right middle
// All four share the center vertex of the bow-tie

const cx = SVG_W / 2;
const cy = SVG_H / 2;

// Each face is an equilateral triangle. The bow-tie center is at (cx, cy).
// F points UP: apex at (cx, cy - H/2)
// D points DOWN: apex at (cx, cy + H/2)
// L points LEFT: apex at (cx - H/2, cy)
// R points RIGHT: apex at (cx + H/2, cy)
// But wait, the triangles share edges at the center.

// Actually, the bow-tie layout has triangles sharing edges:
// F: base horizontal, apex up. Center point is midpoint of base.
// D: base horizontal, apex down. Center point is midpoint of base.
// L: base vertical, apex left.
// R: base vertical, apex right.
// All share the center point.

// F triangle: extends UP from center. Center is midpoint of base edge.
//   Vertices: top-apex (cx, cy-H), base-left (cx-S/2, cy), base-right (cx+S/2, cy)
// D triangle: extends DOWN from center.
//   Vertices: bottom-apex (cx, cy+H), base-left (cx-S/2, cy), base-right (cx+S/2, cy)
// L triangle: extends LEFT from center. Center is midpoint of right edge.
//   Vertices: left-apex (cx-H, cy), base-top (cx, cy-S/2), base-bottom (cx, cy+S/2)
// R triangle: extends RIGHT from center.
//   Vertices: right-apex (cx+H, cy), base-top (cx, cy-S/2), base-bottom (cx, cy+S/2)

// Hmm, this doesn't quite work because the base lengths don't match S.
// Let me use proper equilateral triangles.

// For F (pointing up): base at y=cy, apex at y=cy-H
//   vertices: top=(cx, cy-H), left=(cx-S/2, cy), right=(cx+S/2, cy)
// For D (pointing down): base at y=cy, apex at y=cy+H
//   vertices: bottom=(cx, cy+H), left=(cx-S/2, cy), right=(cx+S/2, cy)
// For L (pointing left):
//   vertices: left=(cx-H, cy), top=(cx, cy-S/2), bottom=(cx, cy+S/2)
// For R (pointing right):
//   vertices: right=(cx+H, cy), top=(cx, cy-S/2), bottom=(cx, cy+S/2)

// Actually verifying: top-left edge of F = dist((cx,cy-H), (cx-S/2,cy))
// = sqrt((S/2)^2 + H^2) = sqrt(S^2/4 + 3S^2/4) = sqrt(S^2) = S ✓

// But L triangle: top to left = dist((cx,cy-S/2), (cx-H,cy))
// = sqrt(H^2 + S^2/4) = S ✓

// So the triangles share the center edges:
// F's base is (cx-S/2,cy) to (cx+S/2,cy)
// D's base is (cx-S/2,cy) to (cx+S/2,cy) — same line
// L's right edge is (cx,cy-S/2) to (cx,cy+S/2) — vertical through center
// R's left edge is (cx,cy-S/2) to (cx,cy+S/2) — same line

// F and D share a horizontal edge. L and R share a vertical edge.
// F/D and L/R don't directly share edges (they cross at center).

// This gives the bow-tie effect. Let me implement it.

interface Triangle {
	apex: [number, number];
	baseLeft: [number, number];
	baseRight: [number, number];
}

const TRIANGLES: Record<number, Triangle> = {
	0: { // F - pointing up
		apex: [cx, cy - H],
		baseLeft: [cx - S / 2, cy],
		baseRight: [cx + S / 2, cy],
	},
	1: { // D - pointing down
		apex: [cx, cy + H],
		baseLeft: [cx - S / 2, cy],
		baseRight: [cx + S / 2, cy],
	},
	2: { // L - pointing left
		apex: [cx - H, cy],
		baseLeft: [cx, cy - S / 2],
		baseRight: [cx, cy + S / 2],
	},
	3: { // R - pointing right
		apex: [cx + H, cy],
		baseLeft: [cx, cy + S / 2],
		baseRight: [cx, cy - S / 2],
	},
};

/**
 * Sub-triangle positions within a face.
 * Face is divided into 9 small equilateral triangles.
 *
 * Indices (n=3, 9 sub-triangles):
 *      /\
 *     /0 \
 *    /_ _ \
 *   /\ 1 /\
 *  /2 \3 /4 \
 * /_ _ \/_ _ \
 * \ 5 /\ 6 /
 *  \7 /8 \9 /
 *   \/_ _ \/
 *
 * Wait that's 10...let me use 0-8:
 *
 * Upward and downward triangles alternate. For n=3:
 * Row 0 (1 up):    0
 * Row 1 (1 down, 1 up on each side): actually 3 triangles
 * Row 2 (2 up, 1 down, 2 up): 5 triangles
 * Total: 9
 *
 * Let me map them to barycentric coordinates (u, v, w) where u+v+w=1
 * Each sub-triangle center can be expressed as linear combination.
 *
 * Simpler: divide each triangle side into n=3 segments, draw the grid.
 */

function renderPyraminxFace(
	svg: SVGSVGElement,
	tri: Triangle,
	stickers: string[],
	faceIdx: number,
): void {
	const { apex, baseLeft, baseRight } = tri;
	const [ax, ay] = apex;
	const [blx, bly] = baseLeft;
	const [brx, bry] = baseRight;

	// Divide the triangle into a 3x3 grid of sub-triangles
	// Using barycentric subdivision.
	// Each sub-triangle vertex in barycentric coords, where each coord is multiples of 1/3.

	// Generate all grid points (4x4 grid for n=3)
	const pts: [number, number][] = [];
	for (let i = 0; i <= 3; i++) {
		for (let j = 0; j <= i; j++) {
			// Barycentric: (3-i, i-j, j) / 3
			// Point = (3-i)/3 * apex + (i-j)/3 * baseLeft + j/3 * baseRight
			const wa = (3 - i) / 3;
			const wl = (i - j) / 3;
			const wr = j / 3;
			pts.push([
				wa * ax + wl * blx + wr * brx,
				wa * ay + wl * bly + wr * bry,
			]);
		}
	}

	// Sub-triangles: 9 up-facing and down-facing triangles
	// Point indices by barycentric (i, j): idx = i*(i+1)/2 + j
	const idx = (i: number, j: number) => i * (i + 1) / 2 + j;

	interface SubTri { indices: [number, number, number]; stickerIdx: number }

	// Actually, the 9-sticker triangular grid with n=3 is:
	// Three rows of alternating up/down triangles:
	// Row 0 (y=0): 1 up tri using vertices (0,0), (1,0), (1,1)       → sticker 0
	// Row 1 (y=1): 3 tris:
	//   - up tri (1,0), (2,0), (2,1)                                → sticker 1
	//   - down tri (1,1), (2,2), (2,1)                              → sticker 2
	//   - up tri (1,1), (2,1), (2,2)                                → sticker 3
	// Row 2 (y=2): 5 tris:
	//   - up tri (2,0), (3,0), (3,1)                                → sticker 4
	//   - down tri (2,1), (3,2), (3,1)                              → sticker 5
	//   - up tri (2,1), (3,1), (3,2)                                → sticker 6
	//   - down tri (2,2), (3,3), (3,2)                              → sticker 7
	//   - up tri (2,2), (3,2), (3,3)                                → sticker 8

	// Wait, this doesn't look right either. Let me draw out the grid.
	//
	// Point grid (4 points per side = 10 points total):
	//       (0,0)
	//     (1,0)(1,1)
	//   (2,0)(2,1)(2,2)
	// (3,0)(3,1)(3,2)(3,3)
	//
	// Up triangles (pointing up) use vertices in this pattern:
	//   (i,j), (i+1,j), (i+1,j+1)  where i<3, j<=i
	// Down triangles (pointing down) use:
	//   (i+1,j), (i+1,j+1), (i,j+1)  where i<3, j<i
	//
	// Up triangles:
	// (0,0)-(1,0)-(1,1)      [row 0, 1 tri]
	// (1,0)-(2,0)-(2,1)      [row 1, 2 tris: left, right]
	// (1,1)-(2,1)-(2,2)
	// (2,0)-(3,0)-(3,1)      [row 2, 3 tris: left, mid, right]
	// (2,1)-(3,1)-(3,2)
	// (2,2)-(3,2)-(3,3)
	//
	// Down triangles:
	// (1,0)-(1,1)-(0,0) — actually this is same as up (0,0)
	// (2,0)-(2,1)-(1,0) — down between up (1,0) and up (1,1)
	// (2,1)-(2,2)-(1,1) — down
	// (3,0)-(3,1)-(2,0) — down
	// (3,1)-(3,2)-(2,1) — down
	// (3,2)-(3,3)-(2,2) — down
	//
	// So 6 up + 6 down = 12. But I need 9 total.
	// Actually for n=3 subdivision: n² = 9 triangles.
	// The n² formula works when we count only up OR down triangles, not both.
	//
	// For a triangle divided into n² small equilateral triangles,
	// they all point the same direction (up or down depending on convention).
	// There are also inverted triangles between them.
	//
	// Standard WCA pyraminx has 9 stickers: all pointing in the same direction,
	// or alternating? Looking at actual pyraminx images, the stickers are
	// arranged in a triangular pattern where each sticker is a small equilateral
	// triangle all pointing in the same orientation.
	//
	// For n=3, we have 9 upward-pointing triangles:
	// Row 0: 1 tri
	// Row 1: 2 tris
	// Row 2: 3 tris
	// Row 3: 3 tris ... wait 1+2+3+3=9
	//
	// Actually the "n²" = 9 means a triangle of side n gets divided into
	// n² *small congruent* triangles. For n=3:
	// Row 0: 1 tri
	// Row 1: 2 tris
	// Row 2: 3 tris
	// That's 1+2+3=6... that's only 6.
	//
	// Hmm, n² = 9 for n=3 means we have a triangular number sum:
	// 1 + 3 + 5 = 9. That's not n² in the arithmetic sense (that's 9).
	// Wait, 1+3+5 = 9 = 3². Yes! So it IS n².
	// Row 0: 1, Row 1: 3, Row 2: 5. Total = 9 = 3².
	//
	// But that's counting BOTH orientations. For pure up triangles:
	// Row 0: 1 up
	// Row 1: 2 up + 1 down = 3 total
	// Row 2: 3 up + 2 down = 5 total
	// So up triangles: 1+2+3 = 6, down: 1+2 = 3, total 9.
	//
	// For the WCA pyraminx, I believe all 9 stickers are the same orientation,
	// using the 6 up triangles + merging the 3 down triangles into larger shapes?
	// Or maybe the stickers cover the "cells" of a subdivided triangle where
	// all are upward-pointing small triangles.
	//
	// Actually, looking at images of pyraminx nets, each face has 9 stickers
	// that are all upward-pointing small equilateral triangles, with the inverted
	// (downward) triangles being gaps/creases.
	//
	// So I should render 6 upward triangles as stickers:
	// Row 0: 1, Row 1: 2, Row 2: 3 = 6 total
	//
	// But the plan says 9 stickers per face... Let me check again.
	// Actually a standard pyraminx has 9 stickers per face (3x3 triangle grid).
	// These are the "cells" of the subdivided mesh, including both orientations.
	//
	// Let me just render all 9 cells (6 up + 3 down) as stickers.
	// Each cell gets its color from the state array.

	const allTris: SubTri[] = [];

	// Up triangles: (i,j), (i+1,j), (i+1,j+1) for i=0..2, j=0..i
	for (let i = 0; i < 3; i++) {
		for (let j = 0; j <= i; j++) {
			allTris.push({
				indices: [idx(i, j), idx(i + 1, j), idx(i + 1, j + 1)] as [number, number, number],
				stickerIdx: allTris.length,
			});
		}
	}

	// Down triangles: (i+1,j), (i+1,j+1), (i,j+1) for i=1..2, j=0..i-1
	for (let i = 1; i < 3; i++) {
		for (let j = 0; j < i; j++) {
			allTris.push({
				indices: [idx(i + 1, j), idx(i + 1, j + 1), idx(i, j + 1)] as [number, number, number],
				stickerIdx: allTris.length,
			});
		}
	}

	// Draw background (face outline)
	const facePath = document.createElementNS(SVG_NS, 'path');
	const faceD = `M${ax},${ay} L${blx},${bly} L${brx},${bry} Z`;
	facePath.setAttribute('d', faceD);
	facePath.setAttribute('fill', '#1a1a1a');
	facePath.setAttribute('stroke', '#333');
	facePath.setAttribute('stroke-width', '2');
	svg.appendChild(facePath);

	// Draw each sub-triangle sticker
	for (const tri of allTris) {
		const [i0, i1, i2] = tri.indices;
		const [v0x, v0y] = pts[i0]!;
		const [v1x, v1y] = pts[i1]!;
		const [v2x, v2y] = pts[i2]!;
		// Small inset for gap effect
		const mx = (v0x + v1x + v2x) / 3;
		const my = (v0y + v1y + v2y) / 3;
		const inset = 0.85;

		const cx0 = mx + (v0x - mx) * inset;
		const cy0 = my + (v0y - my) * inset;
		const cx1 = mx + (v1x - mx) * inset;
		const cy1 = my + (v1y - my) * inset;
		const cx2 = mx + (v2x - mx) * inset;
		const cy2 = my + (v2y - my) * inset;

		const color = getHex(stickers[tri.stickerIdx] ?? 'A');

		const path = document.createElementNS(SVG_NS, 'path');
		path.setAttribute('d', `M${cx0},${cy0} L${cx1},${cy1} L${cx2},${cy2} Z`);
		path.setAttribute('fill', color);
		path.setAttribute('stroke', 'rgba(0,0,0,0.3)');
		path.setAttribute('stroke-width', '0.5');
		svg.appendChild(path);
	}

	// Face label
	const label = document.createElementNS(SVG_NS, 'text');
	const lx = (ax + blx + brx) / 3;
	const ly = (ay + bly + bry) / 3 + H * 0.3;
	label.setAttribute('x', String(lx));
	label.setAttribute('y', String(ly));
	label.setAttribute('text-anchor', 'middle');
	label.setAttribute('font-size', '14');
	label.setAttribute('fill', '#888');
	label.setAttribute('font-family', 'sans-serif');
	label.setAttribute('font-weight', 'bold');
	label.textContent = FACE_LABELS[faceIdx]!;
	svg.appendChild(label);
}

export function renderPyraminx(state: PyraminxState): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg');
	svg.setAttribute('xmlns', SVG_NS);
	svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
	svg.setAttribute('width', String(SVG_W));
	svg.setAttribute('height', String(SVG_H));
	svg.style.display = 'block';
	svg.style.margin = '0 auto';

	for (let i = 0; i < 4; i++) {
		renderPyraminxFace(svg, TRIANGLES[i]!, state.faces[i]!, i);
	}

	return svg;
}
