import fp from "fastify-plugin";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

declare module "fastify" {
  interface FastifyInstance {
    jwt: {
      sign: (payload: string | Buffer | object, options?: SignOptions) => string;
      verify: <T>(token: string) => T;
    };
  }
}

export const jwtPlugin = fp(async (fastify) => {
  const jwtSecret: Secret = env.jwtSecret;
  const defaultSignOptions: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"]
  };

  fastify.decorate("jwt", {
    sign: (payload, options = {}) =>
      jwt.sign(payload, jwtSecret, {
        ...defaultSignOptions,
        ...options
      }),
    verify: <T>(token: string) => jwt.verify(token, jwtSecret) as T
  });
});
