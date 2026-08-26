export type RequiredEnvKey =
  | "MONGODB_URI"
  | "JWT_SECRET"
  ;

function requireEnv(key: RequiredEnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

/**
 * Lazy env lookup (so `next build` does not fail if env vars are not set during
 * build-time module evaluation).
 */
export function getEnv() {
  return {
    MONGODB_URI: requireEnv("MONGODB_URI"),
    JWT_SECRET: requireEnv("JWT_SECRET"),
  } as const;
}
