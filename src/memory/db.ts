import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from '../config/env.js';
import fs from 'fs';

export interface MessageRow {
  user_id?: number;
  role: string;
  content: string;
  timestamp: number;
}

let db: FirebaseFirestore.Firestore;

export const memory = {
  async init() {
    let serviceAccount;
    
    if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      // Prioridad 1: Vercel (Variable de entorno)
      serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } else {
      // Prioridad 2: Local (Archivo)
      const serviceAccountPath = env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
      if (!fs.existsSync(serviceAccountPath)) {
        throw new Error(`[Firebase] No se encontró el archivo de credenciales en: ${serviceAccountPath}. Por favor, descárgalo de la consola de Firebase y colócalo ahí.`);
      }
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    }

    initializeApp({
      credential: cert(serviceAccount)
    });

    db = getFirestore();
    console.log('✅ Conectado a Firebase Firestore.');
  },

  async addMessage(userId: number, role: string, content: string) {
    const docRef = db.collection('users').doc(userId.toString()).collection('messages').doc();
    await docRef.set({
      role,
      content,
      timestamp: Date.now()
    });
  },

  async getHistory(userId: number, limit: number = 100): Promise<MessageRow[]> {
    const snapshot = await db.collection('users')
      .doc(userId.toString())
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
      
    const messages: MessageRow[] = [];
    snapshot.forEach(doc => {
      messages.push(doc.data() as MessageRow);
    });
    
    // Invertir para que queden en orden cronológico ascendente (el más viejo primero)
    return messages.reverse();
  },

  async clearHistory(userId: number) {
    const messagesRef = db.collection('users').doc(userId.toString()).collection('messages');
    const snapshot = await messagesRef.get();
    
    if (snapshot.size === 0) return;
    
    // Batch delete
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  },

  async saveGoogleToken(userId: number, token: any) {
    const docRef = db.collection('users').doc(userId.toString()).collection('auth').doc('google');
    await docRef.set({
      ...token,
      updated_at: Date.now()
    });
  },

  async getGoogleToken(userId: number): Promise<any | null> {
    const docRef = db.collection('users').doc(userId.toString()).collection('auth').doc('google');
    const doc = await docRef.get();
    return doc.exists ? doc.data() : null;
  },

  async isUpdateProcessed(updateId: number): Promise<boolean> {
    const docRef = db.collection('processed_updates').doc(updateId.toString());
    const doc = await docRef.get();
    return doc.exists;
  },

  async markUpdateAsProcessed(updateId: number) {
    const docRef = db.collection('processed_updates').doc(updateId.toString());
    await docRef.set({
      processed_at: Date.now(),
      // TTL de 24 horas para que Firestore limpie automáticamente si se configura
      // O simplemente para tener registro
      expires_at: Date.now() + 24 * 60 * 60 * 1000 
    });
  }
};
