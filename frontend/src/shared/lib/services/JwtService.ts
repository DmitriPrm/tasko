const ACCESS_KEY = "tasko_access_token";
const REFRESH_KEY = "tasko_refresh_token";

export const JwtService = {
	getToken() {
		return localStorage.getItem(ACCESS_KEY);
	},
	getRefreshToken() {
		return localStorage.getItem(REFRESH_KEY);
	},
	saveTokens({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }) {
		localStorage.setItem(ACCESS_KEY, accessToken);
		localStorage.setItem(REFRESH_KEY, refreshToken);
	},
	destroyTokens() {
		localStorage.removeItem(ACCESS_KEY);
		localStorage.removeItem(REFRESH_KEY);
	},
};
