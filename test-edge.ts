import { EdgeTTS } from 'node-edge-tts';

async function test() {
  const tts = new EdgeTTS({ voice: 'es-MX-DaliaNeural' });
  await tts.ttsPromise('Hola mundo', 'test.mp3');
  console.log("OK");
}
test();
