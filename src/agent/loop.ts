import { createChatCompletion } from './llm.js';
import { memory } from '../memory/db.js';
import { toolDefinitions, executeTool } from '../tools/index.js';

const MAX_ITERATIONS = 5;

export async function runAgentLoop(userId: number, userMessage: string, ctx?: any): Promise<string> {
  // 1. Agregar el mensaje del usuario a la memoria
  await memory.addMessage(userId, 'user', userMessage);

  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    // 2. Obtener el historial de este usuario
    const history = await memory.getHistory(userId);

    // Formatear el historial para la API
    const messages: any[] = history.map((msg: any) => {
      if (msg.role === 'tool' || msg.role === 'assistant') {
        try {
          const parsed = JSON.parse(msg.content);
          if (parsed.tool_calls) {
            return { role: 'assistant', content: null, tool_calls: parsed.tool_calls };
          } else if (parsed.tool_call_id) {
            return {
              role: 'tool',
              content: typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.content || parsed.error),
              tool_call_id: parsed.tool_call_id,
              name: parsed.name
            };
          }
        } catch (e) {
          // Es un mensaje normal
        }
      }
      return {
        role: msg.role,
        content: msg.content,
      };
    }).filter(Boolean);

    // Limpiar historial
    const sanitizedMessages: any[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === 'tool') {
        const prevMsg = sanitizedMessages[sanitizedMessages.length - 1];
        if (!prevMsg || prevMsg.role !== 'assistant' || !prevMsg.tool_calls) {
          continue; 
        }
      }
      sanitizedMessages.push(msg);
    }

    // 3. Llamar al LLM
    console.log(`[Iteración ${iterations}] Llamando al LLM con ${sanitizedMessages.length} mensajes...`);
    const responseMessage = await createChatCompletion(sanitizedMessages, toolDefinitions);
    console.log(`[Iteración ${iterations}] Respuesta recibida. tool_calls: ${responseMessage.tool_calls ? responseMessage.tool_calls.length : 0}, content: ${responseMessage.content ? 'Sí' : 'No'}`);

    // 4. Procesar la respuesta
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      await memory.addMessage(userId, 'assistant', JSON.stringify({
        tool_calls: responseMessage.tool_calls
      }));

      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments || '{}');

        try {
          const result = await executeTool(functionName, functionArgs, userId, ctx);

          await memory.addMessage(userId, 'tool', JSON.stringify({
            tool_call_id: toolCall.id,
            name: functionName,
            content: result
          }));
        } catch (error: any) {
          await memory.addMessage(userId, 'tool', JSON.stringify({
            tool_call_id: toolCall.id,
            name: functionName,
            error: error.message
          }));
        }
      }
      continue;
    }

    // 5. Finalizar
    const finalContent = responseMessage.content || "Lo siento, no pude procesar una respuesta.";
    await memory.addMessage(userId, 'assistant', finalContent);
    return finalContent;
  }

  return "He alcanzado mi límite de pensamiento para esta tarea.";
}
