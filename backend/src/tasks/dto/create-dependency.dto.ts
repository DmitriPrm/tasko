import { IsIn, IsUUID } from "class-validator";

/** Как текущая задача связана с выбранной */
export const DEPENDENCY_KINDS = ["DEPENDS_ON", "BLOCKS", "RELATED"] as const;
export type DependencyKind = (typeof DEPENDENCY_KINDS)[number];

export class CreateDependencyDto {
	@IsUUID()
	taskId: string;

	@IsIn(DEPENDENCY_KINDS)
	kind: DependencyKind;
}
