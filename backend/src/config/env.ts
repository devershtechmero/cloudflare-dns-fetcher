import dotenv from "dotenv";

dotenv.config();

const requiredEnv = ["MONGODB_URI", "MONGODB_DB_NAME", "JWT_SECRET"] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  host: process.env.HOST ?? "0.0.0.0",
  port: Number(process.env.PORT ?? 7000),
  mongodbUri: process.env.MONGODB_URI as string,
  mongodbDbName: process.env.MONGODB_DB_NAME as string,
  jwtSecret: process.env.JWT_SECRET as string,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d"
};
