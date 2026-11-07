import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	Logger,
} from "@nestjs/common";
import { Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(HttpExceptionFilter.name);

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();

		const status =
			exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

		const exceptionResponse =
			exception instanceof HttpException ? exception.getResponse() : "Внутренняя ошибка сервера";

		const message =
			typeof exceptionResponse === "string"
				? exceptionResponse
				: Array.isArray((exceptionResponse as { message?: unknown }).message)
					? ((exceptionResponse as { message: string[] }).message).join(", ")
					: ((exceptionResponse as { message?: string }).message ?? "Ошибка запроса");

		if (status >= 500) {
			this.logger.error(exception);
		}

		response.status(status).json({
			error: {
				message,
				code: status,
			},
		});
	}
}
