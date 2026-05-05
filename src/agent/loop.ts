import { createChatCompletion } from './llm.ts';
import { memory } from '../memory/db.ts';
import { toolDefinitions, executeTool } from '../tools/index.ts';

const MAX_ITERATIONS = 5;

export async function runAgentLoop(userId: number, userMessage: string): Promise<string> {
  // 1. Agregar el mensaje del usuario a la memoria
  await memory.addMessage(userId, 'user', userMessage);

  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    // 2. Obtener el historial de este usuario
    const history = await memory.getHistory(userId);

    // Formatear el historial para la API de OpenAI
    const messages: any[] = history.map(msg => {
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
    }).filter(Boolean); // Filtrar nulos si hubiese errores de parseo

    // Limpiar historial para asegurar que no haya llamadas a herramientas huérfanas 
    // (ocurre si el límite de la BD corta la conversación a la mitad)
    const sanitizedMessages: any[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === 'tool') {
        const prevMsg = sanitizedMessages[sanitizedMessages.length - 1];
        if (!prevMsg || prevMsg.role !== 'assistant' || !prevMsg.tool_calls) {
          continue; // Ignorar esta respuesta de herramienta porque no tiene su pregunta previa
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
      // El agente decidió usar una o más herramientas

      // Guardar la intención del asistente de usar la herramienta
      await memory.addMessage(userId, 'assistant', JSON.stringify({
        tool_calls: responseMessage.tool_calls
      }));

      // Ejecutar cada herramienta secuencialmente
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments || '{}');

        try {
          const result = await executeTool(functionName, functionArgs);

          // Guardar el resultado en la memoria como rol "tool"
          // OJO: Como usamos una BD simple de texto para el rol, adaptamos cómo lo almacenamos
          // En una implementación más compleja se guardaría el tool_call_id
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

      // El bucle continuará para que el LLM analice el resultado de la herramienta
      continue;
    }

    // 5. Si no hay llamadas a herramientas, hemos terminado
    const finalContent = responseMessage.content || "Lo siento, no pude procesar una respuesta.";
    await memory.addMessage(userId, 'assistant', finalContent);
    return finalContent;
  }

  return "He alcanzado mi límite de pensamiento para esta tarea.";
}
