import fs from 'fs';
import path from 'path';
import axios from 'axios';
import OpenAI from 'openai';
import { env } from '../config/env.js';
import { EdgeTTS } from 'node-edge-tts';

const groqClient = new OpenAI({
  apiKey: env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

import os from 'os';

// Directorio temporal para audios. Vercel solo permite escribir en /tmp
const TEMP_DIR = os.tmpdir();

export const voiceService = {
  /**
   * Transcribe un archivo de audio (OGG, MP3, etc.) usando Whisper en Groq.
   * @param fileUrl URL de descarga del archivo de audio en Telegram
   * @returns El texto transcrito
   */
  async transcribeAudio(fileUrl: string): Promise<string> {
    const tempFilePath = path.join(TEMP_DIR, `in_${Date.now()}.ogg`);

    try {
      // 1. Descargar audio
      const response = await axios({
        method: 'GET',
        url: fileUrl,
        responseType: 'arraybuffer',
      });

      fs.writeFileSync(tempFilePath, response.data);

      // 2. Transcribir con Groq Whisper
      const transcription = await groqClient.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: 'whisper-large-v3-turbo', // Modelo rápido de Groq
        language: 'es',
      });

      return transcription.text;
    } finally {
      // 3. Limpiar archivo temporal
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  },

  /**
   * Convierte texto a voz usando Microsoft Edge TTS (100% Gratis, Alta Calidad).
   * @param text El texto a sintetizar
   * @returns Ruta al archivo de audio temporal generado
   */
  async textToSpeech(text: string): Promise<string | null> {
    const tempFilePath = path.join(TEMP_DIR, `out_${Date.now()}.mp3`);

    try {
      // Usamos una voz neuronal de México para que suene más natural y animada
      const tts = new EdgeTTS({
        voice: 'es-MX-DaliaNeural',
        rate: '+26%'
      });
      await tts.ttsPromise(text, tempFilePath);

      return tempFilePath;
    } catch (error: any) {
      console.error("Error al generar TTS (Edge):", error.message);
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      return null;
    }
  }
};
