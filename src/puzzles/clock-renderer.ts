import type { ClockState } from './scramble-generator';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Clock renderer: 2 circular faces side by side, each with 9 clock dials.
 *
 * Each face: circle with 9 small clock sub-dials in 3x3 grid.
 * Each sub-dial: circle with clock hand (line from center to edge).
 *
 * Pin layout (front face):
 *   UL(0)  U(1)  UR(2)
 *   L(3)   C(4)  R(5)
 *   DL(6)  D(7)  DR(8)
 */

const FACE_R = 120;
const DIAL_R = 28;
const DIAL_GAP = 8;
const FACE_GAP = 20;

const FACE_CX1 = FACE_R + 10;
const FACE_CX2 = FACE_CX1 + FACE_R * 2 + FACE_GAP;
const FACE_CY = FACE_R + 10;

const SVG_W = FACE_CX2 + FACE_R + 10;
const SVG_H = FACE_CY + FACE_R + 10;

// Sub-dial centers within a face (relative to face center)
function dialCenter(index: number): [number, number] {
	const col = index % 3; // 0, 1, 2
	const row = Math.floor(index / 3); // 0, 1, 2
	const step = (DIAL_R * 2 + DIAL_GAP);
	return [
		(col - 1) * step,
		(row - 1) * step,
	];
}

function renderClockFace(
	svg: SVGSVGElement,
	fx: number, fy: number,
	pins: number[],
	label: string,
): void {
	// Face circle background
	const faceBg = document.createElementNS(SVG_NS, 'circle');
	faceBg.setAttribute('cx', String(fx));
	faceBg.setAttribute('cy', String(fy));
	faceBg.setAttribute('r', String(FACE_R));
	faceBg.setAttribute('fill', '#1a1a1a');
	faceBg.setAttribute('stroke', '#444');
	faceBg.setAttribute('stroke-width', '2');
	svg.appendChild(faceBg);

	// Draw 9 sub-dials
	for (let i = 0; i < 9; i++) {
		const [dx, dy] = dialCenter(i);
		const cx = fx + dx;
		const cy = fy + dy;
		const hour = pins[i]!; // 0-11

		// Sub-dial background
		const dialBg = document.createElementNS(SVG_NS, 'circle');
		dialBg.setAttribute('cx', String(cx));
		dialBg.setAttribute('cy', String(cy));
		dialBg.setAttribute('r', String(DIAL_R));
		dialBg.setAttribute('fill', '#2a2a2a');
		dialBg.setAttribute('stroke', '#555');
		dialBg.setAttribute('stroke-width', '1');
		svg.appendChild(dialBg);

		// Tick marks (12 small circles around the dial)
		for (let t = 0; t < 12; t++) {
			const angle = (t / 12) * Math.PI * 2 - Math.PI / 2;
			const tickR = DIAL_R * 0.82;
			const tx = cx + Math.cos(angle) * tickR;
			const ty = cy + Math.sin(angle) * tickR;
			const tick = document.createElementNS(SVG_NS, 'circle');
			tick.setAttribute('cx', String(tx));
			tick.setAttribute('cy', String(ty));
			tick.setAttribute('r', String(DIAL_R * 0.06));
			tick.setAttribute('fill', t === 0 ? '#ff0' : '#666');
			svg.appendChild(tick);
		}

		// Clock hand (line from center to the hour position)
		const hourAngle = (hour / 12) * Math.PI * 2 - Math.PI / 2;
		const handLen = DIAL_R * 0.72;
		const hx = cx + Math.cos(hourAngle) * handLen;
		const hy = cy + Math.sin(hourAngle) * handLen;

		const hand = document.createElementNS(SVG_NS, 'line');
		hand.setAttribute('x1', String(cx));
		hand.setAttribute('y1', String(cy));
		hand.setAttribute('x2', String(hx));
		hand.setAttribute('y2', String(hy));
		hand.setAttribute('stroke', '#fff');
		hand.setAttribute('stroke-width', '2');
		hand.setAttribute('stroke-linecap', 'round');
		svg.appendChild(hand);

		// Center dot
		const dot = document.createElementNS(SVG_NS, 'circle');
		dot.setAttribute('cx', String(cx));
		dot.setAttribute('cy', String(cy));
		dot.setAttribute('r', String(DIAL_R * 0.08));
		dot.setAttribute('fill', '#fff');
		svg.appendChild(dot);
	}

	// 4 corner pins (small circles at the corners of the 3x3 grid)
	const pinPositions: [number, number][] = [];
	const step2 = DIAL_R * 2 + DIAL_GAP;
	pinPositions.push([-step2, -step2]); // UL
	pinPositions.push([step2, -step2]);  // UR
	pinPositions.push([step2, step2]);   // DR
	pinPositions.push([-step2, step2]);  // DL

	for (const [px, py] of pinPositions) {
		const pin = document.createElementNS(SVG_NS, 'circle');
		pin.setAttribute('cx', String(fx + px));
		pin.setAttribute('cy', String(fy + py));
		pin.setAttribute('r', String(DIAL_R * 0.18));
		pin.setAttribute('fill', '#555');
		pin.setAttribute('stroke', '#777');
		pin.setAttribute('stroke-width', '0.5');
		svg.appendChild(pin);
	}

	// Face label
	const lbl = document.createElementNS(SVG_NS, 'text');
	lbl.setAttribute('x', String(fx));
	lbl.setAttribute('y', String(fy + FACE_R + 16));
	lbl.setAttribute('text-anchor', 'middle');
	lbl.setAttribute('font-size', '12');
	lbl.setAttribute('fill', '#888');
	lbl.setAttribute('font-family', 'sans-serif');
	lbl.textContent = label;
	svg.appendChild(lbl);
}

export function renderClock(state: ClockState): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, 'svg');
	svg.setAttribute('xmlns', SVG_NS);
	svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
	svg.setAttribute('width', String(SVG_W));
	svg.setAttribute('height', String(SVG_H));
	svg.style.display = 'block';
	svg.style.margin = '0 auto';

	// Front face
	renderClockFace(svg, FACE_CX1, FACE_CY, state.pins.slice(0, 9), 'Front');
	// Back face
	renderClockFace(svg, FACE_CX2, FACE_CY, state.pins.slice(9, 18), 'Back');

	return svg;
}
