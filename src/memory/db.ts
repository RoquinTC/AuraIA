import { initializeApp, cert, getApp, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { env } from '../config/env.js';
import fs from 'fs';
import path from 'path';

export class Memory {
  private db!: Firestore;

  async init() {
    if (getApps().length > 0) {
      this.db = getFirestore(getApp());
      return;
    }

    let serviceAccount: any;

    // 1. Prioridad: Variable de entorno con el JSON directamente (Ideal para Vercel)
    if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
        console.log('✅ Inicializando Firebase usando FIREBASE_SERVICE_ACCOUNT_JSON');
      } catch (e) {
        console.error('❌ Error al parsear FIREBASE_SERVICE_ACCOUNT_JSON:', e);
      }
    }

    // 2. Fallback: Archivo físico (Para local)
    if (!serviceAccount) {
      const keyPath = path.join(process.cwd(), 'firebase-key.json');
      if (fs.existsSync(keyPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        console.log('✅ Inicializando Firebase usando archivo local firebase-key.json');
      }
    }

    if (!serviceAccount) {
      throw new Error('[Firebase] No se encontró configuración válida (JSON o archivo).');
    }

    const app = initializeApp({
      credential: cert(serviceAccount),
    });

    this.db = getFirestore(app);
    console.log('✅ Conectado a Firebase Firestore.');
  }

  // --- MÉTODOS DE HISTORIAL ---

  async getHistory(userId: number, limit: number = 20) {
    const snapshot = await this.db
      .collection('history')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => doc.data()).reverse();
  }

  async addMessage(userId: number, role: string, content: string) {
    await this.db.collection('history').add({
      userId,
      role,
      content,
      timestamp: Date.now(),
    });
  }

  async clearHistory(userId: number) {
    const snapshot = await this.db
      .collection('history')
      .where('userId', '==', userId)
      .get();

    const batch = this.db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  // --- MÉTODOS DE GOOGLE TOKENS ---

  async saveGoogleTokens(userId: number, tokens: any) {
    await this.db.collection('google_tokens').doc(userId.toString()).set({
      ...tokens,
      updatedAt: Date.now(),
    });
  }

  async getGoogleTokens(userId: number) {
    const doc = await this.db.collection('google_tokens').doc(userId.toString()).get();
    return doc.exists ? doc.data() : null;
  }

  // --- DEDUPLICACIÓN DE UPDATES ---

  async isUpdateProcessed(updateId: number): Promise<boolean> {
    const doc = await this.db.collection('processed_updates').doc(updateId.toString()).get();
    return doc.exists;
  }

  async markUpdateAsProcessed(updateId: number): Promise<void> {
    await this.db.collection('processed_updates').doc(updateId.toString()).set({
      processedAt: Date.now()
    });
  }
}

export const memory = new Memory();
