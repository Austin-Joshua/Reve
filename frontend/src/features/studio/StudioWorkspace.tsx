import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "../../components/common/BrandLogo";
import { useAuthStore } from "../../stores/authStore";
import { useCanvasStore } from "../../stores/canvasStore";
import { api, resolveImageUrl } from "../../services/api";
import {
  Wand2,
  Image as ImageIcon,
  Layers,
  History,
  Sliders,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Check,
  Server,
  Cpu,
  ArrowRight,
  LogOut,
  User,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  Dice5,
  X,
  ExternalLink,
  ChevronUp,
  BarChart2,
  MessageSquare,
  Share2,
  Bell,
  Folder,
} from "lucide-react";

import { ConversationsDrawer } from "../conversations/ConversationsDrawer";
import { ProjectSwitcherModal, ProjectItem } from "../projects/ProjectSwitcherModal";
import { ShareModal } from "../collaboration/ShareModal";
import { InvitationsInboxModal } from "../collaboration/InvitationsInboxModal";

interface GenerationRecord {
  id: string;
  generation_type: string;
  prompt: string;
  negative_prompt?: string;
  model_id: string;
  status: string;
  width: number;
  height: number;
  seed?: number;
  created_at: string;
  images: Array<{
    id: string;
    url: string;
    thumbnail_url?: string;
    width: number;
    height: number;
  }>;
}

type WorkerStatusType = "checking" | "connected" | "waiting" | "unavailable";

