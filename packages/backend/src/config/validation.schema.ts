import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),

  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().port().default(5432),
  DB_USER: Joi.string().default('iam'),
  DB_PASSWORD: Joi.string().default('iam'),
  DB_NAME: Joi.string().default('iam'),
  DB_SSL: Joi.string().valid('true', 'false').default('false'),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).optional().allow(''),
  JWT_ACCESS_TTL_SECONDS: Joi.number().integer().positive().default(900),
  JWT_REFRESH_TTL_SECONDS: Joi.number()
    .integer()
    .positive()
    .default(60 * 60 * 24 * 14),
  JWT_ISSUER: Joi.string().default('iam-backend'),
  JWT_AUDIENCE: Joi.string().default('iam-frontend'),

  LOGIN_MAX_ATTEMPTS: Joi.number().integer().positive().default(5),
  LOGIN_LOCKOUT_MINUTES: Joi.number().integer().positive().default(15),

  PASSWORD_RESET_TTL_MINUTES: Joi.number().integer().positive().default(30),
  PASSWORD_RESET_URL_BASE: Joi.string()
    .uri()
    .default('http://localhost:5173/reset-password'),

  THROTTLE_TTL_SECONDS: Joi.number().integer().positive().default(60),
  THROTTLE_LIMIT_GLOBAL: Joi.number().integer().positive().default(120),
  THROTTLE_LIMIT_AUTH: Joi.number().integer().positive().default(10),

  BOOTSTRAP_ADMIN_EMAIL: Joi.string().email().allow('').optional(),
  BOOTSTRAP_ADMIN_PASSWORD: Joi.string().min(12).allow('').optional(),
});
