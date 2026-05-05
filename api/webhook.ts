import { webhookCallback } from "grammy";
import { bot } from "../src/bot/telegram";
import { memory } from "../src/memory/db";

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

  // Grammy se encarga de convertir la petición HTTP al formato del bot
  return webhookCallback(bot, "http")(req, res);
}
