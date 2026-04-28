import fp from "fastify-plugin";
import type { Db } from "mongodb";
import { closeMongo, connectMongo } from "../db/mongodb.js";

declare module "fastify" {
  interface FastifyInstance {
    mongo: Db;
  }
}

export const mongodbPlugin = fp(async (fastify) => {
  const db = await connectMongo();

  fastify.decorate("mongo", db);
  fastify.addHook("onClose", async () => {
    await closeMongo();
  });
});
