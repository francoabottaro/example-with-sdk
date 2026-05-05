import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('bootstrap');
  // ? Is development environment?
  const configService = app.get(ConfigService);
  const env = configService.get<string>('NODE_ENV') ?? 'development';
  const isDev = env === 'development';

  // * Server port
  const port = configService.get<number>('PORT') ?? 3000;

  // * Global pipes for validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }),
  );

  if (isDev) {
    // * Swagger configuration
    const swaggerConfig = new DocumentBuilder()
      .setTitle('test-cloudinary API')
      .setDescription(
        'HTTP API (Swagger UI is enabled when NODE_ENV=development)',
      )
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('swagger', app, document);
  }

  // * Start server
  await app
    .listen(port)
    .then(() => {
      // * Log server is running
      logger.log(`Server is running on port ${port}`);
      if (isDev) {
        // * Log Swagger URL
        logger.verbose(`Swagger: http://localhost:${port}/swagger`);
      }
    })
    .catch((error) => {
      // ! Log error and exit process
      logger.error(error);
      process.exit(1);
    });
}
void bootstrap();
