import { Redis } from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL não definida");
}

// BullMQ pede maxRetriesPerRequest: null em conexões usadas por workers.
export const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on("error", (err) => {
  console.error("Erro no Redis:", err);
});
