import { runAgentLoop } from './src/agent/loop.ts';
import { memory } from './src/memory/db.ts';

async function test() {
  console.log("Testeando Agent Loop...");
  await memory.init();
  try {
    const response = await runAgentLoop(12345, 'Hola Aura, ¿qué hora es?');
    console.log("Respuesta Final:", response);
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
