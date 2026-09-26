import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar.js';
import { Navbar } from './components/Navbar.js';
import { HeroInput } from './components/HeroInput.js';
import { VideoInspectCard } from './components/VideoInspectCard.js';
import { PipelineProgress } from './components/PipelineProgress.js';
import { ClipsShowcase } from './components/ClipsShowcase.js';
import { VideoEditorModal } from './components/VideoEditor/VideoEditorModal.js';
import { ProjectsView } from './components/ProjectsView.js';
import { SettingsView } from './components/SettingsView.js';
import { ToastContainer, ToastMessage } from './components/Toast.js';
import { api } from './services/api.js';
import { AppSettings, Clip, PipelineStage, Project, VideoInfo } from './types/index.js';
import { FolderCheck, FolderOpen, X, LayoutDashboard, FolderKanban, Film, Settings } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation & Views
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'projects' | 'clips' | 'settings'>('dashboard');
  
  // Active Project & Video Workflow State
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false);

  // Editor Modal State
  const [editingClip, setEditingClip] = useState<Clip | null>(null);
  const [exportingClipId, setExportingClipId] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<{ message: string; fileName: string } | null>(null);

  // Global Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Auto-dismiss exportNotice safely with timer cleanup
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (exportNotice) {
      timer = setTimeout(() => {
        setExportNotice(null);
      }, 7000);
    }
    return () => clearTimeout(timer);
  }, [exportNotice]);

  // Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'dark',
    defaultAspectRatio: '9:16',
    defaultSubtitleStyle: 'hormozi',
    exportQuality: '1080p',
    exportFps: 60,
    autoReframeEnabled: true,
  });

  // Load initial settings and projects
  useEffect(() => {
    loadSettings();
    loadProjects();
  }, []);

  // Update theme class on HTML element
  useEffect(() => {
    if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  }, [settings.theme]);

  const loadSettings = async () => {
    try {
      const res = await api.getSettings();
      if (res.success && res.settings) {
        setSettings(res.settings);
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const loadProjects = async () => {
    try {
      const res = await api.getProjects();
      if (res.success && res.projects && res.projects.length > 0) {
        setProjects(res.projects);
        setActiveProject((current) => {
          if (current) return current;
          const completedProject = res.projects.find(
            (p: Project) => p.status === 'completed' && p.clips && p.clips.length > 0
          );
          if (completedProject) {
            setVideoInfo(completedProject.videoInfo);
            return completedProject;
          }
          return null;
        });
      }
    } catch (e) {
      console.error('Failed to load projects:', e);
    }
  };

  const handleToggleTheme = () => {
    const nextTheme: 'dark' | 'light' = settings.theme === 'dark' ? 'light' : 'dark';
    const updated: AppSettings = { ...settings, theme: nextTheme };
    setSettings(updated);
    api.updateSettings({ theme: nextTheme });
  };

  // Step 1 -> 2: URL Inspected
  const handleVideoInspected = (info: VideoInfo, autoStart = true) => {
    setVideoInfo(info);
    setActiveProject(null);
    setPipelineStage(null);
    setPipelineError(null);
    if (autoStart) {
      handleStartAnalysis(info);
    }
  };

  // Step 2 -> 3: Start Analysis Pipeline with Resilient Live Polling
  const handleStartAnalysis = async (explicitInfo?: VideoInfo) => {
    const targetVideo = explicitInfo || videoInfo;
    if (!targetVideo) return;
    setIsStartingAnalysis(true);
    setPipelineError(null);
    setPipelineStage('fetching_info');
    setProgressPercent(12);

    try {
      const res = await api.createProject({ videoInfo: targetVideo, url: targetVideo.url });
      if (!res.success || !res.project) {
        setPipelineError(res.message || 'No pudimos acceder a este video.');
        setIsStartingAnalysis(false);
        return;
      }

      const projectId = res.project.id;
      setActiveProject(res.project);

      // Active polling mechanism that never drops or closes prematurely
      let isDone = false;
      const pollProgress = async () => {
        if (isDone) return;
        try {
          const pollRes = await api.getProject(projectId);
          if (pollRes.success && pollRes.project) {
            const p = pollRes.project;
            if (p.currentStage) setPipelineStage(p.currentStage);
            if (p.progressPercent !== undefined) setProgressPercent(p.progressPercent);

            if (p.status === 'completed' && p.clips && p.clips.length > 0) {
              isDone = true;
              setProgressPercent(100);
              setPipelineStage('completed');
              // Smooth transition to show completed status before rendering clips
              setTimeout(() => {
                setActiveProject(p);
                setPipelineStage(null);
                setPipelineError(null);
                setIsStartingAnalysis(false);
                loadProjects();
              }, 1500);
              return;
            }

            if (p.status === 'error') {
              isDone = true;
              setPipelineError(p.errorMessage || 'Error durante el análisis del video.');
              setIsStartingAnalysis(false);
              return;
            }
          }
        } catch (err) {
          console.warn('Progress polling check:', err);
        }

        if (!isDone) {
          setTimeout(pollProgress, 500);
        }
      };

      // Start continuous progress polling
      setTimeout(pollProgress, 400);

    } catch (e: any) {
      setPipelineError('No pudimos acceder a este video.');
      setIsStartingAnalysis(false);
    }
  };

  // Reset to initial input view
  const handleNewVideoClick = () => {
    setVideoInfo(null);
    setActiveProject(null);
    setPipelineStage(null);
    setPipelineError(null);
    setCurrentTab('dashboard');
  };

  // Open Project from History
  const handleOpenProject = (project: Project) => {
    setActiveProject(project);
    setVideoInfo(project.videoInfo);
    setPipelineStage(null);
    setCurrentTab('dashboard');
  };

  // Delete Project
  const handleDeleteProject = async (projectId: string) => {
    await api.deleteProject(projectId);
    if (activeProject?.id === projectId) {
      setActiveProject(null);
      setVideoInfo(null);
    }
    loadProjects();
    addToast({
      type: 'info',
      title: 'Proyecto eliminado',
      description: 'El proyecto fue removido de tu biblioteca.',
    });
  };

  // Clip update in modal editor
  const handleSaveClipChanges = async (updatedClip: Clip) => {
    const targetProjectId = updatedClip.projectId || activeProject?.id;
    if (!targetProjectId) return;
    try {
      const res = await api.updateClip(targetProjectId, updatedClip.id, updatedClip);
      if (res.success && res.clip) {
        if (activeProject && activeProject.id === targetProjectId) {
          const savedClip = res.clip;
          const updatedClips = activeProject.clips.map((c) =>
            c.id === updatedClip.id ? savedClip : c
          );
          setActiveProject({ ...activeProject, clips: updatedClips });
        }
        loadProjects();
        addToast({
          type: 'success',
          title: 'Cambios guardados',
          description: `Clip #${updatedClip.clipNumber} actualizado con éxito.`,
        });
      }
    } catch (e) {
      console.error('Error saving clip changes:', e);
      addToast({
        type: 'error',
        title: 'Error al guardar',
        description: 'No se pudieron persistir los cambios del clip.',
      });
    }
  };

  // Export clip directly
  const handleExportClip = async (clip: Clip): Promise<string | undefined> => {
    const targetProjectId = clip.projectId || activeProject?.id;
    if (!targetProjectId) return;
    setExportingClipId(clip.id);
    try {
      const res = await api.exportClip(targetProjectId, clip.id);
      if (res.success && res.exportedUrl) {
        // Update clip in local project state
        if (activeProject && activeProject.id === targetProjectId) {
          const updatedClips = activeProject.clips.map((c) =>
            c.id === clip.id
              ? { ...c, exportedUrl: res.exportedUrl, exportStatus: 'completed' as const, exportProgress: 100 }
              : c
          );
          setActiveProject({ ...activeProject, clips: updatedClips });
        }
        loadProjects();

        // Trigger browser download safely without navigating away or opening blank tabs
        const cleanTitle = (clip.metadata?.title || `clip_${clip.clipNumber || 1}`)
          .replace(/[/\\?%*:|"<>]/g, '_')
          .replace(/\s+/g, '_')
          .slice(0, 40);
        const fileName = `ViralCut_Clip_${clip.clipNumber || 1}_${cleanTitle}.mp4`;
        const downloadUrl = api.getClipDownloadUrl(res.exportedUrl, fileName);

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', fileName);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
        }, 1500);

        // Feedback visual y toast notification
        setExportNotice({
          message: '¡Clip guardado exitosamente en tu carpeta de Videos (Documentos\\Videos)!',
          fileName,
        });

        addToast({
          type: 'success',
          title: '¡Clip 9:16 exportado!',
          description: `Guardado en Videos y descargado: ${fileName}`,
        });

        return res.exportedUrl;
      }
    } catch (e) {
      console.error('Error exporting clip:', e);
      addToast({
        type: 'error',
        title: 'Error de exportación',
        description: 'Ocurrió un error renderizando el clip con FFmpeg.',
      });
    } finally {
      setExportingClipId(null);
    }
  };

  // Save App Settings
  const handleSaveSettings = async (newSettings: Partial<AppSettings>) => {
    const res = await api.updateSettings(newSettings);
    if (res.success && res.settings) {
      setSettings(res.settings);
    }
  };

  return (
    <div className="flex min-h-screen bg-dark-950 text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <Navbar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          settings={settings}
          onToggleTheme={handleToggleTheme}
          onNewVideoClick={handleNewVideoClick}
        />

        {/* Dynamic View Router with page transition */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          <div key={currentTab} className="animate-fade-in-up">
            {currentTab === 'dashboard' && (
              <>
                {/* Stage 1: Initial Empty Hero Input */}
                {!videoInfo && !activeProject && !pipelineStage && !pipelineError && (
                  <HeroInput onVideoInspected={handleVideoInspected} />
                )}

                {/* Stage 2: Video Inspected & Ready to Start Analysis */}
                {videoInfo && !activeProject && !pipelineStage && !pipelineError && (
                  <VideoInspectCard
                    videoInfo={videoInfo}
                    onStartAnalysis={() => handleStartAnalysis(videoInfo)}
                    onBack={handleNewVideoClick}
                    isLoading={isStartingAnalysis}
                  />
                )}

                {/* Stage 3: Real Pipeline Progress Monitor & Resilient Error Screen */}
                {(pipelineStage || pipelineError) && (
                  <PipelineProgress
                    currentStage={pipelineStage || 'fetching_info'}
                    progressPercent={progressPercent}
                    videoTitle={videoInfo?.title}
                    thumbnailUrl={videoInfo?.thumbnailUrl}
                    errorMessage={pipelineError || undefined}
                    onRetry={() => handleStartAnalysis(videoInfo || undefined)}
                    onCancel={handleNewVideoClick}
                  />
                )}

                {/* Stage 4: Results View — Showcase of Detected Clips */}
                {activeProject && !pipelineStage && !pipelineError && (
                  <ClipsShowcase
                    clips={activeProject.clips}
                    videoInfo={activeProject.videoInfo}
                    projects={projects}
                    onEditClip={(clip) => setEditingClip(clip)}
                    onExportClip={handleExportClip}
                    exportingClipId={exportingClipId}
                  />
                )}
              </>
            )}

            {currentTab === 'projects' && (
              <ProjectsView
                projects={projects}
                onOpenProject={handleOpenProject}
                onDeleteProject={handleDeleteProject}
                onNewProjectClick={handleNewVideoClick}
              />
            )}

            {currentTab === 'clips' && (
              <div className="max-w-7xl mx-auto space-y-6">
                {projects.length > 0 && projects.some((p) => p.clips && p.clips.length > 0) ? (
                  <ClipsShowcase
                    clips={projects.flatMap((p) => p.clips)}
                    videoInfo={activeProject?.videoInfo || projects[0].videoInfo}
                    projects={projects}
                    onEditClip={(clip) => setEditingClip(clip)}
                    onExportClip={handleExportClip}
                    exportingClipId={exportingClipId}
                  />
                ) : (
                  <div className="text-center py-20 glass-panel rounded-3xl border border-white/5 space-y-4">
                    <h3 className="text-lg font-bold text-white font-display">No hay clips generados</h3>
                    <p className="text-xs text-slate-400">Analiza un video primero para ver todos tus clips aquí.</p>
                    <button
                      onClick={handleNewVideoClick}
                      className="px-5 py-2.5 rounded-xl bg-cyber-cyan active:scale-95 text-dark-950 font-bold text-xs uppercase cursor-pointer transition-all shadow-glow-cyan/20"
                    >
                      Comenzar Ahora
                    </button>
                  </div>
                )}
              </div>
            )}

            {currentTab === 'settings' && (
              <SettingsView settings={settings} onSaveSettings={handleSaveSettings} />
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Dock */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-950/95 backdrop-blur-2xl border-t border-white/10 px-4 py-2 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-90 cursor-pointer ${
            currentTab === 'dashboard' ? 'text-cyber-cyan font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[10px] font-mono">Inicio</span>
        </button>

        <button
          onClick={() => setCurrentTab('projects')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-90 cursor-pointer ${
            currentTab === 'projects' ? 'text-cyber-cyan font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          <span className="text-[10px] font-mono">Proyectos</span>
        </button>

        <button
          onClick={() => setCurrentTab('clips')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-90 cursor-pointer ${
            currentTab === 'clips' ? 'text-cyber-cyan font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Film className="w-4 h-4" />
          <span className="text-[10px] font-mono">Clips</span>
        </button>

        <button
          onClick={() => setCurrentTab('settings')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-90 cursor-pointer ${
            currentTab === 'settings' ? 'text-cyber-cyan font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span className="text-[10px] font-mono">Ajustes</span>
        </button>
      </nav>

      {/* Video Editor Modal */}
      {editingClip && (
        <VideoEditorModal
          clip={editingClip}
          videoInfo={
            (editingClip.projectId
              ? projects.find((p) => p.id === editingClip.projectId)?.videoInfo
              : null) ||
            activeProject?.videoInfo ||
            videoInfo || {
              url: '',
              videoId: '',
              title: editingClip.metadata.title,
              channel: 'ViralCut',
              duration: editingClip.duration,
              durationFormatted: '',
              thumbnailUrl: editingClip.thumbnailUrl || '',
              videoSourceUrl: '/uploads/sample_base.mp4',
            }
          }
          onClose={() => setEditingClip(null)}
          onSave={handleSaveClipChanges}
          onExport={handleExportClip}
        />
      )}

      {/* Notificación Flotante: Guardado en Documentos/Videos */}
      {exportNotice && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-dark-900/95 backdrop-blur-xl border border-cyber-green/40 p-4 rounded-2xl shadow-2xl shadow-cyber-green/10 flex items-start gap-3 animate-toast-enter">
          <div className="p-2.5 rounded-xl bg-cyber-green/15 text-cyber-green mt-0.5 shrink-0">
            <FolderCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span>Guardado en Documentos\Videos</span>
              <span className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
            </h4>
            <p className="text-xs text-slate-400 mt-0.5 truncate font-mono">
              {exportNotice.fileName}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              El archivo MP4 se copió automáticamente a tu carpeta de Videos y se inició la descarga en el navegador.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => api.openSavedFolder()}
                className="px-3.5 py-1.5 rounded-lg bg-cyber-green/20 hover:bg-cyber-green/30 active:scale-95 text-cyber-green text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-cyber-green/40"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Abrir Carpeta en Windows</span>
              </button>
            </div>
          </div>
          <button
            onClick={() => setExportNotice(null)}
            className="text-slate-400 hover:text-slate-200 active:scale-90 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Global Futuristic Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;
