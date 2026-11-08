import { TaskStatus } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { MlClient } from "./ml-client";
import { PredictionsService } from "./predictions.service";

describe("PredictionsService", () => {
	const task = {
		id: "t1",
		projectId: "p1",
		assigneeId: null,
		parentTaskId: null,
		title: "Задача",
		description: "",
		type: "TASK",
		priority: "MEDIUM",
		status: TaskStatus.TODO,
		isCompleted: false,
		deadlineAt: null,
		plannedStartAt: null,
		_count: { tags: 0 },
		dependenciesIn: [],
	};

	const prisma = {
		task: { findUnique: jest.fn(), findMany: jest.fn() },
		modelVersion: { findUnique: jest.fn(), upsert: jest.fn() },
		taskPrediction: { create: jest.fn() },
	};
	const ml = { enabled: true, predict: jest.fn(), modelsInfo: jest.fn() };
	const service = new PredictionsService(prisma as unknown as PrismaService, ml as unknown as MlClient);

	beforeEach(() => {
		jest.clearAllMocks();
		ml.enabled = true;
		prisma.task.findUnique.mockResolvedValue(task);
		prisma.task.findMany.mockResolvedValue([]);
		prisma.taskPrediction.create.mockImplementation(async ({ data }) => ({ id: "pred", ...data }));
	});

	it("does nothing when the ML service is not configured", async () => {
		ml.enabled = false;
		await expect(service.refresh("t1", "CREATED")).resolves.toBeNull();
		expect(prisma.task.findUnique).not.toHaveBeenCalled();
	});

	it("does not forecast a finished task", async () => {
		prisma.task.findUnique.mockResolvedValue({ ...task, status: TaskStatus.DONE });
		await expect(service.refresh("t1", "MANUAL")).resolves.toBeNull();
		expect(ml.predict).not.toHaveBeenCalled();
	});

	it("returns null instead of failing when the service is unavailable", async () => {
		ml.predict.mockResolvedValue(null);
		await expect(service.refresh("t1", "CREATED")).resolves.toBeNull();
		expect(prisma.taskPrediction.create).not.toHaveBeenCalled();
	});

	it("registers a new model version and stores the prediction", async () => {
		ml.predict.mockResolvedValue({
			predictedDurationHours: 12.5,
			durationModelVersion: "duration-v1",
			durationFactors: [],
			deadlineRiskProbability: 0.3,
			riskModelVersion: "risk-v1",
			topFactors: [{ feature: "priority", label: "Приоритет", impact: -0.1 }],
		});
		prisma.modelVersion.findUnique.mockImplementation(async ({ where }) =>
			where.version === "risk-v1" ? { id: "m-risk" } : null,
		);
		ml.modelsInfo.mockResolvedValue({
			duration: { version: "duration-v1", algorithm: "ridge", sampleSize: 900, metrics: { mae: 30 } },
			risk: { version: "risk-v1", algorithm: "logistic_regression" },
		});
		prisma.modelVersion.upsert.mockResolvedValue({ id: "m-duration" });

		const result = await service.refresh("t1", "CREATED");

		expect(prisma.modelVersion.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				create: expect.objectContaining({
					kind: "DURATION",
					version: "duration-v1",
					algorithm: "ridge",
					sampleSize: 900,
				}),
			}),
		);
		expect(prisma.taskPrediction.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					taskId: "t1",
					trigger: "CREATED",
					durationHours: 12.5,
					riskProbability: 0.3,
					durationModelId: "m-duration",
					riskModelId: "m-risk",
				}),
			}),
		);
		expect(result).not.toBeNull();
	});
});
