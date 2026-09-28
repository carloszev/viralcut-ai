import fs from 'fs';
import path from 'path';
import { SubtitleSegment, SubtitleConfig } from '../types/server.js';
import { UPLOADS_DIR } from '../config.js';

export interface AssStyleOptions {
  fontName: string;
  fontSize: number;
  primaryColorHex: string;
  highlightColorHex: string;
  outlineColorHex: string;
  backColorHex: string;
  outlineWidth: number;
  shadowDistance: number;
  alignment: number; // 2: bottom-center, 5: middle-center, 8: top-center
  marginV: number;
  uppercase: boolean;
}

export class SubtitleBurnerService {
  /**
   * Convierte color HEX (#RRGGBB o #RGB) a formato ASS (&H00BBGGRR)
   */
  public hexToAssColor(hex: string, alphaHex: string = '00'): string {
    let clean = (hex || '#FFFFFF').replace('#', '').trim();
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    if (clean.length !== 6) {
      clean = 'FFFFFF';
    }
    const r = clean.substring(0, 2);
    const g = clean.substring(2, 4);
    const b = clean.substring(4, 6);
    // ASS usa orden BGR con prefijo &HAABBGGRR
    return `&H${alphaHex}${b}${g}${r}`.toUpperCase();
  }

  /**
   * Convierte segundos a formato de tiempo ASS (H:MM:SS.cs)
   */
  public formatAssTime(seconds: number): string {
    const s = Math.max(0, seconds);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = Math.floor(s % 60);
    const cs = Math.floor((s % 1) * 100);

    const pad = (n: number, w: number = 2) => n.toString().padStart(w, '0');
    return `${hrs}:${pad(mins)}:${pad(secs)}.${pad(cs, 2)}`;
  }

  /**
   * Diccionario de emojis de alto impacto para palabras clave virales
   */
  private emojiMap: Record<string, string> = {
    dinero: '💰', plata: '💵', platazo: '💸', millones: '💎', ganar: '🏆',
    fuego: '🔥', viral: '🚀', secreto: '🤫', cuidado: '⚠️', peligro: '🚨',
    increíble: '🤯', brutal: '⚡', nunca: '❌', error: '🚫', falso: '⚠️',
    verdad: '✅', éxito: '💯', clave: '🔑', poder: '⚡', rápido: '⏱️',
    mente: '🧠', pensar: '💡', magia: '✨', atención: '👀', stop: '🛑'
  };

  /**
   * Detecta y anexa emoji contextual si la palabra es clave
   */
  public getEmojiForWord(word: string): string | null {
    const clean = word.toLowerCase().replace(/[^a-záéíóúñ]/g, '');
    for (const [key, emoji] of Object.entries(this.emojiMap)) {
      if (clean === key || (clean.length > 4 && clean.startsWith(key))) {
        return emoji;
      }
    }
    return null;
  }