export const StudioWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, fetchUser } = useAuthStore();
  const { layers, addLayer } = useCanvasStore();

  // Active View Tab
  const [activeTab, setActiveTab] = useState<"generate" | "conversations" | "layers" | "history">("generate");
  const [mode, setMode] = useState<"text2img" | "img2img">("text2img");

  // Core Generation Parameters
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [showNegative, setShowNegative] = useState(false);

  // Model & Dimension Configuration
  const modelId = "SD-1.5";
  const width = 512;
  const height = 512;
  const [steps, setSteps] = useState(25);
  const [cfgScale, setCfgScale] = useState(7.5);
  const [strength, setStrength] = useState(0.70);
  const [seed, setSeed] = useState<string>("");

  // Source Image for Image-to-Image
  const [sourceImageId, setSourceImageId] = useState<string | null>(null);
  const [sourceImagePreview, setSourceImagePreview] = useState<string | null>(null);
  const [isUploadingSource, setIsUploadingSource] = useState(false);

  // Active Job State
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobStage, setJobStage] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [activeImageResult, setActiveImageResult] = useState<any | null>(null);

  // Generation History
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Real Worker Status derived from backend
  const [workerStatus, setWorkerStatus] = useState<WorkerStatusType>("checking");
  const [workerDetails, setWorkerDetails] = useState<{
    device?: string;
    vram_total_gb?: number;
    vram_free_gb?: number;
    worker_id?: string;
  } | null>(null);

  // UI Drawer & Inspector States
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [futureModelsOpen, setFutureModelsOpen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<"fit" | "100">("fit");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [projectName, setProjectName] = useState("Untitled Project");
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);

  // Active Persistent Workspace & Conversation State
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<"OWNER" | "EDITOR" | "VIEWER">("OWNER");
  const [projectSwitcherOpen, setProjectSwitcherOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [invitationsModalOpen, setInvitationsModalOpen] = useState(false);
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);

  // Scene Auto-save State
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimerRef = useRef<any>(null);

  // User Analytics Modal State
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchUser();
    fetchHistory();
    checkWorkerHealth();
    initConversationAndProject();
    const interval = setInterval(() => {
      checkWorkerHealth();
      fetchPendingInvitationsCount();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadProjectScene = async (projectId: string) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    try {
      const res = await api.get(`/projects/${projectId}/scene`);
      if (res.data?.layers_data) {
        useCanvasStore.getState().setLayers(res.data.layers_data);
      }
      setSaveStatus("saved");
    } catch {
      setSaveStatus("idle");
    }
  };

  const scheduleSaveScene = (newLayers: any[]) => {
    if (!activeProjectId || currentUserRole === "VIEWER") return;
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      try {
        await api.put(`/projects/${activeProjectId}/scene`, {
          canvas: { width: 512, height: 512, background: "#16292B" },
          layers: newLayers,
        });
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 1000);
  };

  const fetchPendingInvitationsCount = async () => {
    try {
      const res = await api.get("/invitations");
      setPendingInvitationsCount(res.data?.length || 0);
    } catch {
      // Ignore
    }
  };

  const initConversationAndProject = async () => {
    try {
      // 1. Load active project
      const projRes = await api.get("/projects");
      if (projRes.data && projRes.data.length > 0) {
        const p = projRes.data[0];
        setActiveProjectId(p.id);
        setProjectName(p.name);
        setCurrentUserRole(p.role || "OWNER");
        loadProjectScene(p.id);
      } else {
        const newProj = await api.post("/projects", { name: "Creative Project" });
        setActiveProjectId(newProj.data.id);
        setProjectName(newProj.data.name);
        setCurrentUserRole("OWNER");
      }

      // 2. Load active conversation
      const convRes = await api.get("/conversations");
      if (convRes.data && convRes.data.length > 0) {
        setActiveConversationId(convRes.data[0].id);
      } else {
        const newConv = await api.post("/conversations", { title: "Creative Workspace" });
        setActiveConversationId(newConv.data.id);
      }

      // 3. Fetch pending invitations
      fetchPendingInvitationsCount();
    } catch {
      // Fallback
    }
  };

  const handleRenameProject = async () => {
    setIsEditingProjectName(false);
    if (!projectName.trim()) return;
    try {
      if (activeProjectId) {
        await api.patch(`/projects/${activeProjectId}`, { name: projectName.trim() });
      } else {
        const res = await api.post("/projects", { name: projectName.trim() });
        setActiveProjectId(res.data.id);
      }
    } catch {
      // Keep local state
    }
  };

  const fetchAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const res = await api.get("/users/me/analytics");
      setAnalyticsData(res.data);
    } catch {
      // Ignore
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const checkWorkerHealth = async () => {
    try {
      const res = await api.get("/health");
      const ai = res.data?.services?.ai_provider;
      if (ai) {
        if (ai.status === "healthy" || ai.status === "ready") {
          setWorkerStatus("connected");
          setWorkerDetails({
            device: ai.device,
            vram_total_gb: ai.vram_total_gb,
            vram_free_gb: ai.vram_free_gb,
            worker_id: ai.details?.worker_id,
          });
        } else if (ai.status === "unavailable") {
          setWorkerStatus("waiting");
          setWorkerDetails(null);
        } else {
          setWorkerStatus("waiting");
          setWorkerDetails(null);
        }
      } else {
        setWorkerStatus("waiting");
      }
    } catch {
      setWorkerStatus("unavailable");
      setWorkerDetails(null);
    }
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await api.get("/generations?limit=25");
      setHistory(res.data);
      if (res.data.length > 0 && !activeImageResult) {
        const latest = res.data[0];
        if (latest.images && latest.images.length > 0) {
          setActiveImageResult({
            ...latest.images[0],
            prompt: latest.prompt,
            seed: latest.seed,
            model_id: latest.model_id,
          });
        }
      }
    } catch {
      // Backend history fallback
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSourceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSource(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/images/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSourceImageId(res.data.image_id);
      setSourceImagePreview(resolveImageUrl(res.data.url));
      setMode("img2img");
    } catch (err: any) {
      alert("Failed to upload image: " + (err.response?.data?.detail?.message || err.message));
    } finally {
      setIsUploadingSource(false);
    }
  };

  const clearSourceImage = () => {
    setSourceImageId(null);
    setSourceImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setMode("text2img");
  };

  const randomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 2147483647).toString());
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || jobStatus === "PROCESSING" || jobStatus === "QUEUED") return;

    setJobError(null);
    setIsCancelling(false);
    setJobStatus("QUEUED");
    setJobStage("Submitting request...");
    setJobProgress(10);

    try {
      let res;
      if (mode === "text2img") {
        res = await api.post("/generations/text-to-image", {
          prompt: prompt.trim(),
          negative_prompt: showNegative && negativePrompt.trim() ? negativePrompt.trim() : undefined,
          model_id: "SD-1.5",
          width: 512,
          height: 512,
          steps,
          cfg_scale: cfgScale,
          seed: seed ? parseInt(seed, 10) : undefined,
          num_images: 1,
          conversation_id: activeConversationId || undefined,
          project_id: activeProjectId || undefined,
        });
      } else {
        if (!sourceImageId) {
          alert("Please upload a source image for image-to-image transformation.");
          setJobStatus(null);
          return;
        }
        res = await api.post("/generations/image-to-image", {
          source_image_id: sourceImageId,
          prompt: prompt.trim(),
          negative_prompt: showNegative && negativePrompt.trim() ? negativePrompt.trim() : undefined,
          model_id: "SD-1.5",
          strength,
          steps,
          cfg_scale: cfgScale,
          seed: seed ? parseInt(seed, 10) : undefined,
          conversation_id: activeConversationId || undefined,
          project_id: activeProjectId || undefined,
        });
      }

      // Record prompt message in conversation history
      if (activeConversationId) {
        api.post(`/conversations/${activeConversationId}/messages`, {
          role: "user",
          content: prompt.trim(),
        }).catch(() => { });
      }

      const jobId = res.data.job_id;
      setActiveJobId(jobId);
      pollJob(jobId);
    } catch (err: any) {
      setJobStatus("FAILED");
      const detail = err.response?.data?.detail;
      const message =
        typeof detail === "object"
          ? detail?.message || "Generation request failed."
          : detail || err.message || "Failed to submit request.";
      setJobError(message);
    }
  };

  const pollJob = (jobId: string) => {
    let consecutiveErrors = 0;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/jobs/${jobId}`);
        consecutiveErrors = 0;
        const data = res.data;
        setJobStatus(data.status);
        setJobProgress(data.progress || 20);
        setJobStage(data.stage || "Denoising latents...");

        if (data.status === "COMPLETED") {
          clearInterval(interval);
          setJobProgress(100);
          if (data.result_images && data.result_images.length > 0) {
            setActiveImageResult({
              ...data.result_images[0],
              prompt: prompt,
              seed: seed ? parseInt(seed, 10) : undefined,
              model_id: "Stable Diffusion 1.5",
            });
          }
          fetchHistory();
          fetchUser();
        } else if (data.status === "FAILED") {
          clearInterval(interval);
          setJobError(data.error_message || "Generation failed on worker.");
        } else if (data.status === "CANCELLED") {
          clearInterval(interval);
          setIsCancelling(false);
          setJobError("Job cancelled and credits refunded.");
        }
      } catch (e: any) {
        consecutiveErrors++;
        // Allow up to 5 consecutive network blips or cold start delays before declaring failure
        if (consecutiveErrors >= 5) {
          clearInterval(interval);
          setJobStatus("FAILED");
          setJobError("Lost connection to generation status endpoint after multiple retries.");
        }
      }
    }, 1200);
  };

  const handleCancel = async () => {
    if (!activeJobId) return;
    setIsCancelling(true);
    setJobStage("Cancelling generation...");
    try {
      await api.post(`/jobs/${activeJobId}/cancel`);
    } catch {
      // Ignored
    }
  };

  const handleCopyPrompt = () => {
    if (!activeImageResult?.prompt) return;
    navigator.clipboard.writeText(activeImageResult.prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleRemix = (item: GenerationRecord) => {
    setPrompt(item.prompt);
    if (item.negative_prompt) {
      setNegativePrompt(item.negative_prompt);
      setShowNegative(true);
    }
    if (item.seed) setSeed(item.seed.toString());
    setActiveTab("generate");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleSendToImg2Img = (imgUrl: string) => {
    setSourceImagePreview(resolveImageUrl(imgUrl));
    setMode("img2img");
  };

  const handleAddLayerFromActive = () => {
    if (!activeImageResult) return;
    const newLayer = {
      id: `layer-${Date.now()}`,
      type: "raster" as const,
      name: `Output #${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1.0,
      zIndex: layers.length,
      transform: { x: 0, y: 0, width: 512, height: 512, rotation: 0 },
      content: { url: resolveImageUrl(activeImageResult.url) },
    };
    addLayer(newLayer);
    setActiveTab("layers");
    scheduleSaveScene([...layers, newLayer]);
  };

  const toggleLayerVisibility = (layerId: string, currentVisible: boolean) => {
    const updated = layers.map((l) => (l.id === layerId ? { ...l, visible: !currentVisible } : l));
    useCanvasStore.getState().updateLayer(layerId, { visible: !currentVisible });
    scheduleSaveScene(updated);
  };

  const handleDeleteLayer = (layerId: string) => {
    const updated = layers.filter((l) => l.id !== layerId);
    useCanvasStore.getState().removeLayer(layerId);
    scheduleSaveScene(updated);
  };

  // Determine Generate button state label
  const getGenerateButtonContent = () => {
    if (isCancelling) {
      return (
        <>
          <div className="w-3.5 h-3.5 border-2 border-raven-950 border-t-transparent rounded-full animate-spin" />
          <span>Cancelling...</span>
        </>
      );
    }
    if (jobStatus === "QUEUED" || jobStatus === "PROCESSING") {
      return (
        <>
          <div className="w-3.5 h-3.5 border-2 border-raven-950 border-t-transparent rounded-full animate-spin" />
          <span>Generating...</span>
        </>
      );
    }
    return (
      <>
        <span>Generate</span>
        <ArrowRight className="w-4 h-4" />
      </>
    );
  };

  const isGenerateDisabled =
    !prompt.trim() ||
    jobStatus === "QUEUED" ||
    jobStatus === "PROCESSING" ||
    isCancelling;

  return (
    <div className="flex h-screen w-screen bg-raven-800 text-seagrass-50 flex-col font-sans overflow-hidden selection:bg-apricot-500/30">
      {/* ---------------------------------------------------------------------- */}
      {/* 1. TOP NAVIGATION BAR                                                  */}
      {/* ---------------------------------------------------------------------- */}
      <header className="h-14 border-b border-raven-700 bg-raven-900 px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-4">
          <BrandLogo size="sm" />

          {/* Project Switcher & Name */}
          <div className="flex items-center gap-2 pl-3 border-l border-raven-700">
            <button
              onClick={() => setProjectSwitcherOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-raven-850 hover:bg-raven-800 border border-raven-700 hover:border-seagrass-400/30 text-xs font-mono transition-colors"
              title="Switch or manage projects"
            >
              <Folder className="w-3.5 h-3.5 text-apricot-500 shrink-0" />
              <span className="font-semibold text-seagrass-50 max-w-[120px] sm:max-w-[180px] truncate">{projectName}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-semibold ${currentUserRole === "OWNER"
                  ? "bg-apricot-500/15 text-apricot-400 border border-apricot-500/30"
                  : currentUserRole === "EDITOR"
                    ? "bg-semantic-success/15 text-semantic-success border border-semantic-success/30"
                    : "bg-seagrass-400/15 text-seagrass-300 border border-seagrass-400/30"
                  }`}
              >
                {currentUserRole}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-seagrass-400" />
            </button>

            {/* Scene Save Status Indicator */}
            {saveStatus !== "idle" && (
              <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded bg-raven-950/80 border border-raven-800 text-[10px] font-mono text-seagrass-400">
                {saveStatus === "saving" && (
                  <>
                    <div className="w-2.5 h-2.5 border border-apricot-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-apricot-400">Saving...</span>
                  </>
                )}
                {saveStatus === "saved" && (
                  <>
                    <Check className="w-2.5 h-2.5 text-semantic-success" />
                    <span className="text-seagrass-300">Saved</span>
                  </>
                )}
                {saveStatus === "error" && (
                  <>
                    <AlertCircle className="w-2.5 h-2.5 text-semantic-error" />
                    <span className="text-semantic-error">Save failed</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Actual Worker Connection Status (Backend-Derived) */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-raven-850 border border-raven-700 text-xs font-mono"
            title={workerDetails?.worker_id ? `Worker: ${workerDetails.worker_id}` : undefined}
          >
            {workerStatus === "connected" && (
              <>
                <span className="w-2 h-2 rounded-full bg-semantic-success" />
                <span className="text-seagrass-200">GPU connected</span>
                {workerDetails?.device && (
                  <span className="text-seagrass-400 hidden md:inline">({workerDetails.device.replace("remote:", "")})</span>
                )}
              </>
            )}
            {workerStatus === "waiting" && (
              <>
                <span className="w-2 h-2 rounded-full bg-semantic-warning" />
                <span className="text-seagrass-200">Waiting for GPU</span>
              </>
            )}
            {workerStatus === "unavailable" && (
              <>
                <span className="w-2 h-2 rounded-full bg-semantic-error" />
                <span className="text-seagrass-200">GPU unavailable</span>
              </>
            )}
            {workerStatus === "checking" && (
              <>
                <span className="w-2 h-2 rounded-full bg-seagrass-400 animate-pulse" />
                <span className="text-seagrass-400">Checking connection</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Credits, Collaboration & User Controls */}
        <div className="flex items-center gap-2.5">
          {/* Share & Collaborate Button */}
          {activeProjectId && (
            <button
              onClick={() => setShareModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-raven-850 hover:bg-raven-800 border border-raven-700 text-xs font-mono text-seagrass-200 transition-colors"
              title="Share project & manage members"
            >
              <Share2 className="w-3.5 h-3.5 text-apricot-500" />
              <span className="hidden md:inline">Share</span>
            </button>
          )}

          {/* Notifications / Pending Invitations Bell */}
          <button
            onClick={() => setInvitationsModalOpen(true)}
            className="relative w-8 h-8 rounded-lg bg-raven-850 hover:bg-raven-800 border border-raven-700 flex items-center justify-center text-seagrass-300 hover:text-seagrass-50 transition-colors"
            title="Project invitations"
          >
            <Bell className="w-4 h-4" />
            {pendingInvitationsCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-apricot-500 text-raven-950 text-[9px] font-bold font-mono">
                {pendingInvitationsCount}
              </span>
            )}
          </button>

          {/* Credits remaining */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-raven-850 border border-raven-700 text-xs font-mono">
            <span className="text-apricot-500 font-semibold">{user?.credits_remaining ?? 50}</span>
            <span className="text-seagrass-400">credits</span>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-8 h-8 rounded-lg bg-raven-750 hover:bg-raven-700 border border-raven-700 flex items-center justify-center text-seagrass-100 text-xs font-mono transition-colors"
              aria-label="User account menu"
            >
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <User className="w-4 h-4 text-seagrass-300" />}
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl bg-raven-900 border border-raven-700 shadow-modal p-2 z-50 text-xs">
                <div className="px-3 py-2 border-b border-raven-800">
                  <div className="font-semibold text-seagrass-50 truncate">{user?.full_name || "Creator"}</div>
                  <div className="text-seagrass-400 text-[11px] font-mono truncate">{user?.email || "creator@reve.ai"}</div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setAnalyticsOpen(true);
                      setUserMenuOpen(false);
                      fetchAnalytics();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-seagrass-300 hover:text-seagrass-50 hover:bg-raven-800 flex items-center gap-2"
                  >
                    <BarChart2 className="w-3.5 h-3.5 text-apricot-500" />
                    <span>Workspace Analytics</span>
                  </button>
                  <Link
                    to="/"
                    className="w-full text-left px-3 py-2 rounded-lg text-seagrass-300 hover:text-seagrass-50 hover:bg-raven-800 flex items-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-seagrass-400" />
                    <span>Public overview</span>
                  </Link>
                </div>
                <div className="pt-1 border-t border-raven-800">
                  <button
                    onClick={() => {
                      logout();
                      navigate("/");
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-[#EF4444] hover:bg-[#EF4444]/10 flex items-center gap-2 font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. MAIN CREATIVE LAYOUT                                                */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT TOOLBAR */}
        <aside className="w-14 bg-raven-900 border-r border-raven-700 flex flex-col items-center py-3 gap-2 shrink-0 z-20">
          <button
            onClick={() => setActiveTab("generate")}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab === "generate"
              ? "bg-apricot-500 text-raven-950 font-bold shadow-surface"
              : "text-seagrass-400 hover:text-seagrass-50 hover:bg-raven-800"
              }`}
            title="Generate"
          >
            <Wand2 className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTab(activeTab === "conversations" ? "generate" : "conversations")}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative ${activeTab === "conversations"
              ? "bg-apricot-500 text-raven-950 font-bold shadow-surface"
              : "text-seagrass-400 hover:text-seagrass-50 hover:bg-raven-800"
              }`}
            title="Conversations & Threads"
          >
            <MessageSquare className="w-5 h-5" />
            {activeConversationId && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-apricot-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab(activeTab === "layers" ? "generate" : "layers")}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative ${activeTab === "layers"
              ? "bg-apricot-500 text-raven-950 font-bold shadow-surface"
              : "text-seagrass-400 hover:text-seagrass-50 hover:bg-raven-800"
              }`}
            title="Layers"
          >
            <Layers className="w-5 h-5" />
            {layers.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-apricot-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab(activeTab === "history" ? "generate" : "history")}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab === "history"
              ? "bg-apricot-500 text-raven-950 font-bold shadow-surface"
              : "text-seagrass-400 hover:text-seagrass-50 hover:bg-raven-800"
              }`}
            title="Recent work"
          >
            <History className="w-5 h-5" />
          </button>

          <div className="my-auto" />

          {/* Toggle Image Settings Drawer */}
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${settingsOpen
              ? "text-apricot-500 bg-raven-800 border border-apricot-500/30"
              : "text-seagrass-400 hover:text-seagrass-50 hover:bg-raven-800"
              }`}
            title="Image settings"
          >
            <Sliders className="w-5 h-5" />
          </button>
        </aside>

        {/* ------------------------------------------------------------------ */}
        {/* CENTER CANAVS VIEWPORT                                             */}
        {/* ------------------------------------------------------------------ */}
        <main className="flex-1 flex flex-col overflow-hidden bg-raven-800 relative">
          <div className="flex-1 flex items-center justify-center p-6 overflow-auto relative">
            {/* Active Generation Progress Overlay */}
            {(jobStatus === "QUEUED" || jobStatus === "PROCESSING") && (
              <div className="absolute inset-0 bg-raven-950/75 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-sm rounded-2xl bg-raven-900 border border-raven-700 p-6 shadow-modal space-y-4 text-center">
                  <div className="w-10 h-10 rounded-full border-2 border-apricot-500 border-t-transparent animate-spin mx-auto" />

                  <div>
                    <h3 className="text-base font-semibold text-seagrass-50 font-sans">
                      {jobStatus === "QUEUED" ? "Waiting for GPU..." : "Generating image..."}
                    </h3>
                    <p className="mt-1 text-xs text-seagrass-300 font-mono">
                      {jobStage || "Denoising latents..."}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-1.5 rounded-full bg-raven-800 overflow-hidden border border-raven-700">
                      <div
                        className="h-full bg-apricot-500 transition-all duration-300"
                        style={{ width: `${Math.max(jobProgress, 10)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-seagrass-400">
                      <span>Progress</span>
                      <span>{jobProgress}%</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCancel}
                    disabled={isCancelling}
                    className="px-4 py-2 rounded-lg bg-raven-800 hover:bg-[#EF4444]/20 border border-raven-700 hover:border-[#EF4444]/40 text-[#EF4444] text-xs font-mono transition-colors"
                  >
                    {isCancelling ? "Cancelling..." : "Cancel"}
                  </button>
                </div>
              </div>
            )}

            {/* Error Notification */}
            {jobError && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 max-w-lg w-full px-4">
                <div className="p-4 rounded-xl bg-raven-900 border border-[#EF4444]/40 shadow-modal flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs text-seagrass-200">
                    <div className="font-semibold text-[#EF4444]">Generation error</div>
                    <p className="mt-0.5">{jobError}</p>
                  </div>
                  <button
                    onClick={() => setJobError(null)}
                    className="text-seagrass-400 hover:text-seagrass-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Main Stage: If active image exists */}
            {activeImageResult ? (
              <div className="flex flex-col items-center justify-center max-w-full max-h-full">
                <div
                  className={`relative rounded-xl overflow-hidden border border-raven-700 bg-raven-900 shadow-modal transition-all ${zoomLevel === "fit" ? "max-h-[55vh] max-w-[55vw]" : "w-[512px] h-[512px]"
                    }`}
                >
                  <img
                    src={resolveImageUrl(activeImageResult.url)}
                    alt="Diffusion output"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Canvas Floating Toolbar */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 bg-raven-900/90 backdrop-blur px-4 py-2 rounded-xl border border-raven-700 shadow-surface text-xs font-mono">
                  <span className="text-seagrass-200">512 × 512</span>
                  <span className="text-seagrass-500">|</span>
                  <span className="text-seagrass-300">Stable Diffusion 1.5</span>

                  {/* Zoom controls */}
                  <div className="flex items-center gap-1 pl-2 border-l border-raven-700">
                    <button
                      onClick={() => setZoomLevel("fit")}
                      className={`px-2 py-0.5 rounded ${zoomLevel === "fit" ? "bg-raven-750 text-seagrass-50" : "text-seagrass-400"}`}
                    >
                      Fit
                    </button>
                    <button
                      onClick={() => setZoomLevel("100")}
                      className={`px-2 py-0.5 rounded ${zoomLevel === "100" ? "bg-raven-750 text-seagrass-50" : "text-seagrass-400"}`}
                    >
                      1:1
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pl-2 border-l border-raven-700">
                    <a
                      href={resolveImageUrl(activeImageResult.url)}
                      download={`reve-${Date.now()}.png`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded hover:bg-raven-800 text-seagrass-300 hover:text-seagrass-50 transition-colors"
                      title="Download image"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleSendToImg2Img(activeImageResult.url)}
                      className="p-1.5 rounded hover:bg-raven-800 text-seagrass-300 hover:text-apricot-400 transition-colors"
                      title="Use as source for image-to-image"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleAddLayerFromActive}
                      className="p-1.5 rounded hover:bg-raven-800 text-seagrass-300 hover:text-apricot-400 transition-colors"
                      title="Add to canvas layers"
                    >
                      <Layers className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCopyPrompt}
                      className="p-1.5 rounded hover:bg-raven-800 text-seagrass-300 hover:text-apricot-400 transition-colors"
                      title="Copy description"
                    >
                      {copiedPrompt ? <Check className="w-4 h-4 text-semantic-success" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty Canvas State */
              <div className="max-w-md text-center p-8 rounded-2xl border border-raven-700 bg-raven-900/60">
                <div className="w-10 h-10 rounded-xl bg-raven-800 border border-raven-700 flex items-center justify-center text-apricot-500 mx-auto mb-4">
                  <Wand2 className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-seagrass-50 font-sans">
                  What are we creating today?
                </h3>
                <p className="mt-2 text-xs text-seagrass-300 leading-relaxed">
                  Describe a scene, an object or an idea. Your prompt is the starting point.
                </p>

                {/* 3 Clickable Examples */}
                <div className="mt-6 space-y-2 text-left">
                  <div className="text-[11px] font-mono uppercase text-seagrass-400 font-medium">
                    Try an example
                  </div>
                  {[
                    "A quiet architectural space filled with afternoon light.",
                    "A sculptural product photographed against a textured backdrop.",
                    "A cinematic landscape under a dramatic evening sky.",
                  ].map((example, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setPrompt(example);
                        promptInputRef.current?.focus();
                      }}
                      className="w-full text-left p-2.5 rounded-lg bg-raven-850 hover:bg-raven-750 border border-raven-700 text-xs text-seagrass-200 transition-colors flex items-center justify-between"
                    >
                      <span className="truncate">{example}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-apricot-500 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* BOTTOM PROMPT COMPOSER                                             */}
          {/* ------------------------------------------------------------------ */}
          <div className="p-4 bg-raven-900 border-t border-raven-700 shrink-0 z-20">
            <div className="max-w-4xl mx-auto space-y-2">
              {/* Collapsible Negative Prompt */}
              {showNegative && (
                <div className="flex items-center gap-2 bg-raven-850 p-2 rounded-lg border border-raven-700 text-xs font-mono">
                  <span className="text-apricot-500 font-semibold uppercase text-[10px] shrink-0">
                    Negative &gt;
                  </span>
                  <input
                    type="text"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="blurry, distorted, artifacts, text, watermark..."
                    className="flex-1 bg-transparent border-none text-seagrass-100 placeholder-seagrass-500 focus:outline-none text-xs"
                  />
                  <button
                    onClick={() => setShowNegative(false)}
                    className="text-seagrass-500 hover:text-seagrass-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Main Composer Box */}
              <div className="rounded-xl border border-raven-700 bg-raven-850 p-2.5 shadow-surface flex flex-col md:flex-row items-stretch md:items-end gap-3 focus-within:border-apricot-500/50 transition-colors">
                {/* Source Image Thumbnail if Img2Img */}
                {mode === "img2img" && sourceImagePreview && (
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-apricot-500/50 shrink-0 group">
                    <img
                      src={resolveImageUrl(sourceImagePreview)}
                      alt="Source"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={clearSourceImage}
                      className="absolute inset-0 bg-raven-950/70 text-[#EF4444] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      title="Remove source image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Input Area */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between text-[11px] font-mono text-seagrass-400 mb-1 px-1">
                    <div className="flex items-center gap-3">
                      <span className="text-seagrass-300 font-semibold uppercase">IMAGE DESCRIPTION</span>
                      <span>·</span>
                      <button
                        onClick={() => setMode("text2img")}
                        className={`transition-colors ${mode === "text2img" ? "text-apricot-500 font-semibold" : "hover:text-seagrass-200"}`}
                      >
                        Text to image
                      </button>
                      <span>/</span>
                      <button
                        onClick={() => {
                          setMode("img2img");
                          if (!sourceImagePreview) fileInputRef.current?.click();
                        }}
                        className={`transition-colors ${mode === "img2img" ? "text-apricot-500 font-semibold" : "hover:text-seagrass-200"}`}
                      >
                        Image to image
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {!showNegative && (
                        <button
                          onClick={() => setShowNegative(true)}
                          className="hover:text-apricot-400 transition-colors"
                        >
                          + Negative prompt
                        </button>
                      )}
                      <span>·</span>
                      <span className="hidden sm:inline">Ctrl+Enter</span>
                    </div>
                  </div>

                  <textarea
                    ref={promptInputRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                    placeholder="Describe the image you want to create..."
                    className="w-full bg-transparent border-none text-seagrass-50 placeholder-seagrass-500 text-sm focus:outline-none resize-none font-sans px-1"
                  />
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end">
                  {/* File upload input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleSourceUpload}
                    className="hidden"
                  />

                  {mode === "img2img" && !sourceImagePreview && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingSource}
                      className="px-3 py-2.5 rounded-lg bg-raven-800 hover:bg-raven-750 border border-raven-700 text-xs font-mono text-seagrass-200 flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5 text-apricot-500" />
                      <span>{isUploadingSource ? "Uploading..." : "Upload source"}</span>
                    </button>
                  )}

                  <button
                    onClick={handleGenerate}
                    disabled={isGenerateDisabled}
                    className="px-5 py-2.5 rounded-lg bg-apricot-500 hover:bg-apricot-400 active:bg-apricot-600 disabled:opacity-40 text-raven-950 font-semibold text-sm transition-all shadow-surface flex items-center gap-2"
                  >
                    {getGenerateButtonContent()}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* ------------------------------------------------------------------ */}
        {/* RIGHT IMAGE SETTINGS INSPECTOR                                     */}
        {/* ------------------------------------------------------------------ */}
        {settingsOpen && (
          <aside className="w-80 bg-raven-900 border-l border-raven-700 flex flex-col justify-between p-5 overflow-y-auto shrink-0 z-20">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-raven-700">
                <span className="text-xs font-mono uppercase tracking-wider text-seagrass-100 font-semibold">
                  Image settings
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-raven-800 text-seagrass-300">
                  Stable Diffusion 1.5
                </span>
              </div>

              {/* Model */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase text-seagrass-300 font-medium">
                  Model
                </label>
                <div className="p-3 rounded-xl bg-raven-850 border border-raven-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-seagrass-50 font-sans">
                      Stable Diffusion 1.5
                    </span>
                    <span className="text-[10px] font-mono text-semantic-success px-1.5 py-0.5 rounded bg-semantic-success/10">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-seagrass-400">
                    Currently supported model for raster generation.
                  </p>
                </div>

                {/* Collapsible Planned Models for Transparency */}
                <div className="pt-1">
                  <button
                    onClick={() => setFutureModelsOpen(!futureModelsOpen)}
                    className="text-[11px] font-mono text-seagrass-400 hover:text-seagrass-200 flex items-center gap-1"
                  >
                    <span>{futureModelsOpen ? "Hide planned models" : "View planned models"}</span>
                    {futureModelsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {futureModelsOpen && (
                    <div className="mt-2 space-y-1.5">
                      <div className="p-2.5 rounded-lg bg-raven-950 border border-raven-800 text-xs text-seagrass-400 flex items-center justify-between opacity-60">
                        <span>FLUX.1-dev</span>
                        <span className="text-[10px] font-mono">Planned (Offline)</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-raven-950 border border-raven-800 text-xs text-seagrass-400 flex items-center justify-between opacity-60">
                        <span>Stable Diffusion XL 1.0</span>
                        <span className="text-[10px] font-mono">Planned (Offline)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Canvas Size - Strictly 512x512 */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase text-seagrass-300 font-medium">
                  Canvas size
                </label>
                <div className="p-2.5 rounded-lg bg-raven-850 border border-apricot-500/50 text-xs font-mono flex items-center justify-between">
                  <span className="text-seagrass-50 font-semibold">512 × 512 (Square 1:1)</span>
                  <span className="text-[10px] text-apricot-400">Standard</span>
                </div>
                <p className="text-[11px] text-seagrass-400 leading-relaxed">
                  Optimized native resolution for the integrated Stable Diffusion 1.5 model.
                </p>
              </div>

              {/* Quality Controls */}
              <div className="space-y-4 pt-2 border-t border-raven-750">
                {/* Steps */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-seagrass-300">Inference steps</span>
                    <span className="text-seagrass-50 font-semibold">{steps}</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={50}
                    step={1}
                    value={steps}
                    onChange={(e) => setSteps(parseInt(e.target.value, 10))}
                    className="w-full accent-apricot-500 bg-raven-750 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-[11px] text-seagrass-400">
                    Controls diffusion iterations. Higher steps resolve finer details.
                  </p>
                </div>

                {/* CFG Scale */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-seagrass-300">Guidance scale (CFG)</span>
                    <span className="text-seagrass-50 font-semibold">{cfgScale.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min={1.0}
                    max={15.0}
                    step={0.5}
                    value={cfgScale}
                    onChange={(e) => setCfgScale(parseFloat(e.target.value))}
                    className="w-full accent-apricot-500 bg-raven-750 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-[11px] text-seagrass-400">
                    Controls how closely the image adheres to your prompt.
                  </p>
                </div>
              </div>

              {/* Seed */}
              <div className="space-y-2 pt-2 border-t border-raven-750">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-seagrass-300">Seed</span>
                  <span className="text-seagrass-500">{seed ? `#${seed}` : "Random"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="Random seed"
                    className="flex-1 bg-raven-850 border border-raven-700 rounded-lg px-3 py-1.5 text-xs text-seagrass-50 font-mono focus:border-apricot-500 focus:outline-none"
                  />
                  <button
                    onClick={randomizeSeed}
                    className="p-2 rounded-lg bg-raven-850 hover:bg-raven-750 border border-raven-700 text-apricot-500 transition-colors"
                    title="Generate random seed"
                  >
                    <Dice5 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-seagrass-400">
                  Fixed seeds reproduce specific compositions.
                </p>
              </div>

              {/* Advanced Controls Accordion */}
              <div className="pt-2 border-t border-raven-750">
                <button
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  className="w-full flex items-center justify-between text-xs font-mono uppercase text-seagrass-300 hover:text-seagrass-50"
                >
                  <span>Advanced</span>
                  {advancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {advancedOpen && (
                  <div className="mt-3 space-y-3 pt-2">
                    {mode === "img2img" && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-seagrass-300">Denoising strength</span>
                          <span className="text-seagrass-50 font-semibold">{strength.toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={0.95}
                          step={0.05}
                          value={strength}
                          onChange={(e) => setStrength(parseFloat(e.target.value))}
                          className="w-full accent-apricot-500 bg-raven-750 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="text-[11px] text-seagrass-400">
                          Lower values preserve source structure; higher values re-synthesize.
                        </p>
                      </div>
                    )}
                    <div className="text-[11px] font-mono text-seagrass-400">
                      Sampler: Euler_A (Deterministic)
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Credits & Accounting Status */}
            <div className="pt-4 border-t border-raven-700 text-[11px] font-mono text-seagrass-400 flex items-center justify-between">
              <span>Cost: ₹0.00</span>
              <span className="text-seagrass-200">1 credit / render</span>
            </div>
          </aside>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* RECENT WORK DRAWER                                                 */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "history" && (
          <div className="absolute inset-y-0 left-14 w-80 bg-raven-900 border-r border-raven-700 shadow-modal z-30 flex flex-col">
            <div className="p-4 border-b border-raven-700 flex items-center justify-between">
              <div className="text-xs font-mono uppercase font-semibold text-seagrass-50">
                Recent work ({history.length})
              </div>
              <button
                onClick={() => setActiveTab("generate")}
                className="text-seagrass-400 hover:text-seagrass-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoadingHistory ? (
                <div className="text-center py-8 text-xs font-mono text-seagrass-400">
                  Loading recent images...
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-xs text-seagrass-400 space-y-1">
                  <p className="text-sm font-medium text-seagrass-200">No images yet</p>
                  <p className="text-xs">Your generated images will appear here.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-raven-700 bg-raven-850 p-2.5 space-y-2 hover:border-seagrass-400/40 transition-colors"
                  >
                    {item.images && item.images.length > 0 && (
                      <div
                        onClick={() => {
                          setActiveImageResult({
                            ...item.images[0],
                            prompt: item.prompt,
                            seed: item.seed,
                            model_id: item.model_id,
                          });
                          setActiveTab("generate");
                        }}
                        className="relative aspect-square rounded-lg overflow-hidden bg-raven-950 cursor-pointer group"
                      >
                        <img
                          src={resolveImageUrl(item.images[0].url)}
                          alt="Recent work output"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-raven-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-mono text-seagrass-50">
                          View image
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-seagrass-200 line-clamp-2 font-sans">
                      {item.prompt}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-raven-750 text-[10px] font-mono text-seagrass-400">
                      <span>{item.model_id}</span>
                      <button
                        onClick={() => handleRemix(item)}
                        className="text-apricot-400 hover:underline"
                      >
                        Remix prompt
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* COMPOSITION LAYERS DRAWER                                          */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "layers" && (
          <div className="absolute inset-y-0 left-14 w-80 bg-raven-900 border-r border-raven-700 shadow-modal z-30 flex flex-col">
            <div className="p-4 border-b border-raven-700 flex items-center justify-between">
              <div className="text-xs font-mono uppercase font-semibold text-seagrass-50">
                Canvas layers ({layers.length})
              </div>
              <button
                onClick={() => setActiveTab("generate")}
                className="text-seagrass-400 hover:text-seagrass-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {layers.length === 0 ? (
                <div className="text-center py-8 text-xs text-seagrass-400 space-y-1">
                  <p className="text-sm font-medium text-seagrass-200">No active layers</p>
                  <p className="text-xs">
                    Generate an image and select "Add to canvas layers" to build a composition.
                  </p>
                </div>
              ) : (
                layers.map((layer, idx) => (
                  <div
                    key={layer.id}
                    className="p-3 rounded-xl border border-raven-700 bg-raven-850 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-apricot-500 font-bold">#{idx + 1}</span>
                      <span className="text-seagrass-100 font-medium truncate max-w-[150px]">
                        {layer.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-seagrass-400 uppercase">
                      {layer.type}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {/* ------------------------------------------------------------------ */}
        {/* WORKSPACE ANALYTICS MODAL                                           */}
        {/* ------------------------------------------------------------------ */}
        {analyticsOpen && (
          <div className="fixed inset-0 bg-raven-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-raven-900 border border-raven-700 rounded-2xl max-w-xl w-full p-6 shadow-modal space-y-6 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-raven-800 pb-4">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-apricot-500" />
                  <h3 className="font-semibold text-seagrass-50 text-base">Workspace Analytics</h3>
                </div>
                <button
                  onClick={() => setAnalyticsOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-raven-800 flex items-center justify-center text-seagrass-400 hover:text-seagrass-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isLoadingAnalytics ? (
                <div className="py-12 text-center text-seagrass-400 text-xs font-mono animate-pulse">
                  Loading metrics from database...
                </div>
              ) : analyticsData ? (
                <div className="space-y-6 text-xs">
                  {/* Account Summary Banner */}
                  <div className="p-4 rounded-xl bg-raven-850 border border-raven-700 flex items-center justify-between">
                    <div>
                      <div className="text-seagrass-200 font-semibold">{analyticsData.email}</div>
                      <div className="text-[11px] text-seagrass-400 font-mono">Plan: {analyticsData.plan_tier.toUpperCase()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-apricot-500 font-bold font-mono text-base">{analyticsData.credits_remaining}</div>
                      <div className="text-[10px] text-seagrass-400 font-mono">credits remaining</div>
                    </div>
                  </div>

                  {/* 4 Metrics Cards Grid */}
                  <div className="grid grid-cols-2 gap-3 font-mono">
                    <div className="p-3.5 rounded-xl bg-raven-850 border border-raven-700 space-y-1">
                      <span className="text-seagrass-400 text-[11px]">Generations</span>
                      <div className="text-seagrass-50 text-lg font-bold">{analyticsData.total_generations}</div>
                      <div className="text-[11px] text-semantic-success flex items-center gap-1">
                        <span>✓ {analyticsData.successful_generations} succeeded</span>
                      </div>
                      {analyticsData.failed_generations > 0 && (
                        <div className="text-[10px] text-semantic-error">
                          ✗ {analyticsData.failed_generations} failed
                        </div>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl bg-raven-850 border border-raven-700 space-y-1">
                      <span className="text-seagrass-400 text-[11px]">Credits Consumed</span>
                      <div className="text-seagrass-50 text-lg font-bold">{analyticsData.total_credits_consumed}</div>
                      <div className="text-[11px] text-seagrass-400">Total computed usage</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-raven-850 border border-raven-700 space-y-1">
                      <span className="text-seagrass-400 text-[11px]">Projects</span>
                      <div className="text-seagrass-50 text-lg font-bold">{analyticsData.total_projects}</div>
                      <div className="text-[11px] text-seagrass-400">Active workspaces</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-raven-850 border border-raven-700 space-y-1">
                      <span className="text-seagrass-400 text-[11px]">Conversations</span>
                      <div className="text-seagrass-50 text-lg font-bold">{analyticsData.total_conversations}</div>
                      <div className="text-[11px] text-seagrass-400">Creative threads</div>
                    </div>
                  </div>

                  {/* Recent Activity Stream */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-seagrass-200">Recent Creations</h4>
                    {analyticsData.recent_activity.length === 0 ? (
                      <div className="p-4 rounded-xl bg-raven-850/50 border border-raven-800 text-center text-seagrass-400 text-[11px]">
                        No generations recorded yet in this workspace.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {analyticsData.recent_activity.map((item: any) => (
                          <div
                            key={item.id}
                            className="p-2.5 rounded-lg bg-raven-850 border border-raven-750 flex items-center justify-between text-xs"
                          >
                            <span className="text-seagrass-100 truncate max-w-[280px]" title={item.prompt}>
                              {item.prompt}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${item.status === "COMPLETED"
                                ? "bg-semantic-success/15 text-semantic-success"
                                : item.status === "FAILED"
                                  ? "bg-semantic-error/15 text-semantic-error"
                                  : "bg-semantic-warning/15 text-semantic-warning"
                                }`}
                            >
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Close Button */}
              <div className="pt-2 border-t border-raven-800 flex justify-end">
                <button
                  onClick={() => setAnalyticsOpen(false)}
                  className="px-4 py-2 rounded-xl bg-raven-800 hover:bg-raven-750 border border-raven-700 text-seagrass-100 text-xs font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
