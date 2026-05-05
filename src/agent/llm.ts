import OpenAI from 'openai';
import { env } from '../config/env';

// Configuración de clientes
const groqClient = new OpenAI({
  apiKey: env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const openRouterClient = env.OPENROUTER_API_KEY ? new OpenAI({
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'Aura Agent',
  }
}) : null;

const localClient = env.LOCAL_AI_BASE_URL ? new OpenAI({
  apiKey: 'local', // A menudo no es necesaria, pero el SDK de openai la requiere
  baseURL: env.LOCAL_AI_BASE_URL,
}) : null;

const MODELS = {
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'openrouter/free', // O el modelo que prefieras de OpenRouter
  local: env.LOCAL_AI_MODEL
};

export const SYSTEM_PROMPT = `Eres Aura, un agente de IA personal, brillante, amigable y muy capaz.
Regla Estricta: SIEMPRE debes pensar y responder en Español Latinoamericano de forma natural, a menos que el usuario te pida explícitamente otro idioma.
No eres un robot frío, eres conversacional y amigable, pero mantienes respuestas concisas si no se requiere mucho detalle.
Tienes acceso a herramientas y puedes usarlas cuando lo necesites.

IMPORTANTE SOBRE TU VOZ Y AUTONOMÍA:
Tienes la capacidad real y tecnológica de enviar respuestas habladas con una voz humana natural y muy animada. 
Si el usuario te envía un mensaje de voz, DEBES responder enviando tu respuesta dentro de la etiqueta <voice>.
Si el usuario te escribe por texto, TÚ TIENES LA LIBERTAD de decidir si le respondes por texto normal o si quieres enviarle un audio. 
Para enviar un audio (nota de voz), simplemente envuelve el texto que quieres que se escuche dentro de la etiqueta <voice>. 
Por ejemplo: 
<voice>¡Hola! Me encanta tener este superpoder de la voz, ¿cómo estás?</voice>
Todo lo que esté dentro de esa etiqueta será convertido a voz y enviado como un audio real de Telegram, y lo que esté fuera se enviará como texto. ¡Usa este poder con creatividad y para hacer la charla más divertida!`;

export async function createChatCompletion(messages: any[], tools?: any[]) {
  const params: any = {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ],
  };

  if (tools && tools.length > 0) {
    params.tools = tools;
    params.tool_choice = 'auto';
  }

  // 1. Intentar con Groq
  try {
    const response = await groqClient.chat.completions.create({
      ...params,
      model: MODELS.groq,
    });
    return response.choices[0].message;
  } catch (error: any) {
    console.warn('⚠️ Groq falló:', error.message);
  }

  // 2. Intentar con OpenRouter (Fallback 1)
  if (openRouterClient) {
    try {
      console.log('🔄 Intentando con OpenRouter...');
      const response = await openRouterClient.chat.completions.create({
        ...params,
        model: MODELS.openrouter,
      });
      return response.choices[0].message;
    } catch (error: any) {
      console.warn('⚠️ OpenRouter falló:', error.message);
    }
  }

  // 3. Intentar con IA Local (Fallback 2)
  if (localClient) {
    try {
      console.log('🔄 Intentando con IA Local...');
      const response = await localClient.chat.completions.create({
        ...params,
        model: MODELS.local,
      });
      return response.choices[0].message;
    } catch (error: any) {
      console.warn('⚠️ IA Local falló:', error.message);
    }
  }

  throw new Error('Todos los proveedores de LLM fallaron.');
}
