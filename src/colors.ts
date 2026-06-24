/** Standard Rubik's Cube face colors (hex values) */
export const FACE_COLORS: Record<string, string> = {
	W: '#FFFFFF', // White - U (Up)
	Y: '#FFD500', // Yellow - D (Down)
	G: '#009E60', // Green - F (Front)
	B: '#0051BA', // Blue - B (Back)
	R: '#C41E3A', // Red - R (Right)
	O: '#FF5800', // Orange - L (Left)
};

/** Default face-to-color mapping for a solved NxN cube */
export const DEFAULT_FACE_COLORS: Record<Face, string> = {
	U: 'W',
	D: 'Y',
	F: 'G',
	B: 'B',
	R: 'R',
	L: 'O',
};

/** Extra colors for custom fills and non-NxN puzzles */
export const EXTRA_COLORS: Record<string, string> = {
	A: '#808080', // Gray
	K: '#000000', // Black
	// Megaminx 12 colors (tnoodle palette)
	PK: '#FF69B4', // Pink
	LG: '#90EE90', // Light Green
	LB: '#87CEEB', // Light Blue
	PI: '#800080', // Purple
	PP: '#FFB6C1', // Pale Pink
	GY: '#A9A9A9', // Dark Gray
	// Additional megaminx shades
	DK: '#2F4F4F', // Dark Slate
	TN: '#D2B48C', // Tan
	MG: '#FF00FF', // Magenta
	CR: '#FF7F50', // Coral
	CY: '#00FFFF', // Cyan
	LM: '#BFFF00', // Lime
};

/** Get hex color for a sticker code */
export function getHex(code: string): string {
	return FACE_COLORS[code] ?? EXTRA_COLORS[code] ?? '#808080';
}

/** All supported face names */
export const FACES = ['U', 'D', 'F', 'B', 'R', 'L'] as const;
export type Face = (typeof FACES)[number];
