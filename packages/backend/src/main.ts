import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RootConfig } from './config/configuration';

const SWAGGER_PATH = 'api/docs';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const config = app.get(ConfigService<RootConfig>);

  const appConfig = config.getOrThrow<RootConfig['app']>('app');

  app.setGlobalPrefix(appConfig.apiPrefix);
  app.use(helmet());
  app.enableCors({
    origin: appConfig.corsOrigin,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('IT Asset Management API')
    .setDescription(
      'Enterprise IT Asset Lifecycle Management & Workflow Platform — asset inventory, allocations, returns, repairs, disposals, and audit trail.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  // Mounted at a fixed, non-prefixed path — deliberately not under
  // appConfig.apiPrefix, so the docs always live at /api/docs
  // regardless of API_PREFIX.
  SwaggerModule.setup(SWAGGER_PATH, app, swaggerDocument);

  await app.listen(appConfig.port);
  Logger.log(
    `IAM backend listening on :${appConfig.port} (prefix /${appConfig.apiPrefix})`,
    'Bootstrap',
  );
  Logger.log(`Swagger docs at /${SWAGGER_PATH}`, 'Bootstrap');
}

void bootstrap();
