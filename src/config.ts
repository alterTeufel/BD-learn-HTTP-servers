import process from "node:process";
import { MigrationConfig } from "drizzle-orm/migrator";

process.loadEnvFile();

function envOrThrow(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function portOrThrow(): number {
  const port = Number(envOrThrow("PORT"));

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid port number");
  }

  return port;
}

export type APIConfig = {
  port: number;
  fileserverHits: number;
  platform: string;
};

export type DBConfig = {
  url:string;
  migrationConfig: MigrationConfig;
}

export const config: {
  api: APIConfig;
  db: DBConfig;
} = {
  api: {
    port: portOrThrow(),
    fileserverHits: 0,
    platform: envOrThrow("PLATFORM"),
  },
  db: {
    url: envOrThrow("DB_URL"),
    migrationConfig: {
      migrationsFolder: "./src/db/migrations",
    },
  },
};

