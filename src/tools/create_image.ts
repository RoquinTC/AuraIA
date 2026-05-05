import { Context } from 'grammy';

export const createImageDefinition = {
  type: 'function',
  function: {
    name: 'create_image',
    description: 'Genera una imagen artística de alta calidad.',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Descripción en español.' },
        english_prompt: { type: 'string', description: 'Descripción en inglés.' }
      },
      required: ['prompt', 'english_prompt']
    }
  }
};

export async function createImageHandler(ctx: Context, args: any) {
  const { prompt, english_prompt } = args;
  const seed = Math.floor(Math.random() * 1000000);
  
  // Usamos el endpoint clásico que es más directo
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(english_prompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;

  try {
    await ctx.replyWithChatAction('upload_photo');
    await ctx.replyWithPhoto(imageUrl, {
      caption: `🎨 **Imagen Generada**\n\n📝 **Idea:** ${prompt}`,
      parse_mode: 'Markdown'
    });
    return 'Imagen enviada.';
  } catch (error: any) {
    console.error('Error:', error.message);
    await ctx.reply('❌ No pude generar la imagen.');
    return `Error: ${error.message}`;
  }
}
