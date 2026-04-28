import { webcrypto } from "node:crypto";
import { env } from "./config/env.js";
import { buildApp } from "./app.js";

if (typeof globalThis.crypto === "undefined") {
  // @ts-ignore
  globalThis.crypto = webcrypto;
}

const app = await buildApp();

try {
  await app.listen({
    host: env.host,
    port: env.port
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
