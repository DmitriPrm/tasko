import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { WrapResponseInterceptor } from "./common/interceptors/wrap-response.interceptor";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.setGlobalPrefix("api");
	app.enableShutdownHooks();
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

	const swaggerConfig = new DocumentBuilder()
		.setTitle("TASKO API")
		.setDescription("MVP системы управления проектами")
		.setVersion("0.1.0")
		.addBearerAuth()
		.build();

	SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, swaggerConfig));

	const port = Number(process.env.PORT) || 3000;
	await app.listen(port);
}

bootstrap();
