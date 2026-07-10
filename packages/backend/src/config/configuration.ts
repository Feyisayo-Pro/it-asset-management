export interface AppConfig {
  env: 'development' | 'test' | 'production';
  port: number;
  apiPrefix: string;
  corsOrigin: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
}

export interface JwtConfigValues {
  accessSecret: string;
  refreshSecret: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
  issuer: string;
  audience: string;
}

export interface LockoutConfig {
  maxAttempts: number;
  lockoutMinutes: number;
}

export interface PasswordResetConfig {
  ttlMinutes: number;
  urlBase: string;
}

export interface ThrottleConfig {
  ttlSeconds: number;
  limitGlobal: number;
  limitAuth: number;
}

export interface BootstrapConfig {
  adminEmail: string | undefined;
  adminPassword: string | undefined;
}

export interface RootConfig {
  app: AppConfig;
  database: DatabaseConfig;
  jwt: JwtConfigValues;
  lockout: LockoutConfig;
  passwordReset: PasswordResetConfig;
  throttle: ThrottleConfig;
  bootstrap: BootstrapConfig;
}

const num = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Config value "${value}" is not a number`);
  }
  return parsed;
};

const bool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
};

export const loadConfiguration = (): RootConfig => ({
  app: {
    env: (process.env.NODE_ENV as AppConfig['env']) ?? 'development',
    port: num(process.env.PORT, 3000),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  },
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: num(process.env.DB_PORT, 5432),
    username: process.env.DB_USER ?? 'iam',
    password: process.env.DB_PASSWORD ?? 'iam',
    database: process.env.DB_NAME ?? 'iam',
    ssl: bool(process.env.DB_SSL, false),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    accessTtlSeconds: num(process.env.JWT_ACCESS_TTL_SECONDS, 900),
    refreshTtlSeconds: num(process.env.JWT_REFRESH_TTL_SECONDS, 60 * 60 * 24 * 14),
    issuer: process.env.JWT_ISSUER ?? 'iam-backend',
    audience: process.env.JWT_AUDIENCE ?? 'iam-frontend',
  },
  lockout: {
    maxAttempts: num(process.env.LOGIN_MAX_ATTEMPTS, 5),
    lockoutMinutes: num(process.env.LOGIN_LOCKOUT_MINUTES, 15),
  },
  passwordReset: {
    ttlMinutes: num(process.env.PASSWORD_RESET_TTL_MINUTES, 30),
    urlBase: process.env.PASSWORD_RESET_URL_BASE ?? 'http://localhost:5173/reset-password',
  },
  throttle: {
    ttlSeconds: num(process.env.THROTTLE_TTL_SECONDS, 60),
    limitGlobal: num(process.env.THROTTLE_LIMIT_GLOBAL, 120),
    limitAuth: num(process.env.THROTTLE_LIMIT_AUTH, 10),
  },
  bootstrap: {
    adminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL || undefined,
    adminPassword: process.env.BOOTSTRAP_ADMIN_PASSWORD || undefined,
  },
});
