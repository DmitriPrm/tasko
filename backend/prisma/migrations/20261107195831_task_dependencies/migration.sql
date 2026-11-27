-- CreateEnum
CREATE TYPE "DependencyType" AS ENUM ('BLOCKS', 'RELATED');

-- CreateTable
CREATE TABLE "task_dependencies" (
    "id" TEXT NOT NULL,
    "source_task_id" TEXT NOT NULL,
    "target_task_id" TEXT NOT NULL,
    "type" "DependencyType" NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_dependencies_target_task_id_idx" ON "task_dependencies"("target_task_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_dependencies_source_task_id_target_task_id_key" ON "task_dependencies"("source_task_id", "target_task_id");

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_source_task_id_fkey" FOREIGN KEY ("source_task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_target_task_id_fkey" FOREIGN KEY ("target_task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