  /**
   * Genera el contenido textual de subtítulos en formato .ASS
   */
  public generateAssContent(
    subtitles: SubtitleSegment[],
    clipStartTime: number = 0,
    clipDuration: number = 3600,
    config?: SubtitleConfig,
    resX: number = 1080,
    resY: number = 1920
  ): string {
    const styleType = config?.style || 'hormozi';
    const isUppercase = config?.uppercase !== false;
    const yOffsetPercent = config?.yOffsetPercent || 78;

    // MarginV en lienzo 1080x1920
    const marginV = Math.round((100 - yOffsetPercent) * (resY / 100));

    let primaryColor = '&H00FFFFFF';
    let highlightColor = '&H0000F0FF';
    let outlineColor = '&H00000000';
    let fontSize = 74;
    let outline = 5;
    let shadow = 2;
    let fontName = config?.fontFamily || 'Montserrat';

    if (styleType === 'hormozi') {
      fontName = config?.fontFamily || 'Arial Black';
      fontSize = 78;
      primaryColor = '&H00FFFFFF';
      highlightColor = '&H0000D4FF'; // Amarillo oro / Cyan vibrante
      outlineColor = '&H00050505';
      outline = 7;
      shadow = 4;
    } else if (styleType === 'devinci') {
      fontName = config?.fontFamily || 'Impact';
      fontSize = 82;
      primaryColor = '&H00F0F0F0';
      highlightColor = '&H0014F195'; // Verde neón
      outlineColor = '&H00101010';
      outline = 6;
      shadow = 3;
    } else if (styleType === 'clean') {
      fontName = config?.fontFamily || 'Montserrat';
      fontSize = 70;
      primaryColor = '&H00FFFFFF';
      highlightColor = '&H0000F0FF';
      outlineColor = '&H00151515';
      outline = 4;
      shadow = 2;
    } else if (styleType === 'cinema') {
      fontName = config?.fontFamily || 'Georgia';
      fontSize = 58;
      primaryColor = '&H00F0F0F0';
      highlightColor = '&H00FFFFFF';
      outlineColor = '&H00000000';
      outline = 2;
      shadow = 1;
    } else if (styleType === 'cyber') {
      fontName = config?.fontFamily || 'Courier New';
      fontSize = 64;
      primaryColor = '&H0000F2FE';
      highlightColor = '&H00FE0879';
      outlineColor = '&H00000000';
      outline = 3;
      shadow = 4;
    }

    if (config?.textColor) {
      primaryColor = this.hexToAssColor(config.textColor);
    }
    if (config?.highlightColor) {
      highlightColor = this.hexToAssColor(config.highlightColor);
    }
    if (config?.strokeColor) {
      outlineColor = this.hexToAssColor(config.strokeColor);
    }
    if (config?.fontSize) {
      fontSize = Math.round(config.fontSize * 2.2);
    }

    // Cabecera ASS
    let assContent = `[Script Info]
; Script generado por ViralCut AI
Title: ViralCut Hardsub
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709
PlayResX: ${resX}
PlayResY: ${resY}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${primaryColor},&H000000FF,${outlineColor},&H80000000,-1,0,0,0,100,100,0,0,1,${outline},${shadow},2,60,60,${marginV},1
Style: Highlight,${fontName},${fontSize},${highlightColor},&H000000FF,${outlineColor},&H80000000,-1,0,0,0,105,105,0,0,1,${outline + 1},${shadow + 1},2,60,60,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    // Normalizar subtítulos relativos al inicio del clip
    const clipEnd = clipStartTime + clipDuration;
    const relevantSubs = (subtitles || []).filter(s => {
      const sStart = (s as any).startTime ?? s.start ?? 0;
      const sEnd = (s as any).endTime ?? s.end ?? 0;
      return sEnd > clipStartTime && sStart < clipEnd;
    });

    for (const seg of relevantSubs) {
      const sStart = (seg as any).startTime ?? seg.start ?? 0;
      const sEnd = (seg as any).endTime ?? seg.end ?? 0;
      const segStartRel = Math.max(0, sStart - clipStartTime);
      const segEndRel = Math.min(clipDuration, sEnd - clipStartTime);

      if (segEndRel <= segStartRel) continue;

      if (seg.words && seg.words.length > 0) {
        // Renderizado por palabras animadas (karaoke / pop word)
        for (let i = 0; i < seg.words.length; i++) {
          const w = seg.words[i];
          const wStartRel = Math.max(0, w.start - clipStartTime);
          const wEndRel = Math.min(clipDuration, w.end - clipStartTime);

          if (wEndRel <= wStartRel) continue;

          // Construir línea con palabra activa resaltada
          const lineWords = seg.words.map((otherWord, oIdx) => {
            let text = isUppercase ? otherWord.word.toUpperCase() : otherWord.word;
            const emoji = this.getEmojiForWord(otherWord.word);
            if (emoji && (otherWord.highlight || oIdx === i)) {
              text = `${text} ${emoji}`;
            }

            if (oIdx === i) {
              // Palabra activa con pop scale y highlight color
              return `{\\c${highlightColor}\\fscx108\\fscy108}${text}{\\r}`;
            } else {
              return `{\\c${primaryColor}}${text}{\\r}`;
            }
          }).join(' ');

          const startStr = this.formatAssTime(wStartRel);
          const endStr = this.formatAssTime(wEndRel);
          assContent += `Dialogue: 0,${startStr},${endStr},Default,,0,0,0,,${lineWords}\n`;
        }
      } else {
        // Segmento de texto completo
        let text = isUppercase ? seg.text.toUpperCase() : seg.text;
        const words = text.split(' ');
        const processedWords = words.map(w => {
          const emoji = this.getEmojiForWord(w);
          return emoji ? `${w} ${emoji}` : w;
        });
        text = processedWords.join(' ');

        const startStr = this.formatAssTime(segStartRel);
        const endStr = this.formatAssTime(segEndRel);
        assContent += `Dialogue: 0,${startStr},${endStr},Default,,0,0,0,,${text}\n`;
      }
    }

    return assContent;
  }

  /**
   * Genera el archivo .ass estilizado para un clip y lo guarda en disco
   */
  public generateAssFile(
    clipId: string,
    subtitles: SubtitleSegment[],
    clipStartTime: number,
    clipDuration: number,
    config?: SubtitleConfig
  ): string {
    const assContent = this.generateAssContent(subtitles, clipStartTime, clipDuration, config);
    const assFilePath = path.join(UPLOADS_DIR, `subs_${clipId}_${Date.now()}.ass`);
    fs.writeFileSync(assFilePath, assContent, 'utf-8');
    return assFilePath;
  }
}

export const subtitleBurnerService = new SubtitleBurnerService();
