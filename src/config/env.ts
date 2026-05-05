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
  OPENROUTER_API_KEY: getEnv('OPENROUTER_API_KEY', false),
  GOOGLE_AI_KEY: getEnv('GOOGLE_AI_KEY', false),
  TAVILY_API_KEY: getEnv('TAVILY_API_KEY', false),
  
  GITHUB_TOKEN: getEnv('GITHUB_TOKEN', false),
  GITHUB_USER: getEnv('GITHUB_USER', false),
  GITHUB_REPO: getEnv('GITHUB_REPO', false),
  
  LOCAL_AI_BASE_URL: getEnv('LOCAL_AI_BASE_URL', false),
  LOCAL_AI_MODEL: getEnv('LOCAL_AI_MODEL', false, 'llama3'),

  ELEVENLABS_API_KEY: getEnv('ELEVENLABS_API_KEY', false),
  ELEVENLABS_VOICE_ID: getEnv('ELEVENLABS_VOICE_ID', false, '21m00Tcm4TlvDq8ikWAM'),

  FIREBASE_SERVICE_ACCOUNT_JSON: getEnv('FIREBASE_SERVICE_ACCOUNT_JSON', false),
  GOOGLE_CREDENTIALS_JSON: getEnv('GOOGLE_CREDENTIALS_JSON', false),
};

// Log de diagnóstico al arrancar
console.log('--- Diagnóstico de Variables ---');
console.log('GOOGLE_AI_KEY detectada:', env.GOOGLE_AI_KEY ? '✅ SÍ' : '❌ NO');
console.log('TAVILY_API_KEY detectada:', env.TAVILY_API_KEY ? '✅ SÍ' : '❌ NO');
console.log('GITHUB_TOKEN detectada:', env.GITHUB_TOKEN ? '✅ SÍ' : '❌ NO');
console.log('--------------------------------');
