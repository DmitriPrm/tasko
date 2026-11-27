import { INestApplication, ValidationPipe } from "@nestjs/common";

import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { WrapResponseInterceptor } from "./common/interceptors/wrap-response.interceptor";

/** Общая настройка приложения: её используют и main.ts, и интеграционные тесты */
export function configureApp(app: INestApplication) {
	app.setGlobalPrefix("api");
	app.enableCors({
		origin: process.env.FRONTEND_URL || "http://localhost:5173",
		credentials: true,
	});
	app.useGlobalFilters(new HttpExceptionFilter());
	app.useGlobalInterceptors(new WrapResponseInterceptor());
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
			forbidNonWhitelisted: true,
		}),
	);
	return app;
}
