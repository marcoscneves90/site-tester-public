import type { FastifyInstance } from "fastify";

export default async function configRoutes(app: FastifyInstance) {
  // GET /api/config — devolve configurações públicas do sistema
  app.get("/api/config", async () => {
    return {
      userName: process.env.USER_NAME?.trim() || null,
      publicUrl: process.env.PUBLIC_URL?.trim() || null,
    };
  });
}
