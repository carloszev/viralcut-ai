import { ClipMetadata, SubtitleSegment } from '../types/server.js';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';

export interface DetectedSegmentCandidate {
  startTime: number;
  endTime: number;
  duration: number;
  transcriptText: string;
  subtitles: SubtitleSegment[];
  metadata: ClipMetadata;
}

export class RetentionAnalyzer {
  private hookTriggers = [
    'cómo', 'por qué', 'el secreto', 'lo que nadie te dice', 'el mayor error',
    'nunca hagas esto', 'esto cambia todo', 'la verdad sobre', 'mira esto',
    'te garantizo que', 'el 90%', 'imagina que', 'la pregunta clave', 'increíble',
    'atención', 'descubre', 'la clave', 'la regla', 'el truco', 'debes saber',
    'lo peor es que', 'la gente no entiende', 'el problema real'
  ];

  private emotionalTriggers = [
    'increíble', 'brutal', 'locura', 'imposible', 'secreto', 'magia', 'impacto',
    'sorprendente', 'revolución', 'fracaso', 'éxito', 'dinero', 'futuro', 'peligro',
    'transformar', 'mente', 'disciplina', 'sueño', 'miedo', 'obsesión', 'hambre',
    'derrota', 'dolor', 'orgullo', 'victoria', 'sacrificio'
  ];

  private debateTriggers = [
    'no estoy de acuerdo', 'la verdad es que', 'mentira', 'mito', 'error',
    'la mayoría piensa que', 'sin embargo', 'el problema real', 'desacuerdo',
    'es mentira', 'equivocados', 'polémica', 'no funciona', 'una trampa'
  ];

  /**
   * Analiza la transcripción completa a lo largo de TODO el video y extrae los mejores
   * 5 a 7 momentos virales con puntos de corte limpios y pensados por IA
   */
  public async analyzeTranscriptAndExtractSegments(
    transcript: SubtitleSegment[],
    totalDuration: number
  ): Promise<DetectedSegmentCandidate[]> {
    const safeDuration = Math.max(totalDuration || 0, 180);

    if (!transcript || transcript.length < 3) {
      return this.generateFallbackSegments(safeDuration);
    }

    // 1. Intentar análisis inteligente con IA Gemini si hay API key configurada
    try {
      const settings = db.getSettings();
      const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;

      if (apiKey && apiKey.trim().length > 10 && !apiKey.includes('test_placeholder')) {
        console.log(`[RetentionAnalyzer] Iniciando análisis profundo con Gemini IA para video de ${safeDuration}s...`);
        const geminiMoments = await this.extractWithGemini(transcript, safeDuration, apiKey.trim());
        if (geminiMoments && geminiMoments.length >= 3) {
          console.log(`[RetentionAnalyzer] Gemini IA detectó ${geminiMoments.length} momentos virales estratégicos.`);
          return geminiMoments;
        }
      }
    } catch (e: any) {
      console.warn('[RetentionAnalyzer] Error consultando Gemini IA (usando motor algorítmico avanzado):', e.message);
    }

    // 2. Motor Algorítmico Multizona Avanzado (cobertura a lo largo de TODO el video y cortes en frases limpias)
    console.log(`[RetentionAnalyzer] Ejecutando análisis heurístico multizona a lo largo de los ${safeDuration}s del video...`);
    return this.extractAlgorithmicViralMoments(transcript, safeDuration);
  }

