import { memory } from './memory/db.ts';
import { startBot } from './bot/telegram.ts';

async function main() {
  console.log('Iniciando Aura Agent...');
  
  // 1. Inicializar base de datos
  await memory.init();
  console.log('✅ Base de datos iniciada.');

  // 2. Iniciar bot de Telegram
  startBot();
}

main().catch(console.error);
