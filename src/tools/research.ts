import axios from 'axios';
import { env } from '../config/env.js';

export const webSearchDefinition = {
  type: 'function',
  function: {
    name: 'web_search',
    description: 'Busca información en tiempo real en internet para investigar APIs o temas técnicos.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'La consulta de búsqueda',
        },
      },
      required: ['query'],
    },
  },
};

export async function webSearch(query: string) {
  if (!env.TAVILY_API_KEY) {
    throw new Error('TAVILY_API_KEY no está configurada en el archivo .env');
  }

  try {
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: env.TAVILY_API_KEY,
      query,
      search_depth: 'advanced',
      include_answer: true,
    });

    return response.data;
  } catch (error: any) {
    console.error('Error en búsqueda Tavily:', error.response?.data || error.message);
    throw new Error('Fallo al realizar la búsqueda web.');
  }
}
