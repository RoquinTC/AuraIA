import { google } from 'googleapis';
import { env } from '../config/env.js';
import { memory } from '../memory/db.js';
import fs from 'fs';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.metadata.readonly'
];

export const googleService = {
  getAuthClient() {
    let credentials;
    if (env.GOOGLE_CREDENTIALS_JSON) {
      credentials = JSON.parse(env.GOOGLE_CREDENTIALS_JSON);
    } else if (fs.existsSync('./credentials.json')) {
      credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));
    } else {
      throw new Error('No se encontraron credenciales de Google (credentials.json o GOOGLE_CREDENTIALS_JSON)');
    }

    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  },

  async getAuthUrl() {
    const oauth2Client = this.getAuthClient();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent' // Forzar refresco para obtener el refresh_token siempre
    });
  },

  async setTokenFromCode(userId: number, code: string) {
    const oauth2Client = this.getAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    await memory.saveGoogleTokens(userId, tokens);
    return tokens;
  },

  async getAuthorizedClient(userId: number) {
    const oauth2Client = this.getAuthClient();
    const token = await memory.getGoogleTokens(userId);

    if (!token) {
      return null;
    }

    oauth2Client.setCredentials(token);

    // Si el token expiró, se refrescará automáticamente si tiene refresh_token
    oauth2Client.on('tokens', async (newTokens) => {
      await memory.saveGoogleTokens(userId, { ...token, ...newTokens });
    });

    return oauth2Client;
  },

  // --- Gmail ---
  async listRecentEmails(userId: number, maxResults = 5) {
    const auth = await this.getAuthorizedClient(userId);
    if (!auth) throw new Error('No autorizado en Google. Usa /google_auth');

    const gmail = google.gmail({ version: 'v1', auth });
    const res = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
    });

    const messages = res.data.messages || [];
    const detailedMessages = await Promise.all(
      messages.map(async (msg) => {
        const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id! });
        const headers = detail.data.payload?.headers;
        const subject = headers?.find(h => h.name === 'Subject')?.value || '(Sin asunto)';
        const from = headers?.find(h => h.name === 'From')?.value || 'Desconocido';
        return { id: msg.id, subject, from, snippet: detail.data.snippet };
      })
    );

    return detailedMessages;
  },

  // --- Calendar ---
  async listUpcomingEvents(userId: number, maxResults = 10) {
    const auth = await this.getAuthorizedClient(userId);
    if (!auth) throw new Error('No autorizado en Google. Usa /google_auth');

    const calendar = google.calendar({ version: 'v3', auth });
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return res.data.items || [];
  },

  async createEvent(userId: number, summary: string, start: string, end: string, description?: string) {
    const auth = await this.getAuthorizedClient(userId);
    if (!auth) throw new Error('No autorizado en Google. Usa /google_auth');

    const calendar = google.calendar({ version: 'v3', auth });
    const event = {
      summary,
      description,
      start: { dateTime: start },
      end: { dateTime: end },
    };

    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return res.data;
  }
};
