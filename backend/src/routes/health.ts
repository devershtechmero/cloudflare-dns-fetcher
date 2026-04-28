import type { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/health", async () => {
    await fastify.mongo.command({ ping: 1 });

    return {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  });
};
