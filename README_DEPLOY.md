# ☁️ GUÍA DE DESPLIEGUE EN SERVIDOR GRATIS (¡100% SIN DOCKER!)

> 🚨 **ACLARACIÓN IMPORTANTE SOBRE DOCKER:**  
> **NO necesitas instalar Docker en tu computadora ni pagar absolutamente nada.**  
> Aunque la empresa Docker cobra licencias por su programa de escritorio para empresas grandes, **este proyecto funciona en servidores gratuitos directamente con Node.js puro sin tocar Docker**, o en nubes donde ellos ponen los servidores sin cobrarte un centavo.

---

## 🏆 OPCIÓN RECOMENDADA: Render.com (100% GRATIS • SIN DOCKER)

Esta opción es la más sencilla: **Render.com** ejecuta la aplicación con **Node.js nativo**. Ya dejamos instalado `@ffmpeg-installer/ffmpeg` dentro de las dependencias, por lo que el servidor ya tiene FFmpeg incorporado automáticamente.

### Paso 1: Subir tu proyecto a GitHub
1. Entra a [github.com](https://github.com) y crea una cuenta si no tienes una.
2. Crea un nuevo repositorio (por ejemplo: `viralcut-ai`).
3. En la terminal de tu proyecto en la computadora, sube tu código:
   ```bash
   git init
   git add .
   git commit -m "ViralCut AI listo para la nube"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/viralcut-ai.git
   git push -u origin main
   ```

### Paso 2: Crear el servidor gratis en Render
1. Entra a [render.com](https://render.com) y crea tu cuenta gratuita (puedes iniciar sesión con tu cuenta de GitHub con un clic).
2. En el panel principal, haz clic en el botón azul **"New +"** y selecciona **"Web Service"**.
3. Selecciona **"Build and deploy from a Git repository"** y haz clic en **Next**.
4. Conecta tu repositorio de GitHub `viralcut-ai`.
5. Llena estos campos (es muy fácil):
   - **Name**: `viralcut-ai` (o el nombre que quieras)
   - **Language / Runtime**: Selecciona **`Node`** *(¡NO selecciones Docker!)*
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Instance Type**: Selecciona **`Free`** ($0 / mes)
6. Haz clic en el botón inferior **"Create Web Service"**.

### Paso 3: ¡Listo!
Render comenzará a compilar la aplicación. En aproximadamente 2 minutos te dará un enlace web propio con candado de seguridad HTTPS:  
`https://viralcut-ai.onrender.com`

---

## 🌟 OPCIÓN ALTERNATIVA: Hugging Face Spaces (16 GB RAM • 100% GRATIS)

Si procesas videos muy largos y quieres **16 GB de memoria RAM gratis**, Hugging Face es una plataforma de inteligencia artificial (propiedad de Hugging Face Inc.) que te regala servidores en la nube sin pedir tarjeta de crédito.

*(En Hugging Face seleccionas "Docker" como tipo de plantilla porque sus servidores la leen solos, pero **tú no tienes que instalar Docker ni pagar nada a Docker**)*.

### Pasos rápidos:
1. Regístrate en [huggingface.co](https://huggingface.co).
2. Haz clic en tu perfil arriba a la derecha -> **"New Space"**.
3. Nombre: `viralcut-ai`.
4. Space SDK: **Docker** -> **Blank**.
5. Hardware: **CPU basic • 2 vCPU • 16GB RAM • FREE**.
6. Sube tu código con Git y tendrás tu app en:  
   `https://TU_USUARIO-viralcut-ai.hf.space`

---

## 📱 ¿Cómo usar tu app en la nube sin ocupar tu PC?

1. Abre el enlace que te dio Render (ej. `https://viralcut-ai.onrender.com`) desde el navegador de tu computadora, laptop o desde tu celular.
2. Pega cualquier video de YouTube o usa las muestras.
3. La aplicación hará la transcripción, el análisis de retención viral, el recorte 9:16 y el renderizado FFmpeg en los servidores de Render en internet.
4. **Tu computadora no consume batería, no usa ventiladores, no gasta memoria RAM y no almacena videos pesados en tu disco**.
5. Al terminar, descargas el clip directamente con el botón de descarga.
