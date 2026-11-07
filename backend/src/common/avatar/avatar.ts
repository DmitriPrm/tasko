const AVATAR_COLORS = ["#2563EB", "#059669", "#D97706", "#7C3AED", "#DC2626", "#0891B2", "#4F46E5"];

export function getInitials(fullName: string) {
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	if (!parts.length) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function getAvatarColor(seed: string) {
	const hash = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
	return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
