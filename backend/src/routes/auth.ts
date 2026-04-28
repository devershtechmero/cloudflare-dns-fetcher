import type { FastifyPluginAsync } from "fastify";

type TokenRequestBody = {
  subject?: string;
};

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: TokenRequestBody }>("/auth/token", async (request, reply) => {
    const subject = request.body?.subject?.trim();

    if (!subject) {
      return reply.code(400).send({ message: "subject is required" });
    }

    const token = fastify.jwt.sign({ sub: subject });

    return { token };
  });
};
