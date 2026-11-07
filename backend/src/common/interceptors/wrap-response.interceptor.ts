import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from "@nestjs/common";
import { Observable, map } from "rxjs";

@Injectable()
export class WrapResponseInterceptor implements NestInterceptor {
	intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
		return next.handle().pipe(
			map((data) => {
				if (data instanceof StreamableFile) return data;
				if (data && typeof data === "object" && "data" in data) {
					return data;
				}

				return { data };
			}),
		);
	}
}
