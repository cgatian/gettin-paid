import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
			transformOptions: { enableImplicitConversion: true },
		}),
	);
	const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
	app.enableCors({
		origin: frontendUrl.split(",").map((s) => s.trim()),
		credentials: true,
	});
	app.setGlobalPrefix("api");
	const port = Number(process.env.PORT ?? 4000);
	await app.listen(port);
}

bootstrap();
