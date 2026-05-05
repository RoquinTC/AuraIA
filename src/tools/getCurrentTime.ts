export const getCurrentTimeDefinition = {
  type: 'function',
  function: {
    name: 'get_current_time',
    description: 'Obtiene la fecha y hora actual.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
};

export async function getCurrentTime() {
  const now = new Date();
  return {
    time: now.toISOString(),
    locale: now.toLocaleString('es-419'),
  };
}
