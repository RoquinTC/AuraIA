import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { env } from '../config/env.js';
import { memory } from '../memory/db.js';

export const proposeNewSkillDefinition = {
  type: 'function',
  function: {
    name: 'propose_new_skill',
    description: 'Propone una nueva habilidad técnica para Aura. Investiga, escribe el código y lo presenta al usuario para aprobación.',
    parameters: {
      type: 'object',
      properties: {
        skill_name: { type: 'string', description: 'Nombre de la habilidad (ej: generate_image)' },
        description: { type: 'string', description: 'Qué hace la habilidad' },
        code: { type: 'string', description: 'El código TypeScript completo de la nueva herramienta' },
      },
      required: ['skill_name', 'description', 'code'],
    },
  },
};

export const applyNewSkillDefinition = {
  type: 'function',
  function: {
    name: 'apply_new_skill',
    description: 'Instala definitivamente una habilidad que ya ha sido aprobada por el usuario.',
    parameters: {
      type: 'object',
      properties: {
        skill_name: { type: 'string', description: 'Nombre de la habilidad a instalar' },
      },
      required: ['skill_name'],
    },
  },
};

export const selfDeployDefinition = {
  type: 'function',
  function: {
    name: 'self_deploy',
    description: 'Sube los cambios a GitHub para que Vercel se actualice.',
    parameters: {
      type: 'object',
      properties: {
        commit_message: { type: 'string', description: 'Mensaje del commit' },
      },
      required: ['commit_message'],
    },
  },
};

export async function proposeNewSkill(name: string, desc: string, code: string) {
  // GUARDAR EN FIRESTORE (No en disco)
  await memory.addMessage(999, 'proposal', JSON.stringify({
    name,
    description: desc,
    code,
    timestamp: Date.now()
  }));

  return `✅ He generado la propuesta para "${name}". 
Código guardado en la base de datos en la nube. 
Por favor, revísalo y si estás de acuerdo, dime "Aplica la habilidad ${name}".`;
}

export async function applyNewSkill(name: string) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_USER || !env.GITHUB_REPO) {
    throw new Error('Faltan configurar variables de GITHUB en el .env');
  }

  // 1. Obtener la propuesta de Firestore (buscamos la más reciente)
  const history = await memory.getHistory(999, 10);
  const proposalMsg = history.reverse().find((m: any) => {
    try {
      const p = JSON.parse(m.content);
      return p.name === name;
    } catch (e) { return false; }
  });

  if (!proposalMsg) throw new Error(`No encontré la propuesta para ${name}`);
  const proposal = JSON.parse(proposalMsg.content);

  // 2. Subir el nuevo archivo de herramienta a GitHub vía API
  const toolContentBase64 = Buffer.from(proposal.code).toString('base64');

  await axios.put(
    `https://api.github.com/repos/${env.GITHUB_USER}/${env.GITHUB_REPO}/contents/src/tools/${name}.ts`,
    {
      message: `Feat: add new skill ${name} (Aura Evolution)`,
      content: toolContentBase64,
    },
    { headers: { Authorization: `token ${env.GITHUB_TOKEN}` } }
  );

  // 3. Actualizar index.ts en GitHub vía API
  const indexUrl = `https://api.github.com/repos/${env.GITHUB_USER}/${env.GITHUB_REPO}/contents/src/tools/index.ts`;
  const indexRes = await axios.get(indexUrl, {
    headers: { Authorization: `token ${env.GITHUB_TOKEN}` }
  });

  const currentContent = Buffer.from(indexRes.data.content, 'base64').toString('utf8');
  const sha = indexRes.data.sha;

  const importLine = `import { ${name}Definition, ${name} } from './${name}.js';\n`;
  let newIndexContent = currentContent;

  if (!newIndexContent.includes(importLine)) {
    newIndexContent = importLine + newIndexContent;
  }
  if (!newIndexContent.includes(`${name}Definition`)) {
    newIndexContent = newIndexContent.replace('export const toolDefinitions = [', `export const toolDefinitions = [\n  ${name}Definition,`);
  }
  if (!newIndexContent.includes(`case '${name}':`)) {
    newIndexContent = newIndexContent.replace("default:", `case '${name}':\n      return await ${name}(args.query || args);\n    default:`);
  }

  await axios.put(
    indexUrl,
    {
      message: `Refactor: register new skill ${name} in index.ts`,
      content: Buffer.from(newIndexContent).toString('base64'),
      sha: sha
    },
    { headers: { Authorization: `token ${env.GITHUB_TOKEN}` } }
  );

  return `🚀 ¡Hecho! He subido el código de "${name}" directamente a GitHub y he actualizado mi registro. Vercel se está reiniciando con mi nuevo poder.`;
}

export async function selfDeploy(message: string) {
  return "✅ Mi sistema ahora es evolutivo en tiempo real. Al aplicar una habilidad con 'apply_new_skill', ya me actualizo automáticamente en GitHub. ¡No necesito hacer git push manual!";
}
