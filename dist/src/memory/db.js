import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from '../config/env.js';
import fs from 'fs';
let db;
export const memory = {
    async init() {
        let serviceAccount;
        if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            // Prioridad 1: Vercel (Variable de entorno)
            serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
        }
        else {
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
    async addMessage(userId, role, content) {
        const docRef = db.collection('users').doc(userId.toString()).collection('messages').doc();
        await docRef.set({
            role,
            content,
            timestamp: Date.now()
        });
    },
    async getHistory(userId, limit = 100) {
        const snapshot = await db.collection('users')
            .doc(userId.toString())
            .collection('messages')
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();
        const messages = [];
        snapshot.forEach(doc => {
            messages.push(doc.data());
        });
        // Invertir para que queden en orden cronológico ascendente (el más viejo primero)
        return messages.reverse();
    },
    async clearHistory(userId) {
        const messagesRef = db.collection('users').doc(userId.toString()).collection('messages');
        const snapshot = await messagesRef.get();
        if (snapshot.size === 0)
            return;
        // Batch delete
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    }
};
