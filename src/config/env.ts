import dotenv from 'dotenv';

dotenv.config();

function getEnv(key: string, required: boolean = true, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (required && !value) {
    throw new Error(`Falta la variable de entorno obligatoria: ${key}`);
  }
  return value || '';
}

export const env = {
  TELEGRAM_BOT_TOKEN: getEnv('TELEGRAM_BOT_TOKEN'),
  TELEGRAM_ALLOWED_USER_IDS: getEnv('TELEGRAM_ALLOWED_USER_IDS')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .map(Number),

  GROQ_API_KEY: getEnv('GROQ_API_KEY'),
  OPENROUTER_API_KEY: getEnv('OPENROUTER_API_KEY', false), // No es estrictamente requerida para iniciar, pero sí para el fallback
  
  LOCAL_AI_BASE_URL: getEnv('LOCAL_AI_BASE_URL', false),
  LOCAL_AI_MODEL: getEnv('LOCAL_AI_MODEL', false, 'llama3'),

  ELEVENLABS_API_KEY: getEnv('ELEVENLABS_API_KEY', false),
  ELEVENLABS_VOICE_ID: getEnv('ELEVENLABS_VOICE_ID', false, '21m00Tcm4TlvDq8ikWAM'), // Rachel voice as default

  DB_PATH: getEnv('DB_PATH', false, './memory.db'),
  FIREBASE_SERVICE_ACCOUNT_KEY_PATH: getEnv('FIREBASE_SERVICE_ACCOUNT_KEY_PATH', false, './firebase-key.json'),
  FIREBASE_SERVICE_ACCOUNT_JSON: getEnv('FIREBASE_SERVICE_ACCOUNT_JSON', false, ''), // Para Vercel
};

if (env.TELEGRAM_ALLOWED_USER_IDS.length === 0) {
  throw new Error("TELEGRAM_ALLOWED_USER_IDS debe contener al menos un ID de usuario válido.");
}
