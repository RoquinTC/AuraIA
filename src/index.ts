import { memory } from './memory/db';
import { startBot } from './bot/telegram';

async function main() {
  console.log('Iniciando Aura Agent...');
  
  // 1. Inicializar base de datos
  await memory.init();
  console.log('✅ Base de datos iniciada.');

  // 2. Iniciar bot de Telegram
  startBot();
}

main().catch(console.error);
