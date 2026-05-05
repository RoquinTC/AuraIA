import { getCurrentTimeDefinition, getCurrentTime } from './getCurrentTime.js';
import { googleToolDefinitions, executeGoogleTool } from './google.js';
import { webSearchDefinition, webSearch } from './research.js';
import { proposeNewSkillDefinition, proposeNewSkill, applyNewSkillDefinition, applyNewSkill, selfDeployDefinition, selfDeploy } from './meta.js';

export const toolDefinitions = [
  getCurrentTimeDefinition,
  webSearchDefinition,
  proposeNewSkillDefinition,
  applyNewSkillDefinition,
  selfDeployDefinition,
  ...googleToolDefinitions,
];

export async function executeTool(name: string, args: any, userId: number) {
  if (name.startsWith('gmail_') || name.startsWith('calendar_')) {
    return await executeGoogleTool(name, args, userId);
  }
  
  switch (name) {
    case 'get_current_time':
      return await getCurrentTime();
    case 'web_search':
      return await webSearch(args.query);
    case 'propose_new_skill':
      return await proposeNewSkill(args.skill_name, args.description, args.code);
    case 'apply_new_skill':
      return await applyNewSkill(args.skill_name);
    case 'self_deploy':
      return await selfDeploy(args.commit_message);
    default:
      throw new Error(`Herramienta no encontrada: ${name}`);
  }
}
