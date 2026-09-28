# ==============================================================================
# Build Script: ViralCut AI Windows Desktop Application & Mountable ISO Image
# ==============================================================================

$ErrorActionPreference = "Stop"
$sw = [System.Diagnostics.Stopwatch]::StartNew()

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   CREANDO INSTALADOR / IMAGEN ISO DE VIRALCUT AI       " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$WorkspaceRoot = (Get-Item ".").FullName
$DistDir = Join-Path $WorkspaceRoot "dist"
$DistServerDir = Join-Path $WorkspaceRoot "dist-server"
$WinUnpackedDir = Join-Path $WorkspaceRoot "release\win-unpacked"
$IsoStagingDir = Join-Path $WorkspaceRoot "release\iso-staging"
$IsoOutputPath = Join-Path $WorkspaceRoot "ViralCut_AI_v1.1_Setup.iso"

# 1. Compilar Backend a dist-server si no existe o actualizar
Write-Host "`n[1/5] Compilando servidor backend con esbuild..." -ForegroundColor Yellow
& npx esbuild server/index.ts --bundle --platform=node --format=cjs --outfile=dist-server/index.cjs --packages=external
if ($LASTEXITCODE -ne 0) { throw "Error al compilar backend con esbuild" }

# Asegurar que dist-server esté copiado en resources/app
$AppResourcesDir = Join-Path $WinUnpackedDir "resources\app"
if (Test-Path $AppResourcesDir) {
    Copy-Item -Path $DistServerDir -Destination (Join-Path $AppResourcesDir "dist-server") -Recurse -Force
}

# 2. Empaquetar Desktop Executable con electron-builder si no existe
if (-not (Test-Path (Join-Path $WinUnpackedDir "ViralCut AI.exe"))) {
    Write-Host "`n[2/5] Empaquetando aplicación de escritorio con electron-builder..." -ForegroundColor Yellow
    $env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
    & npx electron-builder --dir
    if ($LASTEXITCODE -ne 0) { throw "Error en electron-builder" }
} else {
    Write-Host "`n[2/5] Binario de escritorio ya empaquetado en release\win-unpacked" -ForegroundColor Green
}

