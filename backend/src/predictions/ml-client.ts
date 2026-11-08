import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { MlTaskInput } from "./prediction-input";

export interface MlFactor {
	feature: string;
	label: string;
	impact: number;
	/** Значение признака у задачи; null — нет данных */
	value?: string | number | null;
}

export interface MlPrediction {
	predictedDurationHours: number | null;
	durationModelVersion: string | null;
	durationFactors?: MlFactor[];
	deadlineRiskProbability: number | null;
	riskModelVersion: string | null;
	topFactors?: MlFactor[];
}

export interface MlModelInfo {
	version: string;
	algorithm: string;
	trainedAt?: string | null;
	sampleSize?: number | null;
	dataSource?: string | null;
	metrics?: Record<string, number> | null;
}

export interface MlModelsInfo {
	duration: MlModelInfo | null;
	risk: MlModelInfo | null;
}

/**
 * HTTP-клиент сервиса прогноза (ml/service/app.py). Любая ошибка — сервис выключен, недоступен,
 * нет моделей — превращается в null: без прогноза задача всё равно сохраняется.
 */
@Injectable()
export class MlClient {
	private readonly logger = new Logger(MlClient.name);
	private readonly baseUrl: string;
	private readonly timeoutMs: number;

	constructor(config: ConfigService) {
		this.baseUrl = (config.get<string>("ML_SERVICE_URL") ?? "").replace(/\/+$/, "");
		this.timeoutMs = Number(config.get("ML_TIMEOUT_MS") ?? 3000) || 3000;
	}

	get enabled() {
		return Boolean(this.baseUrl);
	}

	predict(input: MlTaskInput) {
		return this.request<MlPrediction>("/predict", { method: "POST", body: JSON.stringify(input) });
	}

	modelsInfo() {
		return this.request<MlModelsInfo>("/models/info");
	}

	private async request<T>(path: string, init: RequestInit = {}): Promise<T | null> {
		if (!this.enabled) return null;
		try {
			const response = await fetch(`${this.baseUrl}${path}`, {
				...init,
				headers: { "Content-Type": "application/json" },
				signal: AbortSignal.timeout(this.timeoutMs),
			});
			if (!response.ok) {
				this.logger.warn(`ML ${path}: HTTP ${response.status}`);
				return null;
			}
			return (await response.json()) as T;
		} catch (error) {
			this.logger.warn(`ML ${path}: ${error instanceof Error ? error.message : String(error)}`);
			return null;
		}
	}
}
