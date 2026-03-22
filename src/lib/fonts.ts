export type AppFont = 'dm-sans' | 'space-grotesk' | 'inter' | 'bricolage-grotesque';

export interface FontOption {
	id: AppFont;
	label: string;
	family: string;
	stack: string;
}

export const defaultFont: AppFont = 'dm-sans';

export const fontOptions: FontOption[] = [
	{
		id: 'dm-sans',
		label: 'Calm',
		family: 'DM Sans',
		stack: "'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
	},
	{
		id: 'space-grotesk',
		label: 'Modern',
		family: 'Space Grotesk',
		stack: "'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
	},
	{
		id: 'inter',
		label: 'Minimal',
		family: 'Inter',
		stack: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
	},
	{
		id: 'bricolage-grotesque',
		label: 'Expressive',
		family: 'Bricolage Grotesque',
		stack: "'Bricolage Grotesque', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
	}
];

const fontOptionsById = new Map(fontOptions.map((option) => [option.id, option]));

export function isAppFont(value: unknown): value is AppFont {
	return typeof value === 'string' && fontOptionsById.has(value as AppFont);
}

export function getFontOption(font: AppFont): FontOption {
	return fontOptionsById.get(font) ?? fontOptionsById.get(defaultFont)!;
}

export function getFontStack(font: AppFont): string {
	return getFontOption(font).stack;
}
