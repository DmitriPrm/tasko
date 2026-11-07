import { IsObject, Validate, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

import { assertColumnWidths } from "../table-layout.validation";

@ValidatorConstraint({ name: "columnWidths", async: false })
class ColumnWidthsConstraint implements ValidatorConstraintInterface {
	validate(value: unknown) {
		try {
			assertColumnWidths(value);
			return true;
		} catch {
			return false;
		}
	}

	defaultMessage() {
		return "Некорректные ширины колонок";
	}
}

export class SaveTableLayoutDto {
	@IsObject()
	@Validate(ColumnWidthsConstraint)
	widths: Record<string, number>;
}
