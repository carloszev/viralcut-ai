import { ClipMetadata, SubtitleSegment } from '../types/server.js';

export interface SocialMediaPack {
  viralTitles: {
    type: 'curiosity' | 'controversy' | 'educational';
    title: string;
    hookExplanation: string;
  }[];
  seoDescription: string;
  hashtags: string[];
  pinnedComment: string;
  formattedPost: string;
}

export class SocialCopyService {
  /**
   * Genera el pack completo de publicación para redes sociales
   */
  public generateSocialPack(
    clipNumber: number,
    metadata: ClipMetadata,
    subtitles?: SubtitleSegment[]
  ): SocialMediaPack {
    const rawTitle = metadata.title || `Clip #${clipNumber}`;
    const rawHook = metadata.hook || '';
    const cleanTopic = rawTitle
      .replace(/^(el|la|los|las|un|una|cómo|por qué|este|esta)\s+/i, '')
      .trim();

    // 1. Tres variantes de títulos de alto impacto psicológico
    const viralTitles = [
      {
        type: 'curiosity' as const,
        title: `Lo que NADIE te dijo sobre ${cleanTopic.toLowerCase()} 🤫`,
        hookExplanation: 'Genera vacío de información (Information Gap) que obliga a ver los primeros 5 segundos.'
      },
      {
        type: 'controversy' as const,
        title: `La cruda verdad que el 90% ignora sobre esto ⚠️`,
        hookExplanation: 'Dispara el sesgo de auto-inclusión: el espectador quiere comprobar si él forma parte del 10% que sabe.'
      },
      {
        type: 'educational' as const,
        title: `Aprende a dominar ${cleanTopic.toLowerCase()} en 30 segundos ⚡`,
        hookExplanation: 'Promete gratificación inmediata y alto valor práctico en formato corto.'
      }
    ];

    // 2. Hashtags categorizados y optimizados para SEO vertical
    const categoryTags: Record<string, string[]> = {
      Humor: ['#humor', '#comedia', '#viral', '#tiktokhumor', '#gracioso'],
      Información: ['#datos', '#sabiasque', '#tecnologia', '#futuro', '#curiosidades'],
      Emoción: ['#inspiracion', '#motivacion', '#superacion', '#mindset', '#exito'],
      Debate: ['#debate', '#opinion', '#polemica', '#queopinas', '#verdad'],
      Sorpresa: ['#increible', '#impactante', '#locura', '#viralvideo', '#tendencia'],
      Historia: ['#storytime', '#historia', '#anecdota', '#experiencia', '#relato'],
      Educación: ['#aprende', '#educacion', '#consejos', '#tips', '#trucos']
    };

    const specificTags = categoryTags[metadata.category] || categoryTags['Información'];
    const baseTags = ['#viralcut', '#shorts', '#reels', '#tiktok', '#foryou', '#parati'];
    const combinedTags = Array.from(new Set([...specificTags, ...baseTags, ...(metadata.hashtags || [])]));

    // 3. Descripción estructurada para el algoritmo
    const hookText = rawHook ? `"${rawHook}"` : 'Mira lo que sucede en este clip.';
    const seoDescription = `🔥 ${viralTitles[0].title}\n\n${hookText}\n\n¿Estás de acuerdo o piensas distinto? 👇\n\n${combinedTags.join(' ')}`;

    // 4. Primer comentario fijado (Call to Action para disparar la sección de comentarios)
    const pinnedComment = `👇 Pregunta para la comunidad: ¿Qué opinas de lo que dice en el segundo 0:15? Te leo abajo en los comentarios 👇`;

    // 5. Post completo formateado para copiar en 1 clic
    const formattedPost = `${viralTitles[0].title}

${seoDescription}

---
Comentario Fijado Sugerido:
${pinnedComment}`;

    return {
      viralTitles,
      seoDescription,
      hashtags: combinedTags,
      pinnedComment,
      formattedPost
    };
  }
}

export const socialCopyService = new SocialCopyService();
