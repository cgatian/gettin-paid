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
	console.log(`[CORS] FRONTEND_URL resolved to: "${frontendUrl}"`);
	const origins = frontendUrl
		.split(",")
		.map((s) => s.trim().replace(/\/+$/, ""));
	console.log(`[CORS] Allowed origins: ${JSON.stringify(origins)}`);
	app.enableCors({
		origin: origins,
		credentials: true,
		methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization", "Accept"],
	});
	app.setGlobalPrefix("api");
	const port = Number(process.env.PORT ?? 4000);
	await app.listen(port);
}

bootstrap();
