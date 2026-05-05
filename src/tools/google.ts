import { googleService } from '../services/google.js';

export const googleToolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'gmail_list_recent',
      description: 'Lista los correos electrónicos más recientes de la bandeja de entrada.',
      parameters: {
        type: 'object',
        properties: {
          maxResults: { type: 'number', description: 'Número máximo de correos a listar (por defecto 5).' }
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calendar_list_events',
      description: 'Lista los próximos eventos del calendario de Google.',
      parameters: {
        type: 'object',
        properties: {
          maxResults: { type: 'number', description: 'Número máximo de eventos a listar.' }
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calendar_create_event',
      description: 'Crea un nuevo evento en el calendario de Google.',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Título del evento.' },
          start: { type: 'string', description: 'Fecha y hora de inicio en formato ISO (ej. 2024-05-10T10:00:00Z).' },
          end: { type: 'string', description: 'Fecha y hora de fin en formato ISO.' },
          description: { type: 'string', description: 'Descripción opcional del evento.' }
        },
        required: ['summary', 'start', 'end'],
      },
    },
  },
];

export async function executeGoogleTool(name: string, args: any, userId: number) {
  switch (name) {
    case 'gmail_list_recent':
      return await googleService.listRecentEmails(userId, args.maxResults);
    case 'calendar_list_events':
      return await googleService.listUpcomingEvents(userId, args.maxResults);
    case 'calendar_create_event':
      return await googleService.createEvent(userId, args.summary, args.start, args.end, args.description);
    default:
      throw new Error(`Herramienta de Google no encontrada: ${name}`);
  }
}
