const BACKGROUNDS = ["#2563EB", "#059669", "#D97706", "#7C3AED", "#DC2626", "#0891B2", "#4F46E5", "#DB2777"];
const SKINS = ["#F6D7B8", "#E8B892", "#C68642", "#8D5524", "#FFDFC4"];
const HAIR = ["#1F2937", "#4B2E1F", "#92400E", "#F5D0A9", "#111827", "#B45309"];
const SHIRTS = ["#1D4ED8", "#047857", "#B45309", "#6D28D9", "#BE123C", "#0F766E", "#334155"];

function hashSeed(seed: string) {
	let hash = 2166136261;
	for (const char of seed) {
		hash ^= char.charCodeAt(0);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function pick<T>(hash: number, shift: number, items: T[]) {
	return items[(hash >>> shift) % items.length];
}

export function buildAvatarSvg(seed: string) {
	const hash = hashSeed(seed);
	const background = pick(hash, 0, BACKGROUNDS);
	const skin = pick(hash, 3, SKINS);
	const hair = pick(hash, 6, HAIR);
	const shirt = pick(hash, 9, SHIRTS);
	const hairStyle = (hash >>> 12) % 5;
	const glasses = (hash >>> 16) % 3 === 0;
	const beard = (hash >>> 18) % 4 === 0;

	const hairMarkup = [
		`<path d="M28 58c2-22 18-34 36-34s34 12 36 34c-8-10-18-14-36-14S36 48 28 58z" fill="${hair}"/>`,
		`<path d="M24 70c0-28 16-46 40-46s40 18 40 46v28c-10-8-22-12-40-12s-30 4-40 12V70z" fill="${hair}"/>`,
		`<path d="M30 62c4-24 16-36 34-36s30 12 34 36c-6-8-16-12-34-12s-28 4-34 12z" fill="${hair}"/>
		<circle cx="64" cy="30" r="14" fill="${hair}"/>`,
		`<path d="M34 64c6-20 16-30 30-30s24 10 30 30c-8-6-16-8-30-8s-22 2-30 8z" fill="${hair}"/>`,
		"",
	][hairStyle];

	const beardMarkup = beard
		? `<path d="M46 78c4 16 12 24 18 24s14-8 18-24c-6 6-12 8-18 8s-12-2-18-8z" fill="${hair}"/>`
		: "";
	const glassesMarkup = glasses
		? `<circle cx="52" cy="70" r="8" fill="none" stroke="#111827" stroke-width="2"/>
		<circle cx="76" cy="70" r="8" fill="none" stroke="#111827" stroke-width="2"/>
		<path d="M60 70h8" stroke="#111827" stroke-width="2"/>`
		: "";

	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
	<circle cx="64" cy="64" r="64" fill="${background}"/>
	<ellipse cx="64" cy="118" rx="36" ry="28" fill="${shirt}"/>
	<circle cx="64" cy="70" r="28" fill="${skin}"/>
	${hairMarkup}
	<circle cx="54" cy="70" r="2.4" fill="#111827"/>
	<circle cx="74" cy="70" r="2.4" fill="#111827"/>
	<path d="M58 82c4 4 8 4 12 0" fill="none" stroke="#9A3412" stroke-width="2" stroke-linecap="round"/>
	${beardMarkup}
	${glassesMarkup}
</svg>`;
}
