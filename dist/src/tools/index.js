import { getCurrentTimeDefinition, getCurrentTime } from './getCurrentTime.js';
export const toolDefinitions = [
    getCurrentTimeDefinition,
];
export async function executeTool(name, args) {
    switch (name) {
        case 'get_current_time':
            return await getCurrentTime();
        default:
            throw new Error(`Herramienta no encontrada: ${name}`);
    }
}
