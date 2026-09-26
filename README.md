# 🚀 ViralCut AI — Smart Short Engine

Transforma videos largos en clips cortos verticales (9:16) optimizados con alta retención para **TikTok**, **Instagram Reels** y **YouTube Shorts**.

---

## 🌟 Características Principales

1. **Experiencia Minimalista y Futurista**:
   - Estética obsidian con acentos cyber cyan (`#00F0FF`) y modo claro/oscuro configurable.
   - Espacio visual despejado, micro-animaciones fluidas y tipografía moderna (`Outfit` + `Inter`).

2. **Procesamiento Real Multi-Etapa**:
   - Monitor en tiempo real con 8 etapas auténticas:
     - `✓ Obteniendo información`
     - `✓ Analizando duración`
     - `● Transcribiendo contenido`
     - `○ Detectando momentos importantes`
     - `○ Analizando escenas & Smart Reframe`
     - `○ Buscando hooks`
     - `○ Calculando potencial (Potential Score)`
     - `○ Preparando clips`

3. **Algoritmo de Detección y Potential Score (0-100)**:
   - Evaluación transparente basada en señales objetivas del contenido:
     - *Hook Impact (0-25 pts)*: Primeros 3 segundos.
     - *Densidad de Información (0-25 pts)*: Cadencia de palabras y valor explicativo.
     - *Picos Emocionales / Sorpresa (0-20 pts)*: Modulación y palabras clave.
     - *Ritmo y Flow (0-15 pts)*: Duración óptima para retención.
     - *Curiosity Loop (0-15 pts)*: Cierre con pregunta o intriga.
   - Categorización automática: **Humor, Información, Emoción, Debate, Sorpresa, Historia, Educación**.

4. **Editor de Video Integrado**:
   - **Timeline Interactivo**: Ajuste fino de In-point y Out-point con visualización de audio waveform.
   - **Smart Reframe 9:16**: Detección y seguimiento dinámico de orador con suavizado de paneo, zoom y offset horizontal.
   - **Estudio de Subtítulos**: Estilos predefinidos (*Hormozi Kinetic*, *Clean Modern*, *Cyberpunk Glow*, *Cinematic Minimal*), resaltado interactivo de palabras clave, ajuste de tamaño, posición y color.
   - **Social Kit de Metadatos**: Generación de títulos llamativos, descripciones optimizadas y hashtags virales con copia en 1 clic.

5. **Motor de Renderizado FFmpeg**:
   - Exportación real a **MP4 1080×1920 (H.264 / AAC)** a través de FFmpeg.
   - Descarga directa en el navegador.

6. **Historial y Gestión de Proyectos**:
   - Base de datos local persistente (`data/db.json`).
   - Gestión de proyectos: reabrir, editar clips y eliminar.

---

## 🛠️ Arquitectura Técnica

```
ViralCut AI
├── client/ (Vite + React 18 + TypeScript + Tailwind CSS v4 + Lucide Icons)
│   ├── src/components/         # Componentes modulares
│   ├── src/components/VideoEditor/ # Suite del editor de video
│   ├── src/services/api.ts     # Cliente API tipado
│   └── src/types/              # Interfaces TypeScript
├── server/ (Node.js + Express + TypeScript + SQLite/JSON Store + FFmpeg)
│   ├── server/services/
│   │   ├── youtubeService.ts   # Extracción de metadatos y videos de muestra
│   │   ├── transcriptService.ts # Subtítulos y timestamps palabra por palabra
│   │   ├── retentionAnalyzer.ts # Algoritmo de scoring de retención
│   │   ├── smartReframeService.ts # Reencuadre dinámico 9:16
│   │   └── renderEngine.ts     # Renderizado y transcodificación MP4
│   └── server/routes/          # Endpoints REST y Server-Sent Events (SSE)
```

---

## ⚡ Instalación y Ejecución

### 1. Requisitos Previos
- **Node.js**: v18 o superior (v22 recomendado).
- **npm**: v9 o superior.

### 2. Iniciar el Servidor de Desarrollo
```bash
npm run dev
```
Esto iniciará simultáneamente:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000`

### 3. Ejecutar las Pruebas Automatizadas
```bash
npm test
```

### 4. Compilar para Producción
```bash
npm run build
```

---

## 🔒 Variables de Entorno y Seguridad
Crea un archivo `.env` en la raíz si deseas configurar puertos o claves de IA opcionales:
```env
PORT=4000
NODE_ENV=development
GEMINI_API_KEY=tu_clave_opcional
OPENAI_API_KEY=tu_clave_opcional
```
*Nota: La aplicación incluye un motor algorítmico local de análisis y transcripción integrado que funciona de inmediato sin necesidad obligatoria de claves externas.*
