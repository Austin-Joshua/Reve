import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import {
  Folder,
  Plus,
  Archive,
  RotateCcw,
  Trash2,
  Edit2,
  Check,
  X,
  Users,
  Shield,
  Clock,
  Sparkles,
} from "lucide-react";

export interface ProjectItem {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  thumbnail_url?: string;
  canvas_width: number;
  canvas_height: number;
  canvas_background: string;
  is_archived: boolean;
  role: "OWNER" | "EDITOR" | "VIEWER";
  created_at: string;
  updated_at: string;
}

interface ProjectSwitcherModalProps {
  currentProjectId: string | null;
  onSelectProject: (project: ProjectItem) => void;
  onClose: () => void;
}

export const ProjectSwitcherModal: React.FC<ProjectSwitcherModalProps> = ({
  currentProjectId,
  onSelectProject,
  onClose,
}) => {
  const [tab, setTab] = useState<"owned" | "shared" | "archived">("owned");
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New project creation state
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    fetchProjects();
  }, [tab]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/projects?include_archived=${tab === "archived"}`);
      setProjects(res.data);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const res = await api.post("/projects", {
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        canvas_width: 512,
        canvas_height: 512,
        canvas_background: "#16292B",
      });
      setNewName("");
      setNewDescription("");
      setIsCreating(false);
      onSelectProject(res.data);
      fetchProjects();
    } catch (err: any) {
      alert("Failed to create project: " + (err.response?.data?.detail?.message || err.message));
    }
  };

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      await api.patch(`/projects/${id}`, { name: editingName.trim() });
      setEditingId(null);
      fetchProjects();
    } catch (err: any) {
      alert("Failed to rename project: " + (err.response?.data?.detail?.message || err.message));
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await api.post(`/projects/${id}/archive`);
      fetchProjects();
    } catch (err: any) {
      alert("Failed to archive project: " + (err.response?.data?.detail?.message || err.message));
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await api.post(`/projects/${id}/restore`);
      fetchProjects();
    } catch (err: any) {
      alert("Failed to restore project: " + (err.response?.data?.detail?.message || err.message));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this project? All associated scene layers and members will be removed.")) return;
    try {
      await api.delete(`/projects/${id}`);
      fetchProjects();
    } catch (err: any) {
      alert("Failed to delete project: " + (err.response?.data?.detail?.message || err.message));
    }
  };

  // Filter projects by current tab
  const displayedProjects = projects.filter((p) => {
    if (tab === "archived") return p.is_archived;
    if (tab === "shared") return !p.is_archived && p.role !== "OWNER";
    return !p.is_archived && p.role === "OWNER";
  });

  return (
    <div className="fixed inset-0 bg-raven-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-raven-900 border border-raven-700 rounded-2xl max-w-2xl w-full p-6 shadow-modal space-y-5 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-raven-800 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-apricot-500" />
            <h3 className="font-semibold text-seagrass-50 text-base">Projects & Workspaces</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreating(true)}
              className="px-3 py-1.5 rounded-lg bg-apricot-500 hover:bg-apricot-400 text-raven-950 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-surface"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-raven-800 flex items-center justify-center text-seagrass-400 hover:text-seagrass-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-raven-800 text-xs font-mono shrink-0">
          <button
            onClick={() => setTab("owned")}
            className={`py-2 px-4 border-b-2 font-medium transition-colors ${
              tab === "owned"
                ? "border-apricot-500 text-seagrass-50"
                : "border-transparent text-seagrass-400 hover:text-seagrass-200"
            }`}
          >
            My Projects
          </button>
          <button
            onClick={() => setTab("shared")}
            className={`py-2 px-4 border-b-2 font-medium transition-colors ${
              tab === "shared"
                ? "border-apricot-500 text-seagrass-50"
                : "border-transparent text-seagrass-400 hover:text-seagrass-200"
            }`}
          >
            Shared with Me
          </button>
          <button
            onClick={() => setTab("archived")}
            className={`py-2 px-4 border-b-2 font-medium transition-colors ${
              tab === "archived"
                ? "border-apricot-500 text-seagrass-50"
                : "border-transparent text-seagrass-400 hover:text-seagrass-200"
            }`}
          >
            Archived
          </button>
        </div>

        {/* Create Project Modal Box */}
        {isCreating && (
          <div className="p-4 rounded-xl bg-raven-850 border border-raven-700 space-y-3 shrink-0">
            <div className="text-xs font-semibold text-seagrass-100">Create New Project</div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project title (e.g. Neo Tokyo Concept)"
              autoFocus
              className="w-full bg-raven-950 border border-raven-700 focus:border-apricot-500 rounded-lg px-3 py-1.5 text-xs text-seagrass-50 font-sans focus:outline-none"
            />
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional description..."
              className="w-full bg-raven-950 border border-raven-700 focus:border-apricot-500 rounded-lg px-3 py-1.5 text-xs text-seagrass-50 font-sans focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-seagrass-400 hover:text-seagrass-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-1.5 rounded-lg bg-apricot-500 hover:bg-apricot-400 text-raven-950 font-semibold text-xs"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {/* Project Grid / List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {isLoading ? (
            <div className="text-center py-12 text-xs font-mono text-seagrass-400 animate-pulse">
              Loading projects...
            </div>
          ) : displayedProjects.length === 0 ? (
            <div className="text-center py-12 text-xs text-seagrass-400 space-y-1">
              <p className="font-medium text-seagrass-200">
                {tab === "owned"
                  ? "No projects created yet"
                  : tab === "shared"
                  ? "No projects shared with you"
                  : "No archived projects"}
              </p>
              <p className="text-[11px]">
                {tab === "owned"
                  ? "Click 'New Project' above to create a workspace."
                  : tab === "shared"
                  ? "Projects where you have been invited will appear here."
                  : "Archived projects will appear here."}
              </p>
            </div>
          ) : (
            displayedProjects.map((p) => {
              const isCurrent = p.id === currentProjectId;
              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    isCurrent
                      ? "border-apricot-500/70 bg-raven-800 shadow-surface"
                      : "border-raven-750 bg-raven-850 hover:border-seagrass-400/40"
                  }`}
                >
                  <div className="space-y-1 flex-1 pr-4">
                    {editingId === p.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleRename(p.id)}
                          autoFocus
                          className="bg-raven-950 border border-apricot-500 rounded px-2 py-0.5 text-xs text-seagrass-50 font-sans focus:outline-none"
                        />
                        <button
                          onClick={() => handleRename(p.id)}
                          className="p-1 rounded bg-apricot-500 text-raven-950"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 rounded text-seagrass-400 hover:text-seagrass-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-seagrass-50 text-sm">{p.name}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded bg-apricot-500/15 text-apricot-400 text-[10px] font-mono">
                            Current
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                            p.role === "OWNER"
                              ? "bg-apricot-500/10 text-apricot-400 border border-apricot-500/30"
                              : p.role === "EDITOR"
                              ? "bg-semantic-success/10 text-semantic-success border border-semantic-success/30"
                              : "bg-seagrass-400/10 text-seagrass-300 border border-seagrass-400/30"
                          }`}
                        >
                          {p.role}
                        </span>
                      </div>
                    )}
                    {p.description && (
                      <p className="text-[11px] text-seagrass-400 line-clamp-1">{p.description}</p>
                    )}
                    <div className="text-[10px] font-mono text-seagrass-500">
                      Canvas: {p.canvas_width} × {p.canvas_height}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!isCurrent && !p.is_archived && (
                      <button
                        onClick={() => {
                          onSelectProject(p);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-raven-750 hover:bg-raven-700 border border-raven-700 text-seagrass-100 font-mono text-xs transition-colors"
                      >
                        Open
                      </button>
                    )}

                    {p.role === "OWNER" && !p.is_archived && (
                      <button
                        onClick={() => {
                          setEditingId(p.id);
                          setEditingName(p.name);
                        }}
                        className="p-1.5 rounded-lg hover:bg-raven-750 text-seagrass-400 hover:text-seagrass-100"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {p.role === "OWNER" && (
                      <>
                        {p.is_archived ? (
                          <button
                            onClick={() => handleRestore(p.id)}
                            className="p-1.5 rounded-lg hover:bg-raven-750 text-seagrass-400 hover:text-apricot-400"
                            title="Restore project"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchive(p.id)}
                            className="p-1.5 rounded-lg hover:bg-raven-750 text-seagrass-400 hover:text-seagrass-100"
                            title="Archive project"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 rounded-lg hover:bg-[#EF4444]/20 text-seagrass-400 hover:text-[#EF4444]"
                          title="Delete project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-raven-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-raven-800 hover:bg-raven-750 border border-raven-700 text-seagrass-100 text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
