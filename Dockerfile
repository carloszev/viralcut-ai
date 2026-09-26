# ==============================================================================
# Dockerfile para ViralCut AI (Cloud Ready: Hugging Face Spaces / Render / Koyeb)
# Incluye Node.js 20, FFmpeg, Python 3 y yt-dlp para procesamiento de video en la nube.
# ==============================================================================

FROM node:20-bullseye-slim

# Evitar prompts interactivos durante apt-get
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV PORT=7860

# Instalar dependencias del sistema requeridas para video y descargas:
# ffmpeg, ffprobe, python3, curl, ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
    fonts-freefont-ttf \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Directorio de trabajo
WORKDIR /app

# Copiar manifiestos de dependencias primero para aprovechar el cache de Docker
COPY package*.json ./

# Instalar dependencias (incluyendo devDependencies para compilar el frontend)
RUN npm install

# Copiar el código fuente completo
COPY . .

# Compilar el frontend Vite a la carpeta dist/
RUN npm run build

# Crear directorios para persistencia de datos y multimedia con permisos de escritura
RUN mkdir -p uploads exports data \
    && chmod -R 777 uploads exports data

# Puerto estándar para Hugging Face Spaces (Render y Koyeb sobreescriben la variable $PORT)
EXPOSE 7860

# Iniciar la aplicación completa (Frontend + Backend + FFmpeg)
CMD ["npm", "start"]