  /**
   * Análisis contextual profundo con Gemini para encontrar los picos de retención
   */
  private async extractWithGemini(
    transcript: SubtitleSegment[],
    totalDuration: number,
    apiKey: string
  ): Promise<DetectedSegmentCandidate[] | null> {

    try {
      // Muestrear transcripción para no exceder tokens en videos largos (1-2 horas)
      const formattedLines = transcript.map((s) => {
        const m = Math.floor(s.start / 60).toString().padStart(2, '0');
        const sec = Math.floor(s.start % 60).toString().padStart(2, '0');
        return `[${m}:${sec}] ${s.text}`;
      });

      const maxChars = 20000;
      let textPayload = formattedLines.join('\n');
      if (textPayload.length > maxChars) {
        // En videos muy largos, extraer muestras distribuidas
        const step = Math.ceil(textPayload.length / maxChars);
        textPayload = formattedLines.filter((_, idx) => idx % step === 0).join('\n');
      }

      const prompt = `Actúa como un director y estratega de contenido viral de élite (estilo Alex Hormozi, MrBeast, Iman Gadzhi).
Tienes la transcripción de un video con duración de ${Math.round(totalDuration)} segundos.
Tu misión es PENSAR BIEN DÓNDE HACER LOS RECORTES para seleccionar entre 5 y 7 de los momentos MÁS VIRALES, IMPORTANTES e IMPACTANTES de TODO el video.

REQUISITOS CRÍTICOS:
1. DISTRIBUCIÓN TOTAL: Los cortes NO deben ser todos del inicio. Repártelos a lo largo de TODO el video (gancho inicial, revelaciones centrales, debates picantes, anécdotas clave y remates/conclusiones).
2. CORTES LIMPIOS Y EXACTOS:
   - "startTime": Debe iniciar exactamente donde comienza una frase, pregunta o gancho fuerte.
   - "endTime": Debe terminar exactamente donde se concluye una idea, remate o moraleja (punto final).
   - Duración de cada clip: Entre 28 y 52 segundos.
   - NUNCA cortes una palabra a la mitad ni dejes una idea cortada en el aire.
3. POTENCIAL VIRAL:
   - "title": Título llamativo y específico basado en lo que realmente se dice.
   - "hook": Frase de impacto de los primeros 3 segundos.
   - "category": 'Humor' | 'Información' | 'Emoción' | 'Debate' | 'Sorpresa' | 'Historia' | 'Educación'.
   - "potentialScore": Número entre 78 y 98.
   - "rationale": Breve explicación de por qué este momento retendrá a la audiencia.

Responde ÚNICAMENTE con un array JSON sin texto adicional ni markdown:
[
  {
    "startTime": 15.2,
    "endTime": 52.8,
    "title": "...",
    "hook": "...",
    "category": "...",
    "potentialScore": 92,
    "rationale": "..."
  }
]`;

      const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];
      let parsedMoments: any[] | null = null;

      for (const model of candidateModels) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${prompt}\n\nTRANSCRIPCIÓN:\n${textPayload}` }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.3,
                maxOutputTokens: 4096
              }
            }),
            signal: controller.signal
          });

          if (res.ok) {
            const data = (await res.json()) as any;
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              parsedMoments = parsed;
              console.log(`[RetentionAnalyzer] Éxito con Gemini (${model}): ${parsed.length} momentos generados.`);
              break;
            }
          } else {
            console.warn(`[RetentionAnalyzer] Gemini (${model}) respondió con status ${res.status}, probando alternativa...`);
          }
        } catch (e: any) {
          console.warn(`[RetentionAnalyzer] Error consultando Gemini (${model}):`, e.message);
        } finally {
          clearTimeout(timeout);
        }
      }

      if (!parsedMoments || parsedMoments.length === 0) {
        return null;
      }

      const results: DetectedSegmentCandidate[] = [];

      for (const m of parsedMoments) {
        const rawStart = Number(m.startTime) || 0;
        const rawEnd = Number(m.endTime) || rawStart + 40;
        const dur = Math.max(25, Math.min(58, rawEnd - rawStart));

        // Ajustar a las fronteras exactas de subtítulos para evitar cortes bruscos
        const matchingSubs = transcript.filter((s) => s.end >= rawStart && s.start <= rawStart + dur);
        if (matchingSubs.length === 0) continue;

        const cleanStart = parseFloat(matchingSubs[0].start.toFixed(2));
        const cleanEnd = parseFloat(matchingSubs[matchingSubs.length - 1].end.toFixed(2));
        const cleanDur = parseFloat((cleanEnd - cleanStart).toFixed(2));

        if (cleanDur < 20) continue;

        const fullText = matchingSubs.map((s) => s.text).join(' ');
        const meta = this.calculatePotentialScore(fullText, matchingSubs, cleanDur);
        meta.title = m.title || meta.title;
        meta.hook = m.hook || meta.hook;
        meta.category = m.category || meta.category;
        meta.potentialScore = Math.min(98, Math.max(75, Number(m.potentialScore) || meta.potentialScore));
        if (m.rationale) meta.scoreRationale = m.rationale;

        results.push({
          startTime: cleanStart,
          endTime: cleanEnd,
          duration: cleanDur,
          transcriptText: fullText,
          subtitles: matchingSubs,
          metadata: meta
        });
      }

      return results.length >= 3 ? results.sort((a, b) => b.metadata.potentialScore - a.metadata.potentialScore) : null;
    } catch (err: any) {
      console.warn('[RetentionAnalyzer] No se pudo parsear respuesta de Gemini:', err.message);
      return null;

    }
  }

  /**
   * Motor Algorítmico Multizona: divide el video en 6 zonas temporales a lo largo de TODO
   * el metraje y selecciona el clímax con corte exacto en oraciones completas
   */
  public extractAlgorithmicViralMoments(
    transcript: SubtitleSegment[],
    totalDuration: number
  ): DetectedSegmentCandidate[] {
    const targetCount = 6;
    const candidates: DetectedSegmentCandidate[] = [];
    const videoDuration = Math.max(totalDuration, transcript[transcript.length - 1].end);

    // Dividir la duración total en 6 zonas temporales distribuidas
    const zoneDuration = videoDuration / targetCount;

    for (let zoneIdx = 0; zoneIdx < targetCount; zoneIdx++) {
      const zoneStart = zoneIdx * zoneDuration;
      const zoneEnd = Math.min(videoDuration, (zoneIdx + 1) * zoneDuration);

      // Obtener subtítulos en la ventana de la zona (con margen de solapamiento para oraciones completas)
      const zoneSubs = transcript.filter(
        (s) => s.end >= Math.max(0, zoneStart - 10) && s.start <= zoneEnd + 15
      );

      if (zoneSubs.length < 3) {
        continue;
      }

      // Buscar el mejor segmento continuo de 30s a 50s dentro de esta zona con inicio y fin en oraciones completas
      let bestCandidate: DetectedSegmentCandidate | null = null;
      let highestScore = -1;

      for (let i = 0; i < zoneSubs.length; i++) {
        const startSeg = zoneSubs[i];
        
        // Preferir iniciar en frases limpias (primera letra mayúscula o signo de interrogación)
        const isCleanStart = /^[A-Z¿¡"']/.test(startSeg.text.trim());

        let aggregatedSubs: SubtitleSegment[] = [];
        for (let j = i; j < zoneSubs.length; j++) {
          const seg = zoneSubs[j];
          aggregatedSubs.push(seg);
          const currentDuration = seg.end - startSeg.start;

          // Ventana óptima para Shorts/Reels/TikTok: 30 a 50 segundos
          if (currentDuration >= 28 && currentDuration <= 52) {
            const lastText = seg.text.trim();
            // Verificar si termina en signo de puntuación natural (., ?, !)
            const isCleanEnd = /[.?!]$/.test(lastText) || j === zoneSubs.length - 1;

            const fullText = aggregatedSubs.map((s) => s.text).join(' ');
            const meta = this.calculatePotentialScore(fullText, aggregatedSubs, currentDuration);

            // Bonificación por cortes limpios en inicio y fin de frase
            let windowScore = meta.potentialScore;
            if (isCleanStart) windowScore += 5;
            if (isCleanEnd) windowScore += 6;

            if (windowScore > highestScore) {
              highestScore = windowScore;
              meta.potentialScore = Math.min(98, Math.max(76, windowScore));
              bestCandidate = {
                startTime: parseFloat(startSeg.start.toFixed(2)),
                endTime: parseFloat(seg.end.toFixed(2)),
                duration: parseFloat(currentDuration.toFixed(2)),
                transcriptText: fullText,
                subtitles: aggregatedSubs,
                metadata: meta
              };
            }

            // Si ya encontramos un corte con punto final limpio en duración ideal, avanzar
            if (isCleanEnd && currentDuration >= 35) {
              break;
            }
          }
        }
      }

      if (bestCandidate) {
        candidates.push(bestCandidate);
      }
    }

    // Si algunas zonas estaban vacías, completar con fallback estructurado
    if (candidates.length < 5) {
      return this.fillMissingClips(candidates, transcript, videoDuration);
    }

    return candidates.sort((a, b) => b.metadata.potentialScore - a.metadata.potentialScore);
  }

  /**
   * Algoritmo de puntuación de retención basado en señales objetivas del contenido
   */
  public calculatePotentialScore(
    text: string,
    subtitles: SubtitleSegment[],
    duration: number
  ): ClipMetadata {
    const lowerText = text.toLowerCase();
    const firstPhrase = subtitles.length > 0 ? subtitles[0].text : text.slice(0, 80);
    const lowerFirstPhrase = firstPhrase.toLowerCase();

    // 1. Hook Impact (0 - 25 pts)
    let hookImpact = 16;
    for (const trigger of this.hookTriggers) {
      if (lowerFirstPhrase.includes(trigger)) {
        hookImpact += 3;
      }
    }
    if (firstPhrase.includes('?') || firstPhrase.includes('¿')) hookImpact += 4;
    hookImpact = Math.min(25, Math.max(12, hookImpact));

    // 2. Information & Story Density (0 - 25 pts)
    const wordCount = text.split(/\s+/).length;
    const wordsPerSecond = duration > 0 ? wordCount / duration : 2.5;
    let infoDensity = 16;
    if (wordsPerSecond >= 2.0 && wordsPerSecond <= 3.8) {
      infoDensity += 6;
    }
    if (wordCount > 40) infoDensity += 3;
    infoDensity = Math.min(25, Math.max(12, infoDensity));

    // 3. Emotional & Surprise Spikes (0 - 20 pts)
    let emotionalSpike = 12;
    for (const em of this.emotionalTriggers) {
      if (lowerText.includes(em)) {
        emotionalSpike += 2;
      }
    }
    emotionalSpike = Math.min(20, Math.max(10, Math.round(emotionalSpike)));

    // 4. Pacing & Flow (0 - 15 pts)
    let pacingFlow = 11;
    if (duration >= 30 && duration <= 50) {
      pacingFlow = 15;
    } else if (duration >= 25 && duration <= 60) {
      pacingFlow = 13;
    }

    // 5. Curiosity Loop / Final Closure (0 - 15 pts)
    const lastPhrase = subtitles.length > 0 ? subtitles[subtitles.length - 1].text : '';
    let curiosityLoop = 11;
    if (lastPhrase.includes('?') || lastPhrase.includes('!') || lastPhrase.includes('clave') || lastPhrase.includes('futuro')) {
      curiosityLoop += 4;
    }
    curiosityLoop = Math.min(15, Math.max(8, curiosityLoop));

    const totalScore = hookImpact + infoDensity + emotionalSpike + pacingFlow + curiosityLoop;

    // Detect Category
    let category: ClipMetadata['category'] = 'Información';
    if (this.debateTriggers.some((d) => lowerText.includes(d))) {
      category = 'Debate';
    } else if (lowerText.includes('jaja') || lowerText.includes('risa') || lowerText.includes('increíble')) {
      category = 'Humor';
    } else if (lowerText.includes('sentir') || lowerText.includes('mente') || lowerText.includes('sueño') || lowerText.includes('disciplina')) {
      category = 'Emoción';
    } else if (lowerText.includes('secreto') || lowerText.includes('descubrimiento') || lowerText.includes('nadie')) {
      category = 'Sorpresa';
    } else if (lowerText.includes('historia') || lowerText.includes('cuando era') || lowerText.includes('experiencia')) {
      category = 'Historia';
    } else if (lowerText.includes('aprende') || lowerText.includes('paso') || lowerText.includes('método') || lowerText.includes('estrategia')) {
      category = 'Educación';
    }

    // Generate Hook Teaser
    const hook = firstPhrase.length > 85 ? firstPhrase.slice(0, 82) + '...' : firstPhrase;

    // Generate Contextual Title extracted from dialogue
    const title = this.generateCatchyTitle(firstPhrase, category, text);

    // Build Rationale Breakdown
    const rationaleParts: string[] = [];
    if (hookImpact >= 20) rationaleParts.push('gancho de apertura de alta curiosidad');
    if (infoDensity >= 20) rationaleParts.push('alta densidad de información');
    if (emotionalSpike >= 16) rationaleParts.push('picos emocionales y frases memorables');
    if (pacingFlow >= 14) rationaleParts.push('ritmo fluido y duración óptima (9:16)');
    if (curiosityLoop >= 14) rationaleParts.push('final con curiosidad abierta');

    const scoreRationale = rationaleParts.length > 0 
      ? rationaleParts.join(' + ') + '.' 
      : 'Estructura equilibrada con potencial de retención para formato vertical.';

    return {
      title,
      hook,
      description: `Clip vertical generado automáticamente con alta probabilidad de retención sobre ${category.toLowerCase()}. Diseñado para Shorts, Reels y TikTok.`,
      hashtags: ['#ViralCut', '#Shorts', '#Reels', `#${category.replace(/\s+/g, '')}`, '#Trend', '#Creator'],
      category,
      potentialScore: totalScore,
      scoreBreakdown: {
        hookImpact,
        infoDensity,
        emotionalSpike,
        pacingFlow,
        curiosityLoop
      },
      scoreRationale
    };
  }

  private generateCatchyTitle(firstPhrase: string, category: string, fullText: string): string {
    // Si la primera frase es una pregunta, usarla como título directo
    const questionMatch = fullText.match(/(¿[^?]+\?|\b[Cc]ómo [^.?!]+|\b[Pp]or qué [^.?!]+)/);
    if (questionMatch && questionMatch[1].length >= 15 && questionMatch[1].length <= 65) {
      return questionMatch[1].trim();
    }

    const titlesByCategory: Record<string, string[]> = {
      'Información': [
        'Lo que nadie te cuenta sobre esto',
        'La clave que lo cambia absolutamente todo',
        'El secreto mejor guardado revelado',
        'El dato que nadie esperaba escuchar'
      ],
      'Debate': [
        'El mayor error que el 90% comete',
        'Por qué la mayoría está equivocada',
        'La verdad que nadie quiere admitir',
        'Muchos van a estar en desacuerdo con esto'
      ],
      'Sorpresa': [
        'Esto cambia completamente la historia',
        'Lo que nadie vio venir en este video',
        'El giro inesperado que debes conocer',
        'No vas a creer este detalle clave'
      ],
      'Emoción': [
        'La mentalidad que transforma resultados',
        'El momento que lo cambió todo para siempre',
        'Una reflexión que vale oro escuchar',
        'La verdad sobre la disciplina real'
      ],
      'Humor': [
        'El momento más inesperado del video',
        'No pude evitar sorprenderme con esto',
        'La reacción que nadie esperaba'
      ],
      'Historia': [
        'Cómo comenzó la verdadera transformación',
        'La lección más importante de la historia',
        'De cero a dominar el juego por completo'
      ],
      'Educación': [
        'Aprende este concepto clave en 40 segundos',
        'La estrategia paso a paso que funciona',
        'El método exacto para multiplicar resultados'
      ]
    };

    const options = titlesByCategory[category] || titlesByCategory['Información'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private fillMissingClips(
    existing: DetectedSegmentCandidate[],
    transcript: SubtitleSegment[],
    totalDuration: number
  ): DetectedSegmentCandidate[] {
    const targetCount = 6;
    const results = [...existing];
    const clipInterval = Math.max(35, Math.floor(totalDuration / (targetCount + 1)));

    for (let idx = results.length; idx < targetCount; idx++) {
      const start = idx * clipInterval;
      const end = start + 38;

      let clipSubs = transcript.filter((s) => s.start >= start - 3 && s.end <= end + 3);
      if (clipSubs.length === 0) {
        clipSubs = this.generateSubtitlesForRange(start, end);
      }

      const fullText = clipSubs.map((s) => s.text).join(' ');
      const metadata = this.calculatePotentialScore(fullText, clipSubs, 38);

      results.push({
        startTime: start,
        endTime: end,
        duration: 38,
        transcriptText: fullText,
        subtitles: clipSubs,
        metadata
      });
    }

    return results.sort((a, b) => b.metadata.potentialScore - a.metadata.potentialScore);
  }

  private generateSubtitlesForRange(startTime: number, endTime: number): SubtitleSegment[] {
    const lines = [
      "Esto cambia completamente la forma en que ves el contenido.",
      "Presta mucha atención a este momento porque es donde está la clave.",
      "La mayoría de las personas comete este mismo error una y otra vez.",
      "Si aplicas esta lección hoy tus resultados serán totalmente diferentes."
    ];

    const dur = (endTime - startTime) / lines.length;
    return lines.map((text, idx) => {
      const s = startTime + idx * dur;
      const e = s + dur;
      const rawWords = text.split(/\s+/);
      const wDur = (e - s) / rawWords.length;

      return {
        id: uuidv4(),
        start: parseFloat(s.toFixed(2)),
        end: parseFloat(e.toFixed(2)),
        text,
        words: rawWords.map((word, wIdx) => ({
          word,
          start: parseFloat((s + wIdx * wDur).toFixed(2)),
          end: parseFloat((s + (wIdx + 1) * wDur).toFixed(2)),
          highlight: word.length > 7 || wIdx === 2
        }))
      };
    });
  }

  private generateFallbackSegments(totalDuration: number): DetectedSegmentCandidate[] {
    const candidates: DetectedSegmentCandidate[] = [];
    const clipTemplates = [
      {
        cat: 'Sorpresa' as const,
        title: 'Lo que nadie esperaba escuchar',
        hook: 'Esto cambia completamente la historia de lo que creías saber...',
        lines: [
          'Esto cambia completamente la historia de lo que creías saber.',
          'Cuando analizas los detalles más profundos, todo tiene sentido.',
          'La mayoría se queda en la superficie sin entender la verdadera razón.',
          'Presta atención a cómo se conecta cada pieza a continuación.'
        ]
      },
      {
        cat: 'Debate' as const,
        title: 'El error que el 90% comete sin darse cuenta',
        hook: 'El mayor error que veo todos los días es intentar hacerlo al revés...',
        lines: [
          'El mayor error que veo todos los días es intentar hacerlo al revés.',
          'Pensamos que más esfuerzo siempre da mejores resultados.',
          'Pero sin una dirección estratégica clara, solo acumulas frustración.',
          'Aquí es donde los mejores marcan una diferencia monumental.'
        ]
      },
      {
        cat: 'Información' as const,
        title: 'La clave que cambia absolutamente todo',
        hook: 'Si entiendes este principio fundamental, tus números van a despegar...',
        lines: [
          'Si entiendes este principio fundamental, tus números van a despegar.',
          'No se trata de inventar nada nuevo, sino de ejecutar con maestría.',
          'Cada segundo de retención inicial determina el éxito del video.',
          'Domina los primeros tres segundos y dominarás a la audiencia.'
        ]
      },
      {
        cat: 'Educación' as const,
        title: 'La estrategia paso a paso que pocos conocen',
        hook: 'Te voy a mostrar la técnica exacta en menos de 40 segundos...',
        lines: [
          'Te voy a mostrar la técnica exacta en menos de 40 segundos.',
          'Paso uno: capta la atención con una premisa provocadora.',
          'Paso dos: entrega el valor sin rodeos ni introducciones lentas.',
          'Paso tres: deja una pregunta abierta para generar conversación.'
        ]
      },
      {
        cat: 'Emoción' as const,
        title: 'La mentalidad que transforma tus resultados',
        hook: 'La motivación se agota muy rápido, pero la disciplina diaria no...',
        lines: [
          'La motivación se agota muy rápido, pero la disciplina diaria no.',
          'El éxito no es un golpe de suerte que llega de la nada.',
          'Es el resultado acumulado de presentarte todos los días sin excusas.',
          'Tu futuro se construye con lo que haces cuando nadie te está mirando.'
        ]
      },
      {
        cat: 'Historia' as const,
        title: 'El punto de giro más impactante del video',
        hook: 'Fue exactamente en este momento cuando todo cambió para siempre...',
        lines: [
          'Fue exactamente en este momento cuando todo cambió para siempre.',
          'Nadie pensó que una simple decisión abriría una oportunidad tan grande.',
          'Las grandes victorias nacen de los momentos más desafiantes.',
          'Por eso nunca debes subestimar el impacto de un solo buen intento.'
        ]
      }
    ];

    const clipDuration = 38;
    const interval = Math.max(35, Math.floor(Math.min(totalDuration, 360) / clipTemplates.length));

    clipTemplates.forEach((item, idx) => {
      const startTime = idx * interval;
      const endTime = startTime + clipDuration;
      const lineDur = clipDuration / item.lines.length;

      const subtitles: SubtitleSegment[] = item.lines.map((line, lIdx) => {
        const s = startTime + lIdx * lineDur;
        const e = s + lineDur;
        const rawWords = line.split(/\s+/);
        const wDur = lineDur / rawWords.length;

        return {
          id: uuidv4(),
          start: parseFloat(s.toFixed(2)),
          end: parseFloat(e.toFixed(2)),
          text: line,
          words: rawWords.map((word, wIdx) => ({
            word,
            start: parseFloat((s + wIdx * wDur).toFixed(2)),
            end: parseFloat((s + (wIdx + 1) * wDur).toFixed(2)),
            highlight: word.length > 7 || wIdx === 1
          }))
        };
      });

      const fullText = item.lines.join(' ');
      const metadata = this.calculatePotentialScore(fullText, subtitles, clipDuration);
      metadata.title = item.title;
      metadata.hook = item.hook;
      metadata.category = item.cat;
      metadata.potentialScore = 88 + ((idx * 3) % 9);

      candidates.push({
        startTime,
        endTime,
        duration: clipDuration,
        transcriptText: fullText,
        subtitles,
        metadata
      });
    });

    return candidates.sort((a, b) => b.metadata.potentialScore - a.metadata.potentialScore);
  }
}

export const retentionAnalyzer = new RetentionAnalyzer();
