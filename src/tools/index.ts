import { getCurrentTimeDefinition, getCurrentTime } from './getCurrentTime.js';
import { googleToolDefinitions, executeGoogleTool } from './google.js';

export const toolDefinitions = [
  getCurrentTimeDefinition,
  ...googleToolDefinitions,
];

export async function executeTool(name: string, args: any, userId: number) {
  if (name.startsWith('gmail_') || name.startsWith('calendar_')) {
    return await executeGoogleTool(name, args, userId);
  }
  
  switch (name) {
    case 'get_current_time':
      return await getCurrentTime();
    default:
      throw new Error(`Herramienta no encontrada: ${name}`);
  }
}
