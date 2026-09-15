import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

function requireSecret(name: string) {
  const value = process.env[name] || '';
  if (value.length < 24) throw new Error(`${name} must be at least 24 characters`);
}

function validateHttpsUrl(name: string, required = false) {
  const value = process.env[name];
  if (!value) {
    if (required) throw new Error(`${name} is required in production`);
    return;
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
  if (parsed.protocol !== 'https:') throw new Error(`${name} must use HTTPS in production`);
}

function validateEnv() {
  const required = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_ACCESS_SECRET',
    'OTP_PEPPER',
    'REFRESH_TOKEN_PEPPER',
    'IP_HASH_PEPPER',
    'SERIAL_HASH_PEPPER',
    'S3_ENDPOINT',
    'S3_ACCESS_KEY',
    'S3_SECRET_KEY',
    'S3_PRIVATE_BUCKET',
    'S3_PUBLIC_BUCKET',
  ];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`${key} is required`);
  }

  for (const key of ['JWT_ACCESS_SECRET', 'OTP_PEPPER', 'REFRESH_TOKEN_PEPPER', 'IP_HASH_PEPPER', 'SERIAL_HASH_PEPPER']) {
    requireSecret(key);
  }

  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? (process.env.NODE_ENV === 'production' ? '1' : '0'));
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 10) {
    throw new Error('TRUST_PROXY_HOPS must be an integer between 0 and 10');
  }

  if (process.env.NODE_ENV === 'production') {
    if (process.env.OTP_DEV_CODE) throw new Error('OTP_DEV_CODE must not be set in production');
    if (!(process.env.CORS_ORIGINS || '').trim()) throw new Error('CORS_ORIGINS is required in production');
    validateHttpsUrl('S3_PUBLIC_ENDPOINT', true);
    validateHttpsUrl('PUBLIC_MEDIA_BASE_URL', true);

    if (process.env.OTP_DELIVERY_WEBHOOK_URL) {
      validateHttpsUrl('OTP_DELIVERY_WEBHOOK_URL');
      requireSecret('OTP_DELIVERY_WEBHOOK_SECRET');
    }
    if (process.env.KYC_PROVIDER_BASE_URL) {
      validateHttpsUrl('KYC_PROVIDER_BASE_URL');
      requireSecret('KYC_PROVIDER_API_KEY');
      requireSecret('KYC_WEBHOOK_SECRET');
      validateHttpsUrl('KYC_WEBHOOK_PUBLIC_URL', true);
    }
  }
}

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const express = app.getHttpAdapter().getInstance();
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? (process.env.NODE_ENV === 'production' ? '1' : '0'));
  express.set('trust proxy', trustProxyHops > 0 ? trustProxyHops : false);

  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const origins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins.length ? origins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT || 3000), '0.0.0.0');
}

bootstrap();
