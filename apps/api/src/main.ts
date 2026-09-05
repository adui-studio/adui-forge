import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, new FastifyAdapter());
  app.setGlobalPrefix("api/v1");
  await app.listen(Number(process.env.PORT ?? 3000));
}

void bootstrap();
