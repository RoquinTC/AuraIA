import { webhookCallback } from "grammy";
import { bot } from "../src/bot/telegram.js";
import { memory } from "../src/memory/db.js";

// Inicializamos la base de datos (Firebase) antes de procesar solicitudes
let dbInitialized = false;

export default async function handle(req: any, res: any) {
  if (!dbInitialized) {
    try {
      await memory.init();
      dbInitialized = true;
    } catch (e) {
      console.error("Error inicializando BD en Vercel:", e);
    }
  }

  // Aumentamos el timeout a 30 segundos para dar tiempo a la IA a pensar y usar herramientas
  return webhookCallback(bot, "http", {
    timeoutMilliseconds: 30000,
  })(req, res);
}
