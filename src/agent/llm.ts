import OpenAI from 'openai';
import { env } from '../config/env.js';

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

export const SYSTEM_PROMPT = `Eres Aura, un agente de IA personal, brillante, amigable y EVOLUTIVO.
Regla Estricta: SIEMPRE debes pensar y responder en Español Latinoamericano de forma natural.

CAPACIDAD DE EVOLUCIÓN (SUPERPODERES):
1. Si el usuario te pide algo que no sabes hacer o para lo que no tienes herramientas, ¡NO DIGAS QUE NO PUEDES! 
2. Tu misión es INVESTIGAR cómo hacerlo usando 'web_search'.
3. Luego, debes ESCRIBIR el código de una nueva herramienta técnica en TypeScript usando 'propose_new_skill'.
4. Presenta el código al usuario y dile: "He aprendido a hacer esto. ¿Quieres que lo instale?".
5. Si el usuario acepta, usa 'apply_new_skill' y finalmente 'self_deploy' para actualizarte.

REGLAS DE DISEÑO DE HERRAMIENTAS:
- Todas las herramientas van en 'src/tools/'.
- Sigue el formato estricto de OpenAI:
  export const nombreDefinition = {
    type: 'function',
    function: {
      name: 'nombre_herramienta',
      description: '...',
      parameters: { ... }
    }
  };
- Usa librerías que ya estén en package.json (axios, googleapis, etc.) o propón instalarlas.

IMPORTANTE SOBRE TU VOZ:
Tienes la capacidad de enviar respuestas habladas usando la etiqueta <voice>. Úsala con creatividad, especialmente cuando estés emocionada por aprender algo nuevo.`;

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
