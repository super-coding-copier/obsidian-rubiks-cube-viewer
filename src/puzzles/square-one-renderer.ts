import { getHex } from '../colors';
import type { SquareOneState } from './scramble-generator';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Square-1 renderer: Top and bottom faces as circles split into 12 pieces each.
 *
 * Each piece: corner (60° = 2×30°) or edge (30°), alternating.
 * The state tracks 12 × 30° slots per face.
 *
 * Layout: Top face on left, bottom face on right, middle band between.
 */

const FACE_R = 100;
const FACE_GAP = 30;
const BAND_H = 20;

const CX1 = FACE_R + 10;
const CX2 = CX1 + FACE_R * 2 + FACE_GAP;
const CY = FACE_R + 20;

const SVG_W = CX2 + FACE_R + 10;
const SVG_H = CY * 2 + BAND_H + 20;

function renderSquareOneFace(
	svg: SVGSVGElement,
	fx: number, fy: number,
	pieces: string[],
): void {
	// Background circle
	const bg = document.createElementNS(SVG_NS, 'circle');
	bg.setAttribute('cx', String(fx));
	bg.setAttribute('cy', String(fy));
	bg.setAttribute('r', String(FACE_R));
	bg.setAttribute('fill', '#1a1a1a');
	bg.setAttribute('stroke', '#444');
	bg.setAttribute('stroke-width', '2');
	svg.appendChild(bg);

	// Draw each 30° slice
	for (let i = 0; i < 12; i++) {
		const startAngle = (i / 12) * Math.PI * 2 - Math.PI / 2;
		const endAngle = ((i + 1) / 12) * Math.PI * 2 - Math.PI / 2;

		// Outer arc points
		const innerR = FACE_R * 0.2; // inner hole

		const x1o = fx + Math.cos(startAngle) * FACE_R;
		const y1o = fy + Math.sin(startAngle) * FACE_R;
		const x2o = fx + Math.cos(endAngle) * FACE_R;
		const y2o = fy + Math.sin(endAngle) * FACE_R;
		const x1i = fx + Math.cos(startAngle) * innerR;
		const y1i = fy + Math.sin(startAngle) * innerR;
		const x2i = fx + Math.cos(endAngle) * innerR;
		const y2i = fy + Math.sin(endAngle) * innerR;

		const largeArc = 0; // 30° arc
		const color = getHex(pieces[i] ?? 'A');

		const path = document.createElementNS(SVG_NS, 'path');
		const d = `M${x1o},${y1o} A${FACE_R},${FACE_R} 0 ${largeArc} 1 ${x2o},${y2o} L${x2i},${y2i} A${innerR},${innerR} 0 ${largeArc} 0 ${x1i},${y1i} Z`;
		path.setAttribute('d', d);
		path.setAttribute('fill', color);
		path.setAttribute('stroke', 'rgba(0,0,0,0.4)');
		path.setAttribute('stroke-width', '0.8');
		svg.appendChild(path);
	}

	// Center cap
	const cap = document.createElementNS(SVG_NS, 'circle');
	cap.setAttribute('cx', String(fx));
	cap.setAttribute('cy', String(fy));
	cap.setAttribute('r', String(FACE_R * 0.15));
	cap.setAttribute('fill', '#333');
	cap.setAttribute('stroke', '#555');
	cap.setAttribute('stroke-width', '1');
	svg.appendChild(cap);
}

export function renderSquareOne(state: SquareOneState): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg');
	svg.setAttribute('xmlns', SVG_NS);
	svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
	svg.setAttribute('width', String(SVG_W));
	svg.setAttribute('height', String(SVG_H));
	svg.style.display = 'block';
	svg.style.margin = '0 auto';

	// Top face
	renderSquareOneFace(svg, CX1, CY, state.pieces.slice(0, 12));

	// Bottom face
	renderSquareOneFace(svg, CX2, CY, state.pieces.slice(12, 24));

	// Middle band (connects top and bottom in 3D)
	const bandY = CY + FACE_R + 5;
	const band = document.createElementNS(SVG_NS, 'rect');
	band.setAttribute('x', String(CX1 - FACE_R));
	band.setAttribute('y', String(bandY));
	band.setAttribute('width', String((CX2 + FACE_R) - (CX1 - FACE_R)));
	band.setAttribute('height', String(BAND_H));
	band.setAttribute('rx', '4');
	band.setAttribute('ry', '4');
	band.setAttribute('fill', '#1a1a1a');
	band.setAttribute('stroke', '#444');
	band.setAttribute('stroke-width', '1');
	svg.appendChild(band);

	// Center split line in band
	const split = document.createElementNS(SVG_NS, 'line');
	split.setAttribute('x1', String(CX1 - FACE_R));
	split.setAttribute('y1', String(bandY + BAND_H / 2));
	split.setAttribute('x2', String(CX2 + FACE_R));
	split.setAttribute('y2', String(bandY + BAND_H / 2));
	split.setAttribute('stroke', '#555');
	split.setAttribute('stroke-width', '1');
	split.setAttribute('stroke-dasharray', '4,4');
	svg.appendChild(split);

	// Labels
	for (const [cx, lbl] of [[CX1, 'Top'], [CX2, 'Bottom']] as [number, string][]) {
		const text = document.createElementNS(SVG_NS, 'text');
		text.setAttribute('x', String(cx));
		text.setAttribute('y', String(bandY + BAND_H + 16));
		text.setAttribute('text-anchor', 'middle');
		text.setAttribute('font-size', '12');
		text.setAttribute('fill', '#888');
		text.setAttribute('font-family', 'sans-serif');
		text.textContent = lbl;
		svg.appendChild(text);
	}

	return svg;
}
