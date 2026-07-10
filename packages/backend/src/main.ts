import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RootConfig } from './config/configuration';

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

  await app.listen(appConfig.port);
  Logger.log(
    `IAM backend listening on :${appConfig.port} (prefix /${appConfig.apiPrefix})`,
    'Bootstrap',
  );
}

void bootstrap();
