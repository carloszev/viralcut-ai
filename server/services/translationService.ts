import { SubtitleSegment } from '../types/server.js';
import { db } from '../db/database.js';

export class TranslationService {
  /**
   * Diccionario básico de traducción rápida offline para términos comunes
   */
  private quickTranslations: Record<string, Record<string, string>> = {
    en: {
      'hola': 'hello', 'bienvenidos': 'welcome', 'dinero': 'money',
      'secreto': 'secret', 'increíble': 'incredible', 'verdad': 'truth',
      'error': 'mistake', 'éxito': 'success', 'mente': 'mind', 'futuro': 'future'
    },
    pt: {
      'hola': 'olá', 'bienvenidos': 'bem-vindos', 'dinero': 'dinheiro',
      'secreto': 'segredo', 'increíble': 'incrível', 'verdad': 'verdade',
      'error': 'erro', 'éxito': 'sucesso', 'mente': 'mente', 'futuro': 'futuro'
    },
    fr: {
      'hola': 'bonjour', 'bienvenidos': 'bienvenue', 'dinero': 'argent',
      'secreto': 'secret', 'increíble': 'incroyable', 'verdad': 'vérité',
      'error': 'erreur', 'éxito': 'succès', 'mente': 'esprit', 'futuro': 'futur'
    }
  };

  /**
   * Traduce un conjunto de segmentos de subtítulos a un idioma objetivo
   */
  public async translateSubtitles(
    subtitles: SubtitleSegment[],
    targetLang: 'en' | 'pt' | 'fr' | 'de' | 'es'
  ): Promise<SubtitleSegment[]> {
    if (!subtitles || subtitles.length === 0 || targetLang === 'es') {
      return subtitles;
    }

    const settings = db.getSettings();
    const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;

    // Si hay Gemini API Key, traducir con IA contextual de alta fidelidad
    if (apiKey && apiKey.trim().length > 10 && !apiKey.includes('test_placeholder')) {
      try {
        const textPayload = subtitles.map((s, i) => `${i}|${s.text}`).join('\n');
        const langNames: Record<string, string> = {
          en: 'English',
          pt: 'Portuguese (Brazil)',
          fr: 'French',
          de: 'German'
        };

        const targetLangName = langNames[targetLang] || 'English';
        const prompt = `You are a professional video translator for viral short-form clips (TikTok/Reels).
Translate the following subtitle lines into natural, impactful, spoken ${targetLangName}.
Keep the same index format "index|translated_text". Do not change the line count or order.

LINES:
${textPayload}`;

        const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];
        let responseText = '';

        for (const model of candidateModels) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 12000);
          try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2, maxOutputTokens: 2000 }
              }),
              signal: controller.signal
            });
            if (res.ok) {
              const data = await res.json() as any;
              responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (responseText) break;
            }
          } catch (modelErr) {
            // Try next candidate
          } finally {
            clearTimeout(timeout);
          }
        }

        if (responseText) {
          const lines = responseText.split('\n').filter((l: string) => l.includes('|'));
          const transMap: Record<number, string> = {};

          lines.forEach((l: string) => {
            const parts = l.split('|');
            const idx = parseInt(parts[0].trim(), 10);
            const val = parts.slice(1).join('|').trim();
            if (!isNaN(idx) && val) {
              transMap[idx] = val;
            }
          });

          if (Object.keys(transMap).length > 0) {
            return subtitles.map((sub, i) => {
              const translatedText = transMap[i] || sub.text;
              const sStart = sub.start ?? (sub as any).startTime ?? 0;
              const sEnd = sub.end ?? (sub as any).endTime ?? (sStart + 2);
              return {
                ...sub,
                start: sStart,
                end: sEnd,
                text: translatedText,
                words: this.recalculateWords(translatedText, sStart, sEnd)
              };
            });
          }
        }
      } catch (e) {
        console.warn('[TranslationService] Error con Gemini, usando traducción rápida:', e);
      }
    }

    // Fallback heurístico inteligente
    return subtitles.map(sub => {
      const dict = this.quickTranslations[targetLang] || {};
      const words = sub.text.split(' ').map(w => {
        const lower = w.toLowerCase().replace(/[^a-záéíóúñ]/g, '');
        return dict[lower] ? dict[lower] : w;
      });
      const newText = words.join(' ');
      const sStart = sub.start ?? (sub as any).startTime ?? 0;
      const sEnd = sub.end ?? (sub as any).endTime ?? (sStart + 2);
      return {
        ...sub,
        start: sStart,
        end: sEnd,
        text: newText,
        words: this.recalculateWords(newText, sStart, sEnd)
      };
    });
  }

  /**
   * Recalcula marcas de tiempo de palabras para la nueva traducción
   */
  private recalculateWords(text: string, startTime: number, endTime: number) {
    const words = text.split(' ').filter(Boolean);
    if (words.length === 0) return [];
    const dur = Math.max(0.1, endTime - startTime);
    const step = dur / words.length;

    return words.map((w, idx) => ({
      word: w,
      start: parseFloat((startTime + idx * step).toFixed(2)),
      end: parseFloat((startTime + (idx + 1) * step).toFixed(2)),
      highlight: idx % 3 === 0
    }));
  }
}

export const translationService = new TranslationService();
