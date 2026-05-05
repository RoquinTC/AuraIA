import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export const proposeNewSkillDefinition = {
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
};

export const applyNewSkillDefinition = {
  name: 'apply_new_skill',
  description: 'Instala definitivamente una habilidad que ya ha sido aprobada por el usuario.',
  parameters: {
    type: 'object',
    properties: {
      skill_name: { type: 'string', description: 'Nombre de la habilidad a instalar' },
    },
    required: ['skill_name'],
  },
};

export const selfDeployDefinition = {
  name: 'self_deploy',
  description: 'Sube los cambios a GitHub para que Vercel se actualice.',
  parameters: {
    type: 'object',
    properties: {
      commit_message: { type: 'string', description: 'Mensaje del commit' },
    },
    required: ['commit_message'],
  },
};

export async function proposeNewSkill(name: string, desc: string, code: string) {
  // Guardamos en una carpeta de propuestas para revisión
  const proposedDir = path.join(process.cwd(), 'proposed_skills');
  if (!fs.existsSync(proposedDir)) fs.mkdirSync(proposedDir);

  const filePath = path.join(proposedDir, `${name}.ts`);
  fs.writeFileSync(filePath, code);

  return `✅ He generado la propuesta para "${name}". 
Código guardado en: proposed_skills/${name}.ts. 
Por favor, revísalo y si estás de acuerdo, dime "Aplica la habilidad ${name}".`;
}

export async function applyNewSkill(name: string) {
  const proposedPath = path.join(process.cwd(), 'proposed_skills', `${name}.ts`);
  const targetPath = path.join(process.cwd(), 'src', 'tools', `${name}.ts`);

  if (!fs.existsSync(proposedPath)) {
    throw new Error(`No existe una propuesta para la habilidad: ${name}`);
  }

  // 1. Mover el archivo a la carpeta de herramientas
  fs.copyFileSync(proposedPath, targetPath);

  // 2. Registrar la herramienta en src/tools/index.ts
  const indexPath = path.join(process.cwd(), 'src', 'tools', 'index.ts');
  let indexContent = fs.readFileSync(indexPath, 'utf8');

  // Añadir importación (asumiendo formato estándar)
  const importStatement = `import { ${name}Definition, ${name} } from './${name}.js';\n`;
  if (!indexContent.includes(importStatement)) {
    indexContent = importStatement + indexContent;
  }

  // Añadir a la lista de definiciones
  if (!indexContent.includes(`${name}Definition`)) {
    indexContent = indexContent.replace('export const toolDefinitions = [', `export const toolDefinitions = [\n  ${name}Definition,`);
  }

  // Añadir al switch de ejecución (si no es de google)
  if (!indexContent.includes(`case '${name}':`)) {
     indexContent = indexContent.replace("default:", `case '${name}':\n      return await ${name}(args.query || args);\n    default:`);
  }

  fs.writeFileSync(indexPath, indexContent);

  return `🚀 Habilidad "${name}" integrada con éxito. Ahora puedes pedirme que use 'self_deploy' para subir los cambios.`;
}

export async function selfDeploy(message: string) {
  try {
    // Validar sintaxis antes de subir
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    
    execSync('git add .', { stdio: 'inherit' });
    execSync(`git commit -m "${message}"`, { stdio: 'inherit' });
    execSync('git push origin main', { stdio: 'inherit' });
    
    return "✅ ¡Despliegue completado! En unos minutos estaré actualizada en la nube.";
  } catch (error: any) {
    throw new Error(`Error en el despliegue: ${error.message}`);
  }
}
