import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { ElMessage } from "element-plus";

import { apiInstance } from "@/shared/api/v0/base";
import { JwtService } from "@/shared/lib/services/JwtService";

interface PendingRequest {
	resolve: (token: string) => void;
	reject: (error: unknown) => void;
}

const AUTH_URLS = ["/auth/login", "/auth/refresh"];

let isRefreshing = false;
let pendingRequests: PendingRequest[] = [];

const flushPending = (token: string | null, error?: unknown) => {
	const queue = pendingRequests;
	pendingRequests = [];
	queue.forEach((request) => (token ? request.resolve(token) : request.reject(error)));
};

function onRequest(config: InternalAxiosRequestConfig) {
	const token = JwtService.getToken();
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}

	return config;
}

async function onResponseRejected(error: AxiosError<{ error?: { message?: string } }>) {
	const status = error.response?.status;
	const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

	const isAuthRequest = AUTH_URLS.some((url) => original?.url?.includes(url));

	if (status === 401 && original && !original._retry && !isAuthRequest) {
		if (isRefreshing) {
			return new Promise((resolve, reject) => {
				pendingRequests.push({
					resolve: (token) => {
						original.headers.Authorization = `Bearer ${token}`;
						original._retry = true;
						resolve(apiInstance(original));
					},
					reject,
				});
			});
		}

		original._retry = true;
		isRefreshing = true;

		try {
			const refreshToken = JwtService.getRefreshToken();
			if (!refreshToken) {
				throw new Error("No refresh token");
			}

			const { data } = await apiInstance.post("/auth/refresh", { refreshToken });
			JwtService.saveTokens(data.data);
			flushPending(data.data.accessToken);
			original.headers.Authorization = `Bearer ${data.data.accessToken}`;
			return apiInstance(original);
		} catch (refreshError) {
			flushPending(null, refreshError);
			JwtService.destroyTokens();
			const { router } = await import("@/app/providers/router");
			if (router.currentRoute.value.name !== "sign-in") {
				await router.push({ name: "sign-in" });
			}
		} finally {
			isRefreshing = false;
		}
	}

	const message = error.response?.data?.error?.message || "Не удалось выполнить запрос";
	if (status !== 401) {
		ElMessage.error(message);
	}

	return Promise.reject(error);
}

apiInstance.interceptors.request.use(onRequest);
apiInstance.interceptors.response.use((response) => response, onResponseRejected);
