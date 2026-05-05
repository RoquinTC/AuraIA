import { getCurrentTimeDefinition, getCurrentTime } from './getCurrentTime.js';

export const toolDefinitions = [
  getCurrentTimeDefinition,
];

export async function executeTool(name: string, args: any) {
  switch (name) {
    case 'get_current_time':
      return await getCurrentTime();
    default:
      throw new Error(`Herramienta no encontrada: ${name}`);
  }
}
