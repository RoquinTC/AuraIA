import axios from 'axios';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

export const readPdfDefinition = {
  type: 'function',
  function: {
    name: 'read_pdf',
    description: 'Extrae texto de un PDF. IMPORTANTE: Acepta y procesa URLs de Telegram (api.telegram.org) sin problemas.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL del PDF (incluyendo URLs de Telegram api.telegram.org).' }
      },
      required: ['url']
    }
  }
};

export async function readPdf(url: string) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const data = await pdf(response.data);
    return `📄 Contenido del PDF:\n\n${data.text.substring(0, 5000)}`;
  } catch (error: any) {
    console.error('Error leyendo PDF:', error.message);
    return '❌ No pude leer el archivo PDF. Verifica que el enlace sea accesible.';
  }
}
