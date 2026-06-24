import { getHex } from './colors';
import type { CubeState } from './cube-simulator';

const SVG_NS = 'http://www.w3.org/2000/svg';

interface RenderOpts {
	stickerSize: number;
	gapSize: number;
	facePad: number;
	faceGap: number;
	borderRadius: number;
}

/** Positions in the cross-shaped net layout (col, row in face-grid units) */
const FACE_POSITIONS: Record<string, [number, number]> = {
	U: [1, 0],
	L: [0, 1],
	F: [1, 1],
	R: [2, 1],
	B: [3, 1],
	D: [1, 2],
};

/** Face display order (for consistent iteration) */
const FACE_ORDER = ['U', 'L', 'F', 'R', 'B', 'D'] as const;

/** Face labels in Chinese */
const FACE_LABELS: Record<string, string> = {
	U: 'U',
	L: 'L',
	F: 'F',
	R: 'R',
	B: 'B',
	D: 'D',
};

function autoOpts(n: number): RenderOpts {
	const stickerSize = Math.max(14, Math.floor(100 / n));
	return {
		stickerSize,
		gapSize: Math.max(1, Math.floor(stickerSize / 14)),
		facePad: Math.max(4, Math.floor(stickerSize / 6)),
		faceGap: Math.max(4, Math.floor(stickerSize / 5)),
		borderRadius: Math.max(2, Math.floor(stickerSize / 8)),
	};
}

function faceDim(n: number, opts: RenderOpts): number {
	return n * opts.stickerSize + (n - 1) * opts.gapSize + 2 * opts.facePad;
}

function faceOrigin(
	n: number,
	opts: RenderOpts,
	face: string,
): [number, number] {
	const dim = faceDim(n, opts);
	const [col, row] = FACE_POSITIONS[face] ?? [0, 0];
	return [
		col * (dim + opts.faceGap),
		row * (dim + opts.faceGap),
	];
}

function totalSize(n: number, opts: RenderOpts): [number, number] {
	const dim = faceDim(n, opts);
	return [
		4 * dim + 3 * opts.faceGap,
		3 * dim + 2 * opts.faceGap,
	];
}

/** Render a cube state to an SVG element */
export function renderCube(cube: CubeState): SVGSVGElement {
	const n = cube.n;
	const opts = autoOpts(n);
	const [svgW, svgH] = totalSize(n, opts);

	const svg = document.createElementNS(SVG_NS, 'svg');
	svg.setAttribute('xmlns', SVG_NS);
	svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
	svg.setAttribute('width', String(svgW));
	svg.setAttribute('height', String(svgH));
	svg.style.display = 'block';
	svg.style.margin = '0 auto';

	for (const face of FACE_ORDER) {
		renderFace(svg, face, cube.faces[face]!, n, opts);
	}

	return svg;
}

function renderFace(
	svg: SVGSVGElement,
	faceName: string,
	grid: string[][],
	n: number,
	opts: RenderOpts,
): void {
	const dim = faceDim(n, opts);
	const [fx, fy] = faceOrigin(n, opts, faceName);

	// Face background with rounded corners
	const bg = document.createElementNS(SVG_NS, 'rect');
	bg.setAttribute('x', String(fx));
	bg.setAttribute('y', String(fy));
	bg.setAttribute('width', String(dim));
	bg.setAttribute('height', String(dim));
	bg.setAttribute('rx', String(opts.borderRadius * 2));
	bg.setAttribute('ry', String(opts.borderRadius * 2));
	bg.setAttribute('fill', '#1a1a1a');
	bg.setAttribute('stroke', '#333');
	bg.setAttribute('stroke-width', '1');
	svg.appendChild(bg);

	// Stickers
	for (let r = 0; r < n; r++) {
		for (let c = 0; c < n; c++) {
			const sx = fx + opts.facePad + c * (opts.stickerSize + opts.gapSize);
			const sy = fy + opts.facePad + r * (opts.stickerSize + opts.gapSize);
			const color = getHex(grid[r]![c]!);

			const rect = document.createElementNS(SVG_NS, 'rect');
			rect.setAttribute('x', String(sx));
			rect.setAttribute('y', String(sy));
			rect.setAttribute('width', String(opts.stickerSize));
			rect.setAttribute('height', String(opts.stickerSize));
			rect.setAttribute('rx', String(opts.borderRadius));
			rect.setAttribute('ry', String(opts.borderRadius));
			rect.setAttribute('fill', color);
			rect.setAttribute('stroke', 'rgba(0,0,0,0.15)');
			rect.setAttribute('stroke-width', '0.5');
			svg.appendChild(rect);
		}
	}

	// Face label
	const label = document.createElementNS(SVG_NS, 'text');
	const labelX = fx + dim / 2;
	const labelY = fy + dim + opts.facePad + 12;
	label.setAttribute('x', String(labelX));
	label.setAttribute('y', String(labelY));
	label.setAttribute('text-anchor', 'middle');
	label.setAttribute('font-size', String(Math.max(10, opts.stickerSize * 0.4)));
	label.setAttribute('fill', '#888');
	label.setAttribute('font-family', 'sans-serif');
	label.textContent = FACE_LABELS[faceName] ?? faceName;
	svg.appendChild(label);
}
