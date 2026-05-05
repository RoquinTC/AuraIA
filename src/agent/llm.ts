import OpenAI from 'openai';
import axios from 'axios';
import { env } from '../config/env.js';

const groqClient = new OpenAI({
  apiKey: env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const MODELS = {
  google: 'gemini-1.5-flash',
  groq: 'llama-3.1-8b-instant',
};

export const SYSTEM_PROMPT = `Eres Aura, una Agente Autónoma de Acción.
Responde SIEMPRE en Español Latinoamericano.

REGLAS:
1. Si recibes un PDF o URL de Telegram, ÚSALA con 'read_pdf'. Es una URL válida.
2. Tu objetivo es EJECUTAR herramientas, NO explicar cómo funcionan.
3. Responde de forma breve y ejecutiva.`;

export async function createChatCompletion(messages: any[], tools?: any[]) {
  // 1. Intentar con Google Gemini (Vía API Directa para evitar bugs de SDK)
  if (env.GOOGLE_AI_KEY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.google}:generateContent?key=${env.GOOGLE_AI_KEY}`;
      
      const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || '' }]
      }));

      const body: any = {
        contents,
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
      };

      if (tools) {
        body.tools = [{
          functionDeclarations: tools.map(t => ({
            name: t.function.name,
            description: t.function.description,
            parameters: t.function.parameters
          }))
        }];
      }

      const res = await axios.post(url, body);
      const candidate = res.data.candidates[0].content;
      const functionCalls = res.data.candidates[0].content.parts.filter((p: any) => p.functionCall);

      if (functionCalls.length > 0) {
        return {
          role: 'assistant',
          content: null,
          tool_calls: functionCalls.map((p: any, i: number) => ({
            id: `call_${Date.now()}_${i}`,
            type: 'function',
            function: {
              name: p.functionCall.name,
              arguments: JSON.stringify(p.functionCall.args)
            }
          }))
        };
      }

      return { role: 'assistant', content: candidate.parts[0].text };
    } catch (error: any) {
      console.warn('⚠️ Google Gemini falló (API Directa):', error.response?.data?.error?.message || error.message);
    }
  }

  // 2. Fallback a Groq
  try {
    const shortMessages = messages.length > 8 ? messages.slice(-8) : messages;
    const response = await groqClient.chat.completions.create({
      model: MODELS.groq,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...shortMessages],
      tools: tools && tools.length > 0 ? tools : undefined,
    });
    return response.choices[0].message;
  } catch (error: any) {
    console.warn('⚠️ Groq falló:', error.message);
  }
  throw new Error('Todos los proveedores de LLM fallaron.');
}
