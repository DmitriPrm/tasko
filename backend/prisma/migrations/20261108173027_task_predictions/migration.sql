-- CreateEnum
CREATE TYPE "ModelKind" AS ENUM ('DURATION', 'RISK');

-- CreateEnum
CREATE TYPE "PredictionTrigger" AS ENUM ('CREATED', 'UPDATED', 'MANUAL');

-- CreateTable
CREATE TABLE "model_versions" (
    "id" TEXT NOT NULL,
    "kind" "ModelKind" NOT NULL,
    "version" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "trained_at" TIMESTAMP(3),
    "sample_size" INTEGER,
    "data_source" TEXT,
    "metrics" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_predictions" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "trigger" "PredictionTrigger" NOT NULL,
    "duration_hours" DOUBLE PRECISION,
    "risk_probability" DOUBLE PRECISION,
    "duration_model_id" TEXT,
    "risk_model_id" TEXT,
    "factors" JSONB NOT NULL,
    "input" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "model_versions_version_key" ON "model_versions"("version");

-- CreateIndex
CREATE INDEX "task_predictions_task_id_created_at_idx" ON "task_predictions"("task_id", "created_at");

-- AddForeignKey
ALTER TABLE "task_predictions" ADD CONSTRAINT "task_predictions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_predictions" ADD CONSTRAINT "task_predictions_duration_model_id_fkey" FOREIGN KEY ("duration_model_id") REFERENCES "model_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_predictions" ADD CONSTRAINT "task_predictions_risk_model_id_fkey" FOREIGN KEY ("risk_model_id") REFERENCES "model_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
