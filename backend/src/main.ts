import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.enableShutdownHooks();
	configureApp(app);

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