# 3. Preparar directorio staging para el archivo ISO
Write-Host "`n[3/5] Preparando archivos para la imagen ISO..." -ForegroundColor Yellow
if (Test-Path $IsoStagingDir) {
    Remove-Item -Path $IsoStagingDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $IsoStagingDir | Out-Null

# Copiar contenido de win-unpacked a staging
Write-Host "       Copiando archivos de la aplicacion..." -ForegroundColor DarkGray
Copy-Item -Path "$WinUnpackedDir\*" -Destination $IsoStagingDir -Recurse -Force

# Crear autorun.inf
$AutorunContent = @"
[AutoRun]
open=ViralCut AI.exe
icon=ViralCut AI.exe,0
label=ViralCut AI Pro
action=Abrir ViralCut AI Pro
"@
Set-Content -Path (Join-Path $IsoStagingDir "autorun.inf") -Value $AutorunContent -Encoding ASCII

# Crear LEEME_PRIMERO.txt
$ReadmeContent = @"
==============================================================================
                    VIRALCUT AI - VERSION 1.1 PRO
                 Editor y Creador Inteligente de Videos
==============================================================================

¡Bienvenido a ViralCut AI!

Esta unidad contiene la aplicacion de escritorio nativa e independiente de
ViralCut AI. NO requiere un navegador web ni abre ventanas de explorador.

OPCIONES DE USO:

1. USO DIRECTO (PORTABLE):
   Simplemente haz doble clic en "ViralCut AI.exe" para abrir la aplicacion
   directamente. Todos tus proyectos, exportaciones y configuraciones se
   guardaran de forma segura en tu equipo (%APPDATA%\ViralCutAI y tus Videos).

2. INSTALAR EN TU EQUIPO:
   Si deseas instalar ViralCut AI en tu disco duro y tener un acceso directo
   en tu Escritorio, haz doble clic en:
   "Instalar ViralCut AI.bat"

==============================================================================
© 2026 ViralCut AI - Motor de Inteligencia Artificial para Redes Sociales
==============================================================================
"@
Set-Content -Path (Join-Path $IsoStagingDir "LEEME_PRIMERO.txt") -Value $ReadmeContent -Encoding UTF8

# Crear Instalar ViralCut AI.bat
$InstallerBat = @'
@echo off
chcp 65001 >nul
title Instalador Oficial de ViralCut AI
color 0B
cls
echo ==============================================================================
echo                INSTALADOR OFICIAL DE VIRALCUT AI PRO
echo ==============================================================================
echo.
echo Instalando ViralCut AI en tu equipo...
set "INSTALL_DIR=%LOCALAPPDATA%\Programs\ViralCut AI"

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo Copiando archivos de la aplicacion...
xcopy "%~dp0*" "%INSTALL_DIR%\" /E /I /Y /Q >nul

echo Configurando acceso directo en el Escritorio...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [Environment]::GetFolderPath('Desktop'); $s = $ws.CreateShortcut((Join-Path $desktop 'ViralCut AI.lnk')); $s.TargetPath = (Join-Path $env:LOCALAPPDATA 'Programs\ViralCut AI\ViralCut AI.exe'); $s.WorkingDirectory = (Join-Path $env:LOCALAPPDATA 'Programs\ViralCut AI'); $s.IconLocation = (Join-Path $env:LOCALAPPDATA 'Programs\ViralCut AI\ViralCut AI.exe') + ',0'; $s.Description = 'ViralCut AI - Editor Inteligente de Videos Virales'; $s.Save()"

echo.
echo ==============================================================================
echo   ¡INSTALACION COMPLETADA EXITOSAMENTE!
echo   Se ha creado un acceso directo en tu Escritorio: "ViralCut AI"
echo ==============================================================================
echo.
echo Presiona cualquier tecla para abrir ViralCut AI ahora mismo...
pause >nul
start "" "%INSTALL_DIR%\ViralCut AI.exe"
exit
'@
Set-Content -Path (Join-Path $IsoStagingDir "Instalar ViralCut AI.bat") -Value $InstallerBat -Encoding UTF8

# 4. Generar la imagen ISO usando el subsistema nativo IMAPI2FS de Windows
Write-Host "`n[4/5] Generando archivo .iso con motor nativo Windows IMAPI2FS..." -ForegroundColor Yellow

if (Test-Path $IsoOutputPath) {
    Remove-Item -Path $IsoOutputPath -Force
}

# Compilar helper C# para volcar IStream a archivo eficientemente
Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;

public class FastIsoStreamWriter {
    public static void StreamToFile(object comStream, string targetPath) {
        IStream stream = (IStream)comStream;
        using (FileStream fs = new FileStream(targetPath, FileMode.Create, FileAccess.Write, FileShare.None, 1048576)) {
            byte[] buffer = new byte[1048576]; // 1MB buffer
            IntPtr pcbRead = Marshal.AllocHGlobal(sizeof(int));
            try {
                while (true) {
                    stream.Read(buffer, buffer.Length, pcbRead);
                    int bytesRead = Marshal.ReadInt32(pcbRead);
                    if (bytesRead <= 0) break;
                    fs.Write(buffer, 0, bytesRead);
                }
            } finally {
                Marshal.FreeHGlobal(pcbRead);
            }
        }
    }
}
"@

$fsi = New-Object -ComObject IMAPI2FS.MsftFileSystemImage
$fsi.ChooseImageDefaultsForMediaType(12) # 12 = MediaDVDPlusR (permite imágenes grandes)
$fsi.VolumeName = "VIRALCUT_AI"
$fsi.Root.AddTree($IsoStagingDir, $false)

$isoStream = $fsi.CreateResultImage().ImageStream
[FastIsoStreamWriter]::StreamToFile($isoStream, $IsoOutputPath)

# 5. Verificación de Integridad
Write-Host "`n[5/5] Verificando integridad del archivo .iso..." -ForegroundColor Yellow
if (Test-Path $IsoOutputPath) {
    $isoFile = Get-Item $IsoOutputPath
    $sizeMB = [math]::round($isoFile.Length / 1MB, 2)
    $sw.Stop()
    Write-Host "`n==========================================================" -ForegroundColor Green
    Write-Host "   ¡ARCHIVO .ISO CREADO CON ÉXITO!" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "Archivo: $($isoFile.FullName)" -ForegroundColor White
    Write-Host "Tamaño:  $sizeMB MB" -ForegroundColor White
    Write-Host "Tiempo:  $([math]::round($sw.Elapsed.TotalSeconds, 1)) segundos" -ForegroundColor White
    Write-Host "==========================================================" -ForegroundColor Green
} else {
    throw "El archivo ISO no fue generado."
}
