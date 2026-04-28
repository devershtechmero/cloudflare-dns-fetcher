import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jwtPlugin } from "./plugins/jwt.js";
import { mongodbPlugin } from "./plugins/mongodb.js";
import { authRoutes } from "./routes/auth.js";
import { healthRoutes } from "./routes/health.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDistPath = path.resolve(currentDir, "../../frontend/dist");

export async function buildApp() {
  const app = Fastify({
    logger: true,
    pluginTimeout: 20000,
  });

  await app.register(mongodbPlugin);
  await app.register(jwtPlugin);
  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(authRoutes);
    },
    { prefix: "/api" }
  );
  await app.register(fastifyStatic, {
    root: frontendDistPath,
    prefix: "/",
    wildcard: false,
    maxAge: "30d",
    immutable: true
  });

  app.setNotFoundHandler((request, reply) => {
    if (request.method === "GET" && !request.url.startsWith("/api")) {
      return reply.sendFile("index.html", {
        maxAge: 0,
        immutable: false
      });
    }

    return reply.code(404).send({ message: "Route not found" });
  });

  return app;
}
