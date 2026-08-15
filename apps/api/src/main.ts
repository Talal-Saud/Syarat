import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { type Environment } from '@syarat/config';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { randomUUID } from 'node:crypto';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true })
  );

  const environment = app.get<Environment>('ENVIRONMENT');
  const corsOrigins = environment.CORS_ORIGINS.split(',').map((origin: string) => origin.trim());
  const fastify = app.getHttpAdapter().getInstance();

  await fastify.register(helmet, { contentSecurityPolicy: false });
  await fastify.register(cors, {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS']
  });

  fastify.addHook('onRequest', async (request, reply) => {
    const receivedRequestId = request.headers['x-request-id'];
    const correlationId =
      typeof receivedRequestId === 'string' && /^[a-zA-Z0-9_-]{8,128}$/.test(receivedRequestId)
        ? receivedRequestId
        : randomUUID();

    request.headers['x-request-id'] = correlationId;
    reply.header('x-request-id', correlationId);
  });

  app.setGlobalPrefix(environment.API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: false }
    })
  );

  const openApiConfig = new DocumentBuilder()
    .setTitle('Syarat API')
    .setDescription('REST API for the Syarat automotive marketplace and dealership SaaS.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, openApiConfig),
    { jsonDocumentUrl: 'docs/openapi.json' }
  );

  await app.listen({ port: environment.PORT, host: '0.0.0.0' });
}

void bootstrap();
