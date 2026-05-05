import { Bot, InputFile } from 'grammy';
import { env } from '../config/env.js';
import { runAgentLoop } from '../agent/loop.js';
import { memory } from '../memory/db.js';
import { voiceService } from '../services/voice.js';
import { googleService } from '../services/google.js';

const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

// Middleware para verificar lista blanca de usuarios
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId || !env.TELEGRAM_ALLOWED_USER_IDS.includes(userId)) {
    console.warn(`[Seguridad] Usuario bloqueado intentó acceder: ${userId} (@${ctx.from?.username})`);
    return; // Ignorar silenciosamente
  }
  await next();
});

// Middleware para evitar procesar el mismo mensaje varias veces (duplicados por reintentos de Telegram)
bot.use(async (ctx, next) => {
  const updateId = ctx.update.update_id;
  
  const isProcessed = await memory.isUpdateProcessed(updateId);
  if (isProcessed) {
    console.log(`[Bot] Ignorando actualización duplicada: ${updateId}`);
    return;
  }

  // Marcamos como procesada ANTES de empezar el trabajo pesado
  await memory.markUpdateAsProcessed(updateId);
  await next();
});

bot.command('start', async (ctx) => {
  await ctx.reply('¡Hola! Soy Aura, tu asistente personal de IA. ¿En qué te puedo ayudar hoy?');
});

bot.command(['clear', 'borrar'], async (ctx) => {
  const userId = ctx.from!.id;
  await memory.clearHistory(userId);
  await ctx.reply('🧹 He borrado nuestra memoria reciente. ¡Empecemos de cero!');
});

bot.command('google_auth', async (ctx) => {
  const url = await googleService.getAuthUrl();
  await ctx.reply('🔐 Para que pueda manejar tu Gmail y Calendario, necesito tu permiso.\n\n' +
    '1. Entra a este enlace:\n' + url + '\n\n' +
    '2. Inicia sesión y copia el código que te den.\n' +
    '3. Pégamelo aquí mismo.');
});

async function processAndSendResponse(ctx: any, responseText: string) {
  const voiceMatch = responseText.match(/<voice>([\s\S]*?)<\/voice>/i);
  
  if (voiceMatch) {
    const voiceText = voiceMatch[1].trim();
    const cleanText = responseText.replace(/<voice>[\s\S]*?<\/voice>/i, '').trim();

    if (cleanText) {
      await ctx.reply(cleanText);
    }
    
    await ctx.replyWithChatAction('record_voice');
    const audioPath = await voiceService.textToSpeech(voiceText);
    if (audioPath) {
      await ctx.replyWithVoice(new InputFile(audioPath));
    } else {
      await ctx.reply(voiceText); // Fallback si falla el audio
    }
  } else {
    await ctx.reply(responseText);
  }
}

bot.on('message:text', async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;

  // Si el texto parece un código de autorización de Google
  if (text.startsWith('4/') && text.length > 20) {
    try {
      await ctx.reply('⏳ Validando código de Google...');
      await googleService.setTokenFromCode(userId, text);
      await ctx.reply('✅ ¡Listo! Ya tengo permiso para ayudarte con tu Gmail y Calendario.');
      return;
    } catch (error: any) {
      console.error('Error validando código de Google:', error);
      await ctx.reply('❌ No pude validar ese código. Asegúrate de copiarlo completo e intentarlo de nuevo con /google_auth');
      return;
    }
  }

  await ctx.replyWithChatAction('typing');

  try {
    const responseText = await runAgentLoop(userId, text);
    await processAndSendResponse(ctx, responseText);
  } catch (error: any) {
    console.error('Error en el bucle del agente:', error);
    await ctx.reply('Hubo un error al procesar tu solicitud.');
  }
});

bot.on('message:voice', async (ctx) => {
  const userId = ctx.from.id;
  const fileId = ctx.message.voice.file_id;

  try {
    await ctx.replyWithChatAction('typing');

    const file = await ctx.api.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const transcription = await voiceService.transcribeAudio(fileUrl);
    await ctx.reply(`🎤 Entendí: "${transcription}"`);

    // Añadimos una instrucción oculta para asegurar que responda en audio a una nota de voz
    const responseText = await runAgentLoop(userId, transcription);
    await processAndSendResponse(ctx, responseText);

  } catch (error: any) {
    console.error('Error procesando voz:', error);
    await ctx.reply('Lo siento, tuve un problema procesando tu nota de voz.');
  }
});

export { bot };

export function startBot() {
  // Iniciar el bot solo si NO estamos en Vercel (entorno serverless)
  // Vercel inyecta una variable de entorno llamada VERCEL
  if (!process.env.VERCEL) {
    bot.start({
      onStart: (botInfo) => {
        console.log(`🤖 Bot iniciado como @${botInfo.username}`);
      },
    });
  }
}
