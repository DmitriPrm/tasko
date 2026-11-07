import { Injectable, PipeTransform } from "@nestjs/common";

import { assertTableCode } from "./table-layout.validation";

@Injectable()
export class TableCodePipe implements PipeTransform<string, string> {
	transform(value: string) {
		return assertTableCode(value);
	}
}
